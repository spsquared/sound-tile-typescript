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
                type: string
                envelopes: EnvelopeData[]
            } | {
                type: 'mod'
                modChannels: number[],
                modInstruments: number[],
                modSettings: number[]
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

    export enum InstrumentType {
        CHIP = 'chip',
        CUSTOM_CHIP = 'custom chip',
        PWM = 'pwm',
        SUPERSAW = 'supersaw',
        FM = 'fm',
        FM_6OP = 'fm6op',
        HARMONICS = 'harmonics',
        PICKED_STRING = 'picked string',
        SPECTRUM = 'spectrum',
        NOISE = 'noise',
        DRUMSET = 'drumset'
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

    export type EnvelopeData = {
        target: string // only here for UI, not used in rendering
        envelope: EnvelopeType
        min: number
        max: number
        speed: number
        discrete: boolean
    } & ({
        envelope: EnvelopeType.PITCH
        pitchMin: number
        pitchMax: number
    } | {
        envelope: EnvelopeType.RANDOM
        randomType: 'time' | 'pitch' | 'note' | 'time smooth'
        seed: number
        steps: number
    } | {
        envelope: EnvelopeType.LFO
        waveform: 'sine' | 'square' | 'triangle' | 'sawtooth' | 'trapezoid' | 'stepped saw' | 'stepped tri'
    } | {
        envelope: Exclude<EnvelopeType, EnvelopeType.PITCH | EnvelopeType.RANDOM | EnvelopeType.LFO>
    });

    export namespace EnvelopeData {
        // https://github.com/ultraabox/ultrabox_typescript/blob/main/synth/SynthConfig.ts#L1296
        // https://github.com/slarmoo/slarmoosbox/blob/main/synth/SynthConfig.ts#L1421
        // https://github.com/slarmoo/slarmoosbox/blob/main/synth/synth.ts#L1454
        // HI SLARMOO
        export const beepboxEnvelopeTable = {
            // beepbox, jummbox, ultrabox, abyssbox, etc.
            'none': { envelope: EnvelopeType.NONE },
            'note size': { envelope: EnvelopeType.NOTE_SIZE },
            'punch': { envelope: EnvelopeType.PUNCH },
            'flare -1': { envelope: EnvelopeType.FLARE, speed: 128.0 },
            'flare 1': { envelope: EnvelopeType.FLARE, speed: 32.0 },
            'flare 2': { envelope: EnvelopeType.FLARE, speed: 8.0 },
            'flare 3': { envelope: EnvelopeType.FLARE, speed: 2.0 },
            'twang -1': { envelope: EnvelopeType.TWANG, speed: 128.0 },
            'twang 1': { envelope: EnvelopeType.TWANG, speed: 32.0 },
            'twang 2': { envelope: EnvelopeType.TWANG, speed: 8.0 },
            'twang 3': { envelope: EnvelopeType.TWANG, speed: 2.0 },
            'swell -1': { envelope: EnvelopeType.SWELL, speed: 128.0 },
            'swell 1': { envelope: EnvelopeType.SWELL, speed: 32.0 },
            'swell 2': { envelope: EnvelopeType.SWELL, speed: 8.0 },
            'swell 3': { envelope: EnvelopeType.SWELL, speed: 2.0 },
            'tremolo0': { envelope: EnvelopeType.LFO, speed: 8.0 },
            'tremolo1': { envelope: EnvelopeType.LFO, speed: 4.0 },
            'tremolo2': { envelope: EnvelopeType.LFO, speed: 2.0 },
            'tremolo3': { envelope: EnvelopeType.LFO },
            'tremolo4': { envelope: EnvelopeType.LFO, min: 0.0, max: 0.5, speed: 4.0 },
            'tremolo5': { envelope: EnvelopeType.LFO, min: 0.0, max: 0.5, speed: 2.0 },
            'tremolo6': { envelope: EnvelopeType.LFO, min: 0.0, max: 0.5 },
            'decay -1': { envelope: EnvelopeType.DECAY, speed: 40.0 },
            'decay 1': { envelope: EnvelopeType.DECAY, speed: 10.0 },
            'decay 2': { envelope: EnvelopeType.DECAY, speed: 7.0 },
            'decay 3': { envelope: EnvelopeType.DECAY, speed: 4.0 },
            'wibble-1': { envelope: EnvelopeType.WIBBLE, speed: 96.0 },
            'wibble 1': { envelope: EnvelopeType.WIBBLE, speed: 24.0 },
            'wibble 2': { envelope: EnvelopeType.WIBBLE, speed: 12.0 },
            'wibble 3': { envelope: EnvelopeType.WIBBLE, speed: 4.0 },
            'linear-2': { envelope: EnvelopeType.LINEAR, speed: 256.0 },
            'linear-1': { envelope: EnvelopeType.LINEAR, speed: 128.0 },
            'linear 1': { envelope: EnvelopeType.LINEAR, speed: 32.0 },
            'linear 2': { envelope: EnvelopeType.LINEAR, speed: 8.0 },
            'linear 3': { envelope: EnvelopeType.LINEAR, speed: 2.0 },
            'rise -2': { envelope: EnvelopeType.RISE, speed: 256.0 },
            'rise -1': { envelope: EnvelopeType.RISE, speed: 128.0 },
            'rise 1': { envelope: EnvelopeType.RISE, speed: 32.0 },
            'rise 2': { envelope: EnvelopeType.RISE, speed: 8.0 },
            'rise 3': { envelope: EnvelopeType.RISE, speed: 2.0 },
            'flute 1': { envelope: EnvelopeType.WIBBLE, speed: 16.0 },
            'flute 2': { envelope: EnvelopeType.WIBBLE, speed: 8.0 },
            'flute 3': { envelope: EnvelopeType.WIBBLE, speed: 4.0 },
            'tripolo1': { envelope: EnvelopeType.LFO, speed: 9.0 },
            'tripolo2': { envelope: EnvelopeType.LFO, speed: 6.0 },
            'tripolo3': { envelope: EnvelopeType.LFO, speed: 3.0 },
            'tripolo4': { envelope: EnvelopeType.LFO, min: 0.0, max: 0.5, speed: 9.0 },
            'tripolo5': { envelope: EnvelopeType.LFO, min: 0.0, max: 0.5, speed: 6.0 },
            'tripolo6': { envelope: EnvelopeType.LFO, min: 0.0, max: 0.5, speed: 3.0 },
            'pentolo1': { envelope: EnvelopeType.LFO, speed: 10.0 },
            'pentolo2': { envelope: EnvelopeType.LFO, speed: 5.0 },
            'pentolo3': { envelope: EnvelopeType.LFO, speed: 2.5 },
            'pentolo4': { envelope: EnvelopeType.LFO, min: 0.0, max: 0.5, speed: 10.0 },
            'pentolo5': { envelope: EnvelopeType.LFO, min: 0.0, max: 0.5, speed: 5.0 },
            'pentolo6': { envelope: EnvelopeType.LFO, min: 0.0, max: 0.5, speed: 2.5 },
            'flutter 1': { envelope: EnvelopeType.LFO, speed: 14.0 },
            'flutter 2': { envelope: EnvelopeType.LFO, min: 0.0, max: 0.5, speed: 11.0 },
            'water-y flutter': { envelope: EnvelopeType.LFO, speed: 9.0 },
            'blip 1': { envelope: EnvelopeType.BLIP, speed: 6.0 },
            'blip 2': { envelope: EnvelopeType.BLIP, speed: 16.0 },
            'blip 3': { envelope: EnvelopeType.BLIP, speed: 32.0 },
            // fancy slarmoo things
            // note size covered
            'pitch': { envelope: EnvelopeType.PITCH },
            'random': { envelope: EnvelopeType.RANDOM },
            // punch covered
            'flare': { envelope: EnvelopeType.FLARE, speed: 32.0 },
            'twang': { envelope: EnvelopeType.TWANG, speed: 32.0 },
            'swell': { envelope: EnvelopeType.SWELL, speed: 32.0 },
            'lfo': { envelope: EnvelopeType.LFO },
            'decay': { envelope: EnvelopeType.DECAY, speed: 10.0 },
            'wibble': { envelope: EnvelopeType.WIBBLE, speed: 24.0 },
            'linear': { envelope: EnvelopeType.LINEAR, speed: 32.0 },
            'rise': { envelope: EnvelopeType.RISE, speed: 32.0 },
            'blip': { envelope: EnvelopeType.BLIP, speed: 6.0 },
            'fall': { envelope: EnvelopeType.FALL, speed: 6.0 }
        } as Record<string, Partial<EnvelopeData> & { envelope: EnvelopeType }>;
    }

    // modulator settings dont actually save the setting, just the enum ordinal (really dumb)
    // if a mod changes the enum ordering it all breaks and that's not my problem
    export const modulatorSettingNames = [
        'None',
        'Volume',
        'Tempo',
        'Reverb',
        'Next Bar',
        'Note Vol.',
        'Pan',
        'Reverb',
        'Distortion',
        'FM 1',
        'FM 2',
        'FM 3',
        'FM 4',
        'FM Feedback',
        'Pulse Width',
        'Detune',
        'Vibrato Depth',
        'Detune',
        'Vibrato Speed',
        'Vibrato Delay',
        'Arp Speed',
        'Pan Delay',
        'Reset Arp',
        'EQFlt',
        'N.Flt',
        'Bitcrush',
        'Freq Crush',
        'Echo',
        'Echo Delay',
        'Chorus',
        'EQFlt Cut',
        'EQFlt Peak',
        'N.Flt Cut',
        'N.Flt Peak',
        'Pitch Shift',
        'Sustain',
        'Mix Vol.',
        'FM 5',
        'FM 6',
        'Decimal Offset',
        'EnvelopeSpd',
        'Dynamism',
        'Spread',
        'Saw Shape',
    ] as const;


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
            envelopes: {
                target: string
                envelope: string
                discrete?: boolean
                inverse?: boolean
                discreteEnvelope?: boolean
                envelopeInverse?: boolean
                perEnvelopeSpeed?: number
                perEnvelopeLowerBound?: number
                perEnvelopeUpperBound?: number
                pitchEnvelopeStart?: number
                pitchEnvelopeEnd?: number
                waveform?: number
                seed?: number
                steps?: number
            }[]
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
