import { merge } from 'lodash-es'; // hopefully tree-shakeable
import { DeepPartial } from '@/components/scripts/utils';
import { ColorData } from '@/components/inputs/colorPicker';
import { createDefaultVisualizerData, VisualizerData, VisualizerMode } from './visualizerData';

export namespace MediaSchema {
    // extracting data using types was too annoying so here we are

    /**Blank tile schema-layout data */
    export type Tile = {
        label: string
        size: number
        backgroundColor: ColorData
    };
    /**Group tile schema-layout data */
    export type GroupTile = Tile & {
        borderColor: ColorData
        children: Tile[]
    };
    /**Visualizer tile schema-layout data - data is partial as files may be missing newer additions */
    export type VisualizerTile = Tile & {
        data: DeepPartial<Omit<VisualizerData, 'buffer'>, ColorData> & { buffer: number }
    };
    /**Text tile schema-layout data */
    export type TextTile = Tile & {};
    /**Image tile schema-layout data */
    export type ImageTile = Tile & {};
    /**Grass tile schema-layout data */
    export type GrassTile = Tile & {};

    /**Legacy (old Sound Tile) mode enumeration, even more scuffed somehow. */
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
        value: Omit<(ColorData & { type: 'gradient' }), 'radius' | 'stops'> & { r: number, stops: [number, string][] }
    }
    /**Legacy (old Sound Tile) visualizer options & audio data. */
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
        muteOutput?: boolean
    };
    /**Legacy (old Sound Tile) channel peaks mode visualizer options & audio data. */
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
     * @returns Color in new format
     */
    export function translateLegacyColorData(color: string | LegacyColorData): ColorData {
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
            return {
                type: 'gradient',
                pattern: color.value.pattern,
                stops: color.value.stops.map((([t, c]) => ({ t: t / 100, c: c, a: 1 }))),
                x: color.value.x / 100,
                y: color.value.y / 100,
                radius: color.value.r / 100,
                angle: color.value.angle
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
            buffer: data?.buffer,
            mode: VisualizerMode.CHANNEL_PEAKS,
            gain: data?.volume,
            mute: data?.muteOutput,
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
            buffer: data?.buffer,
            mode: legacyModeTranslator[data.mode] ?? VisualizerMode.FREQ_BAR,
            gain: data?.volume,
            mute: data?.muteOutput,
            color: translateLegacyColorData(data.color),
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

    /**Legacy (old Sound Tile) tree layouts, very scuffed. */
    export type LegacyTree = {
        orientation: number
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
        textColor: number
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
        textColor: number
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
        version: 0,
        tree: {
            root: LegacyTree
        }
    };
    /**File layout for legacy Sound Tile schema V2 */
    export type SchemaV1 = {
        version: 1,
        tree: {
            // why metadata in tree? NO IDEA
            metadata: {
                image: string
                title: string
                subtitle: string
            },
            root: LegacyTree
        }
    };
    /**File layout for Sound Tile schema V1, current version */
    export type SchemaV2 = {
        version: 2,
        metadata: {
            coverArt: string
            title: string
            subtitle: string
        }
        sources: ArrayBuffer[]
        tree: Tile
    };

    /**File layouts for all schema versions. */
    export type Schema = SchemaV0 | SchemaV1 | SchemaV2;
}
