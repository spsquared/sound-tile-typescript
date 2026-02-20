import { reactive, ref, Ref, WatchStopHandle } from 'vue';
import { watchThrottled } from '@vueuse/core';
import { cloneDeep } from 'lodash-es';
import Playback from './playback';
import perfMetrics from './drawLoop';
import VisualizerRenderInstance from './visualizerRenderInstance';
import VisualizerData from './visualizerData';

export type VisualizerSettingsData = Omit<VisualizerData, 'buffer' | 'gain'>;

/**
 * A rendering container that accepts raw AnalyzerNode data and settings.
 * Creates its own canvas as to not irreversibly break outside canvases.
 */
export abstract class VisualizerRenderer {
    abstract readonly isWorker: boolean;
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
    readonly canvas: HTMLCanvasElement;

    private readonly stopWatching: WatchStopHandle;

    constructor(data: VisualizerSettingsData) {
        this.data = reactive(data);
        this.canvas = document.createElement('canvas');
        this.stopWatching = watchThrottled(this.data, () => this.updateData(), { deep: true, throttle: 50, leading: true, trailing: true });
    }

    abstract draw(buffer: Uint8Array | Float32Array | Uint8Array[]): Promise<VisualizerRendererFrameResults>
    abstract resize(w: number, h: number): void
    protected abstract updateData(): void

    destroy(): void {
        this.stopWatching();
    }
}

/**
 * Main rendering container that wraps a VisualizerRenderInstance in a web worker.
 */
export class VisualizerWorkerRenderer extends VisualizerRenderer {
    readonly isWorker: true = true;
    private readonly worker: Worker;

    constructor(data: VisualizerSettingsData) {
        super(data);
        this.worker = new Worker(new URL('./visualizerRenderInstance.ts', import.meta.url), { type: 'module' });
        // initialize worker with canvas immediately, this sets up communications as well
        const workerCanvas = this.canvas.transferControlToOffscreen();
        const cleanData = cloneDeep({ ...this.data, buffer: undefined });
        this.worker.postMessage([workerCanvas, cleanData satisfies VisualizerSettingsData], [workerCanvas]);
        this.worker.onerror = (e) => {
            console.error(e.error);
            throw new Error(`Worker error: ${e.message} (${e.filename} ${e.lineno}:${e.colno})`);
        }
    }

    async draw(buffer: Uint8Array | Float32Array | Uint8Array[]): Promise<VisualizerRendererFrameResults> {
        this.frameResult.value = await this.postMessageWithAck('draw', 'drawResponse', {
            buffer: buffer,
            playing: Playback.playing.value,
            debug: perfMetrics.debugLevel.value
        }, Array.isArray(buffer) ? buffer.map((b) => b.buffer) : [buffer.buffer]);
        return this.frameResult.value;
    }
    resize(w: number, h: number): void {
        this.postMessage('resize', { w: w, h: h });
    }
    protected updateData(): void {
        // even though typing is fine, object is passed in from outside and could have buffer properties
        const clean = cloneDeep({ ...this.data, buffer: undefined });
        this.postMessage('settings', { data: clean satisfies VisualizerSettingsData });
    }

    private postMessage<Event extends RendererMessageData['type']>(e: Event, data: Omit<Extract<RendererMessageData, { type: Event }>, 'type'>, transfers?: Transferable[]): void {
        this.worker.postMessage({ type: e, ...data }, { transfer: transfers });
    }
    private async postMessageWithAck<Event extends RendererMessageData['type'], ResEvent extends RendererMessageData['type']>(e: Event, res: ResEvent, data: Omit<Extract<RendererMessageData, { type: Event }>, 'type'>, transfers?: Transferable[]): Promise<Omit<Extract<RendererMessageData, { type: ResEvent }>, 'type'>> {
        return await new Promise((resolve) => {
            const listener = (e: RendererMessageEvent) => {
                if (e.data.type == res) {
                    resolve(e.data as any); // dont care, code is private anyway
                    this.worker.removeEventListener('message', listener);
                }
            };
            this.worker.addEventListener('message', listener);
            this.postMessage(e, data, transfers);
        });
    }

    destroy() {
        super.destroy();
        this.postMessage('stop', {});
        setTimeout(() => this.worker.terminate(), 10000);
    }
}

/**
 * Fallback rendering container used when web workers are unavailable.
 */
export class VisualizerFallbackRenderer extends VisualizerRenderer {
    readonly isWorker: false = false;
    private readonly renderer: VisualizerRenderInstance;

    constructor(data: VisualizerSettingsData) {
        super(data);
        this.renderer = new VisualizerRenderInstance(this.canvas.transferControlToOffscreen(), cloneDeep({ ...this.data, buffer: undefined }));
    }

    async draw(buffer: Uint8Array | Float32Array | Uint8Array[]): Promise<VisualizerRendererFrameResults> {
        this.renderer.playing = Playback.playing.value;
        this.renderer.debugInfo = perfMetrics.debugLevel.value;
        this.renderer.draw(buffer);
        return this.frameResult.value = this.renderer.frameResult;
    }
    resize(w: number, h: number): void {
        this.renderer.resize(w, h);
    }
    protected updateData(): void {
        this.renderer.updateData(cloneDeep({ ...this.data, buffer: undefined }));
    }

    destroy(): void {
        super.destroy();
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

export type RendererMessageData = {
    type: 'draw'
    buffer: Uint8Array | Float32Array | Uint8Array[]
    playing: boolean
    debug: 0 | 1 | 2
} | ({
    type: 'drawResponse'
} & VisualizerRendererFrameResults) | {
    type: 'resize'
    w: number
    h: number
} | {
    type: 'settings'
    data: VisualizerSettingsData
} | {
    type: 'stop'
};

export interface RendererMessageEvent extends MessageEvent {
    readonly data: RendererMessageData
}
