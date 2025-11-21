import { ColorData } from "@/components/inputs/colorPicker";

export enum ScaleKeys {
    'C',
    'C♯',
    'D',
    'D♯',
    'E',
    'F',
    'F♯',
    'G',
    'G♯',
    'A',
    'A♯',
    'B'
}

/**
 * BeepBox song data and visualizer configurations for a BeepBox tile.
 */
export interface BeepboxVisualizerData {
    song: {
        /**Root key of song - basically a pitch shift */
        key: ScaleKeys
        /**Beats per minute of song */
        bpm: number
        /**Length of a bar in BeepBox ticks - calculated from song data */
        barLength: number
        /**Differs from BeepBox format, defines loop points */
        loopBars: {
            length: number
            offset: number
        }
        /**Converted channel data */
        channels: {

        }[]
    } | null;
    channelStyles: {
        color: ColorData
    }[]
    /**How many times the loop loops */
    loopCount: number
}

/**
 * A bare-bones type definition for the BeepBox JSON export format, only
 * including note data and a few other properties that are used.
 */
export type BeepboxJsonSkeleton = {
    format: string
    key: string
    introBars: number
    loopBars: number
    beatsPerBar: number
    ticksPerBeat: number
    beatsPerMinute: number
}

export function createDefaultBeepboxVisualizerData(): BeepboxVisualizerData {
    return {
        song: null,
        channelStyles: [],
        loopCount: 1
    };
}