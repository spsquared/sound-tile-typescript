import { merge } from 'lodash-es'; // hopefully tree-shakeable
import { DeepPartial } from '@/components/scripts/utils';
import { ColorData } from '@/components/inputs/colorPicker';
import { createDefaultVisualizerData, VisualizerData, VisualizerMode } from './visualizerData';
import { GroupTile as GroupTileInstance } from './tiles';

export namespace MediaSchema {
    /**Blank tile schema-layout data */
    export type Tile = {
        // type can't be stricter without causing issues for subclasses
        // abstract Tile would break code that relies on instances of arbitrary tiles
        type: string
        label: string
        size: number
        backgroundColor: ColorData
    };
    /**Group tile schema-layout data */
    export type GroupTile = Tile & {
        orientation: typeof GroupTileInstance.HORIZONTAL
        borderColor: ColorData
        children: Tile[]
    };
    /**Visualizer tile schema-layout data - data is partial as files may be missing newer additions */
    export type VisualizerTile = Tile & {
        data: DeepPartial<Omit<VisualizerData, 'buffer'>, ColorData> & { buffer: ArrayBuffer | number | null }
    };
    /**Text tile schema-layout data */
    export type TextTile = Tile & {
        textHtml: string
        textColor: ColorData
        align: 'start' | 'center' | 'end'
    };
    /**Image tile schema-layout data */
    export type ImageTile = Tile & {
        imgSrc: string
        smoothDrawing: boolean
    };
    /**Grass tile schema-layout data */
    export type GrassTile = Tile & {};

    /**Legacy (old Sound Tile) mode enumeration, even more scuffed somehow */
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
    /**Legacy (old Sound Tile) color picker data */
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
    /**Legacy (old Sound Tile) visualizer options & audio data */
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
    /**Legacy (old Sound Tile) channel peaks mode visualizer options & audio data */
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
    const legacyModeTranslator: VisualizerMode[] = [
        VisualizerMode.FREQ_BAR,
        VisualizerMode.FREQ_BAR,
        VisualizerMode.FREQ_LINE,
        VisualizerMode.FREQ_FILL,
        VisualizerMode.WAVE_DIRECT,
        VisualizerMode.FREQ_FILL,
        VisualizerMode.CHANNEL_PEAKS,
        VisualizerMode.FREQ_LINE,
        VisualizerMode.FREQ_LUMINANCE,
        VisualizerMode.WAVE_CORRELATED,
        VisualizerMode.SPECTROGRAM
    ];
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
    export function translateLegacyColorData(color: string | LegacyColorData, preserveGradientStops: boolean = false, applyPositionToAlpha: boolean = false): ColorData {
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
    export function translateLegacyVisualizerData(data: LegacyVisualizerData | LegacyChannelPeaksData): VisualizerData {
        if ('channelCount' in data) return merge<VisualizerData, DeepPartial<VisualizerData>>(createDefaultVisualizerData(), {
            buffer: data.buffer,
            mode: VisualizerMode.CHANNEL_PEAKS,
            gain: data.volume,
            mute: data.muteOutput,
            color: translateLegacyColorData(data.color),
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
        else return merge<VisualizerData, DeepPartial<VisualizerData>>(createDefaultVisualizerData(), {
            buffer: data.buffer,
            mode: legacyModeTranslator[data.mode] ?? VisualizerMode.FREQ_BAR,
            gain: data.volume,
            mute: data.muted ?? data.muteOutput,
            color: translateLegacyColorData(data.color, data.altColor && [0, 1, 8].includes(data.mode), data.altColor && data.mode == 8),
            color2: translateLegacyColorData(data.color2),
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

    /**Legacy (old Sound Tile) tree layouts, very scuffed */
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

    /**File layout for extremely old legacy Sound Tile schema V1 */
    export type SchemaV0 = {
        version: 0
        root: LegacyTree
    };
    /**File layout for legacy Sound Tile schema V2 */
    export type SchemaV1 = {
        version: 1
        root: LegacyTree
        metadata: {
            image: string
            title: string
            subtitle: string
        },
    };
    /**File layout for Sound Tile schema V1, current version */
    export type SchemaV2 = {
        version: 2
        metadata: {
            coverArt: string
            title: string
            subtitle: string
        }
        sources: ArrayBuffer[]
        tree: GroupTile
    };

    /**File layouts for all schema versions */
    export type Schema = SchemaV0 | SchemaV1 | SchemaV2;
}
