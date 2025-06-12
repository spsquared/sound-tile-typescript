import { reactive, watch } from "vue";
import { useThrottleFn } from "@vueuse/core";
import { audioContext, globalGain } from "./audio";
import { VisualizerFallbackRenderer, VisualizerRenderer, VisualizerWorkerRenderer } from "./visualizerRenderer";
import { EnhancedColorData } from "@/components/inputs/enhancedColorPicker";

export const webWorkerSupported = 'Worker' in window;

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
    CHANNEL_LEVELS
}

/**
 * Visualizer options, audio data, and any attached images/text for a visualizer tile.
 */
export interface VisualizerData {
    /**Audio data uploaded by user - not decoded yet */
    buffer: ArrayBuffer
    /**Gain value, 0-1, affects visualizer gain */
    gain: number
    /**Mute the output without affecting the visualizer gain */
    mute: boolean
    /**Primary color */
    color: EnhancedColorData
    /**Secondary color (if available) */
    color2: EnhancedColorData
    /**Apply colors in alternate mode (if available) */
    altColorMode: boolean
    /**Visualizer style */
    mode: VisualizerMode
    /**The size of the underlying FFT - power of 2 from 32 to 32768 */
    fftSize: number
    /**Inline padding on edges of visualizer - left/right for horizontal */
    paddingInline: number
    /**Block padding on edges of visualizer - top/bottom for horizontal */
    paddingBlock: number
    /**Settings for frequency modes */
    freqOptions: {
        /**Settings for frequency bar modes */
        bar: {
            ledEffect: boolean
            ledCount: number
            ledSize: number
        }
        /**Settings for frequency line and fill modes */
        line: {
            /**Width of lines drawn */
            thickness: number
            /**Use miter joins instead of rounded joins at corners in lines */
            sharpEdges: boolean
        }
        /**Sets factor for blending the previous frame's data with the current data, 0-1 (technical terms: a Blackman window) */
        smoothing: number
        /**Cutoff threshold for frequency scale, controls highest frequency drawn, 0-1 */
        freqCutoff: number
        /**Minimum decibels required for show up on the visualizer, in decibels below the maximum energy of the output */
        minDbCutoff: number
        /**Scale of drawn frequences */
        scale: number
        /**Use a logarithmic frequency scale */
        useLogScale: boolean
        /**Draw the current frequency scale below the visualizer */
        showFreqScale: boolean
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
            /** */
            samples: number
            gradientDescentGain: number
            frameSmoothing: number
        }
    }
    /**Settings for spectrogram mode */
    spectOptions: {
        /**Number of previous frames to keep in view */
        historyLength: number
        /**Quantize frequency values to a certain number of levels, disabled at <=1 */
        quantization: number
    }
    rotate: boolean
    flipX: boolean
    flipY: boolean
}

/**
 * Audio & drawing context of visualizer tile
 */
export class Visualizer {
    protected readonly gain: GainNode;
    protected readonly analyzer: AnalyserNode; // very british
    protected audioBuffer: Promise<AudioBuffer>;
    protected playingSource: AudioBufferSourceNode | null = null;

    /**Reactive state of visualizer - all settings & stuff */
    readonly data: VisualizerData = reactive<VisualizerData>({
        buffer: new Uint8Array(0).buffer,
        gain: 1,
        mute: false,
        color: { type: 'solid', color: '#FFFFFF', alpha: 1 },
        color2: { type: 'solid', color: '#FFFFFF', alpha: 1 },
        altColorMode: false,
        mode: VisualizerMode.FREQ_BAR,
        fftSize: 256,
        paddingInline: 8,
        paddingBlock: 8,
        freqOptions: {
            bar: {
                ledEffect: false,
                ledCount: 16,
                ledSize: 0.8
            },
            line: {
                thickness: 2,
                sharpEdges: false
            },
            smoothing: 0.8,
            freqCutoff: 1,
            minDbCutoff: -100,
            scale: 1,
            useLogScale: false,
            showFreqScale: false,
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
        spectOptions: {
            historyLength: 360,
            quantization: 0
        },
        rotate: false,
        flipX: false,
        flipY: false
    });

    readonly renderer: VisualizerRenderer;
    readonly canvas: HTMLCanvasElement;
    readonly ctx: CanvasRenderingContext2D;

    constructor(buffer: ArrayBuffer, canvas: HTMLCanvasElement) {
        this.data.buffer = buffer;
        this.canvas = canvas;
        this.ctx = this.canvas.getContext('2d')!;
        this.gain = audioContext.createGain();
        this.analyzer = audioContext.createAnalyser();
        this.gain.connect(this.analyzer);
        this.analyzer.connect(globalGain);
        this.renderer = webWorkerSupported ? new VisualizerWorkerRenderer(this.data) : new VisualizerFallbackRenderer(this.data);
        // watch functions instead of getter/setter spam
        watch(() => this.data.buffer, useThrottleFn(() => this.audioBuffer = audioContext.decodeAudioData(this.data.buffer), 2000, true));
        this.audioBuffer = audioContext.decodeAudioData(this.data.buffer);
    }

    play() {

    }
}

export default Visualizer;
