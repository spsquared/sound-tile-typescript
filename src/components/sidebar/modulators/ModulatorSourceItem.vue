<script setup lang="ts">
import { computed } from 'vue';
import Modulation from '@/visualizer/modulation';
import ModulatorItem from './ModulatorItem.vue';

const props = defineProps<{
    label: string
    source: Modulation.Source<any>
}>();

const connections = computed<Modulation.Connection[]>(() =>
    Object.entries(props.source.connectedTargets.value).flatMap(([sourceKey, targets]) => targets.map(([target, targetKey, transforms]) => ({
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
        <!-- idk the vital synthesizer interface knobbly things -->
        <div class="sourceDrag"></div>
    </ModulatorItem>
</template>

<style scoped>
.sourceDrag {
    width: 14px;
    height: 14px;
    background-color: #FF0099;
    border-radius: 50%;
}
</style>