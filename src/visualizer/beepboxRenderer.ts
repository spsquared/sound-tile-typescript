import { reactive, ref, Ref, WatchStopHandle } from 'vue';
import { watchThrottled } from '@vueuse/core';
import { cloneDeep } from 'lodash-es';
import Playback from './playback';
import perfMetrics from './drawLoop';
import BeepboxRenderInstance from './beepboxRenderInstance';
import { BeepboxData } from './beepboxData';

// much of this is just a copy of visualizerRenderer.ts
// what are you gonna do about it? complain?

export type BeepboxSettingsData = BeepboxData; // idk nothing to omit

/**
 * A rendering container that accepts song data. Rendering is stateless and only depends on a time
 * input. Creates its own canvas as to not irreversibly break outside canvases.
 */
export abstract class BeepboxRenderer {
    abstract readonly isWorker: boolean;
    /**Reactive data of visualizer, should be a reference to the same object used in the visualizer instance */
    readonly data: BeepboxSettingsData;
    readonly frameResult: Ref<BeepboxRendererFrameResults> = ref<BeepboxRendererFrameResults>({
        renderTime: 0,
        debugText: []
    });
    readonly canvas: HTMLCanvasElement;

    private readonly stopWatching: WatchStopHandle;

    constructor(data: BeepboxSettingsData) {
        this.data = reactive(data);
        this.canvas = document.createElement('canvas');
        this.stopWatching = watchThrottled(this.data, () => this.updateData(), { deep: true, throttle: 50, leading: true, trailing: true });
    }

    abstract draw(time: number): Promise<BeepboxRendererFrameResults>
    abstract resize(w: number, h: number): void
    protected abstract updateData(): void

    destroy(): void {
        this.stopWatching();
    }
}

/**
 * Main rendering container that wraps a BeepboxRenderInstance in a web worker.
 */
export class BeepboxWorkerRenderer extends BeepboxRenderer {
    readonly isWorker: true = true;
    private readonly worker: Worker;

    constructor(data: BeepboxSettingsData) {
        super(data);
        this.worker = new Worker(new URL('./beepboxRenderInstance.ts', import.meta.url), { type: 'module' });
        // initialize worker with canvas immediately, this sets up communications as well
        const workerCanvas = this.canvas.transferControlToOffscreen();
        const cleanData = cloneDeep(this.data);
        this.worker.postMessage([workerCanvas, cleanData satisfies BeepboxSettingsData], [workerCanvas]);
        this.worker.onerror = (e) => {
            console.error(e.error);
            throw new Error(`Worker error: ${e.message} (${e.filename} ${e.lineno}:${e.colno})`);
        };
    }

    async draw(time: number): Promise<BeepboxRendererFrameResults> {
        this.frameResult.value = await this.postMessageWithAck('draw', 'drawResponse', {
            time: time,
            playing: Playback.playing.value,
            debug: perfMetrics.debugLevel.value
        });
        return this.frameResult.value;
    }
    resize(w: number, h: number): void {
        this.postMessage('resize', { w: w, h: h });
    }
    protected updateData(): void {
        const clean = cloneDeep(this.data);
        this.postMessage('settings', { data: clean satisfies BeepboxSettingsData });
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
    }
}

/**
 * Fallback rendering container used when web workers are unavailable.
 */
export class BeepboxFallbackRenderer extends BeepboxRenderer {
    readonly isWorker: false = false;
    private readonly renderer: BeepboxRenderInstance;

    constructor(data: BeepboxSettingsData) {
        super(data);
        this.renderer = new BeepboxRenderInstance(this.canvas.transferControlToOffscreen(), cloneDeep(this.data));
    }

    async draw(time: number): Promise<BeepboxRendererFrameResults> {
        this.renderer.playing = Playback.playing.value;
        this.renderer.debugInfo = perfMetrics.debugLevel.value;
        this.renderer.draw(time);
        return this.frameResult.value = this.renderer.frameResult;
    }
    resize(w: number, h: number): void {
        this.renderer.resize(w, h);
    }
    protected updateData(): void {
        this.renderer.updateData(cloneDeep(this.data));
    }

    destroy(): void {
        super.destroy();
    }
}

// quite limited in terms of modulation options but it'll do
export type BeepboxRendererFrameResults = {
    renderTime: number
    debugText: string[]
}

export type RendererMessageData = {
    type: 'draw'
    time: number
    playing: boolean
    debug: 0 | 1 | 2
} | ({
    type: 'drawResponse'
} & BeepboxRendererFrameResults) | {
    type: 'resize'
    w: number
    h: number
} | {
    type: 'settings',
    data: BeepboxSettingsData
} | {
    type: 'stop'
};
export interface RendererMessageEvent extends MessageEvent {
    readonly data: RendererMessageData
}
