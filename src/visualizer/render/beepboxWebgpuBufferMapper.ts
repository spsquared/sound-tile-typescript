import chroma from "chroma-js";
import type { ColorData } from '@/components/inputs/colorPicker';

namespace BufferMapper {
    /**
     * Uniform buffer builder for general viewport data, like time.
     */
    export class Viewport {
        /**
         * f32 - time offset (translates all notes)
         */
        static readonly byteLength = 4;

        readonly buffer: ArrayBuffer;
        private readonly f32View: Float32Array;

        constructor(buffer: ArrayBuffer) {
            this.buffer = buffer;
            this.f32View = new Float32Array(this.buffer, 0, 1);
        }

        get timeOffset(): number {
            return this.f32View[0];
        }
        set timeOffset(t: number) {
            this.f32View[0] = t;
        }
    }

    /**
     * Instrument data like parallax and color. Each instrument gets its own entry in the
     * `Instrument` struct array in shader and its own texture containing the foreground
     * and background color. Note geometry indexes this using the lower 16 bits of a u32
     * (for a maximum of 65536 styles) with bit 17 high shifting v coordinate to background
     */
    export interface Instrument {
        parallax: number
        foreground: ColorData
        background?: ColorData
    }

    // what the fuck is this fragmented-ass code... assumed array structures everywhere
    export namespace Instrument {
        export const stride = 4;
        /**Texture width of mip level 0 */
        export const colorTextureSize = 256;
        /**Number of mip levels (combined with colorTextureSize to generate mip sizes) */
        export const mipLevels = 6;
        /**
         * Texture sizes of each mip level. The smallest mip is 2 pixels tall (bg+fg) and
         * subsequently larger mips get taller. This shouldn't get close to the texture size cap
         * but is a bit wasteful, this is to reduce running into texture array size limits.
         */
        export const mips: readonly [number, number][] = Array.from({ length: mipLevels }, (_, i) => [
            colorTextureSize / (2 ** (i + 1)),
            2 ** (mipLevels - i)
        ]);

        /**
         * Write instruments into buffer in GPU format and generate mip levels for colors.
         * Outputted textures are rgba 24-bit color.
         * @param instruments
         */
        export function writeInstruments(instruments: Instrument[]): { buffer: ArrayBuffer, textures: ArrayBuffer[][] } {
            const instrBuffer = new ArrayBuffer(stride * instruments.length);
            const instrF32View = new Float32Array(instrBuffer);
            const textureMips = instruments.map(() => mips.map(([width, height]) => new ArrayBuffer(width * height * 4)));
            for (let i = 0; i < instruments.length; i++) {
                const instr = instruments[i];
                instrF32View[i] = instr.parallax;
                // generate textures and all their very fun and weird mipmaps
                const mipsForeground = textureMips[i].map((buf, j) => new Uint8Array(buf, 0, mips[j][0] * 4));
                const mipsBackground = textureMips[i].map((buf, j) => new Uint8Array(buf, mips[j][0] * 4, mips[j][0] * 4));
                const writeTexture = (color: ColorData, buffers: Uint8Array[]): void => {
                    // TODO: premultiply alpha?
                    if (color.type == 'solid') {
                        const [r, g, b] = chroma(color.color).rgb();
                        const a = Math.round(color.alpha * 255); // this one is a float lol
                        for (const view of buffers) {
                            for (let j = 0; j < view.length; j += 4) {
                                view[j] = r;
                                view[j + 1] = g;
                                view[j + 2] = b;
                                view[j + 3] = a;
                            }
                        }
                    } else if (color.type == 'gradient') {
                        const colors = chroma.scale(color.stops.map((c) => chroma(c.c).alpha(c.a))).domain(color.stops.map((c) => Math.max(0, Math.min(1, c.t)))).colors(colorTextureSize, null);
                        const mipHist: [number, number, number, number][] = [];
                        for (let j = 0; j < colorTextureSize; j++) {
                            // inefficient but like who gives a fuck
                            const [r, g, b, aRaw] = colors[j].rgba();
                            mipHist.push([r, g, b, aRaw]);
                            for (let k = 0; k < buffers.length; k++) {
                                if ((j + 1) % (2 ** k) == 0) {
                                    // it turns out chroma rgb actually accepts rgba as well
                                    const [r, g, b, aRaw] = chroma.average(mipHist.slice(-(2 ** k)).map((c) => chroma(...c, 'rgb'))).rgba();
                                    const a = Math.round(aRaw * 255);
                                    const offset = Math.floor(j / (2 ** k)) * 4;
                                    const tex = buffers[k];
                                    tex[offset] = r;
                                    tex[offset + 1] = g;
                                    tex[offset + 2] = b;
                                    tex[offset + 3] = a;
                                }
                            }
                        }
                    }
                };
                writeTexture(instr.foreground, mipsForeground);
                if (instr.background !== undefined) writeTexture(instr.background, mipsBackground);
            }
            return {
                buffer: instrBuffer,
                textures: textureMips
            };
        }
    }

    export namespace Note {
        export const vertexStride = 16; // vec3<f32> and u32
    }
}

export default BufferMapper;