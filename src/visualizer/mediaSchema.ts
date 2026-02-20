import { merge } from 'lodash-es'; // hopefully tree-shakeable
import { DeepPartial } from '@/components/utils';
import { ColorData } from '@/components/inputs/colorPicker';
import { GroupTile as GroupTileInstance } from './tiles';
import VisualizerData from './visualizerData';
import BeepboxData from './beepboxData';

namespace MediaSchema {
    /**Legacy (old Sound Tile) definitions for Schema V0 and V1 */
    export namespace Legacy {
        /**Legacy mode enumeration, even more scuffed somehow */
        export enum LegacyVisualizerMode {
            FREQ_BAR_1 = 0,
            FREQ_BAR_2 = 1,
            FREQ_LINE_1 = 2,
            FREQ_LINE_2 = 7,
            FREQ_FILL_1 = 3,
            FREQ_FILL_2 = 5,
            FREQ_LUMINANCE = 8,
            WAVE_DIRECT = 4,
            WAVE_CORRELATED = 9,
            SPECTROGRAM = 10,
            CHANNEL_PEAKS = 6
        }
        /**Legacy color picker data */
        type LegacyColorData = {
            mode: 0,
            value: string
        } | {
            mode: 1,
            value: {
                type: 0 | 1 | 2
                stops: [number, string][]
                x: number
                y: number
                r: number
                angle: number
            }
        }
        /**Legacy visualizer options & audio data */
        export type LegacyVisualizerData = {
            buffer: ArrayBuffer
            mode: LegacyVisualizerMode
            fftSize: number
            color: string | LegacyColorData,
            color2: LegacyColorData,
            fillAlpha?: number
            altColor?: boolean
            barWidthPercent: number
            barCrop: number
            barScale?: number
            smoothing?: number
            barLEDEffect?: boolean
            barLEDCount?: number
            barLEDSize?: number
            symmetry?: number
            scale: number
            resolution?: number
            lineWidth: number
            corrSamples?: number
            corrWeight?: number
            corrSmoothing?: number
            spectHistoryLength?: number
            spectDiscreteVals?: number
            barMinDecibels?: number
            flippedX?: boolean
            flippedY?: boolean
            rotated?: boolean
            volume?: number
            muted?: boolean
            muteOutput?: boolean
        };
        /**Legacy channel peaks mode visualizer options & audio data */
        export type LegacyChannelPeaksData = {
            buffer: ArrayBuffer
            color: string | LegacyColorData
            smoothing?: number
            channelCount: number
            barWidthPercent: number
            barLEDEffect?: boolean
            barLEDCount?: number
            barLEDSize?: number
            flippedX?: boolean
            flippedY?: boolean
            rotated?: boolean
            volume?: number
            muteOutput?: boolean
        };

        // actually wtf is this ordering
        const legacyModeTranslator = [
            VisualizerData.Mode.FREQ_BAR,
            VisualizerData.Mode.FREQ_BAR,
            VisualizerData.Mode.FREQ_LINE,
            VisualizerData.Mode.FREQ_FILL,
            VisualizerData.Mode.WAVE_DIRECT,
            VisualizerData.Mode.FREQ_FILL,
            VisualizerData.Mode.CHANNEL_PEAKS,
            VisualizerData.Mode.FREQ_LINE,
            VisualizerData.Mode.FREQ_LUMINANCE,
            VisualizerData.Mode.WAVE_CORRELATED,
            VisualizerData.Mode.SPECTROGRAM
        ] as const;

        /**
         * Convert legacy (old Sound Tile) color data into the enhanced color picker format.
         * @param color Color in old format
         * @param preserveGradientStops Do not "fix" ordering of stops: New gradients have their axes transformed
         * to match the visualizer's axes, so stop positions must be inverted for the new format. However
         * "alt color" modes do not apply, so use this option to skip the fix.
         * @param applyPositionToAlpha The luminance bars mode used to apply alpha as well as the color gradient in "alt color"
         * mode, however the new mode does not. Use this to multiply stop alphas by their position.
         * @returns Color in new format
         */
        export function translateColorData(color: string | LegacyColorData, preserveGradientStops: boolean = false, applyPositionToAlpha: boolean = false): ColorData {
            if (typeof color == 'string') {
                return {
                    type: 'solid',
                    color: color,
                    alpha: 1
                };
            } else if (color.mode == 0) {
                return {
                    type: 'solid',
                    color: color.value,
                    alpha: 1
                };
            } else if (color.mode == 1) {
                // new gradients have the y-axis flipped to match the visualizer y-axis so old gradients are upside-down
                // also includes fix for gradients that technically use undefined behavior (two stops with the same position)
                const stops = (color.value.type == 1 || preserveGradientStops) ? color.value.stops.map((([t, c]) => ({ t: t, c: c, a: 1 }))) : color.value.stops.map((([t, c]) => ({ t: 1 - t, c: c, a: 1 }))).reverse();
                return {
                    type: 'gradient',
                    pattern: (['linear', 'radial', 'conic'] as const)[color.value.type],
                    stops: applyPositionToAlpha ? stops.map((s) => (s.a = s.t, s)) : stops,
                    x: color.value.x,
                    y: 1 - color.value.y,
                    radius: color.value.r,
                    angle: -color.value.angle
                };
            }
            // i mean idk
            return {
                type: 'solid',
                color: '#FFFFFF',
                alpha: 1
            };
        }
        /**
         * Convert legacy (old Sound Tile) visualizer data into the current format.
         * @param data Data in old format
         * @returns Data in new format
         */
        export function translateVisualizerData(data: LegacyVisualizerData | LegacyChannelPeaksData): VisualizerData {
            if ('channelCount' in data) return merge<VisualizerData, DeepPartial<VisualizerData>>(VisualizerData.createDefault(), {
                buffer: data.buffer,
                mode: VisualizerData.Mode.CHANNEL_PEAKS,
                gain: data.volume,
                mute: data.muteOutput,
                color: translateColorData(data.color),
                levelOptions: {
                    channels: data.channelCount,
                    frameSmoothing: data.smoothing,
                    size: data.barWidthPercent,
                    ledEffect: data.barLEDEffect,
                    ledCount: data.barLEDCount,
                    ledSize: data.barLEDSize
                },
                rotate: data.rotated,
                flipX: data.flippedX,
                flipY: data.flippedY
            });
            else return merge<VisualizerData, DeepPartial<VisualizerData>>(VisualizerData.createDefault(), {
                buffer: data.buffer,
                mode: legacyModeTranslator[data.mode] ?? VisualizerData.Mode.FREQ_BAR,
                gain: data.volume,
                mute: data.muted ?? data.muteOutput,
                color: translateColorData(data.color, data.altColor && [0, 1, 8].includes(data.mode), data.altColor && data.mode == 8),
                color2: translateColorData(data.color2),
                color2Alpha: data.fillAlpha,
                altColorMode: data.altColor,
                // FFT size divided by 2 due to bug in old version using only half the available time domain
                fftSize: [LegacyVisualizerMode.WAVE_DIRECT, LegacyVisualizerMode.WAVE_CORRELATED].includes(data.mode) ? data.fftSize / 2 : data.fftSize,
                freqOptions: {
                    bar: {
                        size: data.barWidthPercent,
                        ledEffect: data.barLEDEffect,
                        ledCount: data.barLEDCount,
                        ledSize: data.barLEDSize
                    },
                    line: {
                        thickness: data.lineWidth
                    },
                    spectrogram: {
                        historyLength: data.spectHistoryLength,
                        quantization: data.spectDiscreteVals
                    },
                    smoothing: data.smoothing,
                    freqCutoff: data.barCrop,
                    minDbCutoff: data.barMinDecibels,
                    scale: data.barScale,
                    // old duplicate modes were removed and replaced with the reflect setting
                    reflect: [LegacyVisualizerMode.FREQ_BAR_2, LegacyVisualizerMode.FREQ_LINE_2, LegacyVisualizerMode.FREQ_FILL_2].includes(data.mode) ? 0.5 : 0,
                    symmetry: (['none', 'low', 'high'] as const)[data.symmetry ?? 0]
                },
                waveOptions: {
                    scale: data.scale,
                    thickness: data.lineWidth,
                    resolution: data.resolution,
                    correlation: {
                        samples: data.corrSamples,
                        gradientDescentGain: data.corrWeight,
                        frameSmoothing: data.corrSmoothing
                    }
                },
                rotate: data.rotated,
                flipX: data.flippedX,
                flipY: data.flippedY
            });
        }

        /**Legacy tree layouts, very scuffed */
        export type LegacyTree = {
            orientation: boolean | 0 // extremely well-designed code
            flex?: number
            flexGrow?: number
            children: LegacyTree[]
        } | {
            type: 'v'
            backgroundColor: string
            flex?: number
            visualizer: LegacyVisualizerData | null
        } | {
            type: 'vi'
            backgroundColor: string
            flex?: number
            visualizer: LegacyVisualizerData | null
            image: string | null
            smoothing?: boolean
            imageBackground?: boolean
            imageReactive?: boolean
            imageReactiveMin?: number
            imageReactiveMax?: number
        } | {
            type: 'vt'
            backgroundColor: string
            flex?: number
            visualizer: LegacyChannelPeaksData | null
            text: string
            fontSize: number
            textAlign: number
            textColor: string
        } | {
            type: 'cp'
            backgroundColor: string
            flex?: number
            visualizer: LegacyVisualizerData | null
        } | {
            type: 'i'
            backgroundColor: string
            flex?: number
            image: string | null
            smoothing?: boolean
        } | {
            type: 't'
            backgroundColor: string
            flex?: number
            text: string
            fontSize: number
            textAlign: number
            color: string
        } | {
            type: 'b'
            backgroundColor: string
            flex?: number
        } | {
            type: 'grass'
            backgroundColor: string
            flex?: number
        };
    }

    /**Tile definitions for schema V2 */
    export namespace V2 {
        /**Blank tile schema-layout data */
        export type Tile = {
            // type can't be stricter without causing issues for subclasses
            // abstract Tile would break code that relies on instances of arbitrary tiles
            id: bigint
            type: string
            label: string
            size: number
            backgroundColor: ColorData
        };
        /**Group tile schema-layout data */
        export type GroupTile = Tile & {
            orientation: 0 | 1 | 2
            borderColor: ColorData
            hideBorders: boolean
            children: AllTiles[]
        };
        /**Visualizer tile schema-layout data - data is partial as files may be missing newer additions */
        export type VisualizerTile = Tile & {
            // audio buffers are stored outside of tiles and replaced with indices to handle tiles with the same source
            data: DeepPartial<Omit<VisualizerData, 'buffer' | 'mode'>, ColorData> & {
                buffer: ArrayBuffer | number | null
                mode: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7
            }
        };
        /**Text tile schema-layout data */
        export type TextTile = Tile & {
            textHtml: string
            textColor: ColorData
            align: 'start' | 'center' | 'end'
        };
        /**Image tile schema-layout data */
        export type ImageTile = Tile & {
            imgSrc: ArrayBuffer
            smoothDrawing: boolean
        };
        /**Grass tile schema-layout data */
        export type GrassTile = Tile & {};

        type AllTiles = Tile | GroupTile | VisualizerTile | TextTile | ImageTile | GrassTile;
    }

    /**Tile definitions for schema V3 */
    export namespace V3 {
        /**Blank tile schema-layout data */
        export type Tile = {
            // type can't be stricter without causing issues for subclasses
            // abstract Tile would break code that relies on instances of arbitrary tiles
            id: bigint
            type: string
            label: string
            size: number
            backgroundColor: ColorData
        };
        /**Group tile schema-layout data */
        export type GroupTile = Tile & {
            orientation: GroupTileInstance.Orientation
            borderColor: ColorData
            hideBorders: boolean
            children: Tile[]
        };
        /**Visualizer tile schema-layout data - data is partial as files may be missing newer additions */
        export type VisualizerTile = Tile & {
            // audio buffers are stored outside of tiles and replaced with indices to handle tiles with the same source
            data: DeepPartial<Omit<VisualizerData, 'buffer'>, ColorData> & { buffer: ArrayBuffer | number | null }
        };
        /**BeepBox tile schema-layout data */
        export type BeepboxTile = Tile & {
            data: DeepPartial<BeepboxData, ColorData | BeepboxData.Song>
        };
        /**Text tile schema-layout data */
        export type TextTile = Tile & {
            textHtml: string
            textColor: ColorData
            align: 'start' | 'center' | 'end'
        };
        /**Image tile schema-layout data */
        export type ImageTile = Tile & {
            imgSrc: ArrayBuffer
            smoothDrawing: boolean
            position: { x: number, y: number, rotation: number, scale: number }
        };
        /**Grass tile schema-layout data */
        export type GrassTile = Tile & {};
    }

    /**Most recent definitions for schema version */
    export namespace Current {
        /**Blank tile schema-layout data */
        export type Tile = V3.Tile;
        /**Group tile schema-layout data */
        export type GroupTile = V3.GroupTile;
        /**Visualizer tile schema-layout data - data is partial as files may be missing newer additions */
        export type VisualizerTile = V3.VisualizerTile;
        /**BeepBox tile schema-layout data */
        export type BeepboxTile = V3.BeepboxTile;
        /**Text tile schema-layout data */
        export type TextTile = V3.TextTile;
        /**Image tile schema-layout data */
        export type ImageTile = V3.ImageTile;
        /**Grass tile schema-layout data */
        export type GrassTile = V3.GrassTile;
    }

    // file layouts

    /**File layout for extremely old legacy Sound Tile schema V0 */
    export type SchemaV0 = {
        version: 0
        root: Legacy.LegacyTree
    };
    /**File layout for legacy Sound Tile schema V1 */
    export type SchemaV1 = {
        version: 1
        root: Legacy.LegacyTree
        metadata: {
            image: string
            title: string
            subtitle: string
        },
    };
    /**File layout for Sound Tile schema V2 */
    export type SchemaV2 = {
        version: 2
        metadata: {
            title: string
            subtitle: string
            coverArt: ArrayBuffer
        }
        sources: ArrayBuffer[]
        tree: V2.GroupTile
        modulations: {
            source: { id: bigint | 'global', key: string },
            target: { id: bigint | 'global', key: string },
            transforms: [string, unknown][]
        }[]
    };
    /**File layout for Sound Tile schema V3, current version */
    export type SchemaV3 = {
        version: 3
        metadata: {
            title: string
            subtitle: string
            coverArt: ArrayBuffer
        }
        sources: ArrayBuffer[]
        tree: V3.GroupTile
        modulations: {
            source: { id: bigint | 'global', key: string },
            target: { id: bigint | 'global', key: string },
            transforms: [string, unknown][]
        }[]
    };

    /**File layouts for all schema versions */
    export type Schema = SchemaV0 | SchemaV1 | SchemaV2 | SchemaV3;
}

export default MediaSchema;