import { reactive, ref, Ref, watch } from "vue";
import { VisualizerData } from "./visualizer";

const isInWorker = 'importScripts' in global;

type VisualizerSettingsData = Omit<VisualizerData, 'buffer' | 'gain'>;

/**
 * A rendering container that accepts raw AnalyzerNode data and settings.
 * Creates its own canvas as to not irreversibly break outside canvases.
 */
export abstract class VisualizerRenderer {
    /**Reactive data of visualizer, should be a reference to the same object used in the visualizer instance */
    readonly data: VisualizerSettingsData;
    readonly frameResult: Ref<VisualizerRendererFrameResults> = ref<VisualizerRendererFrameResults>({

    });
    readonly canvas: HTMLCanvasElement;

    constructor(data: VisualizerSettingsData) {
        this.data = reactive(data);
        this.canvas = document.createElement('canvas');
    }

    abstract draw(buf: Uint8Array | Float32Array | Uint8Array[]): Promise<void>

    abstract resize(w: number, h: number): void
}

/**
 * Main rendering container that wraps a VisualizerRenderInstance in a web worker.
 */
export class VisualizerWorkerRenderer extends VisualizerRenderer {
    private readonly worker: Worker;

    constructor(data: VisualizerSettingsData) {
        super(data);
        this.worker = new Worker(new URL('./visualizerRenderer.ts', import.meta.url), { type: 'module' });
        // initialize worker with canvas immediately, this sets up communications as well
        const workerCanvas = this.canvas.transferControlToOffscreen();
        this.worker.postMessage(workerCanvas, [workerCanvas]);
        this.worker.onmessage = (e: RendererMessageEvent) => {
            const listeners = this.messageListeners.get(e.data.type);
            if (listeners !== undefined) {
                for (const cb of listeners) cb(e.data);
            }
        };
        watch(this.data, () => this.updateData(), { deep: true });
    }

    async draw(buf: Uint8Array | Float32Array | Uint8Array[]): Promise<void> {
        this.frameResult.value = await this.postMessageWithAck('draw', 'drawResponse', {});
    }

    resize(w: number, h: number): void {
        this.postMessage('resize', { w: w, h: h });
    }

    private updateData(): void {
        this.postMessage('settings', { data: this.data });
    }

    private readonly messageListeners: Map<string, Set<(data: Omit<RendererMessageData, 'type'>) => any>> = new Map();
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
    private onMessage<Event extends RendererMessageData['type']>(e: Event, cb: (data: Omit<Extract<RendererMessageData, { type: Event }>, 'type'>) => any): void {
        if (!this.messageListeners.has(e)) this.messageListeners.set(e, new Set());
        this.messageListeners.get(e)?.add(cb as any); // dont care, code is private anyway
    }
    private offMessage<Event extends RendererMessageData['type']>(e: Event, cb: (data: Omit<Extract<RendererMessageData, { type: Event }>, 'type'>) => any): void {
        if (!this.messageListeners.has(e)) return;
        this.messageListeners.get(e)?.delete(cb as any); // dont care, code is private anyway
    }
}

/**
 * Fallback rendering container used when web workers are unavailable.
 */
export class VisualizerFallbackRenderer extends VisualizerRenderer {
    private readonly renderer: VisualizerRenderInstance;

    constructor(data: VisualizerSettingsData) {
        super(data);
        this.renderer = new VisualizerRenderInstance(this.canvas.transferControlToOffscreen());
    }

    async draw(buf: Uint8Array | Float32Array | Uint8Array[]): Promise<void> {
        
    }

    resize(w: number, h: number): void {
        this.renderer.resize(w, h);
    }
}

export class VisualizerRendererFrameResults {

}

/**
 * Renderer class used by both the worker renderer and the fallback renderer.
 */
class VisualizerRenderInstance {
    readonly canvas: OffscreenCanvas;
    readonly ctx: OffscreenCanvasRenderingContext2D;

    constructor(canvas: OffscreenCanvas) {
        this.canvas = canvas;
        this.ctx = this.canvas.getContext('2d')!;
    }

    draw(buf: Uint8Array | Float32Array | Uint8Array[]): void {
    }

    resize(w: number, h: number): void {
        this.canvas.width = w;
        this.canvas.height = h;
    }
}

type RendererMessageData = {
    type: 'draw'
} | ({
    type: 'drawResponse'
} & VisualizerRendererFrameResults) | {
    type: 'resize'
    w: number
    h: number
} | {
    type: 'settings',
    data: VisualizerSettingsData
};
interface RendererMessageEvent extends MessageEvent {
    readonly data: RendererMessageData
}

// wrap a visualizer render instance for communication
if (isInWorker) {
    onmessage = (e) => {
        const renderer = new VisualizerRenderInstance(e.data);
        onmessage = (e: RendererMessageEvent) => {
            switch (e.data.type) {
                case 'draw':
            }
        };
    }
}