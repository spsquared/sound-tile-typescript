import { reactive, ref, Ref, WatchStopHandle } from 'vue';
import { watchThrottled } from '@vueuse/core';
import { cloneDeep } from 'lodash-es';
import Playback from '../playback';
import perfMetrics from '../drawLoop';
import type VisualizerRenderInstance from './visualizerRenderInstance';
import VisualizerData from '../visualizerData';

// the renderer is code-split to avoid bundling it twice (and thus bundling chroma-js 3 times)
// we must be careful what we import to avoid bundling a bunch of dead/redundant code with the async imports
const renderInstance = import('./visualizerRenderInstance');

export type VisualizerSettingsData = Omit<VisualizerData, 'buffer' | 'gain'>;

/**
 * A rendering container that accepts raw AnalyzerNode data and settings.
 */
export class VisualizerRenderer {
    /**Reactive data of visualizer, should be a reference to the same object used in the visualizer instance */
    readonly data: VisualizerSettingsData;
    readonly frameResult: Ref<VisualizerRendererFrameResults> = ref<VisualizerRendererFrameResults>({
        valueMax: 0,
        valueMin: 0,
        valueMinMaxDiff: 0,
        approximatePeak: 0,
        renderTime: 0,
        debugText: []
    });
    readonly canvas: OffscreenCanvas;
    private readonly renderer: Promise<VisualizerRenderInstance>;

    private readonly stopWatching: WatchStopHandle;

    constructor(data: VisualizerSettingsData, canvas: OffscreenCanvas) {
        this.data = reactive(data);
        this.canvas = canvas;
        this.renderer = renderInstance.then((res) => new res.default(this.canvas, cloneDeep({ ...this.data, buffer: undefined })));
        this.stopWatching = watchThrottled(this.data, async () => {
            // even though we're no longer using a worker, we still clone it to remove Vue proxies and improve performance
            (await this.renderer).updateData(cloneDeep({ ...this.data, buffer: undefined }));
        }, { deep: true, throttle: 50, leading: true, trailing: true });
    }

    async draw(buffer: Uint8Array | Float32Array | Uint8Array[]): Promise<VisualizerRendererFrameResults> {
        const renderer = await this.renderer;
        renderer.playing = Playback.playing.value;
        renderer.debugInfo = perfMetrics.debugLevel.value;
        await renderer.draw(buffer);
        return this.frameResult.value = renderer.frameResult;
    }
    async resize(w: number, h: number): Promise<void> {
        (await this.renderer).resize(w, h);
    }

    destroy(): void {
        this.stopWatching();
    }
}

// quite limited in terms of modulation options but it'll do
export type VisualizerRendererFrameResults = {
    valueMax: number
    valueMin: number
    valueMinMaxDiff: number
    approximatePeak: number
    renderTime: number
    debugText: string[]
}
