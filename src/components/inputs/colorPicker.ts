import { useLocalStorage } from '@vueuse/core';
import { reactive } from 'vue';
import { cloneDeep } from 'lodash-es';
import chroma from 'chroma-js';

export type ColorData = ({ type: 'solid' } & ColorPicker['solidData'])
    | ({ type: 'gradient' } & ColorPicker['gradientData']);

const clipboard = useLocalStorage<ColorData>('colorPickerClipboard', { type: 'solid', color: '#FFFFFF', alpha: 1 } satisfies ColorData);

/**
 * Custom color picker, for use the EnhancedColorPicker Vue component.
 * Note that reactivity DOES NOT work by default, needs wrapping in `reactive()` call!
 */
export class ColorPicker {
    /**Color mode */
    type: 'solid' | 'gradient' = 'solid';
    solidData: {
        /**Solid color */
        color: string
        /**Alpha/opacity, from 0-1 */
        alpha: number
    } = {
            color: '#FFFFFF',
            alpha: 1
        };
    gradientData: {
        /**CSS pattern of gradient */
        pattern: 'linear' | 'radial' | 'conic',
        /**List of color stops */
        stops: ({
            /**Position along gradient, from 0-1 */
            t: number,
            /**Color at that stop */
            c: string,
            /**Alpha/opacity at that stop, from 0-1 */
            a: number
        })[],
        /**X coordinate of radial and conic gradients in proportion of width from left */
        x: number,
        /**Y coordinate of radial and conic gradients in proportion of height from right */
        y: number,
        /**Radius of radial gradients in proportion of max(width, height) */
        radius: number,
        /**Angle of linear and conic gradients in degrees */
        angle: number
    } = {
            pattern: 'linear',
            stops: [{ t: 0, c: '#FFFFFF', a: 1 }],
            x: 0.5,
            y: 0.5,
            radius: 1,
            angle: 0
        };

    open: boolean = false;

    constructor(initial?: ColorData | string) {
        if (initial !== undefined) {
            if (typeof initial == 'string') this.solidData.color = initial;
            else this.colorData = initial;
        }
    }

    static createReactive(initial?: ColorData | string): ColorPicker {
        return reactive(new ColorPicker(initial));
    }

    /**Get a css `background` string for the gradient (radial gradients require a `--radial-gradient-size` css variable) */
    get cssStyle(): string {
        if (this.type == 'solid') {
            return chroma(this.solidData.color).alpha(this.solidData.alpha).hex();
        } else if (this.type == 'gradient') {
            const stopsStr = this.gradientData.stops.slice().sort((a, b) => a.t - b.t).reduce((acc, curr) => acc + `, ${chroma(curr.c).alpha(curr.a).hex()} ${curr.t * 100}%`, '');
            switch (this.gradientData.pattern) {
                case 'linear':
                    return `linear-gradient(${180 - this.gradientData.angle}deg${stopsStr})`;
                case 'radial':
                    return `radial-gradient(circle calc(${this.gradientData.radius} * var(--radial-gradient-size)) at ${this.gradientData.x * 100}% ${this.gradientData.y * 100}%${stopsStr})`;
                case 'conic':
                    return `conic-gradient(from ${90 + this.gradientData.angle}deg at ${this.gradientData.x * 100}% ${this.gradientData.y * 100}%${stopsStr})`;
            }
        }
        return '#FFFFFF';
    }

    get colorData(): ColorData {
        // sort of need these extra "_" (lol face) properties to trigger reactivity when color data changes
        if (this.type == 'solid') {
            return {
                ...this.solidData,
                type: 'solid'
            };
        } else if (this.type == 'gradient') {
            return {
                ...this.gradientData,
                type: 'gradient'
            };
        }
        return {
            type: 'solid',
            color: '#FFFFFF',
            alpha: 1
        };
    }

    set colorData(data: ColorData) {
        this.type = data.type;
        if (data.type == 'solid') {
            this.solidData = { ...data, type: undefined } as any;
        } else if (data.type == 'gradient') {
            this.gradientData = { ...data, type: undefined } as any;
        }
    }

    copyColor(): void {
        clipboard.value = cloneDeep(this.colorData);
    }

    pasteColor(): void {
        this.colorData = cloneDeep(clipboard.value);
    }
}

export default ColorPicker;
