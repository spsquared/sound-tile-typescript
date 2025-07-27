import { computed, ComputedRef, effectScope, EffectScope, ref, Ref, watch } from "vue";

export namespace Modulation {
    type ModulationPropertyMap = {
        [key: string]: any
    };

    type PropertiesWithType<Props extends ModulationPropertyMap, T> = {
        [K in keyof Props]: Props[K] extends T ? K : never
    }[keyof Props];

    /**
     * Modulation source side of controller. Values set to its source refs will be applied to linked targets.
     */
    export class Source<Props extends ModulationPropertyMap> {
        /**Source refs that modulate targets */
        readonly sources: {
            readonly [K in keyof Props]: Ref<Props[K]> | ComputedRef<Props[K]> | (() => Props[K])
        };
        /**Maps sources to their target sets */
        private readonly connections: Map<keyof Props, Set<Ref>> = new Map();
        /**Helps efficiently disconnect all targets, maps targets to map of source and target properties */
        private readonly connectionTrackers: Map<Target<any>, Map<keyof Props, any>> = new Map();

        private readonly effectScope: EffectScope;

        /**
         * @param sources Source refs
         * - Source refs will be the same as the ones in the `sources` property
         * - Using computed refs and getters allows modulation based on external dependencies without additional code
         */
        constructor(sources: Source<Props>['sources']) {
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
        }

        /**
         * Connect modulation of `targetKey` in a target by `sourceKey` in this source.
         * @param target Modulation target, either a `Modulatable` object or a modulation `Target`
         * @param sourceKey Name of modulation source
         * @param targetKey Name of modulation target
         */
        connect<TargetProps extends ModulationPropertyMap, Key1 extends keyof Props>(
            target: Target<TargetProps> | Modulatable<TargetProps>, sourceKey: Key1, targetKey: PropertiesWithType<TargetProps, Props[Key1]>
        ): void {
            const normTarget = target instanceof Target ? target : target.modulation;
            const publicTarget = normTarget as any as TargetPublic<TargetProps>;
            // multiple sources to a target doesn't work
            if (publicTarget.connectionTrackers.has(targetKey)) return;
            const targetRef = publicTarget.values[targetKey];
            const sourceRefOrGetter = this.sources[sourceKey];
            this.connections.get(sourceKey)!.add(targetRef);
            targetRef.value = (typeof sourceRefOrGetter == 'function' ? sourceRefOrGetter() : sourceRefOrGetter.value) as any; // ts complains buh
            // update connection trackers (typing is a bit scuffed still)
            if (!this.connectionTrackers.has(normTarget)) this.connectionTrackers.set(normTarget, new Map());
            this.connectionTrackers.get(normTarget)!.set(sourceKey, targetKey);
            publicTarget.connectionTrackers.set(targetKey, [this, sourceKey]);
        }

        /**
         * Disconnect all modulation to all targets.
         */
        disconnect(): void;
        /**
         * Disconnect all modulation to the target.
         * @param target Modulation target, either a `Modulatable` object or a modulation `Target`
         */
        disconnect<TargetProps extends ModulationPropertyMap>(target: Target<TargetProps>): void;
        /**
         * Disconnect the modulation of `targetKey` by `sourceKey` to the target.
         * @param target Modulation target, either a `Modulatable` object or a modulation `Target`
         * @param sourceKey Name of modulation source
         * @param targetKey Name of modulation target
         */
        disconnect<TargetProps extends ModulationPropertyMap, Key1 extends keyof Props>(target: Target<TargetProps>, sourceKey: Key1, targetKey: PropertiesWithType<TargetProps, Props[Key1]>): void;

        disconnect<TargetProps extends ModulationPropertyMap>(
            target?: Target<TargetProps> | Modulatable<TargetProps>, sourceKey?: keyof Props, targetKey?: keyof TargetProps
        ): void {
            if (target === undefined) {
                // disconnect all targets
                this.connections.clear();
                for (const [target, modMap] of this.connectionTrackers) {
                    const publicTarget = target as any as TargetPublic<TargetProps>;
                    for (const [_, targetKey] of modMap) {
                        publicTarget.connectionTrackers.delete(targetKey);
                    }
                }
                this.connectionTrackers.clear();
                return;
            }
            const normTarget = target instanceof Target ? target : target.modulation;
            const publicTarget = normTarget as any as TargetPublic<TargetProps>;
            if (sourceKey === undefined) {
                // disconnect all modulations to a target
                const modMap = this.connectionTrackers.get(normTarget);
                if (modMap === undefined) return; // wasn't connected anyway
                for (const [sourceKey, targetKey] of modMap) {
                    this.connections.get(sourceKey)!.delete(publicTarget.values[targetKey]);
                    publicTarget.connectionTrackers.delete(targetKey);
                }
                return;
            }
            // disconnect just one modulation to a target
            this.connections.get(sourceKey)!.delete(publicTarget.values[targetKey]);
            this.connectionTrackers.get(normTarget)?.delete(sourceKey);
            publicTarget.connectionTrackers.delete(targetKey!);
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
    export class Target<Props extends ModulationPropertyMap> {
        /**Target refs controlled by sources */
        readonly targets: {
            readonly [K in keyof Props]: ComputedRef<Props[K]>
        };
        /**Internal refs to make target refs readonly */
        private readonly values: {
            readonly [K in keyof Props]: Ref<Props[K]>
        };
        /**Helps efficiently disconnect all sources, maps targets to tuple of source and source property */
        private readonly connectionTrackers: Map<keyof Props, [Source<any>, any]> = new Map();

        /**
         * @param initialValues Initial values for modulated items
         */
        constructor(initialValues: Props) {
            this.values = Object.entries(initialValues).reduce((obj, [key, v]) => (obj[key] = ref(v), obj), {} as any);
            this.targets = Object.entries(this.values).reduce((obj, [key, ref]) => (obj[key] = computed(() => ref.value), obj), {} as any);
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

    interface TargetPublic<Props extends ModulationPropertyMap> {
        readonly values: {
            readonly [K in keyof Props]: Ref<Props[K]>
        }
        readonly connectionTrackers: Map<keyof Props, [Source<any>, any]>
    }

    export interface Modulatable<Props extends ModulationPropertyMap> {
        readonly modulation: Target<Props>
    }
}
