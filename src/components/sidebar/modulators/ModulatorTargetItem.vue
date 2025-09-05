<script setup lang="ts">
import { computed, effectScope, reactive, useTemplateRef, watch } from 'vue';
import TileEditor from '@/visualizer/editor';
import Modulation from '@/visualizer/modulation';
import ModulatorItem from './ModulatorItem.vue';
import { useMouseInElement } from '@vueuse/core';

const props = defineProps<{
    label: string
    target: Modulation.Target<any>
}>();

const connections = computed<Modulation.Connection[]>(() =>
    Object.entries(props.target.connectedSources).filter(([_, entry]) => entry !== null).map(([targetKey, entry]) => ({
        source: entry![0],
        target: props.target,
        sourceKey: entry![1],
        targetKey: targetKey,
        transforms: entry![2]
    }))
);
const modKeys = computed(() => Object.keys(props.target.targets));

// more js-powered hover
const modItemComponent = useTemplateRef('modItem');
const modKeyElements = computed(() => modKeys.value.map((key) => [key, useTemplateRef<HTMLDivElement>(key)] as const)); // no resource leak? should only run once anyway
// yeets all old mouse detection and gets new ones
let inefficientEffectScope = effectScope();
const hoverIds: number[] = [];
watch([modKeyElements, () => TileEditor.modulatorDrag.source !== null], () => {
    inefficientEffectScope.stop();
    for (const i of hoverIds) globalHoverCounter.delete(i);
    hoverIds.length = 0;
    if (TileEditor.modulatorDrag.source !== null) {
        inefficientEffectScope = effectScope();
        inefficientEffectScope.run(() => {
            for (const [key, el] of modKeyElements.value) {
                const hoverId = globalHoverId++;
                hoverIds.push(hoverId);
                const { isOutside } = useMouseInElement(el);
                watch(isOutside, (outside) => {
                    if (modItemComponent.value?.dragOpenDropdown && !outside && !props.target.connected(key)) {
                        // can only start hover over one thing at a time, this is fine
                        // hover counter only handles ending hover
                        TileEditor.modulatorDrag.target = props.target;
                        TileEditor.modulatorDrag.targetKey = key;
                        globalHoverCounter.add(hoverId);
                    } else globalHoverCounter.delete(hoverId);
                });
            }
        });
    }
});
</script>
<script lang="ts">
// ITS JANK TIME!!!
// need some sort of global state since vue reactivity lumps all the updates to the end of the tick
// race conditions bla bla one instance clears the drop target after another instance sets it to itself
// this bit clears the drop target only when there are 0 items hovered over globally
const globalHoverCounter = reactive(new Set<number>());
let globalHoverId = 0;
watch(() => globalHoverCounter.size, () => globalHoverCounter.size == 0 ? TileEditor.modulatorDrag.target = null : void 0);
</script>

<template>
    <ModulatorItem type="target" ref="modItem" :label="props.label" :tile="props.target.tile" :connections="connections" :modulation-keys="modKeys">
        <template v-for="key in modKeys" v-slot:[key]>
            <div :class="{
                targetDrop: true,
                targetDropAccepting: TileEditor.modulatorDrag.target === props.target && TileEditor.modulatorDrag.targetKey == key,
                targetDropFull: props.target.connected(key)
            }" :ref="key" :title="props.target.connected(key) ? 'Target is already connected' : 'Drag source here to create a connection'"></div>
        </template>
    </ModulatorItem>
</template>

<style scoped>
.targetDrop {
    width: 48px;
    height: 32px;
    border-radius: 8px;
    background-color: var(--logo-blue);
    background-image: url(@/img/arrow-left-dark.svg), url(@/img/arrow-right-dark.svg);
    background-position: 10% 50%, 90% 50%;
    background-size: 40% 40%;
    background-repeat: no-repeat;
    align-content: center;
    justify-items: center;
    transition: 200ms ease background-position;
}

.targetDrop::after {
    display: block;
    content: ' ';
    min-width: 12px;
    min-height: 12px;
    border-radius: 50%;
    background-color: color-mix(in hsl, var(--logo-blue) 80%, black 20%);
    transition: 200ms ease min-width, 200ms ease min-height, 100ms linear background-color;
}

.targetDropAccepting,
.targetDropFull {
    background-position: -10% 50%, 110% 50%;
}

.targetDropAccepting::after,
.targetDropFull::after {
    min-width: 24px;
    min-height: 24px;
}

.targetDropFull {
    cursor: no-drop;
}

.targetDropFull::after {
    background-color: var(--logo-green);
}
</style>