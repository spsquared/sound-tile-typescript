<script setup lang="ts">
import { computed, onMounted, reactive, ref, useTemplateRef } from 'vue';
import perfMetrics from '@/visualizer/drawLoop';
import DraggableWindow from '@/components/DraggableWindow.vue';

const fpsCanvas = useTemplateRef('fpsCanvas');
const timingsCanvas = useTemplateRef('timingsCanvas');
const memCanvas = useTemplateRef('memCanvas');

const memoryProfilingAvailable = 'memory' in performance;

function resizeCanvas(canvas: HTMLCanvasElement) {
    canvas.width = 280 * window.devicePixelRatio;
    canvas.height = 60 * window.devicePixelRatio;
}
function setupCanvas(canvas: HTMLCanvasElement) {
    resizeCanvas(canvas);
    return canvas.getContext('2d') as CanvasRenderingContext2D;
}

const forceOpenWindow = computed({
    get: () => perfMetrics.debugLevel.value > 0,
    set: (_) => void (0)
});

const avg = (arr: number[]) => arr.reduce((p, c) => p + c, 0) / arr.length;

const fpsVal = reactive([0, 0, 0, 0]);
const jsTimingsVal = reactive([0, 0, 0, 0]);
const totalTimingsVal = reactive([0, 0, 0, 0]);
const overheadTimingsVal = reactive([0, 0, 0, 0]);
// note that this memory instrumentation only tracks what is accessible in the JS interpreter
// stuff like audio data, canvas textures, and render layers are not tracked but contribute to memory use
const heapSizeVal = ref(0);
const memoryAvg = ref(0);
const allocationRateAvg = ref(0);

onMounted(() => {
    let canvasFailed = false;
    const canvases = new Set<HTMLCanvasElement>();
    const frameCbs = new Set<() => any>();
    if (fpsCanvas.value !== null) {
        const canvas = fpsCanvas.value;
        const ctx = setupCanvas(canvas);
        canvases.add(canvas);
        frameCbs.add(() => {
            if (perfMetrics.debugLevel.value > 0 && !document.hidden) {
                ctx.reset();
                ctx.lineWidth = 2;
                ctx.lineJoin = 'bevel';
                ctx.lineCap = 'round';
                ctx.strokeStyle = 'lime';
                // last 10 seconds is drawn, and spacing is uneven to accurately present that
                // lines are also flat to avoid big linear interpolation
                // max will also increase to show higher fps
                const max = Math.ceil(Math.max(60, ...perfMetrics.fpsHistory) / 5) * 5; // quantized
                const now = performance.now();
                ctx.transform(-canvas.width / 10000, 0, 0, -(canvas.height - 2) / max, canvas.width, canvas.height - 1);
                ctx.beginPath();
                ctx.moveTo(10000, perfMetrics.fpsHistory[0]);
                for (let i = 1; i < perfMetrics.fpsHistory.length; i++) {
                    ctx.lineTo(now - perfMetrics.frames[i - 1], perfMetrics.fpsHistory[i]);
                    ctx.lineTo(now - perfMetrics.frames[i], perfMetrics.fpsHistory[i]);
                }
                ctx.resetTransform();
                ctx.stroke();
                ctx.fillStyle = 'white';
                ctx.font = `${10 * window.devicePixelRatio}px monospace`;
                ctx.textBaseline = 'top';
                ctx.fillText(`${max}fps`, 0, 0);
                if (max > 60) {
                    // reference point for 60fps
                    const y = canvas.height * (1 - 60 / max);
                    ctx.globalAlpha = Math.min(1, y / 10 / window.devicePixelRatio);
                    ctx.globalCompositeOperation = 'destination-over';
                    ctx.lineWidth = 1;
                    ctx.strokeStyle = 'white';
                    ctx.setLineDash([5, 5]);
                    ctx.beginPath();
                    ctx.moveTo(0, y);
                    ctx.lineTo(canvas.width, y);
                    ctx.stroke();
                    ctx.globalCompositeOperation = 'source-over';
                    ctx.fillText('60fps', 0, y);
                    ctx.globalAlpha = 1;
                }
            }
            fpsVal[0] = perfMetrics.fps;
            fpsVal[1] = avg(perfMetrics.fpsHistory);
            fpsVal[2] = Math.min(...perfMetrics.fpsHistory);
            fpsVal[3] = Math.max(...perfMetrics.fpsHistory);
        });
    } else canvasFailed = true;
    if (timingsCanvas.value !== null) {
        const canvas = timingsCanvas.value;
        const ctx = setupCanvas(canvas);
        canvases.add(canvas);
        const timingGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        timingGradient.addColorStop(0, '#F0F');
        timingGradient.addColorStop(0.1, '#F00');
        timingGradient.addColorStop(0.25, '#F00');
        timingGradient.addColorStop(0.4, '#FF0');
        timingGradient.addColorStop(0.7, '#0F0');
        timingGradient.addColorStop(1, '#0F0');
        frameCbs.add(() => {
            if (perfMetrics.debugLevel.value > 0 && !document.hidden) {
                ctx.reset();
                ctx.lineWidth = 1;
                ctx.lineJoin = 'bevel';
                ctx.lineCap = 'round';
                // 30/60fps reference lines
                ctx.strokeStyle = '#FFF9';
                ctx.setLineDash([5, 5]);
                ctx.beginPath();
                ctx.moveTo(0, canvas.height * 0.4);
                ctx.lineTo(canvas.width, canvas.height * 0.4);
                ctx.moveTo(0, canvas.height * 0.7);
                ctx.lineTo(canvas.width, canvas.height * 0.7);
                ctx.stroke();
                ctx.lineWidth = 2;
                ctx.strokeStyle = timingGradient;
                ctx.setLineDash([]);
                // same last-10-seconds and flat-lines thing applies here
                // big copy-paste oof
                const max = 50;
                const now = performance.now();
                ctx.transform(-canvas.width / 10000, 0, 0, -(canvas.height - 2) / max, canvas.width, canvas.height - 1);
                ctx.beginPath();
                let v = Math.min(max, perfMetrics.jsTimingHistory[0]);
                ctx.moveTo(10000, v);
                ctx.lineTo(now - perfMetrics.frames[0], v);
                for (let i = 1; i < perfMetrics.jsTimingHistory.length; i++) {
                    const v = Math.min(max, perfMetrics.jsTimingHistory[i]);
                    ctx.lineTo(now - perfMetrics.frames[i - 1], v);
                    ctx.lineTo(now - perfMetrics.frames[i], v);
                }
                v = Math.min(max, perfMetrics.frameTimingHistory[0]);
                ctx.moveTo(10000, v);
                ctx.lineTo(now - perfMetrics.frames[0], v);
                for (let i = 1; i < perfMetrics.frameTimingHistory.length; i++) {
                    const v = Math.min(max, perfMetrics.frameTimingHistory[i]);
                    ctx.lineTo(now - perfMetrics.frames[i - 1], v);
                    ctx.lineTo(now - perfMetrics.frames[i], v);
                }
                ctx.resetTransform();
                ctx.stroke();
                // 30/60fps and 50ms text
                ctx.fillStyle = 'white';
                ctx.font = `${10 * window.devicePixelRatio}px monospace`;
                ctx.textBaseline = 'top';
                ctx.fillText('50ms (20fps)', 0, 0);
                ctx.fillText('33ms (30fps)', 0, canvas.height * 0.4);
                ctx.fillText('16ms (60fps)', 0, canvas.height * 0.7);
            }
            jsTimingsVal[0] = perfMetrics.jsTimingHistory.at(-1) ?? 0;
            jsTimingsVal[1] = avg(perfMetrics.jsTimingHistory);
            jsTimingsVal[2] = Math.min(...perfMetrics.jsTimingHistory);
            jsTimingsVal[3] = Math.max(...perfMetrics.jsTimingHistory);
            totalTimingsVal[0] = perfMetrics.frameTimingHistory.at(-1) ?? 0;
            totalTimingsVal[1] = avg(perfMetrics.frameTimingHistory);
            totalTimingsVal[2] = Math.min(...perfMetrics.frameTimingHistory);
            totalTimingsVal[3] = Math.max(...perfMetrics.frameTimingHistory);
            const overhead = perfMetrics.frameTimingHistory.map((f, i) => f - perfMetrics.jsTimingHistory[i]).filter((n) => !isNaN(n));
            overheadTimingsVal[0] = overhead.at(-1) ?? 0;
            overheadTimingsVal[1] = avg(overhead);
            overheadTimingsVal[2] = Math.min(...overhead);
            overheadTimingsVal[3] = Math.max(...overhead);
        });
    } else canvasFailed = true;
    if (memCanvas.value !== null) {
        const canvas = memCanvas.value;
        const ctx = setupCanvas(canvas);
        canvases.add(canvas);
        let lastHeapSize = 0;
        const memoryHistory: number[] = [];
        const allocationRateHistory: number[] = [];
        if (memoryProfilingAvailable) frameCbs.add(() => {
            const heapSize = (performance as any).memory.usedJSHeapSize / 1048576;
            memoryHistory.push(heapSize);
            const allocRate = heapSize - lastHeapSize;
            lastHeapSize = heapSize;
            allocationRateHistory.push(Math.max(0, allocRate)); // remove changes from GC
            while (memoryHistory.length > 100) {
                memoryHistory.shift();
                allocationRateHistory.shift();
            }
            if (perfMetrics.debugLevel.value > 0 && !document.hidden) {
                ctx.reset();
                ctx.font = `${10 * window.devicePixelRatio}px monospace`;
                const min = Math.min(...memoryHistory);
                const max = Math.max(...memoryHistory);
                const range = max - min;
                const arr = memoryHistory;
                ctx.lineWidth = 2;
                ctx.lineJoin = 'bevel';
                ctx.lineCap = 'square';
                ctx.strokeStyle = 'cyan';
                ctx.transform(canvas.width / 99, 0, 0, -(canvas.height - 24) / range, 0, canvas.height - 12);
                ctx.beginPath();
                ctx.moveTo(0, arr[0] - min);
                for (let i = 1; i < arr.length; i++) {
                    ctx.lineTo(i, arr[i] - min);
                }
                ctx.resetTransform();
                ctx.stroke();
                ctx.fillStyle = 'white';
                ctx.textBaseline = 'top';
                ctx.fillText(`${max.toFixed(2)}MB`, 0, 0);
                ctx.textBaseline = 'bottom';
                ctx.fillText(`${min.toFixed(2)}MB`, 0, canvas.height);
            }
            heapSizeVal.value = heapSize;
            memoryAvg.value = avg(memoryHistory);
            allocationRateAvg.value = avg(allocationRateHistory);
        });
    } else canvasFailed = true;
    if (canvasFailed) console.error('A performance profiling canvas failed to initialize!');
    window.addEventListener('resize', () => {
        for (const canvas of canvases) resizeCanvas(canvas);
    }, { passive: true });
    setInterval(() => {
        for (const cb of frameCbs) cb();
    }, 100);
});
</script>

<template>
    <DraggableWindow :title="'Performance | L' + perfMetrics.debugLevel.value" v-model="forceOpenWindow" :min-width="288" :min-height="344" overflow="clip" close-on-click-out>
        <div class="wrapper">
            <div class="header">-- Framerate --</div>
            <canvas ref="fpsCanvas"></canvas>
            <div>FPS: {{ `${fpsVal[0]} (${fpsVal[1].toFixed(2)} / [${fpsVal[2]} - ${fpsVal[3]}])` }}</div>
            <div class="header">-- Timings --</div>
            <canvas ref="timingsCanvas"></canvas>
            <div>Frame: {{ `${totalTimingsVal[0].toFixed(1)}ms (${totalTimingsVal[1].toFixed(1)} / [${totalTimingsVal[2].toFixed(1)} - ${totalTimingsVal[3].toFixed(1)}])` }}</div>
            <div>JS: {{ `${jsTimingsVal[0].toFixed(1)}ms (${jsTimingsVal[1].toFixed(1)} / [${jsTimingsVal[2].toFixed(1)} - ${jsTimingsVal[3].toFixed(1)}])` }}</div>
            <div>Over: {{ `${overheadTimingsVal[0].toFixed(1)}ms (${overheadTimingsVal[1].toFixed(1)} / [${overheadTimingsVal[2].toFixed(1)} - ${overheadTimingsVal[3].toFixed(1)}])` }}</div>
            <div class="header">-- Memory --</div>
            <canvas ref="memCanvas"></canvas>
            <template v-if="memoryProfilingAvailable">
                <div>Heap size: {{ heapSizeVal.toFixed(2) }}MB ({{ memoryAvg.toFixed(2) }}MB)</div>
                <div>Alloc. rate: {{ allocationRateAvg.toFixed(2) }}MB/s</div>
            </template>
            <div v-else style="color: red;">Memory profiling not available</div>
        </div>
    </DraggableWindow>
</template>

<style scoped>
.wrapper {
    padding: 4px 4px;
    user-select: none;
}

.header {
    margin: 4px 0px;
    font-size: 14px;
    text-align: center;
    background-color: #222;
}

.header:first-child {
    margin-top: 0px;
}

canvas {
    width: 280px;
    height: 60px;
}

div {
    font-size: 10px;
}
</style>