import { effectScope, EffectScope, reactive, ref, Ref, toRaw, watch, watchEffect } from 'vue';
import Playback from './playback';
import perfMetrics from './drawLoop';
import VisualizerData from './visualizerData';
import { VisualizerRenderer } from './render/visualizerRenderer';

/**
 * Audio and visual rendering context of visualizer tiles.
 */
class Visualizer {
    /**
     * Cache decoded audio so audio buffers can be reused. The promise prevents
     * decoding the same buffer a second time while the first is still loading.
     */
    private static readonly decodedAudioCache: WeakMap<ArrayBuffer, Promise<AudioBuffer>> = new WeakMap();

    private readonly gain: GainNode;
    private readonly analyzers: AnalyserNode[] = []; // very british
    private audioBuffer: AudioBuffer | null = null;
    private source: AudioBufferSourceNode | null = null;
    private splitter: ChannelSplitterNode | null = null;

    /**Reactive state of visualizer - all settings & stuff */
    readonly data: VisualizerData;

    /**Renderer renders to its own canvas so we can add extra stuff onto the visualizer */
    readonly renderer: VisualizerRenderer;
    readonly canvas: OffscreenCanvas;
    readonly ctx: OffscreenCanvasRenderingContext2D;

    /**Sets if the visualizer is visible/playable */
    readonly visible: Ref<boolean> = ref(false);

    private readonly effectScope: EffectScope;

    constructor(initData: VisualizerData, canvas: OffscreenCanvas) {
        this.data = reactive(initData);
        this.canvas = canvas;
        this.ctx = this.canvas.getContext('2d')!;
        this.gain = Playback.audioContext.createGain();
        this.gain.connect(Playback.gain);
        this.renderer = new VisualizerRenderer(this.data, this.canvas);
        this.effectScope = effectScope();
        this.effectScope.run(() => {
            watch(this.visible, () => {
                if (this.visible.value) Visualizer.instances.add(this);
                else Visualizer.instances.delete(this);
                Visualizer.recalculateDuration();
                if (this.audioBuffer !== null && Playback.playing.value && this.visible.value) this.start();
                else this.stop();
            }, { immediate: true });
            watch(() => this.data.buffer, async () => {
                this.audioBuffer = null;
                if (this.data.buffer !== null) {
                    Visualizer.recalculateDuration();
                    if (Visualizer.decodedAudioCache.has(this.data.buffer)) {
                        this.audioBuffer = await Visualizer.decodedAudioCache.get(this.data.buffer)!;
                    } else {
                        // buffer is sliced as browser consumes the buffer in decoding
                        const promise = Playback.audioContext.decodeAudioData(this.data.buffer.slice());
                        Visualizer.decodedAudioCache.set(this.data.buffer, promise);
                        this.audioBuffer = await promise;
                    }
                }
                Visualizer.recalculateDuration();
                if (this.audioBuffer !== null && Playback.playing.value && this.visible.value) this.start();
                else this.stop();
            }, { immediate: true });
            watchEffect(() => this.gain.gain.value = this.data.gain);
            watchEffect(() => this.data.mute ? this.gain.disconnect(Playback.gain) : this.gain.connect(Playback.gain));
            watch([() => this.data.mode, () => this.data.levelOptions.channels, () => this.data.buffer], ([], [lastMode, lastChannels, lastBuffer]) => {
                // this could blow up very easily!!
                if (this.data.mode == VisualizerData.Mode.CHANNEL_PEAKS && (lastMode != VisualizerData.Mode.CHANNEL_PEAKS || this.data.levelOptions.channels != lastChannels)) {
                    // yeetus analyzers-us
                    if (this.splitter !== null) this.gain.disconnect(this.splitter);
                    else for (const a of this.analyzers) this.gain.disconnect(a);
                    const channels = Math.max(1, this.data.levelOptions.channels);
                    this.splitter = Playback.audioContext.createChannelSplitter(channels);
                    this.gain.connect(this.splitter);
                    this.analyzers.length = 0;
                    for (let i = 0; i < channels; i++) {
                        const analyzer = Playback.audioContext.createAnalyser();
                        analyzer.fftSize = 1024;
                        analyzer.maxDecibels = 0;
                        this.splitter.connect(analyzer, i);
                        this.analyzers.push(analyzer);
                    }
                } else if (this.data.mode != VisualizerData.Mode.CHANNEL_PEAKS && (lastMode == VisualizerData.Mode.CHANNEL_PEAKS || this.data.buffer != lastBuffer)) {
                    // reset analyzer when audio source changed too
                    if (this.splitter !== null) this.gain.disconnect(this.splitter);
                    this.splitter?.disconnect();
                    this.splitter = null;
                    this.analyzers.length = 0;
                    const analyzer = Playback.audioContext.createAnalyser();
                    this.analyzers.push(analyzer);
                    analyzer.fftSize = this.data.fftSize;
                    analyzer.maxDecibels = 0;
                    analyzer.minDecibels = this.data.freqOptions.minDbCutoff;
                    analyzer.smoothingTimeConstant = this.data.freqOptions.smoothing;
                    this.gain.connect(analyzer);
                }
            }, { immediate: true });
            // watchEffect is unreliable and randomly breaks when other files change so fuck that
            watch(() => this.data.fftSize, () => {
                if (this.data.mode != VisualizerData.Mode.CHANNEL_PEAKS) {
                    for (const a of this.analyzers) a.fftSize = this.data.fftSize;
                }
            });
            watch(() => this.data.freqOptions.minDbCutoff, () => {
                if (this.data.mode != VisualizerData.Mode.CHANNEL_PEAKS) {
                    for (const a of this.analyzers) a.minDecibels = this.data.freqOptions.minDbCutoff;
                }
            });
            watch(() => this.data.freqOptions.smoothing, () => {
                if (this.data.mode != VisualizerData.Mode.CHANNEL_PEAKS) {
                    for (const a of this.analyzers) a.smoothingTimeConstant = this.data.freqOptions.smoothing;
                }
            });
        });
        // who cares about resource leak lmao this is a joke
        if (window.localStorage.getItem('wtfmode') !== null) setInterval(() => {
            this.source?.playbackRate.linearRampToValueAtTime(Math.sin(performance.now() / 50) * 0.2 + 1, Playback.audioContext.currentTime + 0.05);
        }, 50);
    }

    private drawing: boolean = false;
    /**
     * Reused array buffer used for all analyzer data. It will be re-created if resizing is needed,
     * as AnalyserNode doesn't allow resizable buffers being passed to it.
     */
    private dataBuffer: ArrayBuffer = new ArrayBuffer(512);
    private readonly debug: {
        startTime: number
        readonly frames: number[]
        readonly fpsHistory: number[]
        readonly rendererTimingHistory: number[]
        readonly totalTimingHistory: number[]
    } = ({
        startTime: 0,
        frames: [],
        fpsHistory: [],
        rendererTimingHistory: [],
        totalTimingHistory: []
    });
    private async draw(): Promise<void> {
        if (this.drawing || this.data.buffer === null || !this.visible.value) return;
        // spam-resizing hopefully doesn't cause a bunch of performance issues? it stops flickering...
        this.drawing = true;
        this.debug.startTime = performance.now();
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
        } else if ([VisualizerData.Mode.FREQ_BAR, VisualizerData.Mode.FREQ_LINE, VisualizerData.Mode.FREQ_FILL, VisualizerData.Mode.FREQ_LUMINANCE, VisualizerData.Mode.SPECTROGRAM].includes(this.data.mode)) {
            if (this.analyzers.length != 1) this.drawErrorText('Visualizer error - unexpected count ' + this.analyzers.length);
            else {
                const bufSize = this.analyzers[0].frequencyBinCount;
                if (this.dataBuffer.byteLength != bufSize) this.dataBuffer = new ArrayBuffer(bufSize);
                const data = new Uint8Array(this.dataBuffer, 0, this.analyzers[0].frequencyBinCount);
                this.analyzers[0].getByteFrequencyData(data);
                await this.renderer.draw(data);
            }
        } else if ([VisualizerData.Mode.WAVE_DIRECT, VisualizerData.Mode.WAVE_CORRELATED].includes(this.data.mode)) {
            if (this.analyzers.length != 1) this.drawErrorText('Visualizer error - unexpected count ' + this.analyzers.length);
            else {
                const bufSize = this.analyzers[0].fftSize * 4;
                if (this.dataBuffer.byteLength != bufSize) this.dataBuffer = new ArrayBuffer(bufSize);
                const data = new Float32Array(this.dataBuffer, 0, this.analyzers[0].fftSize);
                this.analyzers[0].getFloatTimeDomainData(data);
                await this.renderer.draw(data);
            }
        } else if (this.data.mode == VisualizerData.Mode.CHANNEL_PEAKS) {
            // we actually create multiple views of the same array buffer
            const bufSize = this.analyzers.length * 512; // fft size is 1024
            if (this.dataBuffer.byteLength != bufSize) this.dataBuffer = new ArrayBuffer(bufSize);
            const data: Uint8Array[] = [];
            for (let i = 0; i < this.analyzers.length; i++) {
                const buffer = new Uint8Array(this.dataBuffer, i * 512, 512);
                this.analyzers[i].getByteTimeDomainData(buffer);
                data[i] = buffer;
            }
            await this.renderer.draw(data);
        } else {
            this.ctx.reset();
            this.drawErrorText('Invalid mode');
        }
        this.drawDebugOverlay();
        this.drawing = false;
    }
    private drawDebugOverlay(): void {
        const endTime = performance.now();
        const frameTime = endTime - this.debug.startTime;
        const renderTime = this.renderer.frameResult.value.renderTime;
        this.debug.frames.push(endTime);
        this.debug.rendererTimingHistory.push(renderTime);
        this.debug.totalTimingHistory.push(frameTime);
        while (this.debug.frames[0] + 1000 <= endTime) {
            this.debug.frames.shift();
            this.debug.rendererTimingHistory.shift();
            this.debug.totalTimingHistory.shift();
            this.debug.fpsHistory.shift();
        }
        this.debug.fpsHistory.push(this.debug.frames.length);
        if (perfMetrics.debugLevel.value > 0) {
            const avgArr = (a: number[]): number => a.reduce((p, c) => p + c, 0) / a.length;
            const text = [
                `Playing: ${Playback.playing.value}`,
                `FPS: ${this.debug.frames.length} (${avgArr(this.debug.fpsHistory).toFixed(1)} / [${Math.min(...this.debug.fpsHistory)} - ${Math.max(...this.debug.fpsHistory)}])`,
                `Total:  ${(frameTime).toFixed(1)}ms (${avgArr(this.debug.totalTimingHistory).toFixed(1)}ms / [${Math.min(...this.debug.totalTimingHistory).toFixed(1)}ms - ${Math.max(...this.debug.totalTimingHistory).toFixed(1)}ms])`,
                `Render: ${(renderTime).toFixed(1)}ms (${avgArr(this.debug.rendererTimingHistory).toFixed(1)}ms / [${Math.min(...this.debug.rendererTimingHistory).toFixed(1)}ms - ${Math.max(...this.debug.rendererTimingHistory).toFixed(1)}ms])`,
                ...this.renderer.frameResult.value.debugText
            ];
            this.ctx.resetTransform();
            this.ctx.font = '14px monospace';
            this.ctx.fillStyle = '#333333AA';
            this.ctx.fillRect(8, 8, Math.max(...text.map((t) => this.ctx.measureText(t).width + 8)), text.length * 16 + 6);
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.textAlign = 'left';
            this.ctx.textBaseline = 'top';
            for (let i = 0; i < text.length; i++) {
                this.ctx.fillText(text[i], 12, 12 + i * 16);
            }
        }
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
        this.renderer.resize(w, h);
        // only apply size when not using renderer - stops flickering
        if (this.audioBuffer === null || VisualizerData.Mode[this.data.mode] == undefined) {
            this.canvas.width = w;
            this.canvas.height = h;
        }
    }

    private start(): void {
        this.stop();
        if (this.audioBuffer == null) return;
        this.source = Playback.audioContext.createBufferSource();
        this.source.buffer = this.audioBuffer;
        this.source.connect(this.gain);
        this.source.start(Playback.audioContext.currentTime, Playback.time.value);
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
        this.renderer.destroy();
        this.effectScope.stop();
        this.gain.disconnect();
        Visualizer.instances.delete(toRaw(this));
        Visualizer.recalculateDuration();
    }

    /**All **VISIBLE** instances of visualizers - maintained by the visualizer instances themselves */
    private static readonly instances: Set<Visualizer> = new Set();
    private static readonly internalDuration: Ref<number> = ref(0);
    private static recalculateDuration(): void {
        let time = 0;
        for (const vis of this.instances) {
            if (vis.duration > time) time = vis.duration;
        }
        this.internalDuration.value = time;
    }
    static get duration(): number {
        return this.internalDuration.value;
    }
    static {
        watch([Playback.playing, Playback.startTime], () => {
            if (Playback.playing.value) {
                for (const vis of this.instances) vis.start();
            } else {
                for (const vis of this.instances) vis.stop();
            }
        });
    }

    /**Await this to wait for all renders to complete, or decouple visualizers and drop frames individually */
    static async draw(): Promise<void> {
        await Promise.all([...this.instances.values()].map((v) => v.draw()));
    }
}

export default Visualizer;
