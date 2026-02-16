import { ColorData } from '@/components/inputs/colorPicker';

/**
 * BeepBox song data and visualizer configurations for a BeepBox tile.
 */
type BeepboxData = {
    song: BeepboxData.Song | null;
    /**Styling for individual channels */
    channelStyles: {
        color: ColorData
    }[]
    /**How many times the loop loops */
    loopCount: number
    /**Remove beats skipped by "next bar" modulations */
    cutSkippedBeats: boolean
    /**Rotate the visualizer - applied first, rotates 90 degrees clockwise and flips X-axis (left becomes bottom, bottom becomes left) */
    rotate: boolean
    /**Flip the visualizer's X-axis - applied after rotation (left becomes right) */
    flipX: boolean
    /**Flip the visualizer's Y-axis - applied after rotation (top becomes bottom) */
    flipY: boolean
}

namespace BeepboxData {
    export type Song = {
        /**Root key of song - basically a pitch shift */
        key: ScaleKeys
        /**ticks per second of song - calculated from ticks per beat and beats per minute */
        tickSpeed: number
        /**Length of a bar in BeepBox ticks - calculated from ticks per beat and beats per bar */
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
            instruments: ({
                type: 'chip' | 'custom chip' | 'pwm' | 'supersaw' | 'fm' | 'fm6op' | 'harmonics' | 'picked string' | 'spectrum' | 'noise' | 'drumset'
                envelopes: ({
                    target: string // only here for UI, not used in rendering
                    envelope: EnvelopeType
                    min: number
                    max: number
                    speed: number
                    discrete: boolean
                } & ({} | {
                    envelope: EnvelopeType.PITCH,
                    pitchMin: number
                    pitchMax: number
                } | {
                    envelope: EnvelopeType.RANDOM
                }))[]
            } | {
                type: 'mod'
            })[]
            patterns: {
                notes: {
                    pitches: number[]
                    points: {
                        tick: number
                        pitchBend: number
                        volume: number
                    }[]
                    continueLast: boolean // shortened
                }[]
                instruments: number[]
            }[]
            sequence: number[]
        }[]
    }

    export enum ScaleKeys {
        'C' = 'C',
        'C♯' = 'C♯',
        'D' = 'D',
        'D♯' = 'D♯',
        'E' = 'E',
        'F' = 'F',
        'F♯' = 'F♯',
        'G' = 'G',
        'G♯' = 'G♯',
        'A' = 'A',
        'A♯' = 'A♯',
        'B' = 'B'
    }

    export enum EnvelopeType {
        NONE = 'NONE',
        NOTE_SIZE = 'NOTE_SIZE',
        PITCH = 'PITCH',
        RANDOM = 'RANDOM',
        PUNCH = 'PUNCH',
        FLARE = 'FLARE',
        TWANG = 'TWANG',
        SWELL = 'SWELL',
        LFO = 'LFO',
        DECAY = 'DECAY',
        WIBBLE = 'WIBBLE',
        LINEAR = 'LINEAR',
        RISE = 'RISE',
        BLIP = 'BLIP',
        FALL = 'FALL'
    }

    export namespace EnvelopeType {
        // idk functions
    }

    export function createDefault(): BeepboxData {
        return {
            song: null,
            channelStyles: [],
            loopCount: 1,
            cutSkippedBeats: true,
            rotate: false,
            flipX: false,
            flipY: false
        };
    }
}

export default BeepboxData;

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
        instruments: (({
            type: string
            [key: string]: unknown
        } | {
            type: 'mod',
            modChannels: number[],
            modInstruments: number[],
            modSettings: number[],
            modFilterTypes: number[]
        }) & {
            envelopeSpeed?: number
            envelopes: ({
                target: string
                envelope: string
            } | {
                target: string
                envelope: string
                inverse: boolean
                perEnvelopeSpeed: number
                perEnvelopeLowerBound: number
                perEnvelopeUpperBound: number
                pitchEnvelopeStart?: number
                pitchEnvelopeEnd?: number
                discrete: boolean
                waveform?: number
                seed?: number
                steps?: number
            })[]
        })[]
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
