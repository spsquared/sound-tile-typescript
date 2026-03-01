import type { ColorData } from '@/components/inputs/colorPicker';

/**
 * BeepBox song data and visualizer configurations for a BeepBox tile.
 */
type BeepboxData = {
    song: BeepboxData.Song | null;
    /**
     * Styling for individual channels. Can be reordered to change the rendering order of channels, with
     * earlier channels being rendered below later ones.
     * 
     * *This is not included in song data as new settings need defaults to merge with, and song data doesn't have defaults*
     */
    channelStyles: {
        /**Allow styling each instrument separately */
        separateInstrumentStyles: boolean
        /**Styles for each instrument - if separate styles are off, all instruments use one style */
        instruments: {
            /**Foreground color of notes */
            noteColor: ColorData
            /**Background color of notes */
            noteBackground: ColorData
            /**Note width is scaled by note size pins */
            noteSizeEnabled: boolean
            /**Render instrument vibrato in the piano roll */
            showVibrato: boolean
        }[]
        /**The corresponding channel index in the song of this channel - set on creation, NEVER changes */
        readonly index: number
    }[]
    /**How many times the loop loops */
    loopCount: number
    /**Piano playhead settings */
    piano: {
        /**Show a piano keyboard for the playhead instead of a line */
        enabled: boolean
        /**Label each octave starting on a specific key, or no labels if null */
        octaveLabels: BeepboxData.ScaleKeys | null
        /**Place the piano roll so the playhead is "above" the keys (on the side of black keys) instead of below (default) */
        playheadSide: boolean
        /**Flip the alignment of piano keys to make the keyboard "upside down" */
        flip: boolean
    }
    /**Range [0-1] interpolating from only showing notes in the future and only showing notes that have been played */
    playheadPosition: number
    /**Remove beats skipped by "next bar" modulations */
    cutSkippedBeats: boolean
    /**Length of bars relative to the height of the canvas - essentially the aspect ratio */
    barScale: number
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
        /**Tempo in ticks per second of song - calculated from ticks per beat and beats per minute */
        tickSpeed: number
        /**Length of a beat in ticks */
        beatLength: number
        /**Length of a bar in ticks - calculated from ticks per beat and beats per bar */
        barLength: number
        /**Length of a bar in beats */
        meterLength: number
        /**Differs from BeepBox format, defines loop points */
        loopBars: {
            length: number
            offset: number
        }
        /**Length of song in bars */
        songLength: number
        /**Converted channel data */
        channels: Channel[]
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

    export type Channel = {
        type: 'pitch' | 'drum' | 'mod'
        name: string
        instruments: Instrument[]
        patterns: Pattern[]
        sequence: number[]
    };

    export type Instrument = {
        type: Exclude<InstrumentType, InstrumentType.MOD>
        envelopes: Envelope[]
    } | {
        type: InstrumentType.MOD
        modChannels: number[]
        modInstruments: number[]
        modSettings: number[]
    };

    export type Pattern = {
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
    };

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
        DRUMSET = 'drumset',
        MOD = 'mod'
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

    export type Envelope = {
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

    export namespace Envelope {
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
        } as Record<string, Partial<Envelope> & { envelope: EnvelopeType }>;
    }

    // modulator settings dont actually save the setting, just the enum ordinal (really dumb)
    // if a mod changes the enum ordering it all breaks and that's not my problem
    // https://github.com/slarmoo/slarmoosbox/blob/main/synth/SynthConfig.ts#L1790
    export const modulatorSettingNames = [
        'No Mod Setting',
        'Song Volume',
        'Song Tempo',
        'Song Reverb',
        'Go To Next Bar',
        'Note Volume',
        'Instrument Panning',
        'Instrument Reverb',
        'Instrument Distortion',
        'FM Slider 1',
        'FM Slider 2',
        'FM Slider 3',
        'FM Slider 4',
        'FM Feedback',
        'Pulse Width',
        'Instrument Detune',
        'Vibrato Depth',
        'Song Detune',
        'Vibrato Speed',
        'Vibrato Delay',
        'Arpeggio Speed',
        'Panning Delay',
        'Reset Arpeggio',
        'EQ Filter',
        'Note Filter',
        'Instrument Bit Crush',
        'Instrument Frequency Crush',
        'Instrument Echo Sustain',
        'Instrument Echo Delay',
        'Instrument Chorus',
        'EQ Filter Cutoff Frequency',
        'EQ Filter Peak Gain',
        'Note Filter Cutoff Frequency',
        'Note Filter Peak Gain',
        'Pitch Shift',
        'Picked String Sustain',
        'Mix Volume',
        'FM Slider 5',
        'FM Slider 6',
        'Decimal Offset',
        'Envelope Speed',
        'Supersaw Dynamism',
        'Supersaw Spread',
        'Supersaw Shape',
        'Individual Envelope Speed',
        'Song EQ Filter',
        'Reset Envelope',
        'Ring Modulation',
        'Ring Modulation (Hertz)',
        'Granular',
        'Grain Count',
        'Grain Size',
        'Grain Range',
        'Individual Envelope Lower Bound',
        'Individual Envelope Upper Bound',
    ] as const;

    export function createDefault(): BeepboxData {
        return {
            song: null,
            channelStyles: [],
            loopCount: 1,
            piano: {
                enabled: false,
                octaveLabels: ScaleKeys.C,
                playheadSide: false,
                flip: false
            },
            playheadPosition: 0,
            cutSkippedBeats: true,
            barScale: 0.3,
            rotate: false,
            flipX: false,
            flipY: false
        };
    }

    export function createDefaultChannelStyle(index: number): BeepboxData['channelStyles'][number] {
        return {
            separateInstrumentStyles: false,
            instruments: [],
            index: index
        };
    }
    export function createDefaultInstrumentStyle(): BeepboxData['channelStyles'][number]['instruments'][number] {
        return {
            noteColor: { type: 'solid', color: '#dddddd', alpha: 1 },
            noteBackground: { type: 'solid', color: '#999999', alpha: 1 },
            noteSizeEnabled: true,
            showVibrato: true
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
            modChannels: number[]
            modInstruments: number[]
            modSettings: number[]
            modFilterTypes: number[]
            modEnvelopeNumbers?: number[]
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
            instruments?: number[]
        }[]
        sequence: number[]
    }[]
}
