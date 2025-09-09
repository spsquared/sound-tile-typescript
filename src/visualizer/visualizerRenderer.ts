import { reactive, ref, Ref, WatchStopHandle } from 'vue';
import { throttledWatch, useThrottleFn } from '@vueuse/core';
import chroma from 'chroma-js';
import { cloneDeep } from 'lodash-es';
import { VisualizerData, VisualizerMode } from './visualizerData';
import { ColorData } from '@/components/inputs/colorPicker';

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
        valueMax: 0,
        valueMin: 0,
        valueMinMaxDiff: 0,
        approximatePeak: 0
    });
    readonly canvas: HTMLCanvasElement;

    private readonly stopWatching: WatchStopHandle;

    constructor(data: VisualizerSettingsData) {
        this.data = reactive(data);
        this.canvas = document.createElement('canvas');
        this.stopWatching = throttledWatch(this.data, () => this.updateData(), { deep: true, throttle: 50, leading: true, trailing: true });
    }

    abstract draw(buffer: Uint8Array | Float32Array | Uint8Array[]): Promise<void>
    abstract resize(w: number, h: number): void
    protected abstract updateData(): void

    destroy(): void {
        this.stopWatching();
    }

    static playing: boolean = false;
    static debugInfo: 0 | 1 | 2 = 0;
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
        const cleanData = cloneDeep({ ...this.data, buffer: undefined });
        this.worker.postMessage([workerCanvas, cleanData satisfies VisualizerSettingsData], [workerCanvas]);
    }

    async draw(buffer: Uint8Array | Float32Array | Uint8Array[]): Promise<void> {
        this.frameResult.value = await this.postMessageWithAck('draw', 'drawResponse', {
            buffer: buffer,
            playing: VisualizerRenderer.playing,
            debug: VisualizerRenderer.debugInfo
        }, Array.isArray(buffer) ? buffer.map((b) => b.buffer) : [buffer.buffer]);
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
        this.renderer = new VisualizerRenderInstance(this.canvas.transferControlToOffscreen(), cloneDeep({ ...this.data, buffer: undefined }));
    }

    async draw(buffer: Uint8Array | Float32Array | Uint8Array[]): Promise<void> {
        this.renderer.playing = VisualizerRenderer.playing;
        this.renderer.debugInfo = VisualizerRenderer.debugInfo;
        this.renderer.draw(buffer);
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
}

/**
 * Renderer class used by both the worker renderer and the fallback renderer.
 */
class VisualizerRenderInstance {
    readonly canvas: OffscreenCanvas;
    readonly ctx: OffscreenCanvasRenderingContext2D;
    private data: VisualizerSettingsData;
    private dataUpdated: boolean = false;
    private resized: [number, number] | undefined = undefined;
    private colorStyle: CanvasGradient | string = '#FFFFFF';
    private colorStyle2: CanvasGradient | string = '#FFFFFF';
    private colorScale: chroma.Scale = chroma.scale(['#FFFFFF']);
    // private colorScale2: chroma.Scale = chroma.scale(['#FFFFFF']);
    private corrwaveData: {
        buffer: Float32Array,
        shift: number
    } | null = null;
    private spectogramData: OffscreenCanvas | null = null;
    private levelsData: number[] | null = null;

    playing: boolean = false;
    debugInfo: 0 | 1 | 2 = 0;
    private readonly frames: number[] = [];
    private readonly fpsHistory: number[] = [];
    private readonly timingsHistory: number[] = [];
    private readonly debugText: string[] = [];

    frameResult: VisualizerRendererFrameResults = {
        valueMax: 0,
        valueMin: 0,
        valueMinMaxDiff: 0,
        approximatePeak: 0
    };

    constructor(canvas: OffscreenCanvas, data: VisualizerSettingsData) {
        this.canvas = canvas;
        this.ctx = this.canvas.getContext('2d')!;
        this.data = data;
    }

    draw(buffer: Uint8Array | Float32Array | Uint8Array[]): void {
        const startTime = performance.now();
        this.debugText.length = 0;
        this.ctx.reset();
        if (this.resized !== undefined) {
            this.canvas.width = this.resized[0];
            this.canvas.height = this.resized[1];
        }
        if (this.resized !== undefined || this.dataUpdated) {
            this.colorStyle = this.createColorStyle(this.data.color);
            this.colorStyle2 = this.createColorStyle(this.data.color2, this.data.color2Alpha);
            this.colorScale = this.createColorScale(this.data.color);
            // this.colorScale2 = this.createColorScale(this.data.color2, this.data.color2Alpha);
        }
        // move origin to bottom left and apply transforms & padding
        this.ctx.translate(0, this.canvas.height);
        this.ctx.scale(1, -1);
        this.ctx.scale(this.data.flipX ? -1 : 1, this.data.flipY ? -1 : 1);
        this.ctx.translate(this.data.flipX ? -this.canvas.width : 0, this.data.flipY ? -this.canvas.height : 0);
        if (this.data.rotate) this.ctx.transform(0, 1, 1, 0, 0, 0);
        this.ctx.translate(this.data.paddingInline, this.data.paddingBlock);
        const { width, height } = this.calcViewportSize();
        // spaghetti v2
        this.ctx.save();
        switch (this.data.mode) {
            case VisualizerMode.FREQ_BAR:
                if (!(buffer instanceof Uint8Array)) break;
                this.drawFreqBars(buffer);
                break;
            case VisualizerMode.FREQ_LINE:
                if (!(buffer instanceof Uint8Array)) break;
                this.drawFreqLines(buffer);
                break;
            case VisualizerMode.FREQ_FILL:
                if (!(buffer instanceof Uint8Array)) break;
                this.drawFreqLines(buffer, true);
                break;
            case VisualizerMode.FREQ_LUMINANCE:
                if (!(buffer instanceof Uint8Array)) break;
                this.drawFreqBars(buffer, true);
                break;
            case VisualizerMode.WAVE_DIRECT:
                if (!(buffer instanceof Float32Array)) break;
                this.drawWave(buffer);
                break;
            case VisualizerMode.WAVE_CORRELATED:
                if (!(buffer instanceof Float32Array)) break;
                this.drawCorrWave(buffer);
                break;
            case VisualizerMode.SPECTROGRAM:
                if (!(buffer instanceof Uint8Array)) break;
                this.drawFreqSpectrogram(buffer);
                break;
            case VisualizerMode.CHANNEL_PEAKS:
                if (!Array.isArray(buffer)) break;
                this.drawPeaks(buffer);
                break;
        }
        this.ctx.restore();
        // clip stuff that intrudes out of padded area
        this.ctx.globalCompositeOperation = 'destination-in';
        this.ctx.fillRect(0, 0, width, height);
        this.ctx.globalCompositeOperation = 'source-over';
        // free up some memory by removing unused history data
        if (this.data.mode != VisualizerMode.WAVE_CORRELATED) this.corrwaveData = null;
        if (this.data.mode != VisualizerMode.SPECTROGRAM) this.spectogramData = null;
        if (this.data.mode != VisualizerMode.CHANNEL_PEAKS) this.levelsData = null;
        // get frame results
        let frameResultMin = Infinity, frameResultMax = -Infinity;
        const frameResultBuffers = Array.isArray(buffer) ? buffer : [buffer];
        for (const buf of frameResultBuffers) {
            for (let i = 0; i < buf.length; i++) {
                if (buf[i] < frameResultMin) frameResultMin = buf[i];
                if (buf[i] > frameResultMax) frameResultMax = buf[i];
            }
        }
        this.frameResult = {
            valueMin: frameResultMin,
            valueMax: frameResultMax,
            valueMinMaxDiff: frameResultMax - frameResultMin,
            approximatePeak: buffer instanceof Float32Array ? frameResultMax - frameResultMin : frameResultMax / 255
        };
        // track performance metrics
        const endTime = performance.now();
        this.frames.push(endTime);
        this.timingsHistory.push(endTime - startTime);
        while (this.frames[0] + 1000 <= endTime) {
            this.frames.shift();
            this.timingsHistory.shift();
            this.fpsHistory.shift();
        }
        this.fpsHistory.push(this.frames.length);
        if (this.debugInfo > 0) {
            if (this.playing && this.debugInfo == 2) this.printDebugInfo(buffer);
            this.ctx.resetTransform();
            this.ctx.font = '14px monospace';
            const minArr = (a: number[]): number => a.reduce((p, c) => Math.min(p, c), a[0]);
            const maxArr = (a: number[]): number => a.reduce((p, c) => Math.max(p, c), a[0]);
            const avgArr = (a: number[]): number => a.reduce((p, c) => p + c, 0) / a.length;
            const text = [
                isInWorker ? 'Worker (asynchronous) renderer' : 'Fallback (synchronous) renderer',
                `PLAYING: ${this.playing}`,
                `FPS: ${this.frames.length} (${minArr(this.fpsHistory)} / ${maxArr(this.fpsHistory)} / ${avgArr(this.fpsHistory).toFixed(1)})`,
                `Timings: ${(endTime - startTime).toFixed(1)}ms (${minArr(this.timingsHistory).toFixed(1)}ms / ${maxArr(this.timingsHistory).toFixed(1)}ms / ${avgArr(this.timingsHistory).toFixed(1)}ms)`,
                ...this.debugText
            ];
            this.ctx.fillStyle = '#333333AA';
            this.ctx.fillRect(8, 8, maxArr(text.map((t) => this.ctx.measureText(t).width + 8)), text.length * 16 + 6);
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.textAlign = 'left';
            this.ctx.textBaseline = 'top';
            for (let i = 0; i < text.length; i++) {
                this.ctx.fillText(text[i], 12, 12 + i * 16);
            }
        }
        // finalize
        this.resized = undefined;
        this.dataUpdated = false;
    }

    private drawFreqBars(buffer: Uint8Array, lumi?: boolean): void {
        const { width, height } = this.calcViewportSize();
        const freqRange = Math.ceil(buffer.length * this.data.freqOptions.freqCutoff);
        const xStep = width / freqRange;
        const barWidth = Math.max(1, xStep * this.data.freqOptions.bar.size);
        const xShift = (xStep - barWidth) / 2;
        const draw = lumi ? () => {
            // luminance bars
            const lumiScale = this.data.freqOptions.scale / 255;
            if (this.data.altColorMode && this.data.color.type == 'gradient') {
                for (let i = 0; i < freqRange; i++) {
                    this.ctx.fillStyle = this.colorScale(buffer[i] * lumiScale).hex();
                    this.ctx.fillRect(i * xStep + xShift, 0, barWidth, height);
                }
            } else {
                this.ctx.fillStyle = this.colorStyle;
                for (let i = 0; i < freqRange; i++) {
                    this.ctx.globalAlpha = Math.min(1, buffer[i] * lumiScale);
                    this.ctx.fillRect(i * xStep + xShift, 0, barWidth, height);
                }
            }
        } : () => {
            // height bars
            const dataQuantize = this.data.freqOptions.bar.ledEffect ? this.data.freqOptions.bar.ledCount : 255;
            const dataScale = this.data.freqOptions.scale * dataQuantize / 255;
            const drawScale = height / dataQuantize;
            const minHeight = this.data.freqOptions.bar.ledEffect ? height / this.data.freqOptions.bar.ledCount : this.data.freqOptions.bar.minLength;
            const yReflect = this.data.freqOptions.reflect;
            const yCenter = yReflect * height;
            if (this.data.altColorMode && this.data.color.type == 'gradient') {
                const colorScale = 1 / dataQuantize;
                // batching by color probably pointless since bars/colors ratio is quite low
                for (let i = 0; i < freqRange; i++) {
                    const t = Math.ceil(buffer[i] * dataScale);
                    const barHeight = Math.max(minHeight, t * drawScale);
                    this.ctx.fillStyle = this.colorScale(t * colorScale).hex();
                    this.ctx.fillRect(i * xStep + xShift, yCenter - barHeight * yReflect, barWidth, barHeight);
                }
            } else {
                this.ctx.fillStyle = this.colorStyle;
                for (let i = 0; i < freqRange; i++) {
                    const barHeight = Math.max(minHeight, Math.ceil(buffer[i] * dataScale) * drawScale);
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
    private drawFreqLines(buffer: Uint8Array, fill?: boolean): void {
        const { width, height } = this.calcViewportSize();
        const freqRange = Math.ceil(buffer.length * this.data.freqOptions.freqCutoff);
        const xStep = width / (freqRange - 1);
        const drawScale = height * this.data.freqOptions.scale / 255;
        const tracePath = (reverse?: boolean) => {
            this.ctx.save();
            this.ctx.scale(xStep, drawScale);
            if (reverse) {
                for (let i = freqRange - 1; i >= 0; i--) this.ctx.lineTo(i, buffer[i]);
            } else {
                for (let i = 0; i < freqRange; i++) this.ctx.lineTo(i, buffer[i]);
            }
            this.ctx.restore();
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
        this.ctx.lineJoin = this.data.freqOptions.line.sharpEdges ? 'miter' : 'round';
        this.ctx.lineCap = this.data.freqOptions.line.sharpEdges ? 'square' : 'round';
        this.ctx.lineWidth = thickness;
        if (fill) {
            this.ctx.fillStyle = this.colorStyle2;
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
        this.ctx.strokeStyle = this.colorStyle;
        this.ctx.stroke();
    }
    private drawWave(buffer: Float32Array, offset = 0, length = buffer.length): void {
        const { width, height } = this.calcViewportSize();
        const thickness = this.data.waveOptions.thickness;
        const iStep = Math.max(1, this.data.waveOptions.resolution);
        const xStep = (width - thickness) / (length - iStep);
        this.ctx.lineJoin = this.data.waveOptions.sharpEdges ? 'miter' : 'round';
        this.ctx.lineCap = this.data.waveOptions.sharpEdges ? 'square' : 'round';
        this.ctx.lineWidth = thickness;
        this.ctx.strokeStyle = this.colorStyle;
        this.ctx.beginPath();
        this.ctx.save();
        this.ctx.translate(thickness / 2, height / 2);
        this.ctx.scale(xStep, this.data.waveOptions.scale * height / 2);
        for (let i = 0; i < length; i += iStep) {
            this.ctx.lineTo(i, buffer[i + offset]);
        }
        this.ctx.restore();
        this.ctx.stroke();
    }
    private drawCorrWave(buffer: Float32Array): void {
        const windowSize = buffer.length / 2;
        if (this.corrwaveData === null || this.corrwaveData.buffer.length != windowSize) {
            this.corrwaveData = {
                buffer: buffer.slice(0, windowSize),
                shift: 0
            };
            if (this.debugInfo > 0) this.debugText.push(`Reset: ${windowSize}`);
        }
        if (this.debugInfo == 2) this.debugText.push(`Previous shift: ${this.corrwaveData.shift}`);
        // only correlate when playing, otherwise retain shift
        let bestShift = this.corrwaveData.shift;
        if (this.playing) {
            // approximate lowest error by subtracting shifted window of buffer from smoothed temporal data
            const samples = Math.min(windowSize, this.data.waveOptions.correlation.samples);
            if (this.debugInfo == 2) this.debugText.push(`Samples: ${samples} / ${this.data.waveOptions.correlation.samples}`);
            const debugText: string[] = [];
            let bestError = Infinity;
            let lastShift = Infinity; // prevents calculating the same shift multiple times on edge cases
            for (let i = 0; i < samples; i++) {
                const shift = Math.round(windowSize * i / (samples - 1));
                if (shift == lastShift) continue;
                lastShift = shift;
                let error = 0;
                // TODO - stochastic sampling or similar to reduce performance hit of large buffers
                for (let j = 0; j < windowSize; j++) {
                    error += Math.abs(this.corrwaveData.buffer[j] - buffer[shift + j]);
                }
                if (this.debugInfo == 2) debugText.push(`${i}/${shift}/${Math.round(error)}`);
                if (error < bestError) {
                    bestError = error;
                    bestShift = shift;
                }
            }
            if (this.debugInfo == 2) this.debugText.push('Samples: ' + debugText.join(' '));
            if (this.debugInfo > 0) this.debugText.push(`Best: shift ${bestShift}, error ${bestError}`);
            // gradient descent on lowest sample to minimize error
            let gain = this.data.waveOptions.correlation.gradientDescentGain;
            debugText.length = 0;
            debugText.push(`gain=${gain}`);
            for (let i = 0; i < 16; i++) { // arbitrary maximum iterations
                let adjError = 0;
                // again stochastic sampling
                if (bestShift == windowSize) {
                    const adjShift = bestShift - 1;
                    for (let j = 0; j < windowSize; j++) {
                        adjError -= Math.abs(this.corrwaveData.buffer[j] - buffer[adjShift + j]);
                    }
                } else {
                    const adjShift = bestShift + 1;
                    for (let j = 0; j < windowSize; j++) {
                        adjError += Math.abs(this.corrwaveData.buffer[j] - buffer[adjShift + j]);
                    }
                }
                // get error for new shift
                const newShift = Math.min(windowSize, Math.max(0, bestShift + Math.ceil(Math.abs((bestError - adjError) * gain)) * Math.sign(bestError - adjError)));
                if (this.debugInfo == 2) debugText.push(`${(bestError - adjError).toFixed(2)}/${bestShift}->${newShift}`);
                if (bestShift == newShift) break;
                let newError = 0;
                // STOCHASTIC SAMPLING
                for (let j = 0; j < windowSize; j++) {
                    newError += Math.abs(this.corrwaveData.buffer[j] - buffer[newShift + j]);
                }
                if (newError < bestError) {
                    bestError = newError;
                    bestShift = newShift;
                } else {
                    // if it's worse then the gradient descent could be overtuned, automatically reduce gain
                    gain *= 0.8; // again arbitrary
                    if (this.debugInfo == 2) debugText.push(`gain=${gain.toFixed(3)}`);
                }
            }
            if (this.debugInfo > 0) {
                this.debugText.push('Gradient Descent: ' + debugText.join(' '));
                this.debugText.push(`Best: shift ${bestShift}, error ${bestError}`);
            }
            this.corrwaveData.shift = bestShift;
            // average the shifted buffer with previous buffer
            const smoothing = this.data.waveOptions.correlation.frameSmoothing;
            const invSmoothing = 1 - smoothing;
            for (let i = 0; i < windowSize; i++) {
                this.corrwaveData.buffer[i] = smoothing * this.corrwaveData.buffer[i] + invSmoothing * buffer[this.corrwaveData.shift + i];
            }
        }
        this.drawWave(buffer, bestShift, windowSize);
    }
    private drawFreqSpectrogram(buffer: Uint8Array): void {
        const { width, height } = this.calcViewportSize();
        let forceRedraw = false;
        if (this.spectogramData === null || this.spectogramData.width != this.data.freqOptions.spectrogram.historyLength || this.spectogramData.height != buffer.length) {
            forceRedraw = true;
            this.spectogramData = new OffscreenCanvas(this.data.freqOptions.spectrogram.historyLength, buffer.length);
            const ctx = this.spectogramData.getContext('2d')!;
            ctx.imageSmoothingEnabled = false;
            if (this.debugInfo > 0) this.debugText.push(`Reset: ${this.spectogramData.width}x${this.spectogramData.height}`);
        }
        const spectFrame = this.spectogramData;
        const spectCtx = spectFrame.getContext('2d')!;
        const freqRange = Math.ceil(buffer.length * this.data.freqOptions.freqCutoff);
        const altColor = this.data.altColorMode && this.data.color.type == 'gradient';
        // spectrogram stops flowing when not playing
        if (this.playing || forceRedraw) {
            // spectFrame is unscaled (1x1 pixel = 1 frame x 1 frequency bin) to minimize resource usage
            spectCtx.resetTransform();
            spectCtx.globalCompositeOperation = 'copy';
            spectCtx.drawImage(spectFrame, -1, 0);
            spectCtx.globalCompositeOperation = 'source-over';
            spectCtx.save();
            spectCtx.translate(spectFrame.width - 1, 0);
            // spectrogram can quantize without losing the smoothness of gradients and it does help performance
            const scale = this.data.freqOptions.scale / 255;
            const dataQuantize = Math.round(this.data.freqOptions.spectrogram.quantization); // because user input bad
            if (dataQuantize >= 2) {
                // array of buckets, each entry is position, sorted ascending (inserted in ascending order)
                const dataScale = scale * dataQuantize;
                const maxBucket = dataQuantize - 1;
                // shenanigans needed to divide 0-1 scale evenly
                const buckets: number[][] = new Array(dataQuantize).fill(0).map(() => []);
                for (let i = 0; i < freqRange; i++) {
                    buckets[Math.min(maxBucket, Math.floor(buffer[i] * dataScale))].push(i);
                }
                if (this.debugInfo == 2) this.debugText.push(`Quantization buckets: ${dataQuantize} - ${buckets.map((v) => v.length).join(', ')}`);
                // buckets are drawn in consecutive blocks of the same color (probably unnecessary but original had it)
                if (!altColor) spectCtx.fillStyle = '#FFFFFF';
                for (let i = 0; i < dataQuantize; i++) {
                    if (altColor) spectCtx.fillStyle = this.colorScale(i / maxBucket).hex();
                    else spectCtx.globalAlpha = i / maxBucket;
                    const bucket = buckets[i];
                    let j = 0, k = 0, startY = 0;
                    while (j < bucket.length) {
                        k = j;
                        startY = bucket[j];
                        do j++;
                        while (j < bucket.length && bucket[j] - bucket[j - 1] == 1);
                        spectCtx.fillRect(0, startY, 1, j - k);
                    }
                }
            } else {
                if (this.debugInfo == 2) this.debugText.push('No quantizing')
                if (altColor) {
                    for (let i = 0; i < freqRange; i++) {
                        spectCtx.fillStyle = this.colorScale(buffer[i] * scale).hex();
                        spectCtx.fillRect(0, i, 1, 1);
                    }
                } else {
                    // color/gradient is applied to spectrogram later
                    spectCtx.fillStyle = '#FFFFFF';
                    for (let i = 0; i < freqRange; i++) {
                        spectCtx.globalAlpha = Math.min(1, buffer[i] * scale);
                        spectCtx.fillRect(0, i, 1, 1);
                    }
                }
            }
            spectCtx.restore();
        }
        this.ctx.imageSmoothingEnabled = false; // prevents anti-aliasing when scaling up
        this.ctx.save();
        switch (this.data.freqOptions.symmetry) {
            case 'none':
                this.ctx.drawImage(spectFrame, 0, 0, spectFrame.width, freqRange, 0, 0, width, height);
                break;
            case 'low':
                this.ctx.translate(0, height / 2);
                this.ctx.drawImage(spectFrame, 0, 0, spectFrame.width, freqRange, 0, 0, width, height / 2);
                this.ctx.scale(1, -1);
                this.ctx.drawImage(spectFrame, 0, 0, spectFrame.width, freqRange, 0, 0, width, height / 2);
                break;
            case 'high':
                this.ctx.drawImage(spectFrame, 0, 0, spectFrame.width, freqRange, 0, 0, width, height / 2);
                this.ctx.translate(0, height);
                this.ctx.scale(1, -1);
                this.ctx.drawImage(spectFrame, 0, 0, spectFrame.width, freqRange, 0, 0, width, height / 2);
                break;
        }
        this.ctx.restore();
        this.ctx.imageSmoothingEnabled = true;
        if (!altColor) {
            // apply color/gradient by tinting and using a grayscale alpha version as a mask
            this.ctx.globalCompositeOperation = 'source-in';
            this.ctx.fillStyle = this.colorStyle;
            this.ctx.fillRect(0, 0, width, height);
        }
    }
    private drawPeaks(buffers: Uint8Array[]): void {
        this.levelsData ??= [];
        if (this.playing || this.levelsData.length != buffers.length) {
            this.levelsData.length = buffers.length; // not really a buffer but who cares lol
            const smoothing = this.data.levelOptions.frameSmoothing;
            const invSmoothing = 1 - smoothing;
            for (let i = 0; i < buffers.length; i++) {
                const channel = buffers[i];
                let max = 0, min = 255;
                for (let j = 0; j < channel.length; j++) {
                    if (channel[j] < min) min = channel[j];
                    if (channel[j] > max) max = channel[j];
                }
                const diff = max - min;
                this.levelsData[i] = diff * invSmoothing + (this.levelsData[i] ?? diff) * smoothing;
            }
            if (this.debugInfo == 2) this.debugText.push('Peaks: ' + this.levelsData.map((v) => v.toFixed(1)).join(', '))
        }
        // WOOOOOOO COPY SPAGHETTI TIME
        const { width, height } = this.calcViewportSize();
        const xStep = width / this.levelsData.length;
        const barWidth = Math.max(1, xStep * this.data.levelOptions.size);
        const xShift = (xStep - barWidth) / 2;
        const dataQuantize = this.data.levelOptions.ledEffect ? this.data.levelOptions.ledCount : 255;
        const dataScale = this.data.levelOptions.scale * dataQuantize / 255;
        const drawScale = height / dataQuantize;
        const minHeight = this.data.levelOptions.ledEffect ? height / this.data.levelOptions.ledCount : this.data.levelOptions.minLength;
        const yReflect = this.data.levelOptions.reflect;
        const yCenter = yReflect * height;
        if (this.data.altColorMode && this.data.color.type == 'gradient') {
            const colorScale = 1 / dataQuantize;
            // batching by color probably pointless since bars/colors ratio is quite low
            for (let i = 0; i < this.levelsData.length; i++) {
                const t = Math.ceil(this.levelsData[i] * dataScale);
                const barHeight = Math.max(minHeight, t * drawScale);
                this.ctx.fillStyle = this.colorScale(t * colorScale).hex();
                this.ctx.fillRect(i * xStep + xShift, yCenter - barHeight * yReflect, barWidth, barHeight);
            }
        } else {
            this.ctx.fillStyle = this.colorStyle;
            for (let i = 0; i < this.levelsData.length; i++) {
                const barHeight = Math.max(minHeight, Math.ceil(this.levelsData[i] * dataScale) * drawScale);
                this.ctx.fillRect(i * xStep + xShift, yCenter - barHeight * yReflect, barWidth, barHeight);
            }
        }
        this.ctx.save();
        if (this.data.levelOptions.ledEffect) {
            this.ctx.globalCompositeOperation = 'destination-out';
            this.ctx.fillStyle = '#000000';
            const blockStep = height / this.data.levelOptions.ledCount;
            const blockHeight = blockStep * (1 - this.data.levelOptions.ledSize);
            // LED bar deletes chunks of canvas because faster
            if (this.data.levelOptions.reflect > 0) {
                const yReflect = this.data.levelOptions.reflect;
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

    private calcViewportSize(): { readonly width: number, readonly height: number } {
        return {
            width: Math.max(0, (this.data.rotate ? this.canvas.height : this.canvas.width) - this.data.paddingInline * 2),
            height: Math.max(0, (this.data.rotate ? this.canvas.width : this.canvas.height) - this.data.paddingBlock * 2)
        };
    }
    private createColorStyle(color: ColorData, alpha: number = 1): CanvasGradient | string {
        if (color.type == 'solid') {
            return chroma(color.color).alpha(color.alpha * alpha).hex();
        } else if (color.type == 'gradient') {
            const { width, height } = this.calcViewportSize();
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
                gradient.addColorStop(Math.max(0, Math.min(1, stop.t)), chroma(stop.c).alpha(stop.a * alpha).hex());
            }
            return gradient;
        }
        return 'white';
    }
    private createColorScale(color: ColorData, alpha: number = 1): chroma.Scale {
        if (color.type == 'solid') {
            return chroma.scale([chroma(color.color).alpha(color.alpha * alpha)]);
        } else if (color.type == 'gradient') {
            return chroma.scale(color.stops.map((c) => chroma(c.c).alpha(c.a * alpha))).domain(color.stops.map((c) => Math.max(0, Math.min(1, c.t))));
        }
        // idk
        return chroma.scale(['#FFFFFF']);
    }

    resize(w: number, h: number): void {
        this.resized = [w, h];
    }
    updateData(data: VisualizerSettingsData): void {
        this.data = data;
        this.dataUpdated = true;
    }

    private printDebugInfo = useThrottleFn((buffer: Uint8Array | Float32Array | Uint8Array[]) => {
        console.debug({
            width: this.canvas.width,
            height: this.canvas.height,
            timings: this.timingsHistory,
            data: this.data,
            buffer: buffer
        });
    }, 250);
}

type RendererMessageData = {
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
                    renderer.playing = e.data.playing;
                    renderer.debugInfo = e.data.debug;
                    renderer.draw(e.data.buffer);
                    postMessage({
                        type: 'drawResponse',
                        ...renderer.frameResult
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
