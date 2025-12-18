import Visualizer from "./visualizer";
import BeepboxVisualizer from "./beepbox";
import { Ref, ref } from "vue";

// last 10 seconds are tracked as opposed to just the last 1 second that visualizers track
const perfMetrics: {
    fps: number
    readonly frames: number[]
    readonly fpsHistory: number[]
    readonly jsTimingHistory: number[]
    readonly frameTimingHistory: number[]
    readonly debugLevel: Ref<0 | 1 | 2>
} = {
    fps: 0,
    frames: [],
    fpsHistory: [],
    jsTimingHistory: [],
    frameTimingHistory: [],
    debugLevel: ref(0)
};
window.addEventListener('load', async () => {
    while (true) {
        // gpu (browser thread) can block requestAnimationFrame even if js can run, we measure that too
        const frameStart = performance.now();
        // requestAnimationFrame only used to control the speed of animation because drawing is async
        await new Promise<void>((resolve) => {
            if (!document.hidden) requestAnimationFrame(() => resolve());
            else setTimeout(() => resolve(), 100);
        });
        const jsStart = performance.now();
        if (!document.hidden) {
            Visualizer.draw();
            BeepboxVisualizer.draw();
        }
        const end = performance.now();
        perfMetrics.frames.push(end);
        perfMetrics.jsTimingHistory.push(end - jsStart);
        perfMetrics.frameTimingHistory.push(end - frameStart);
        while (perfMetrics.frames[0] + 10000 <= end) {
            perfMetrics.frames.shift();
            perfMetrics.jsTimingHistory.shift();
            perfMetrics.frameTimingHistory.shift();
            perfMetrics.fpsHistory.shift();
        }
        // measure fps from the last 1 second
        const fpsCutoff = end - 1000;
        perfMetrics.fps = perfMetrics.fpsHistory.length - Math.max(0, perfMetrics.frames.findIndex((t) => t > fpsCutoff));
        perfMetrics.fpsHistory.push(perfMetrics.fps);
    }
});
document.addEventListener('keydown', (e) => {
    if (e.key == '\\' && e.altKey && e.ctrlKey && !e.shiftKey && !e.metaKey) perfMetrics.debugLevel.value = (perfMetrics.debugLevel.value + 1) % 3 as any;
}, { passive: true });

export default perfMetrics;