<script setup lang="ts">
import { computed } from 'vue';
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
</script>

<template>
    <ModulatorItem :label="props.label" :connections="connections">
        <div class="sourceDrag"></div>
    </ModulatorItem>
</template>

<style scoped>
.sourceDrag {
    width: 32px;
    height: 24px;
    background-color: var(--logo-green);
    border-radius: 6px;
    cursor: grab;
}
</style>