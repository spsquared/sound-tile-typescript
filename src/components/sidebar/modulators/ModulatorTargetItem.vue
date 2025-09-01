<script setup lang="ts">
import { computed } from 'vue';
import Modulation from '@/visualizer/modulation';
import ModulatorItem from './ModulatorItem.vue';

const props = defineProps<{
    label: string
    target: Modulation.Target<any>
}>();

const connections = computed<Modulation.Connection[]>(() =>
    Object.entries(props.target.connectedSources.value).filter(([_, entry]) => entry !== null).map(([targetKey, entry]) => ({
        source: entry![0],
        target: props.target,
        sourceKey: entry![1],
        targetKey: targetKey,
        transforms: entry![2]
    }))
);
</script>

<template>
    <ModulatorItem :label="props.label" :connections="connections"></ModulatorItem>
</template>

<style scoped></style>