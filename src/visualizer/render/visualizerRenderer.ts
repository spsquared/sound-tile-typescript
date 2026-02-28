import { reactive, ref, Ref, WatchStopHandle } from 'vue';
import { watchThrottled } from '@vueuse/core';
import { cloneDeep } from 'lodash-es';
import Playback from '../playback';
import perfMetrics from '../drawLoop';
import VisualizerRenderInstance from './visualizerRenderInstance';
import VisualizerData from '../visualizerData';

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
    private readonly renderer: VisualizerRenderInstance;

    private readonly stopWatching: WatchStopHandle;

    constructor(data: VisualizerSettingsData, canvas: OffscreenCanvas) {
        this.data = reactive(data);
        this.canvas = canvas;
        this.renderer = new VisualizerRenderInstance(this.canvas, cloneDeep({ ...this.data, buffer: undefined }));
        this.stopWatching = watchThrottled(this.data, () => {
            // even though we're no longer using a worker, we still clone it to remove Vue proxies and improve performance
            this.renderer.updateData(cloneDeep({ ...this.data, buffer: undefined }));
        }, { deep: true, throttle: 50, leading: true, trailing: true });
    }

    draw(buffer: Uint8Array | Float32Array | Uint8Array[]): VisualizerRendererFrameResults {
        this.renderer.playing = Playback.playing.value;
        this.renderer.debugInfo = perfMetrics.debugLevel.value;
        this.renderer.draw(buffer);
        return this.frameResult.value = this.renderer.frameResult;
    }
    resize(w: number, h: number): void {
        this.renderer.resize(w, h);
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
