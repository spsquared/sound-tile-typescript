import chroma from "chroma-js";
import type { ColorData } from '@/components/inputs/colorPicker';
import type BeepboxData from "../beepboxData";

namespace BufferMapper {
    /**
     * Uniform buffer builder for general viewport data, like time.
     */
    export class Viewport {
        /**
         *          | index count
         *          | instance count
         * indirect | first index
         *          | base vertex
         *          | first instance
         * f32 - tick offset (translates all notes)
         */
        static readonly byteLength = 24;

        readonly buffer: ArrayBuffer;
        private readonly indirectView: Uint32Array;
        private readonly f32View: Float32Array;
        // private readonly uint32View: Uint32Array;

        constructor(buffer: ArrayBuffer) {
            this.buffer = buffer;
            this.indirectView = new Uint32Array(this.buffer, 0, 5);
            this.f32View = new Float32Array(this.buffer, 20);
            // this.uint32View = new Uint32Array(this.buffer, 20);
        }

        get tickOffset(): number {
            return this.f32View[0];
        }
        set tickOffset(t: number) {
            this.f32View[0] = t;
        }

        getVertexRange(): [number, number] {
            return [this.indirectView[2], this.indirectView[2] + this.indirectView[0]];
        }

        setVertexRange([min, max]: [number, number]): void {
            this.indirectView[2] = min;
            this.indirectView[0] = max - min;
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
            const canvas = new OffscreenCanvas(...mips[0]);
            const ctx = canvas.getContext('2d', {
                colorType: 'unorm8',
                willReadFrequently: true
            })!;
            const textureMips: ArrayBuffer[][] = [];
            for (let i = 0; i < instruments.length; i++) {
                const instr = instruments[i];
                instrF32View[i] = instr.parallax;
                // generate textures and all their very fun and weird mipmaps using a canvas
                ctx.reset();
                const writeTexture = (color: ColorData, y: number): void => {
                    if (color.type == 'solid') {
                        ctx.fillStyle = chroma(color.color).alpha(color.alpha).hex();
                    } else if (color.type == 'gradient') {
                        const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
                        for (const stop of color.stops) {
                            gradient.addColorStop(Math.max(0, Math.min(1, stop.t)), chroma(stop.c).alpha(stop.a).hex());
                        }
                        ctx.fillStyle = gradient;
                    }
                    ctx.fillRect(0, y * canvas.height / 2, canvas.width, canvas.height / 2);
                };
                writeTexture(instr.foreground, 0);
                if (instr.background !== undefined) writeTexture(instr.background, 1);
                // generate mips
                const textures: ArrayBuffer[] = [
                    // buffers can now be Float16Array but typescript hasn't caught up yet? i hope they kept backwards compatibility...
                    ctx.getImageData(0, 0, canvas.width, canvas.height).data.buffer.transfer()
                ];
                for (let j = 1; j < mips.length; j++) {
                    // draw previous size at half size
                    ctx.drawImage(canvas, 0, 0, mips[j - 1][0], mips[j - 1][1], 0, 0, mips[j][0], mips[j][1]);
                    textures.push(ctx.getImageData(0, 0, mips[j][0], mips[j][1]).data.buffer.transfer())
                }
                textureMips.push(textures);
            }
            return {
                buffer: instrBuffer,
                textures: textureMips
            };
        }
    }

    export interface Note {
        pitches: BeepboxData.Pattern['notes'][number]['pitches']
        points: BeepboxData.Pattern['notes'][number]['points']
        instrument: number
    }

    export namespace Note {
        export const vertexStride = 16; // vec3<f32> and u32

        /**
         * Helper thing for turning notes into vertices, and tracking offsets for bar culling.
         * tbh idk why this exists other than to put more code in this file.
         */
        // export class GeometryBuilder {
        //     private readonly buffer: ArrayBuffer;
        //     private readonly f32View: Float32Array;
        //     private readonly u32View: Uint32Array;
        //     private readonly indexBuffer: Uint32Array<ArrayBuffer>;

        //     private static readonly blockSize: number = 256;
        //     private static readonly blockByteLength: number = this.blockSize * vertexStride;

        //     private readonly data: BeepboxData['channelStyles'];
        //     private tickOffset: number = 0;
        //     private length: number = 0;
        //     private indexLength: number = 0;
        //     private readonly barVertexOffsets: number[] = [0];

        //     private finished: boolean = false;

        //     constructor(data: BeepboxData['channelStyles'], maxBufferSize: number) {
        //         this.data = data;
        //         this.buffer = new ArrayBuffer(GeometryBuilder.blockByteLength, { maxByteLength: maxBufferSize });
        //         this.f32View = new Float32Array(this.buffer);
        //         this.u32View = new Uint32Array(this.buffer);
        //         this.indexBuffer = new Uint32Array(new ArrayBuffer(GeometryBuilder.blockSize * 4, { maxByteLength: maxBufferSize }));
        //     }

        //     nextBar(tickOffset: number): void {
        //         if (this.finished) throw new Error('Cannot invoke "nextBar()" on finished geometry builder');
        //         this.barVertexOffsets.push(this.indexLength - this.barVertexOffsets[this.barVertexOffsets.length - 1]);
        //         this.tickOffset = tickOffset;
        //     }

        //     submit(note: Note): void {
        //         if (this.finished) throw new Error('Cannot invoke "submit()" on finished geometry builder');
        //         note
        //     }

        //     finish(): { vertex: ArrayBuffer, index: ArrayBuffer, vertexOffsets: number[] } {
        //         if (this.finished) throw new Error('Cannot invoke "finish()" on finished geometry builder');
        //         this.finished = true;
        //         const ret = {
        //             vertex: this.buffer.transferToFixedLength(this.length * vertexStride),
        //             index: this.indexBuffer.buffer.transferToFixedLength(this.indexLength * 4),
        //             vertexOffsets: this.barVertexOffsets.slice()
        //         };
        //         return ret;
        //     }
        // }
    }
}

export default BufferMapper;