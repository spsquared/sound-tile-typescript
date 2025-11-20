<script setup lang="ts">
import { computed, onMounted, ref, useTemplateRef } from 'vue';
import DraggableWindow from '@/components/DraggableWindow.vue';
import { VisualizerRenderer } from '@/visualizer/visualizerRenderer';

const canvas = useTemplateRef('canvas');

const forceOpenWindow = computed({
    get: () => VisualizerRenderer.state.debugInfo > 0,
    set: (_) => undefined
});

// note that this memory instrumentation only tracks what is accessible in the JS interpreter
// stuff like audio data, canvas textures, and render layers are not tracked but contribute to memory use

const heapSize = ref(0);
const memoryHistory = ref<number[]>([]);
const allocationRateHistory = ref<number[]>([]);

onMounted(() => {
    if (canvas.value === null) {
        console.warn('uh oh canvas didnt load - if you\'re not profiling performance it doesn\'t matter');
        return;
    }
    canvas.value.width = 200 * window.devicePixelRatio;
    canvas.value.height = 80 * window.devicePixelRatio;
    const ctx = canvas.value.getContext('2d')!;
    if ('memory' in performance) {
        const height = canvas.value.height; // buh types
        setInterval(() => {
            const lastHeapSize = heapSize.value;
            heapSize.value = (performance as any).memory.usedJSHeapSize / 1048576;
            memoryHistory.value.push(heapSize.value);
            const allocRate = heapSize.value - lastHeapSize;
            allocationRateHistory.value.push(Math.max(0, allocRate)); // GC doesn't count
            while (memoryHistory.value.length > 100) {
                memoryHistory.value.shift();
                allocationRateHistory.value.shift();
            }
            if (VisualizerRenderer.state.debugInfo > 0) {
                ctx.reset();
                ctx.font = `${10 * window.devicePixelRatio}px monospace`;
                const min = Math.min(...memoryHistory.value);
                const max = Math.max(...memoryHistory.value);
                ctx.fillStyle = 'white';
                ctx.textBaseline = 'top';
                ctx.fillText(`${max.toFixed(2)}MB`, 0, 0);
                ctx.textBaseline = 'bottom';
                ctx.fillText(`${min.toFixed(2)}MB`, 0, height);
                ctx.transform(200 / 99, 0, 0, -height + 20, 0, height - 10);
                const arr = memoryHistory.value;
                ctx.lineWidth = 2;
                ctx.lineJoin = 'bevel';
                ctx.lineCap = 'square';
                ctx.strokeStyle = 'cyan';
                ctx.beginPath();
                ctx.moveTo(0, arr[0] / max);
                const range = max - min;
                for (let i = 0; i < arr.length; i++) {
                    ctx.lineTo(i, (arr[i] - min) / range);
                }
                ctx.resetTransform();
                ctx.stroke();
            }
        }, 100);
    } else {
        ctx.font = '18px monospace';
        ctx.fillStyle = 'red';
        ctx.fillText('Memory profiling not available', 0, 0);
    }
});
</script>

<template>
    <DraggableWindow title="Memory usage" v-model="forceOpenWindow" :min-width="200" :min-height="110">
        <canvas ref="canvas" width="200" height="80" style="width: 200px; height: 80px;"></canvas>
        <div style="font-size: 10px;">Memory: {{ heapSize.toFixed(2) }}MB ({{(memoryHistory.reduce((p, c) => p + c, 0) / memoryHistory.length).toFixed(2)}}MB)</div>
        <div style="font-size: 10px;">Alloc. rate: {{(allocationRateHistory.reduce((p, c) => p + c, 0) / allocationRateHistory.length).toFixed(2)}}MB/s</div>
    </DraggableWindow>
</template>

<style scoped></style>