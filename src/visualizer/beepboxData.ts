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
            type: 'pitch' | 'drum' | 'mod'
            name: string
            patterns: {
                pitches: number[]
                points: {
                    tick: number
                    pitchBend: number
                    volume: number
                }[]
                continueLast: boolean // shortened
            }[][]
            sequence: number[]
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
    channels: {
        type: 'pitch' | 'drum' | 'mod'
        name?: string
        instruments: unknown[]
        patterns: {
            notes: {
                pitches: number[]
                points: {
                    tick: number
                    pitchBend: number
                    volume: number
                    forMod?: boolean
                }[]
                continuesLastPattern: boolean
            }[]
            instruments: number[]
        }[]
        sequence: number[]
    }[]
}

export function createDefaultBeepboxVisualizerData(): BeepboxVisualizerData {
    return {
        song: null,
        channelStyles: [],
        loopCount: 1
    };
}