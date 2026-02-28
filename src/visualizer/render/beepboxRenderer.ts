import { reactive, ref, Ref, WatchStopHandle } from 'vue';
import { watchThrottled } from '@vueuse/core';
import { cloneDeep } from 'lodash-es';
import { AsyncLock } from '@/components/lock';
import Playback from '../playback';
import perfMetrics from '../drawLoop';
import BeepboxRenderInstance, { createBeepboxRenderInstance } from './beepboxRenderInstance';
import BeepboxData from '../beepboxData';

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
    readonly loadResult: Ref<BeepboxRendererLoadResults> = ref<BeepboxRendererLoadResults>({
        songLength: 0,
        loadTime: 0
    });

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
    private readonly responsePromises: Map<RendererMessageData['type'], ((value: RendererMessageData) => void)> = new Map();
    private readonly responseLocks: Map<RendererMessageData['type'], AsyncLock> = new Map();

    constructor(data: BeepboxSettingsData) {
        super(data);
        this.worker = new Worker(new URL('./beepboxRenderInstance.ts', import.meta.url), { type: 'module' });
        // initialize worker with canvas immediately, this sets up communications as well
        const workerCanvas = this.canvas.transferControlToOffscreen();
        const cleanData = cloneDeep(this.data);
        this.worker.postMessage([workerCanvas, cleanData satisfies BeepboxSettingsData], [workerCanvas]);
        this.worker.addEventListener('error', (e) => {
            console.error(e.error);
            throw new Error(`Worker error: ${e.message} (${e.filename} ${e.lineno}:${e.colno})`);
        });
        this.worker.addEventListener('message', (e: RendererMessageEvent) => {
            const resolve = this.responsePromises.get(e.data.type);
            if (resolve !== undefined) resolve(e.data);
        });
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
        this.postMessageWithAck('settings', 'loadResult', { data: clean satisfies BeepboxSettingsData }).then((res) => {
            this.loadResult.value = res;
        });
    }

    private postMessage<Event extends RendererMessageData['type']>(e: Event, data: Omit<Extract<RendererMessageData, { type: Event }>, 'type'>, transfers?: Transferable[]): void {
        this.worker.postMessage({ type: e, ...data }, { transfer: transfers });
    }
    private async postMessageWithAck<Event extends RendererMessageData['type'], ResEvent extends RendererMessageData['type']>(e: Event, res: ResEvent, data: Omit<Extract<RendererMessageData, { type: Event }>, 'type'>, transfers?: Transferable[]): Promise<Extract<RendererMessageData, { type: ResEvent }>> {
        if (!this.responseLocks.has(e)) this.responseLocks.set(e, new AsyncLock());
        const lock = this.responseLocks.get(e)!;
        await lock.acquire();
        return await new Promise((resolve, reject) => {
            if (this.responsePromises.has(res)) reject(`Previous response for ${res} not recieved`);
            this.responsePromises.set(res, (dat) => {
                resolve(dat as any);
                this.responsePromises.delete(res);
                lock.release();
            });
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
export class BeepboxFallbackRenderer extends BeepboxRenderer {
    readonly isWorker: false = false;
    private readonly renderer: BeepboxRenderInstance;

    constructor(data: BeepboxSettingsData) {
        super(data);
        this.renderer = createBeepboxRenderInstance(this.canvas.transferControlToOffscreen(), cloneDeep(this.data));
    }

    async draw(time: number): Promise<BeepboxRendererFrameResults> {
        this.renderer.playing = Playback.playing.value;
        this.renderer.debugInfo = perfMetrics.debugLevel.value;
        await this.renderer.draw(time);
        return this.frameResult.value = this.renderer.frameResult;
    }
    resize(w: number, h: number): void {
        this.renderer.resize(w, h);
    }
    protected updateData(): void {
        this.loadResult.value = this.renderer.updateData(cloneDeep(this.data));
    }

    destroy(): void {
        super.destroy();
    }
}

export type BeepboxRendererFrameResults = {
    renderTime: number
    debugText: string[]
}
export type BeepboxRendererLoadResults = {
    songLength: number
    loadTime: number
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
    type: 'settings'
    data: BeepboxSettingsData
} | ({
    type: 'loadResult'
} & BeepboxRendererLoadResults) | {
    type: 'stop'
};

export interface RendererMessageEvent extends MessageEvent {
    readonly data: RendererMessageData
}
