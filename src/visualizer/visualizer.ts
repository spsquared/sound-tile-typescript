import { reactive, ref, Ref, watch, WatchHandle } from "vue";
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
    buffer: ArrayBuffer | null
    /**Gain value, 0-1, affects visualizer gain */
    gain: number
    /**Mute the output without affecting the visualizer gain */
    mute: boolean
    /**Primary color */
    color: EnhancedColorData
    /**Secondary color (if available) */
    color2: EnhancedColorData
    /**Additional alpha multiplier for secondary color */
    color2Alpha: number
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
    };
}

/**
 * Audio & drawing context of visualizer tile
 */
export class Visualizer {
    protected readonly gain: GainNode;
    protected readonly analyzer: AnalyserNode; // very british
    protected audioBuffer: AudioBuffer | null = null;
    protected source: AudioBufferSourceNode | null = null;

    /**Reactive state of visualizer - all settings & stuff */
    readonly data: VisualizerData;

    readonly renderer: VisualizerRenderer;
    readonly canvas: HTMLCanvasElement;
    readonly ctx: CanvasRenderingContext2D;
    /**Sets if the visualizer is visible/playable */
    visible: boolean = false;

    private readonly watchers: WatchHandle[] = [];

    constructor(data: VisualizerData, canvas: HTMLCanvasElement) {
        this.data = reactive<VisualizerData>(data);
        this.canvas = canvas;
        this.ctx = this.canvas.getContext('2d')!;
        this.gain = audioContext.createGain();
        this.analyzer = audioContext.createAnalyser();
        this.gain.connect(this.analyzer);
        this.analyzer.connect(globalGain);
        this.renderer = webWorkerSupported ? new VisualizerWorkerRenderer(this.data) : new VisualizerFallbackRenderer(this.data);
        Visualizer.instances.add(this);
        // watch functions instead of getter/setter spam
        this.watchers.push(watch(() => this.data.buffer, useThrottleFn(async () => {
            this.audioBuffer = this.data.buffer !== null ? await audioContext.decodeAudioData(this.data.buffer) : null;
            if (this.audioBuffer !== null && Visualizer.time.playing && this.visible) this.start();
            else this.stop();
            Visualizer.recalculateDuration();
        }, 2000, true), { immediate: true }));
        this.watchers.push(watch(() => this.data.gain, () => this.gain.gain.value = data.gain));
        this.watchers.push(watch(() => this.data.mute, () => data.mute ? this.analyzer.disconnect() : this.analyzer.connect(globalGain)));
    }

    private start(): void {
        this.stop();
        if (this.audioBuffer == null) return;
        this.source = audioContext.createBufferSource();
        this.source.buffer = this.audioBuffer;
        this.source.connect(this.gain);
        this.source.start(audioContext.currentTime, audioContext.currentTime - Visualizer.time.startTime);
    }
    private stop(): void {
        this.source?.stop();
        this.source?.disconnect();
        this.source = null;
    }
    get duration(): number {
        return this.audioBuffer?.duration ?? 0;
    }

    destroy(): void {
        this.stop();
        for (const handle of this.watchers) handle.stop();
        this.analyzer.disconnect();
        Visualizer.instances.delete(this);
        Visualizer.recalculateDuration();
    }

    private static readonly instances: Set<Visualizer> = reactive(new Set()) as Set<Visualizer>;
    /**Internal timekeeping to synchronize visualizer playback states */
    private static readonly time: {
        startTime: number
        playing: boolean
    } = {
            startTime: 0,
            playing: false
        };
    static start(time: number = 0): void {
        this.time.startTime = audioContext.currentTime - time;
        this.time.playing = true;
        for (const vis of this.instances) {
            if (vis.visible) vis.start();
        }
    }
    static stop(): void {
        this.time.playing = false;
        for (const vis of this.instances) vis.stop();
    }
    private static readonly _duration: Ref<number> = ref(0);
    private static recalculateDuration() {
        let time = 0;
        for (const vis of this.instances) {
            if (vis.duration > time) time = vis.duration;
        }
        this._duration.value = time;
    }
    static get duration(): number {
        return this._duration.value;
    }
}

export default Visualizer;
