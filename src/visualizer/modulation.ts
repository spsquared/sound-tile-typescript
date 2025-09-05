import { ComputedRef, effectScope, EffectScope, markRaw, MaybeRefOrGetter, reactive, ref, Ref, watch, WatchHandle } from 'vue';
import { Tile } from './tiles';

export namespace Modulation {
    export type SourcePropertyMap = Record<string, RefOrGetter>
    export type TargetPropertyMap = Record<string, any>

    type RefOrGetter<T = any> = Ref<T> | ComputedRef<T> | (() => T);
    type ExtractRefOrGetterValue<T> = T extends Ref<infer V> ? V : (T extends (() => infer V) ? V : never);

    type ValidTargetsForSource<Props extends TargetPropertyMap, T extends RefOrGetter> = {
        [K in keyof Props]: Props[K] extends ExtractRefOrGetterValue<T> ? ExtractRefOrGetterValue<T> extends Props[K] ? K : never : never
    }[keyof Props & string];

    // buh so much redundant information but also performance and encapsulation
    // probably don't need to protect against random non-ts editing stuff and borking everything since it's just me

    // also I definitely did something horribly wrong and against all typescript laws here
    // symbol and number types are allowed in properties but you can't use them anyway

    // also probably shouldn't have used refs as ref unwrapping causes utter carnage in all sorts of places

    /**
     * Modulation source side of controller. Values set to its source refs will be applied to linked targets.
     */
    export class Source<Props extends SourcePropertyMap> {
        /**Source refs that modulate targets */
        readonly sources: {
            readonly [K in keyof Props & string]: Props[K]
        };
        /**Type identification labels for determining types at runtime */
        readonly typeLabels: {
            readonly [K in keyof Props & string]: string
        };

        /**Label used for UI purposes */
        label: string = 'Unnamed Source';
        /**Also used for UI purposes */
        readonly tile: Tile | null = null;

        /**Maps sources to their target sets */
        private readonly connections: Map<keyof Props, Set<Ref>> = markRaw(new Map());
        /**Maps target refs to their incoming transforms  */
        private readonly transforms: Map<Ref, Transform<any>[]> = markRaw(new Map());
        /**Keeps watch handles for updating targets so they can be stopped to avoid resource leaks */
        private readonly updateWatchers: Map<Ref, WatchHandle> = markRaw(new Map());
        /**Helps efficiently disconnect all targets, maps targets to map of source and target properties */
        private readonly connectionTrackers: Map<Target<any>, Map<keyof Props, string>> = markRaw(new Map());

        /**Reactive record of all targets modulated by this source - if this is edited it's not this class's problem */
        readonly connectedTargets: {
            readonly [K in keyof Props & string]: readonly [Target<any>, string, Transform<ExtractRefOrGetterValue<Props[K]>>[]][]
        };

        /**Fallback thing and also miscellaneous reactivity scope */
        private readonly effectScope: EffectScope;

        /**
         * @param sources Source refs
         * - Source refs will be the same as the ones in the `sources` property
         * - Using computed refs and getters allows modulation based on external dependencies without additional code
         * @param typeLabels Optionally label sources to make type requirements in UI elements stricter
         * (this is entirely for distinguishing types at runtime), if a label is omitted, the `typeof` operator
         * will be used to determine the type of a source.
         */
        constructor(sources: Props, { typeLabels, label, tile }: { typeLabels?: Partial<Source<Props>['typeLabels']>, label?: MaybeRefOrGetter<string>, tile?: Tile } = { typeLabels: {} }) {
            // markRaw blocks automatic ref unwrapping
            this.sources = markRaw({ ...sources });
            this.typeLabels = markRaw({ ...Object.entries(sources).reduce((obj, [k, v]) => (obj[k] = typeof (typeof v == 'function' ? v() : v.value), obj), {} as any), ...typeLabels });
            for (const sourceKey in this.sources) {
                this.connections.set(sourceKey, new Set());
            }
            // again, using normal refs but exposing them as readonly, and .effect is still deprecated
            this.connectedTargets = reactive(Object.keys(this.sources).reduce((obj, key) => (obj[key] = [], obj), {} as any)) as any;
            this.effectScope = effectScope();
            if (label !== undefined) {
                if (typeof label == 'string') this.label = label;
                else this.effectScope.run(() => {
                    const rThis = reactive(this);
                    watch(label, (v) => rThis.label = v, { immediate: true });
                });
            }
            this.tile = tile ?? null;
        }

        /**
         * Connect modulation of `targetKey` in a target by `sourceKey` in this source.
         * The modulation source and target must have the same type to be connected.
         * @param target Modulation target, either a `Modulatable` object or a modulation `Target`
         * @param sourceKey Name of modulation source
         * @param targetKey Name of modulation target
         * @returns Connection success - failure reasons include existing connections and mismatched types
         */
        connect<TargetProps extends TargetPropertyMap, Key1 extends keyof Props & string>(
            target: Target<TargetProps> | Modulatable<TargetProps>,
            sourceKey: Key1,
            targetKey: ValidTargetsForSource<TargetProps, Props[Key1]>,
            transforms: Transform<ExtractRefOrGetterValue<Props[Key1]>>[] = []
        ): boolean {
            const normTarget = target instanceof Target ? target : target.modulation;
            const publicTarget = normTarget as any as TargetInternalView<TargetProps>;
            // multiple sources to a target doesn't work, also prevents connecting to same thing twice
            if (publicTarget.connectionTrackers.has(targetKey)) return false;
            // runtime checking of property types (for UI mostly)
            if (this.typeLabels[sourceKey] !== normTarget.typeLabels[targetKey]) return false;
            // transform chains require watch function to be here to apply updates to the transforms
            const targetRef = publicTarget.targets[targetKey];
            const sourceRefOrGetter = this.sources[sourceKey];
            this.connections.get(sourceKey)!.add(targetRef);
            this.transforms.set(targetRef, transforms);
            const getSourceValue: () => ExtractRefOrGetterValue<Props[Key1]> = typeof sourceRefOrGetter == 'function' ? () => sourceRefOrGetter() : () => sourceRefOrGetter.value;
            this.effectScope.run(() => this.updateWatchers.set(targetRef, watch([sourceRefOrGetter, reactive(transforms)], () => {
                // for some reason using [value] in watch callback gives some nonsense type that makes a billion errors
                let value = getSourceValue();
                for (let i = 0; i < transforms.length; i++) {
                    value = transforms[i].apply(value);
                }
                targetRef.value = value;
            }, { immediate: true })));
            // update connection trackers (typing is a bit scuffed still)
            if (!this.connectionTrackers.has(normTarget)) this.connectionTrackers.set(normTarget, new Map());
            this.connectionTrackers.get(normTarget)!.set(sourceKey, targetKey);
            publicTarget.connectionTrackers.set(targetKey, [this, sourceKey]);
            (this.connectedTargets[sourceKey] as [Target<any>, string, Transform<any>[]][]).push([normTarget, targetKey, transforms]);
            publicTarget.connectedSources[targetKey] = [this, sourceKey as string, transforms];
            return true;
        }

        /**
         * Disconnect all modulation to all targets.
         */
        disconnect(): void;
        /**
         * Disconnect all modulation to the target.
         * @param target Modulation target, either a `Modulatable` object or a modulation `Target`
         */
        disconnect<TargetProps extends TargetPropertyMap>(target: Target<TargetProps>): void;
        /**
         * Disconnect the modulation of `targetKey` by `sourceKey` to the target.
         * @param target Modulation target, either a `Modulatable` object or a modulation `Target`
         * @param sourceKey Name of modulation source
         * @param targetKey Name of modulation target
         */
        disconnect<TargetProps extends TargetPropertyMap, Key1 extends keyof Props & string>(target: Target<TargetProps>, sourceKey: Key1, targetKey: ValidTargetsForSource<TargetProps, Props[Key1]>): void;

        disconnect<TargetProps extends TargetPropertyMap>(
            target?: Target<TargetProps> | Modulatable<TargetProps>,
            sourceKey?: keyof Props & string,
            targetKey?: keyof TargetProps & string
        ): void {
            if (target === undefined) {
                // disconnect all targets
                this.connections.clear();
                this.transforms.clear();
                for (const [_, stop] of this.updateWatchers) stop();
                this.updateWatchers.clear();
                for (const [target, modMap] of this.connectionTrackers) {
                    const publicTarget = target as any as TargetInternalView<any>;
                    for (const [_, targetKey] of modMap) {
                        publicTarget.connectionTrackers.delete(targetKey);
                        publicTarget.connectedSources[targetKey] = null;
                    }
                }
                this.connectionTrackers.clear();
                for (const key in this.connectedTargets) (this.connectedTargets[key] as any) = [];
                return;
            }
            const normTarget = target instanceof Target ? target : target.modulation;
            const publicTarget = normTarget as any as TargetInternalView<TargetProps>;
            if (sourceKey === undefined) {
                // disconnect all modulations to a target
                const modMap = this.connectionTrackers.get(normTarget);
                if (modMap === undefined) return; // wasn't connected anyway
                for (const [sourceKey, targetKey] of modMap) {
                    const targetRef = publicTarget.targets[targetKey];
                    this.connections.get(sourceKey)!.delete(targetRef);
                    this.transforms.delete(targetRef);
                    this.updateWatchers.get(targetRef)!();
                    this.updateWatchers.delete(targetRef);
                    publicTarget.connectionTrackers.delete(targetKey);
                    (this.connectedTargets[sourceKey as keyof Props & string] as any) = this.connectedTargets[sourceKey as keyof Props & string].filter(([t]) => t !== normTarget); // did I mention that I hate this line?
                    (normTarget.connectedSources as any)[targetKey] = null; // shut up "can only be indexed for reading"
                }
                this.connectionTrackers.delete(normTarget);
                return;
            }
            // disconnect just one modulation to a target
            const targetRef = publicTarget.targets[targetKey!];
            this.connections.get(sourceKey)!.delete(targetRef);
            this.transforms.delete(targetRef);
            this.updateWatchers.get(targetRef)!();
            this.updateWatchers.delete(targetRef);
            this.connectionTrackers.get(normTarget)?.delete(sourceKey);
            publicTarget.connectionTrackers.delete(targetKey!);
            (this.connectedTargets[sourceKey as keyof Props & string] as any) = this.connectedTargets[sourceKey as keyof Props & string].filter(([t, k]) => t !== normTarget || k !== targetKey); // this one's even worse
            publicTarget.connectedSources[targetKey!] = null;
        }

        /**
         * Destroy the modulator
         */
        destroy(): void {
            this.disconnect();
            this.effectScope.stop();
        }
    }

    /**
     * Modulation target side of controller. Values in its `targets` refs are controlled by linked sources.
     */
    export class Target<Props extends TargetPropertyMap> {
        /**Target refs controlled by sources */
        readonly targets: {
            readonly [K in keyof Props & string]: ComputedRef<Props[K]>
        };
        /**Type identification labels for determining types at runtime */
        readonly typeLabels: {
            readonly [K in keyof Props & string]: string
        };
        /**Label used for UI purposes */
        label: string = 'Unnamed Target';
        /**Also used for UI purposes */
        readonly tile: Tile | null = null;

        /**Helps efficiently disconnect all sources, maps targets to tuple of source and source property, also used to enumerate sources */
        private readonly connectionTrackers: Map<keyof Props, [Source<any>, string]> = markRaw(new Map());

        /**Reactive record of all sources for this target - if this is edited it's not this class's problem */
        readonly connectedSources: {
            readonly [K in keyof Props & string]: [Source<any>, string, Transform<Props[K]>[]] | null
        };

        /**Fallback thing and also miscellaneous reactivity scope */
        private readonly effectScope: EffectScope;

        /**
         * @param initialValues Initial values for modulated items
         * @param typeLabels Optionally label sources to make type requirements in UI elements stricter
         * (this is entirely for distinguishing types at runtime), if a label is omitted, the `typeof` operator
         * will be used to determine the type of a source.
         */
        constructor(initialValues: Props, { typeLabels, label, tile }: { typeLabels?: Partial<Target<Props>['typeLabels']>, label?: MaybeRefOrGetter<string>, tile?: Tile } = { typeLabels: {} }) {
            // internally, these are normal writeable refs, but we only expose readonly ones (.effect is irrelevant so its fine)
            // markRaw prevents automatic ref unwrapping shitting all over the types
            this.targets = markRaw(Object.entries(initialValues).reduce((obj, [key, v]) => (obj[key] = ref(v), obj), {} as any));
            this.typeLabels = markRaw({ ...Object.entries(initialValues).reduce((obj, [k, v]) => (obj[k] = typeof v, obj), {} as any), ...typeLabels });
            this.connectedSources = reactive(Object.keys(this.targets).reduce((obj, key) => (obj[key] = null, obj), {} as any)) as any;
            this.effectScope = effectScope();
            if (label !== undefined) {
                if (typeof label == 'string') this.label = label;
                else this.effectScope.run(() => {
                    const rThis = reactive(this);
                    watch(label, (v) => rThis.label = v, { immediate: true });
                });
            }
            this.tile = tile ?? null;
        }

        /**
         * If a modulation target is connected to a source.
         * @param targetKey Target name
         */
        connected(targetKey: keyof Props & string): boolean {
            return this.connectedSources[targetKey] !== null;
        }

        /**
         * Destroy the modulator.
         */
        destroy(): void {
            for (const [_, [source]] of this.connectionTrackers) source.disconnect(this);
            this.effectScope.stop();
        }
    }

    export interface Connection<T = any, KeySource extends keyof TargetPropertyMap = string, KeyTarget extends string = string> {
        readonly source: Modulation.Source<{
            [K in KeySource]: RefOrGetter<T>
        } & SourcePropertyMap>
        readonly target: Modulation.Target<{
            [K in KeyTarget]: T
        } & TargetPropertyMap>
        readonly sourceKey: KeySource
        readonly targetKey: KeyTarget
        readonly transforms: Transform<T>[]
    }

    interface TargetInternalView<Props extends TargetPropertyMap> {
        /**Target refs, internally they are normal refs but are made public as readonly */
        readonly targets: {
            readonly [K in keyof Props]: Ref<Props[K]>
        }
        readonly connectionTrackers: Map<keyof Props, [Source<any>, any]>
        readonly connectedSources: {
            // ignoring typing on transforms because TS can't tell that the type of the properties are the same
            [K in keyof Props]: [Source<any>, string, Transform<any>[]] | null
        };
    }

    export interface Modulatable<Props extends TargetPropertyMap> {
        readonly modulation: Target<Props>
    }

    /**Allows transformation of modulation values. */
    export abstract class Transform<T> {
        abstract type: `${any}`;
        abstract data: unknown;

        abstract apply(n: T): T;
    }

    // constant and linear can technically be just polynomial transforms with 1 and 2 terms,
    // but it's less for users to have these commonly used ones separate from more advanced options

    /**Applies a constant offset to the value: x + a. */
    export class ConstantOffsetTransform extends Transform<number> {
        type: 'constant' = 'constant';
        data: number;

        constructor(data?: number) {
            super();
            this.data = data ?? 0;
        }

        apply(n: number): number {
            return n + this.data;
        }
    }

    /**Applies a linear scale and offset to the value: ax + b . */
    export class LinearTransform extends Transform<number> {
        type: 'linearScale' = 'linearScale';
        data: [number, number];

        constructor(data?: [number, number]) {
            super();
            this.data = data ?? [1, 0];
        }

        apply(n: number): number {
            return n * this.data[0] + this.data[1];
        }
    }

    /**Calculates a polynomial function of any (until fp error borks it) degree: a + bx + cx^2 ... */
    export class PolynomialTransform extends Transform<number> {
        type: 'polynomial' = 'polynomial';
        data: number[];

        constructor(data?: number[]) {
            super();
            this.data = data ?? [0, 1];
        }

        apply(n: number): number {
            let y = this.data[0] ?? 0;
            for (let i = 1; i < this.data.length; i++) {
                y += this.data[i] * (n ** i);
            }
            return y;
        }
    }

    /**Calculates an exponential function: a * (b^x) */
    export class ExponentialTransform extends Transform<number> {
        type: 'exponential' = 'exponential';
        data: [number, number];

        constructor(data?: [number, number]) {
            super();
            this.data = data ?? [1, 2];
        }

        apply(n: number): number {
            return this.data[0] * (this.data[1] ** n);
        }
    }
}

export default Modulation;
