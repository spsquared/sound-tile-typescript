import { reactive, ref, Ref } from "vue";
import { throttledWatch } from "@vueuse/core";
import { deepToRaw } from "@/components/scripts/deepToRaw";
import { VisualizerData, VisualizerMode } from "./visualizerData";
import { ColorData } from "@/components/inputs/colorPicker";
import chroma from 'chroma-js';

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
        throttledWatch(this.data, () => this.updateData(), { deep: true, throttle: 50 });
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
        this.frameResult.value = await this.postMessageWithAck('draw', 'drawResponse', { buffer: buffer }, Array.isArray(buffer) ? buffer.map((b) => b.buffer) : [buffer.buffer]);
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
        this.renderer = new VisualizerRenderInstance(this.canvas.transferControlToOffscreen(), deepToRaw(this.data));
    }

    async draw(buf: Uint8Array | Float32Array | Uint8Array[]): Promise<void> {
        this.renderer.draw(buf);
    }
    resize(w: number, h: number): void {
        this.renderer.resize(w, h);
    }
    updateData(): void {
        this.renderer.updateData(deepToRaw(this.data));
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
    private canvasStyle: CanvasGradient | string = '#FFFFFF';
    private canvasStyle2: CanvasGradient | string = '#FFFFFF';
    private chromaScale: chroma.Scale = chroma.scale(['#FFFFFF']);
    // private chromaScale2: chroma.Scale = chroma.scale(['#FFFFFF']);

    constructor(canvas: OffscreenCanvas, data: VisualizerSettingsData) {
        this.canvas = canvas;
        this.ctx = this.canvas.getContext('2d')!;
        this.data = data;
    }

    draw(buf: Uint8Array | Float32Array | Uint8Array[]): void {
        this.ctx.reset();
        if (this.dataUpdated) {
            this.canvasStyle = this.createCanvasStyle(this.data.color);
            this.canvasStyle2 = this.createCanvasStyle(this.data.color2, this.data.color2Alpha);
            this.chromaScale = this.createChromaScale(this.data.color);
            // this.chromaScale2 = this.createChromaScale(this.data.color2, this.data.color2Alpha);
        }
        // move origin to bottom left and apply transforms
        this.ctx.translate(0, this.canvas.height);
        this.ctx.scale(1, -1);
        this.ctx.scale(this.data.flipX ? -1 : 1, this.data.flipY ? -1 : 1);
        this.ctx.translate(this.data.flipX ? -this.canvas.width : 0, this.data.flipY ? -this.canvas.height : 0);
        if (this.data.rotate) this.ctx.transform(0, 1, 1, 0, 0, 0);
        // padding thing
        this.ctx.translate(this.data.paddingInline, this.data.paddingBlock);
        // spaghetti v2
        switch (this.data.mode) {
            case VisualizerMode.FREQ_BAR:
                if (!(buf instanceof Uint8Array)) break;
                this.drawFreqBars(buf);
                break;
            case VisualizerMode.FREQ_LINE:
                if (!(buf instanceof Uint8Array)) break;
                this.drawFreqLines(buf);
                break;
            case VisualizerMode.FREQ_FILL:
                if (!(buf instanceof Uint8Array)) break;
                this.drawFreqLines(buf, true);
                break;
            case VisualizerMode.FREQ_LUMINANCE:
                if (!(buf instanceof Uint8Array)) break;
                this.drawFreqBars(buf, true);
                break;
            case VisualizerMode.WAVE_DIRECT:
                break;
            case VisualizerMode.WAVE_CORRELATED:
                break;
            case VisualizerMode.SPECTROGRAM:
                // spectrogram can quantize without losing the smoothness of gradients and it does help performance
                break;
            case VisualizerMode.CHANNEL_LEVELS:
                break;
        }
    }

    private drawFreqBars(buf: Uint8Array, lumi?: boolean): void {
        const { width, height } = this.calcViewportSize();
        const freqRange = Math.ceil(buf.length * this.data.freqOptions.freqCutoff);
        const xStep = width / freqRange;
        const barWidth = Math.max(1, xStep * this.data.freqOptions.bar.size);
        const xShift = (xStep - barWidth) / 2;
        const draw = lumi ? () => {
            // luminance bars
            const lumiScale = this.data.freqOptions.scale / 256;
            if (this.data.altColorMode && this.data.color.type == 'gradient') {
                for (let i = 0; i < freqRange; i++) {
                    this.ctx.fillStyle = this.chromaScale(buf[i] * lumiScale).hex();
                    this.ctx.fillRect(i * xStep + xShift, 0, barWidth, height);
                }
            } else {
                this.ctx.fillStyle = this.canvasStyle;
                for (let i = 0; i < freqRange; i++) {
                    this.ctx.globalAlpha = Math.min(1, buf[i] * lumiScale);
                    this.ctx.fillRect(i * xStep + xShift, 0, barWidth, height);
                }
            }
        } : () => {
            // height bars
            const dataQuantize = this.data.freqOptions.bar.ledEffect ? this.data.freqOptions.bar.ledCount : 256;
            const dataScale = this.data.freqOptions.scale * dataQuantize / 256;
            const drawScale = height / dataQuantize;
            const minHeight = this.data.freqOptions.bar.ledEffect ? height / this.data.freqOptions.bar.ledCount : this.data.freqOptions.bar.minLength;
            const yReflect = this.data.freqOptions.reflect;
            const yCenter = yReflect * height;
            if (this.data.altColorMode && this.data.color.type == 'gradient') {
                const colorScale = 1 / dataQuantize;
                // batching by color probably pointless since bars/colors ratio is quite low
                for (let i = 0; i < freqRange; i++) {
                    const t = Math.ceil(buf[i] * dataScale);
                    const barHeight = Math.max(minHeight, t * drawScale);
                    this.ctx.fillStyle = this.chromaScale(t * colorScale).hex();
                    this.ctx.fillRect(i * xStep + xShift, yCenter - barHeight * yReflect, barWidth, barHeight);
                }
            } else {
                this.ctx.fillStyle = this.canvasStyle;
                for (let i = 0; i < freqRange; i++) {
                    const barHeight = Math.max(minHeight, Math.ceil(buf[i] * dataScale) * drawScale);
                    this.ctx.fillRect(i * xStep + xShift, yCenter - barHeight * yReflect, barWidth, barHeight);
                }
            }
        };
        this.ctx.save();
        switch (this.data.freqOptions.symmetry) {
            case 'none':
                draw();
                break;
            case 'low':
                this.ctx.scale(0.5, 1);
                this.ctx.translate(width, 0);
                draw();
                this.ctx.scale(-1, 1);
                draw();
                break;
            case 'high':
                this.ctx.scale(0.5, 1);
                draw();
                this.ctx.translate(width * 2, 0);
                this.ctx.scale(-1, 1);
                draw();
                break;
        }
        this.ctx.restore();
        this.ctx.save();
        if (this.data.freqOptions.bar.ledEffect) {
            this.ctx.globalCompositeOperation = 'destination-out';
            this.ctx.fillStyle = '#000000';
            const blockStep = height / this.data.freqOptions.bar.ledCount;
            const blockHeight = blockStep * (1 - this.data.freqOptions.bar.ledSize);
            // LED bar deletes chunks of canvas because faster
            if (!lumi && this.data.freqOptions.reflect > 0) {
                const yReflect = this.data.freqOptions.reflect;
                const yCenter = yReflect * height;
                this.ctx.save();
                this.ctx.scale(1, yReflect);
                for (let i = -blockHeight / 2; i < height; i += blockStep) {
                    this.ctx.fillRect(0, i, width, blockHeight);
                }
                this.ctx.restore();
                this.ctx.translate(0, yCenter);
                this.ctx.scale(1, 1 - yReflect);
                for (let i = -blockHeight / 2; i < height; i += blockStep) {
                    this.ctx.fillRect(0, i, width, blockHeight);
                }
            } else {
                // reflection < 1% check to stop artifacting
                for (let i = -blockHeight / 2; i < height; i += blockStep) {
                    this.ctx.fillRect(0, i, width, blockHeight);
                }
            }
        }
        this.ctx.restore();
    }
    private drawFreqLines(buf: Uint8Array, fill?: boolean): void {
        const { width, height } = this.calcViewportSize();
        const freqRange = Math.ceil(buf.length * this.data.freqOptions.freqCutoff);
        const xStep = width / (freqRange - 1);
        const drawScale = height * this.data.freqOptions.scale / 256;
        const tracePath = (reverse?: boolean) => {
            if (reverse) {
                for (let i = freqRange - 1; i >= 0; i--) this.ctx.lineTo(i * xStep, buf[i] * drawScale);
            } else {
                for (let i = 0; i < freqRange; i++) this.ctx.lineTo(i * xStep, buf[i] * drawScale);
            }
        };
        // every measurement accounts for line thickness!!
        const thickness = this.data.freqOptions.line.thickness;
        const halfThickness = thickness / 2;
        const yReflect = this.data.freqOptions.reflect;
        const yCenter = yReflect * (height - halfThickness);
        // path must be traced clockwise since moveTo will create a new line and cause visual
        // artifacting with sharpEdges, path ends on centerline to avoid that too
        this.ctx.beginPath();
        if (fill) this.ctx.moveTo(0 + halfThickness, yCenter + halfThickness);
        // EDGE CASES EVERYWHERE SPAGHETTI!!! lots of tiny offsets due to line width
        this.ctx.save();
        this.ctx.translate(halfThickness, halfThickness);
        switch (this.data.freqOptions.symmetry) {
            case 'none':
                this.ctx.scale(1 - thickness / width, 1);
                if (yReflect > 0) {
                    this.ctx.translate(0, yCenter);
                    this.ctx.save();
                    this.ctx.scale(1, 1 - yReflect);
                    tracePath();
                    this.ctx.restore();
                    this.ctx.lineTo(width, 0);
                    this.ctx.scale(1, -yReflect);
                    tracePath(true);
                } else {
                    tracePath();
                    if (fill) this.ctx.lineTo(width, 0);
                }
                break;
            case 'low':
                this.ctx.scale(0.5 - halfThickness / width, 1);
                this.ctx.translate(width, 0);
                if (yReflect > 0) {
                    this.ctx.translate(0, yCenter);
                    this.ctx.save();
                    this.ctx.scale(-1, 1 - yReflect);
                    tracePath(true);
                    this.ctx.scale(-1, 1);
                    tracePath();
                    this.ctx.restore();
                    this.ctx.scale(1, -yReflect);
                    tracePath(true);
                    this.ctx.scale(-1, 1);
                    tracePath();
                } else {
                    this.ctx.scale(-1, 1);
                    tracePath(true);
                    this.ctx.scale(-1, 1);
                    tracePath();
                    if (fill) this.ctx.lineTo(width, 0);
                }
                break;
            case 'high':
                this.ctx.scale(0.5 - halfThickness / width, 1);
                if (yReflect > 0) {
                    this.ctx.translate(0, yCenter);
                    this.ctx.save();
                    this.ctx.scale(1, 1 - yReflect);
                    tracePath();
                    this.ctx.translate(width * 2, 0);
                    this.ctx.scale(-1, 1);
                    tracePath(true);
                    this.ctx.restore();
                    this.ctx.scale(1, -yReflect);
                    this.ctx.save();
                    this.ctx.translate(width * 2, 0);
                    this.ctx.scale(-1, 1);
                    tracePath();
                    this.ctx.restore();
                    tracePath(true);
                } else {
                    tracePath();
                    this.ctx.translate(width * 2, 0);
                    this.ctx.scale(-1, 1);
                    tracePath(true);
                    if (fill) this.ctx.lineTo(width, 0);
                }
                break;
        }
        this.ctx.restore();
        if (fill) this.ctx.lineTo(0 + halfThickness, yCenter + halfThickness);
        this.ctx.lineCap = this.data.freqOptions.line.sharpEdges ? 'square' : 'round';
        this.ctx.lineJoin = this.data.freqOptions.line.sharpEdges ? 'miter' : 'round';
        this.ctx.lineWidth = thickness;
        if (fill) {
            this.ctx.fillStyle = this.canvasStyle2;
            this.ctx.fill();
            // fix visible overlapping of stroke and fill with translucency by cutting away fill
            // alpha check isn't perfect since colors can have translucency themselves without this
            if (this.data.color2Alpha < 1) {
                this.ctx.globalCompositeOperation = 'destination-out';
                this.ctx.strokeStyle = '#000000';
                this.ctx.stroke();
                this.ctx.globalCompositeOperation = 'source-over';
            }
        }
        this.ctx.strokeStyle = this.canvasStyle;
        this.ctx.stroke();
    }

    private calcViewportSize(): { readonly width: number, readonly height: number } {
        return {
            width: (this.data.rotate ? this.canvas.height : this.canvas.width) - this.data.paddingInline * 2,
            height: (this.data.rotate ? this.canvas.width : this.canvas.height) - this.data.paddingBlock * 2
        };
    }
    private createCanvasStyle(color: ColorData, alpha: number = 1): CanvasGradient | string {
        if (color.type == 'solid') {
            return chroma(color.color).alpha(color.alpha * alpha).hex();
        } else if (color.type == 'gradient') {
            const width = (this.data.rotate ? this.canvas.height : this.canvas.width) - this.data.paddingInline;
            const height = (this.data.rotate ? this.canvas.width : this.canvas.height) - this.data.paddingBlock;
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
                gradient.addColorStop(stop.t, chroma(stop.c).alpha(stop.a * alpha).hex());
            }
            return gradient;
        }
        return 'white';
    }
    private createChromaScale(color: ColorData, alpha: number = 1): chroma.Scale {
        if (color.type == 'solid') {
            return chroma.scale([chroma(color.color).alpha(color.alpha * alpha)]);
        } else if (color.type == 'gradient') {
            return chroma.scale(color.stops.map((c) => chroma(c.c).alpha(c.a * alpha))).domain(color.stops.map((c) => c.t));
        }
        // idk
        return chroma.scale(['#FFFFFF']);
    }

    resize(w: number, h: number): void {
        this.canvas.width = w;
        this.canvas.height = h;
        this.dataUpdated = true;
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
                    postMessage({
                        type: 'drawResponse'
                    } satisfies RendererMessageData);
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
