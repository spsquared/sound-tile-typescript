<script setup lang="ts">
import { computed } from 'vue';
import Modulation from '@/visualizer/modulation';
import ModulatorItem from './ModulatorItem.vue';

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
</script>

<template>
    <ModulatorItem :label="props.label" :connections="connections">
        <div class="targetDrop"></div>
    </ModulatorItem>
</template>

<style scoped>
.targetDrop {
    width: 32px;
    height: 24px;
    background-color: var(--logo-blue);
    border-radius: 6px;
}</style>