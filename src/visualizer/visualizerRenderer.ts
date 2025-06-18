import { reactive, ref, Ref } from "vue";
import { throttledWatch } from "@vueuse/core";
import { deepToRaw } from "@/components/scripts/deepToRaw";
import { VisualizerData, VisualizerMode } from "./visualizerData";
import { ColorData } from "@/components/inputs/colorPicker";

const isInWorker = 'importScripts' in globalThis;

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
        throttledWatch(this.data, () => this.updateData(), { deep: true, throttle: 50, leading: true, trailing: true });
    }

    abstract draw(buf: Uint8Array | Float32Array | Uint8Array[]): Promise<void>
    abstract resize(w: number, h: number): void
    abstract updateData(): void

    abstract destroy(): void
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
        const cleanData = {
            ...deepToRaw(this.data),
            buffer: undefined
        };
        this.worker.postMessage([workerCanvas, cleanData satisfies VisualizerSettingsData], [workerCanvas]);
    }

    async draw(buffer: Uint8Array | Float32Array | Uint8Array[]): Promise<void> {
        this.frameResult.value = await this.postMessageWithAck('draw', 'drawResponse', { buffer: buffer });
    }
    resize(w: number, h: number): void {
        this.postMessage('resize', { w: w, h: h });
    }
    updateData(): void {
        // even though typing is fine, object is passed in from outside and could have buffer properties
        const clean = {
            ...deepToRaw(this.data),
            buffer: undefined
        };
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
        this.worker.terminate();
    }
}

/**
 * Fallback rendering container used when web workers are unavailable.
 */
export class VisualizerFallbackRenderer extends VisualizerRenderer {
    private readonly renderer: VisualizerRenderInstance;

    constructor(data: VisualizerSettingsData) {
        super(data);
        this.renderer = new VisualizerRenderInstance(this.canvas.transferControlToOffscreen(), this.data);
    }

    async draw(buf: Uint8Array | Float32Array | Uint8Array[]): Promise<void> {
        await this.renderer.draw(buf);
    }
    resize(w: number, h: number): void {
        this.renderer.resize(w, h);
    }
    updateData(): void {
        this.renderer.updateData(this.data);
    }

    destroy(): void {
        // nothing?
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
    private data: VisualizerSettingsData;
    private dataUpdated: boolean = false;
    private color: CanvasGradient | string = '#FFFFFF';
    private color2: CanvasGradient | string = '#FFFFFF';

    constructor(canvas: OffscreenCanvas, data: VisualizerSettingsData) {
        this.canvas = canvas;
        this.ctx = this.canvas.getContext('2d')!;
        this.data = data;
    }

    async draw(buf: Uint8Array | Float32Array | Uint8Array[]): Promise<void> {
        this.ctx.resetTransform();
        if (this.dataUpdated) {
            this.color = this.createGradient(this.data.color);
            this.color2 = this.createGradient(this.data.color2);
        }
        const width = this.data.rotate ? this.canvas.height : this.canvas.width;
        const height = this.data.rotate ? this.canvas.width : this.canvas.height;
        this.ctx.reset();
        // like actually wtf is this transform code
        const flipX = this.data.flipX ? -1 : 1;
        const flipY = this.data.flipY ? -1 : 1;
        this.ctx.scale(flipX, flipY);
        this.ctx.translate(flipX * this.canvas.width, flipY * this.canvas.height);
        if (this.data.rotate) {
            this.ctx.rotate(Math.PI / 2);
            this.ctx.scale(-1, 1);
            this.ctx.translate(-width, -height);
        }
        // spaghetti v2
        switch (this.data.mode) {
            case VisualizerMode.FREQ_BAR: {
                if (!(buf instanceof Uint8Array)) break;
                switch (this.data.freqOptions.symmetry) {
                    case 'none':
                        this.drawBars(buf);
                        break;
                    case 'high':
                        this.ctx.save();
                        this.ctx.scale(0.5, 1);
                        this.drawBars(buf);
                        this.ctx.translate(width, 0);
                        this.ctx.scale(-1, 1);
                        this.drawBars(buf);
                        this.ctx.restore();
                        break;
                    case 'low':
                        this.ctx.save();
                        this.ctx.scale(0.5, 1);
                        this.ctx.translate(width / 2, 0);
                        this.drawBars(buf);
                        this.ctx.scale(-1, 1);
                        this.ctx.translate(-width, 0);
                        this.drawBars(buf);
                        this.ctx.restore();
                        break;
                }
            }
                break;
            case VisualizerMode.FREQ_LINE: {

            }
                break;
            case VisualizerMode.FREQ_FILL: {

            }
                break;
            case VisualizerMode.FREQ_LUMINANCE: {

            }
                break;
            case VisualizerMode.WAVE_DIRECT: {

            }
            case VisualizerMode.WAVE_CORRELATED: {

            }
                break;
            case VisualizerMode.SPECTROGRAM: {

            }
                break;
            case VisualizerMode.CHANNEL_LEVELS: {

            }
                break;
        }
    }

    private drawBars(buf: Uint8Array): void {
        const width = this.data.rotate ? this.canvas.height : this.canvas.width;
        const height = this.data.rotate ? this.canvas.width : this.canvas.height;
        const freqRange = Math.ceil(buf.length * this.data.freqOptions.freqCutoff);
        const dataScale = this.data.freqOptions.scale;
        const xStep = (width / (freqRange * (this.data.freqOptions.symmetry != 'low' ? 2 : 1)));
        const barWidth = Math.max(1, xStep * this.data.freqOptions.bar.size);
        const xShift = (xStep - barWidth) / 2;
        const yQuantization = 256 / (this.data.freqOptions.bar.ledEffect ? this.data.freqOptions.bar.ledCount : 256);
        const yScale = height / 256 * yQuantization;
        const yReflect = this.data.freqOptions.reflect;
        const yCenter = yReflect * height;
        if (this.data.altColorMode && this.data.color.type == 'gradient') {
            for (let i = 0; i < freqRange; i++) {

            }
        } else {
            this.ctx.fillStyle = this.color2;
            this.ctx.fillStyle = this.color;
            for (let i = 0; i < freqRange; i++) {
                const barHeight = Math.max(1, Math.ceil((buf[i] * dataScale + 1) / yQuantization) * yScale);
                this.ctx.fillRect(i * xStep + xShift, yCenter - barHeight * yReflect, barWidth, barHeight);
            }
        }
    }

    private createGradient(color: ColorData): CanvasGradient | string {
        if (color.type == 'solid') {
            return `color-mix(in srgb, ${color.color} ${color.alpha * 100}%, transparent ${100 - color.alpha * 100}%)`;
        } else if (color.type == 'gradient') {
            const width = this.data.rotate ? this.canvas.height : this.canvas.width;
            const height = this.data.rotate ? this.canvas.width : this.canvas.height;
            const angle = color.angle * Math.PI / 180;
            const halfWidth = width / 2;
            const halfHeight = height / 2;
            const edgeX = ((Math.abs(Math.tan(angle)) > width / height) ? (halfWidth * Math.sign(Math.sin(angle))) : (Math.tan(angle) * halfHeight * Math.sign(Math.cos(angle))));
            const edgeY = ((Math.abs(Math.tan(angle)) < width / height) ? (halfHeight * Math.sign(Math.cos(angle))) : (((angle % 180) == 0) ? (halfHeight * Math.sign(Math.cos(angle))) : (halfWidth / Math.tan(angle * Math.sign(Math.sin(angle))))));
            const gradient = color.pattern == 'linear'
                ? this.ctx.createLinearGradient(halfWidth - edgeX, halfHeight - edgeY, halfWidth + edgeX, halfHeight + edgeY)
                : (color.pattern == 'radial'
                    ? this.ctx.createRadialGradient(color.x * width, color.y * height, 0, color.x * width, color.y * height, color.radius * Math.min(width, height))
                    : this.ctx.createConicGradient(angle, color.x * width, color.y * height));
            for (const stop of color.stops) {
                gradient.addColorStop(stop.t, `color-mix(in srgb, ${stop.c} ${stop.a * 100}%, transparent ${100 - stop.a * 100}%)`);
            }
            return gradient;
        }
        return 'white';
    }

    resize(w: number, h: number): void {
        this.canvas.width = w;
        this.canvas.height = h;
        this.dataUpdated = true;
        console.log('reszize')
    }

    updateData(data: VisualizerSettingsData): void {
        this.data = data;
        this.dataUpdated = true;
    }
}

type RendererMessageData = {
    type: 'draw'
    buffer: Uint8Array | Float32Array | Uint8Array[]
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
        const renderer = new VisualizerRenderInstance(e.data[0], e.data[1]);
        onmessage = (e: RendererMessageEvent) => {
            switch (e.data.type) {
                case 'draw':
                    renderer.draw(e.data.buffer);
                    postMessage({ type: 'drawResponse' } satisfies RendererMessageData);
                    break;
                case 'resize':
                    renderer.resize(e.data.w, e.data.h);
                    break;
                case 'settings':
                    renderer.updateData(e.data.data);
                    break;
            }
        };
    }
}
