<script setup lang="ts">
import { useResizeObserver } from '@vueuse/core';
import { VisualizerTile } from '../tiles';
import BaseTile from './BaseTile.vue';
import { useTemplateRef } from 'vue';

const props = defineProps<{
    tile: VisualizerTile
}>();
const canvas = useTemplateRef('canvas');
useResizeObserver(canvas, (entries) => {
    // resize canvas
});
</script>

<template>
    <BaseTile :tile="props.tile">
        <template v-slot:content>
            <canvas class="visualizerCanvas" ref="canvas"></canvas>
            oof visaulsideer tile
        </template>
    </BaseTile>
</template>

<style scoped>
.visualizerCanvas {
    position: absolute;
    top: 0px;
    left: 0px;
    background-color: orange;
}
</style>