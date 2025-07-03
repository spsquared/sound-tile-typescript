// need this file so the web worker can import the visualizer modes enum
// if in visualizer.ts it explodes because audio.ts gets imported

import { ColorData } from "@/components/inputs/colorPicker"

/**
 * Possible settings for visualizers - channel levels tile is its own class due to needing multiple analyzer nodes
 */
export enum VisualizerMode {
    FREQ_BAR,
    FREQ_LINE,
    FREQ_FILL,
    FREQ_LUMINANCE,
    WAVE_DIRECT,
    WAVE_CORRELATED,
    SPECTROGRAM,
    CHANNEL_PEAKS
}

/**
 * Visualizer options, audio data, and any attached images/text for a visualizer tile.
 */
export interface VisualizerData {
    /**Audio data uploaded by user - not decoded yet */
    buffer: ArrayBuffer | null
    /**Gain value, 0-1, affects visualizer gain */
    gain: number
    /**Mute the output without affecting the visualizer gain */
    mute: boolean
    /**Primary color */
    color: ColorData
    /**Secondary color (if available) */
    color2: ColorData
    /**Additional alpha multiplier for secondary color - setting to below 1 triggers translucency fix for freq. fill mode */
    color2Alpha: number
    /**Apply colors in alternate mode (if available) */
    altColorMode: boolean
    /**Visualizer style */
    mode: VisualizerMode
    /**The size of the underlying FFT, power of 2 from 32 to 32768 */
    fftSize: number
    /**Inline padding on edges of visualizer - left/right for horizontal */
    paddingInline: number
    /**Block padding on edges of visualizer - top/bottom for horizontal */
    paddingBlock: number
    /**Settings for frequency modes */
    freqOptions: {
        /**Settings for frequency bar modes */
        bar: {
            /**Relative width of bars to the width available */
            size: number
            /**Toggles discrete LED-bar effects */
            ledEffect: boolean
            /**Number of LEDs per bar, per side of reflection (reflection doubles LED count) */
            ledCount: number
            /**Relative height of LEDs to the height available */
            ledSize: number
            /**Minimum "height" of bars in pixels */
            minLength: number
        }
        /**Settings for frequency line and fill modes */
        line: {
            /**Width of lines drawn */
            thickness: number
            /**Use miter joins instead of rounded joins at corners in lines */
            sharpEdges: boolean
        }
        /**Settings for spectrogram mode */
        spectrogram: {
            /**Number of previous frames to keep in view */
            historyLength: number
            /**Quantize frequency data to a certain number of levels, mostly unnoticeable in spectrograms - disabled at <2 */
            quantization: number
        }
        /**Sets factor for blending the previous frame's data with the current data, 0-1 (technical terms: a Blackman window) */
        smoothing: number
        /**Cutoff threshold for frequency scale, controls highest frequency drawn, 0-1 */
        freqCutoff: number
        /**Minimum decibels required for show up on the visualizer, in decibels below the maximum energy of the output */
        minDbCutoff: number
        /**Scale of drawn frequences */
        scale: number
        /**Proportion along the amplitude-axis to reflect across, 0-0.5 */
        reflect: number
        /**Use a logarithmic frequency scale */
        useLogScale: boolean
        /**Draw the current frequency scale below the visualizer */
        showScale: boolean
        /**Symmetry - `low`/`high` mirrors with low/high frequencies in center */
        symmetry: 'none' | 'low' | 'high'
    }
    /**Settings for waveform modes */
    waveOptions: {
        /**Amplitude scale of drawn waveform */
        scale: number
        /**Width of lines drawn */
        thickness: number
        /**Use miter joins instead of rounded joins at corners in lines */
        sharpEdges: boolean
        /**Reduce the number of points drawn - every 2 points, every 3 points, etc. */
        resolution: number
        /**Settings for correlated waveform mode */
        correlation: {
            /**Number of initial samples used in visualizer */
            samples: number
            /**Gain used by gradient descent after best sample is picked, algorithm attempts to reduce gain if overtuned */
            gradientDescentGain: number
            /**Sets factor for blending the previous frame's data with the current data, 0-1 */
            frameSmoothing: number
        }
    }
    /**Settings for channel levels mode */
    levelOptions: {
        /**Number of channels to show */
        channels: number
        /**Sets factor for blending the previous frame's data with the current data, 0-1 */
        frameSmoothing: number
        /**Scale of drawn bars */
        scale: number
        /**Proportion along the amplitude-axis to reflect across, 0-0.5 */
        reflect: number
        /**Use a logarithmic decibel scale */
        useLogScale: boolean
        /**Draw the current scale below the visualizer */
        showScale: boolean
        /**Label the bars for each channel */
        showLabels: boolean
        /**Relative width of bars to the width available */
        size: number
        /**Toggles discrete LED-bar effects */
        ledEffect: boolean
        /**Number of LEDs per bar, per side of reflection (reflection doubles LED count) */
        ledCount: number
        /**Relative height of LEDs to the height available */
        ledSize: number
        /**Minimum "height" of bars in pixels */
        minLength: number
    }
    /**Rotate the visualizer - applied first, rotates 90 degrees clockwise and flips X-axis (left becomes bottom, bottom becomes left) */
    rotate: boolean
    /**Flip the visualizer's X-axis - applied after rotation (left becomes right) */
    flipX: boolean
    /**Flip the visualizer's Y-axis - applied after rotation (top becomes bottom) */
    flipY: boolean
}

export function createDefaultVisualizerData(): VisualizerData {
    return {
        buffer: null,
        gain: 1,
        mute: false,
        color: { type: 'solid', color: '#FFFFFF', alpha: 1 },
        color2: { type: 'solid', color: '#FFFFFF', alpha: 1 },
        color2Alpha: 1,
        altColorMode: false,
        mode: VisualizerMode.FREQ_BAR,
        fftSize: 256,
        paddingInline: 8,
        paddingBlock: 8,
        freqOptions: {
            bar: {
                size: 0.8,
                ledEffect: false,
                ledCount: 64,
                ledSize: 0.8,
                minLength: 2
            },
            line: {
                thickness: 2,
                sharpEdges: false
            },
            spectrogram: {
                historyLength: 360,
                quantization: 0
            },
            smoothing: 0.8,
            freqCutoff: 1,
            minDbCutoff: -100,
            scale: 1,
            reflect: 0,
            useLogScale: false,
            showScale: false,
            symmetry: 'none'
        },
        waveOptions: {
            scale: 1,
            thickness: 2,
            sharpEdges: false,
            resolution: 1,
            correlation: {
                samples: 32,
                gradientDescentGain: 0.5,
                frameSmoothing: 0.9
            }
        },
        levelOptions: {
            channels: 2,
            frameSmoothing: 0.5,
            scale: 1,
            reflect: 0,
            useLogScale: false,
            showScale: false,
            showLabels: false,
            size: 0.8,
            ledEffect: false,
            ledCount: 64,
            ledSize: 0.8,
            minLength: 2
        },
        rotate: false,
        flipX: false,
        flipY: false
    };
}