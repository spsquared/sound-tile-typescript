<script setup lang="ts">
import { computed } from 'vue';
import TileEditor from '@/visualizer/editor';
import Modulation from '@/visualizer/modulation';
import ModulatorItem from './ModulatorItem.vue';

const props = defineProps<{
    label: string
    source: Modulation.Source<any>
}>();

const connections = computed<Modulation.Connection[]>(() =>
    Object.entries(props.source.connectedTargets).flatMap(([sourceKey, targets]) => targets.map(([target, targetKey, transforms]) => ({
        source: props.source,
        target: target,
        sourceKey: sourceKey,
        targetKey: targetKey,
        transforms: transforms
    })))
);
const modKeys = computed(() => Object.keys(props.source.sources));

function startDrag(key: string) {
    TileEditor.startModulatorDrag(props.source, key);
}
</script>

<template>
    <ModulatorItem type="source" :label="props.source.tile?.label ?? props.label" :tile="props.source.tile" :connections="connections" :modulation-keys="modKeys">
        <template v-for="key in modKeys" v-slot:[key]>
            <div class="sourceDrag" title="Drag to a target to create a connection" @mousedown="startDrag(key)"></div>
        </template>
    </ModulatorItem>
</template>

<style scoped>
.sourceDrag {
    width: 48px;
    height: 32px;
    border-radius: 8px;
    background-color: var(--logo-green);
    cursor: grab;
    align-content: center;
    justify-items: center;
}

.sourceDrag::after {
    display: block;
    content: ' ';
    min-width: 16px;
    min-height: 16px;
    border-radius: 50%;
    background-color: color-mix(in hsl, var(--logo-green) 80%, black 20%);
    transition: 200ms ease min-width, 200ms ease min-height;
}

.sourceDrag:hover::after {
    min-width: 24px;
    min-height: 24px;
}
</style>