import { useThrottleFn } from '@vueuse/core';
import chroma from 'chroma-js';
import { ColorData } from '@/components/inputs/colorPicker';
import type { RendererMessageData, RendererMessageEvent, BeepboxRendererFrameResults, BeepboxSettingsData } from './beepboxRenderer';

const isInWorker = 'importScripts' in globalThis;

/**
 * Renderer class used by both the worker renderer and the fallback renderer.
 */
class BeepboxRenderInstance {
    readonly canvas: OffscreenCanvas;
    readonly ctx: OffscreenCanvasRenderingContext2D;
    private data: BeepboxSettingsData;
    private resized: [number, number] | undefined = undefined;

    playing: boolean = false;
    debugInfo: 0 | 1 | 2 = 0;
    private readonly debugText: string[] = [];

    /**
     * Time, progress (ticks), and tempo (ticks per second), sorted by time. Binary-searchable.
     * Tempo linearly interpolates to the next lookup point with respect to ticks.
     */
    private tickLookupPoints: [number, number, number][] = [];
    private songLength: number = 0;

    frameResult: BeepboxRendererFrameResults = {
        renderTime: 0,
        debugText: []
    };

    constructor(canvas: OffscreenCanvas, data: BeepboxSettingsData) {
        this.canvas = canvas;
        this.ctx = this.canvas.getContext('2d')!;
        this.data = data;
    }

    draw(time: number): void {
        const startTime = performance.now();
        this.debugText.length = 0;
        this.ctx.reset();
        if (this.resized !== undefined) {
            this.canvas.width = this.resized[0];
            this.canvas.height = this.resized[1];
        }
        // move origin to bottom left and apply transforms
        this.ctx.translate(0, this.canvas.height);
        this.ctx.scale(1, -1);
        this.ctx.scale(this.data.flipX ? -1 : 1, this.data.flipY ? -1 : 1);
        this.ctx.translate(this.data.flipX ? -this.canvas.width : 0, this.data.flipY ? -this.canvas.height : 0);
        if (this.data.rotate) this.ctx.transform(0, 1, 1, 0, 0, 0);
        // spaghetti v2
        // TODO: THINGS
        // TODO: THINGS
        // TODO: THINGS
        // TODO: THINGS
        // TODO: THINGS
        // TODO: THINGS
        this.createColorScale
        this.createColorStyle
        // TODO: THINGS
        // TODO: THINGS
        // TODO: THINGS
        // track performance metrics
        const endTime = performance.now();
        if (this.playing && this.debugInfo == 2) this.printDebugInfo(time);
        // finalize
        this.frameResult = {
            renderTime: endTime - startTime,
            debugText: this.debugText
        }
        this.resized = undefined;
    }

    private lookupTicks(time: number): number {
        if (this.tickLookupPoints.length == 0) return 0;
        if (this.tickLookupPoints.length == 1) return this.tickLookupPoints[0][2] * time;
        // we binary search the tempo modulations to find what part of the song we're in
        let start = 0, end = this.tickLookupPoints.length - 1;
        // this search is a bit weird because we want the start/end to point to the before/after points
        while (end - start > 1) {
            const mid = Math.floor((start + end) / 2);
            const [t, tk] = this.tickLookupPoints[mid];
            if (t == time) return tk;
            if (t < time) {
                start = mid;
            } else {
                end = mid;
            }
        }
        // the search stops early and will always have end adjacent to start
        const [t1, tk1, tps1] = this.tickLookupPoints[start];
        const [t2, tk2, tps2] = this.tickLookupPoints[end];
        // I forsee an edge case if the time is after the last lookup tick
        if (time == t1) return tk1;
        if (time == t2) return tk2;
        if (time > t2) return tk2 + (tps2 * (time - t2));
        // k = tick, r = slope of tempo change with respect to k, r0 = start tempo, k0 = start tick, t0 = start time
        // dk/dt = r(k-k0) + r0
        // k(t) = (r0/r)e^r(t-t0) + k0 - r0/r
        // this looks weird but it works i guess
        // also an edge case if tempo1 and tempo2 are the same, it divides by 0
        if (tps1 == tps2) return tk1 + (tps1 * time - t1);
        const r = (tps2 - tps1) / (tk2 - tk1);
        return tps1 / r * (Math.E ** (r * (time - t1))) + tk1 - tps1 / r;
    }
    private ticksToBar(tick: number): number {
        // skipped beats don't cut bars short
        return Math.floor(tick / (this.data.song?.barLength ?? 1));
    }
    private ticksInBar(tick: number): number {
        return tick % (this.data.song?.barLength ?? 1);
    }

    private calcViewportSize(): { readonly width: number, readonly height: number } {
        return {
            width: this.data.rotate ? this.canvas.height : this.canvas.width,
            height: this.data.rotate ? this.canvas.width : this.canvas.height
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
    updateData(data: BeepboxSettingsData): void {
        this.data = data;
        this.createTickLUT();
    }
    private createTickLUT() {
        const tickLUT: typeof this.tickLookupPoints = [];
        let length = 0;
        // reference for modulator enum:
        // https://github.com/ultraabox/ultrabox_typescript/blob/main/synth/SynthConfig.ts
        // channel -1 is song, modulator 2 is tempo and 4 is next bar
        this.tickLookupPoints = tickLUT;
        this.songLength = length;
    }

    private printDebugInfo = useThrottleFn((time: number) => {
        console.debug({
            width: this.canvas.width,
            height: this.canvas.height,
            debug: this.debugText,
            data: this.data,
            time: time
        });
    }, 500);
}

export default BeepboxRenderInstance;

// wrap a visualizer render instance for communication
if (isInWorker) {
    onmessage = (e) => {
        const renderer = new BeepboxRenderInstance(e.data[0], e.data[1]);
        onmessage = (e: RendererMessageEvent) => {
            switch (e.data.type) {
                case 'draw':
                    renderer.playing = e.data.playing;
                    renderer.debugInfo = e.data.debug;
                    renderer.draw(e.data.time);
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
                case 'stop':
                    // everything should be blocking in the worker, no async, so no need for locks
                    close();
                    break;
            }
        };
    }
}
