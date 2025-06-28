

import { effectScope, EffectScope, reactive, ref, Ref, watch, watchEffect } from "vue";
import { VisualizerData, VisualizerMode } from "./visualizerData";
import { VisualizerFallbackRenderer, VisualizerRenderer, VisualizerWorkerRenderer } from "./visualizerRenderer";

if (!('AudioContext' in window)) {
    throw new TypeError('AudioContext is not enabled - Sound Tile requires the Web Audio API to function!');
}

export const webWorkerSupported = 'Worker' in window;

/**
 * Audio and drawing context of visualizer tiles.
 */
export class Visualizer {
    static readonly audioContext: AudioContext = new AudioContext();
    static readonly gain: GainNode = Visualizer.audioContext.createGain();

    static {
        this.gain.connect(this.audioContext.destination);
    }

    private readonly gain: GainNode;
    private readonly analyzers: AnalyserNode[] = []; // very british
    private audioBuffer: AudioBuffer | null = null;
    private source: AudioBufferSourceNode | null = null;
    private splitter: ChannelSplitterNode | null = null;

    /**Reactive state of visualizer - all settings & stuff */
    readonly data: VisualizerData;

    /**Renderer renders to its own canvas so we can add extra stuff onto the visualizer */
    readonly renderer: VisualizerRenderer;
    readonly canvas: HTMLCanvasElement;
    readonly ctx: CanvasRenderingContext2D;
    /**Sets if the visualizer is visible/playable */
    visible: boolean = false;

    private readonly effectScope: EffectScope;

    constructor(initData: VisualizerData, canvas: HTMLCanvasElement) {
        this.data = reactive<VisualizerData>(initData);
        this.canvas = canvas;
        this.ctx = this.canvas.getContext('2d')!;
        this.gain = Visualizer.audioContext.createGain();
        this.analyzers.push(Visualizer.audioContext.createAnalyser());
        this.analyzers[0].maxDecibels = 0;
        this.gain.connect(this.analyzers[0]);
        this.gain.connect(Visualizer.gain);
        this.renderer = webWorkerSupported ? new VisualizerWorkerRenderer(this.data) : new VisualizerFallbackRenderer(this.data);
        Visualizer.instances.add(this);
        // watch functions instead of getter/setter spam
        this.effectScope = effectScope();
        this.effectScope.run(() => {
            watch(() => this.data.buffer, async () => {
                this.audioBuffer = null;
                if (this.data.buffer !== null) {
                    Visualizer.recalculateDuration();
                    this.audioBuffer = this.data.buffer !== null ? await Visualizer.audioContext.decodeAudioData(this.data.buffer) : null;
                }
                Visualizer.recalculateDuration();
                if (this.audioBuffer !== null && Visualizer.time.playing && this.visible) this.start();
                else this.stop();
            }, { immediate: true });
            watchEffect(() => this.gain.gain.value = this.data.gain);
            watchEffect(() => this.data.mute ? this.gain.disconnect(Visualizer.gain) : this.gain.connect(Visualizer.gain));
            watch([() => this.data.mode, () => this.data.levelOptions.channels, () => this.data.buffer], ([], [lastMode, lastChannels, lastBuffer]) => {
                // this could blow up very easily!!
                if (this.data.mode == VisualizerMode.CHANNEL_LEVELS && (lastMode != VisualizerMode.CHANNEL_LEVELS || this.data.levelOptions.channels != lastChannels)) {
                    // yeetus analyzers-us
                    for (const a of this.analyzers) this.gain.disconnect(a);
                    const channels = Math.max(1, this.data.levelOptions.channels);
                    this.splitter = Visualizer.audioContext.createChannelSplitter(channels);
                    this.gain.connect(this.splitter);
                    this.analyzers.length = 0;
                    for (let i = 0; i < channels; i++) {
                        const analyzer = Visualizer.audioContext.createAnalyser();
                        analyzer.fftSize = 1024;
                        analyzer.maxDecibels = 0;
                        this.splitter.connect(analyzer, i);
                        this.analyzers.push(analyzer);
                    }
                } else if (this.data.mode != VisualizerMode.CHANNEL_LEVELS && (lastMode == VisualizerMode.CHANNEL_LEVELS || this.data.buffer != lastBuffer)) {
                    // reset analyzer when audio source changed
                    if (this.splitter !== null) this.gain.disconnect(this.splitter);
                    this.splitter?.disconnect();
                    this.analyzers.length = 0;
                    this.analyzers.push(Visualizer.audioContext.createAnalyser());
                    this.analyzers[0].maxDecibels = 0;
                    this.gain.connect(this.analyzers[0]);
                }
            });
            watchEffect(() => {
                if (this.data.mode != VisualizerMode.CHANNEL_LEVELS) {
                    for (const a of this.analyzers) a.fftSize = this.data.fftSize;
                }
            });
            watchEffect(() => {
                if (this.data.mode != VisualizerMode.CHANNEL_LEVELS) {
                    for (const a of this.analyzers) a.minDecibels = Math.min(0, this.data.freqOptions.minDbCutoff);
                }
            });
            watchEffect(() => {
                if (this.data.mode != VisualizerMode.CHANNEL_LEVELS) {
                    for (const a of this.analyzers) a.smoothingTimeConstant = Math.max(0, Math.min(this.data.freqOptions.smoothing, 1));
                }
            });
        });
    }

    private drawing: boolean = false;
    private async draw(): Promise<void> {
        if (this.drawing || this.data.buffer === null) return;
        this.drawing = true;
        if (this.audioBuffer === null) {
            this.ctx.reset();
            const boxSize = Math.min(this.canvas.width, this.canvas.height);
            const spinnerRadius = Math.min(boxSize * 0.4, Math.max(50, boxSize * 0.1));
            this.ctx.fillStyle = 'white';
            this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
            this.ctx.rotate(performance.now() / 100);
            this.ctx.beginPath();
            this.ctx.moveTo(spinnerRadius, 0);
            this.ctx.arc(0, 0, spinnerRadius, 0, 4 / 3 * Math.PI);
            this.ctx.arc(0, 0, spinnerRadius * 0.8, 4 / 3 * Math.PI, 0, true);
            this.ctx.fill();
        } else if ([VisualizerMode.FREQ_BAR, VisualizerMode.FREQ_LINE, VisualizerMode.FREQ_FILL, VisualizerMode.FREQ_LUMINANCE, VisualizerMode.SPECTROGRAM].includes(this.data.mode)) {
            if (this.analyzers.length != 1) this.drawErrorText('Visualizer error - unexpected count ' + this.analyzers.length);
            else {
                const data = new Uint8Array(this.analyzers[0].frequencyBinCount);
                this.analyzers[0].getByteFrequencyData(data);
                await this.renderer.draw(data);
                this.ctx.reset();
                this.ctx.drawImage(this.renderer.canvas, 0, 0);
            }
        } else if ([VisualizerMode.WAVE_DIRECT, VisualizerMode.WAVE_CORRELATED].includes(this.data.mode)) {
            if (this.analyzers.length != 1) this.drawErrorText('Visualizer error - unexpected count ' + this.analyzers.length);
            else {
                const data = new Float32Array(this.analyzers[0].fftSize);
                this.analyzers[0].getFloatTimeDomainData(data);
                await this.renderer.draw(data);
                this.ctx.reset();
                this.ctx.drawImage(this.renderer.canvas, 0, 0);
            }
        } else if (this.data.mode == VisualizerMode.CHANNEL_LEVELS) {
            const data: Uint8Array[] = [];
            for (const a of this.analyzers) {
                const buf = new Uint8Array(a.frequencyBinCount);
                a.getByteTimeDomainData(buf);
                data.push(buf);
            }
            await this.renderer.draw(data);
            this.ctx.reset();
            this.ctx.drawImage(this.renderer.canvas, 0, 0);
        } else {
            this.ctx.reset();
            this.drawErrorText('Invalid mode');
        }
        this.drawing = false;
    }
    private drawErrorText(text: string): void {
        this.ctx.resetTransform();
        this.ctx.fillStyle = 'red';
        this.ctx.font = '18px monospace'
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(text, this.canvas.width / 2, this.canvas.height / 2);
    }
    resize(w: number, h: number): void {
        this.canvas.width = w;
        this.canvas.height = h;
        this.renderer.resize(w, h);
    }

    private start(): void {
        this.stop();
        if (this.audioBuffer == null) return;
        this.source = Visualizer.audioContext.createBufferSource();
        this.source.buffer = this.audioBuffer;
        this.source.connect(this.gain);
        this.source.start(Visualizer.audioContext.currentTime, Visualizer.audioContext.currentTime - Visualizer.time.startTime);
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
        this.effectScope.stop();
        this.gain.disconnect();
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
        this.time.startTime = Visualizer.audioContext.currentTime - time;
        this.time.playing = true;
        for (const vis of this.instances) {
            if (vis.visible) vis.start();
        }
        Visualizer.audioContext.resume();
    }
    static stop(): void {
        this.time.playing = false;
        for (const vis of this.instances) vis.stop();
        Visualizer.audioContext.suspend();
    }
    private static readonly _duration: Ref<number> = ref(0);
    private static recalculateDuration(): void {
        let time = 0;
        for (const vis of this.instances) {
            if (vis.duration > time) time = vis.duration;
        }
        this._duration.value = time;
    }
    static get duration(): number {
        return this._duration.value;
    }

    private static async draw(): Promise<void> {
        await Promise.all(Array.from(this.instances.values()).filter((v) => v.visible).map((v) => v.draw()));
    }

    static {
        (async () => {
            while (true) {
                await new Promise<void>((resolve) => {
                    if (!document.hidden) requestAnimationFrame(() => resolve());
                    else setTimeout(() => resolve(), 200);
                });
                await this.draw();
            }
        })();
    }
}

export default Visualizer;
