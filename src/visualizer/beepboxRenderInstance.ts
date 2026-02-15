import { useThrottleFn } from '@vueuse/core';
import chroma from 'chroma-js';
import { ColorData } from '@/components/inputs/colorPicker';
import type { RendererMessageData, RendererMessageEvent, BeepboxRendererFrameResults, BeepboxSettingsData } from './beepboxRenderer';

const isInWorker = 'importScripts' in globalThis;

/**
 * Renderer class used by both the worker renderer and the fallback renderer.
 */
export class BeepboxRenderInstance {
    readonly canvas: OffscreenCanvas;
    readonly ctx: OffscreenCanvasRenderingContext2D;
    private data: BeepboxSettingsData;
    private dataUpdated: boolean = false;
    private resized: [number, number] | undefined = undefined;

    playing: boolean = false;
    debugInfo: 0 | 1 | 2 = 0;
    private readonly debugText: string[] = [];

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
        if (this.resized !== undefined || this.dataUpdated) {
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
        this.dataUpdated = false;
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
        this.dataUpdated = true;
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
