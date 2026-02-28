import chroma from 'chroma-js';
import type { ColorData } from '@/components/inputs/colorPicker';
import type { BeepboxSettingsData } from './beepboxRenderer';
import BeepboxRenderInstance from './beepboxRInstAbstract';

class Canvas2dRenderer extends BeepboxRenderInstance {
    readonly ctx: OffscreenCanvasRenderingContext2D;

    constructor(canvas: OffscreenCanvas, data: BeepboxSettingsData) {
        super(canvas, data);
        this.ctx = this.canvas.getContext('2d')!;
    }

    protected async drawFrame(tick: number): Promise<void> {
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
        this.ctx.save();
        this.drawStaticNotes(tick);
    }

    private drawStaticNotes(tick: number): void {
        tick
        this.createColorScale
        this.createColorStyle
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
}

export default Canvas2dRenderer;
