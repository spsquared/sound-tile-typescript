<script setup lang="ts">
import { throttledWatch, useElementSize } from '@vueuse/core';
import { VisualizerTile } from '../tiles';
import BaseTile from './BaseTile.vue';
import { useTemplateRef } from 'vue';

const props = defineProps<{
    tile: VisualizerTile
}>();
const canvas = useTemplateRef('canvas');
const { width: canvasWidth, height: canvasHeight } = useElementSize(canvas);
// guess I don't need my throttling code anymore
throttledWatch([canvasWidth, canvasHeight], () => {
    props.tile.resize(canvasWidth.value * devicePixelRatio, canvasHeight.value * devicePixelRatio);
}, { throttle: 20 });
</script>

<template>
    <BaseTile :tile="props.tile">
        <template v-slot:content>
            <canvas class="visualizerCanvas" ref="canvas"></canvas>
        </template>
        <template v-slot:options>
            TEST TEST TEST TEST
        </template>
    </BaseTile>
</template>

<style scoped>
.visualizerCanvas {
    position: absolute;
    top: 0px;
    left: 0px;
    width: 100%;
    height: 100%;
}
</style>