import { ComputedRef, effectScope, EffectScope, ref, Ref, watch } from "vue";

export namespace Modulation {
    type TargetPropertyMap = {
        [key: string]: any
    };
    type SourcePropertyMap = {
        [key: string]: RefOrGetter
    };

    type RefOrGetter = Ref<any> | ComputedRef<any> | (() => any);
    type ExtractRefOrGetterValue<T> = T extends Ref<infer V> ? V : (T extends (() => infer V) ? V : never);

    type ValidTargetsForSource<Props extends TargetPropertyMap, T extends RefOrGetter> = {
        [K in keyof Props]: Props[K] extends ExtractRefOrGetterValue<T> ? ExtractRefOrGetterValue<T> extends Props[K] ? K : never : never
    }[keyof Props];

    /**
     * Modulation source side of controller. Values set to its source refs will be applied to linked targets.
     */
    export class Source<Props extends SourcePropertyMap> {
        /**Source refs that modulate targets */
        readonly sources: Readonly<Props>;
        /**Maps sources to their target sets */
        private readonly connections: Map<keyof Props, Set<Ref>> = new Map();
        /**Helps efficiently disconnect all targets, maps targets to map of source and target properties */
        private readonly connectionTrackers: Map<Target<any>, Map<keyof Props, any>> = new Map();

        /**Reactive record of all targets modulated by this source - if this is edited it's not this class's problem */
        readonly connectedTargets: ComputedRef<{
            readonly [K in keyof Props]: ([Target<any>, any])[]
        }>;

        private readonly effectScope: EffectScope;

        /**
         * @param sources Source refs
         * - Source refs will be the same as the ones in the `sources` property
         * - Using computed refs and getters allows modulation based on external dependencies without additional code
         */
        constructor(sources: Props) {
            this.sources = { ...sources };
            this.effectScope = effectScope();
            for (const sourceKey in this.sources) {
                this.connections.set(sourceKey, new Set<Ref>());
            }
            this.effectScope.run(() => {
                for (const sourceKey in this.sources) {
                    const sourceRef = this.sources[sourceKey];
                    const targetRefs = this.connections.get(sourceKey)!;
                    watch(sourceRef, (value) => {
                        for (const target of targetRefs) target.value = value;
                    });
                }
            });
            // again, using normal refs but exposing them as readonly, and .effect is still deprecated
            this.connectedTargets = ref(Object.keys(this.sources).reduce((obj, key) => (obj[key] = [], obj), {} as any)) as any;
        }

        /**
         * Connect modulation of `targetKey` in a target by `sourceKey` in this source.
         * @param target Modulation target, either a `Modulatable` object or a modulation `Target`
         * @param sourceKey Name of modulation source
         * @param targetKey Name of modulation target
         */
        connect<TargetProps extends TargetPropertyMap, Key1 extends keyof Props>(
            target: Target<TargetProps> | Modulatable<TargetProps>, sourceKey: Key1, targetKey: ValidTargetsForSource<TargetProps, Props[Key1]>
        ): void {
            const normTarget = target instanceof Target ? target : target.modulation;
            const publicTarget = normTarget as any as TargetInternalView<TargetProps>;
            // multiple sources to a target doesn't work
            if (publicTarget.connectionTrackers.has(targetKey)) return;
            const targetRef = publicTarget.targets[targetKey];
            const sourceRefOrGetter = this.sources[sourceKey];
            this.connections.get(sourceKey)!.add(targetRef);
            targetRef.value = (typeof sourceRefOrGetter == 'function' ? sourceRefOrGetter() : sourceRefOrGetter.value) as any; // ts complains buh
            // update connection trackers (typing is a bit scuffed still)
            if (!this.connectionTrackers.has(normTarget)) this.connectionTrackers.set(normTarget, new Map());
            this.connectionTrackers.get(normTarget)!.set(sourceKey, targetKey);
            publicTarget.connectionTrackers.set(targetKey, [this, sourceKey]);
            this.connectedTargets.value[sourceKey].push([normTarget, targetKey]);
            normTarget.connectedSources.value[targetKey] = this;
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
        disconnect<TargetProps extends TargetPropertyMap, Key1 extends keyof Props>(target: Target<TargetProps>, sourceKey: Key1, targetKey: ValidTargetsForSource<TargetProps, Props[Key1]>): void;

        disconnect<TargetProps extends TargetPropertyMap>(
            target?: Target<TargetProps> | Modulatable<TargetProps>, sourceKey?: keyof Props, targetKey?: keyof TargetProps
        ): void {
            if (target === undefined) {
                // disconnect all targets
                this.connections.clear();
                for (const [target, modMap] of this.connectionTrackers) {
                    const publicTarget = target as any as TargetInternalView<TargetProps>;
                    for (const [_, targetKey] of modMap) {
                        publicTarget.connectionTrackers.delete(targetKey);
                        target.connectedSources.value[targetKey] = null;
                    }
                }
                this.connectionTrackers.clear();
                return;
            }
            const normTarget = target instanceof Target ? target : target.modulation;
            const publicTarget = normTarget as any as TargetInternalView<TargetProps>;
            if (sourceKey === undefined) {
                // disconnect all modulations to a target
                const modMap = this.connectionTrackers.get(normTarget);
                if (modMap === undefined) return; // wasn't connected anyway
                for (const [sourceKey, targetKey] of modMap) {
                    this.connections.get(sourceKey)!.delete(publicTarget.targets[targetKey]);
                    publicTarget.connectionTrackers.delete(targetKey);
                    (normTarget.connectedSources.value as any)[targetKey] = null; // shut up "can only be indexed for reading"
                }
                return;
            }
            // disconnect just one modulation to a target
            this.connections.get(sourceKey)!.delete(publicTarget.targets[targetKey!]);
            this.connectionTrackers.get(normTarget)?.delete(sourceKey);
            publicTarget.connectionTrackers.delete(targetKey!);
            normTarget.connectedSources.value[targetKey!] = null;
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
            readonly [K in keyof Props]: ComputedRef<Props[K]>
        };
        /**Helps efficiently disconnect all sources, maps targets to tuple of source and source property, also used to enumerate sources */
        private readonly connectionTrackers: Map<keyof Props, [Source<any>, any]> = new Map();

        /**Reactive record of all sources for this target - if this is edited it's not this class's problem */
        readonly connectedSources: ComputedRef<{
            [K in keyof Props]: Source<any> | null
        }>;

        /**
         * @param initialValues Initial values for modulated items
         */
        constructor(initialValues: Props) {
            // internally, these are normal writeable refs, but we only expose readonly ones (.effect is irrelevant so its fine)
            this.targets = Object.entries(initialValues).reduce((obj, [key, v]) => (obj[key] = ref(v), obj), {} as any);
            this.connectedSources = ref(Object.keys(this.targets).reduce((obj, key) => (obj[key] = null, obj), {} as any)) as any;
        }

        /**
         * If a modulation target is connected to a source.
         * @param targetKey Target name
         */
        connected(targetKey: keyof Props): boolean {
            return this.connectionTrackers.has(targetKey);
        }

        /**
         * Destroy the modulator.
         */
        destroy(): void {
            for (const [_, [source]] of this.connectionTrackers) source.disconnect(this);
        }
    }

    interface TargetInternalView<Props extends TargetPropertyMap> {
        /**Target refs, internally they are normal refs but are made public as readonly */
        readonly targets: {
            readonly [K in keyof Props]: Ref<Props[K]>
        }
        readonly connectionTrackers: Map<keyof Props, [Source<any>, any]>
    }

    export interface Modulatable<Props extends TargetPropertyMap> {
        readonly modulation: Target<Props>
    }
}
