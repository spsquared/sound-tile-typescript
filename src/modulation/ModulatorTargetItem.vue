<script setup lang="ts">
import { computed, inject, ShallowRef, watch } from 'vue';
import TileEditor from '@/visualizer/editor';
import Modulation from '@/visualizer/modulation';
import ModulatorItem from './ModulatorItem.vue';

const props = defineProps<{
    target: Modulation.Target<any>
    noIdentify?: boolean
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
const hoveredElement = inject<ShallowRef<Element | null>>('modulatorHoveredElement');
if (hoveredElement === undefined) throw new Error('ModulatorTargetItem missing modulatorHoveredElement injection!');
// function ref because template ref stopped working for some reason, honestly I have no idea the template ref stuff didn't change and it borked
const modKeyElements: Record<string, HTMLDivElement | null> = {};
const hoverId = globalHoverId++;
watch([hoveredElement, () => TileEditor.modulatorDrag.source], () => {
    if (TileEditor.modulatorDrag.source === null) {
        globalHoverCounter.delete(hoverId);
        // clearing of "target" field handled by TileEditor class
        return;
    }
    // hover counter tracks entire target items, when no target items are hovered it resets
    // the item itself will only have one thing hovered at a time anyway, so no point assigning each key an id
    for (const key in modKeyElements) {
        const el = modKeyElements[key];
        if (hoveredElement.value?.isSameNode(el)) {
            globalHoverCounter.add(hoverId);
            TileEditor.modulatorDrag.target = props.target;
            TileEditor.modulatorDrag.targetKey = key;
            return;
        }
    }
    // no hover found
    globalHoverCounter.delete(hoverId);
    if (globalHoverCounter.size == 0) TileEditor.modulatorDrag.target = null;
});
</script>
<script lang="ts">
// ITS JANK TIME!!!
// need some sort of global state since vue reactivity lumps all the updates to the end of the tick
// race conditions bla bla one instance clears the drop target after another instance sets it to itself
// this bit clears the drop target only when there are 0 items hovered over globally
const globalHoverCounter = new Set<number>();
let globalHoverId = 0;
</script>

<template>
    <ModulatorItem type="target" :label="props.target.tile?.label ?? props.target.label" :tile="props.target.tile" :connections="connections" :modulation-keys="modKeys" :no-identify="props.noIdentify">
        <template v-for="key in modKeys" #[key]>
            <div :class="{
                targetDrop: true,
                targetDropAccepting: TileEditor.modulatorDrag.target === props.target && TileEditor.modulatorDrag.targetKey == key,
                targetDropFull: props.target.connected(key)
            }" :ref="(el) => modKeyElements[key] = el as HTMLDivElement | null" :title="props.target.connected(key) ? 'Target is already connected' : 'Drag source here to create a connection'"></div>
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