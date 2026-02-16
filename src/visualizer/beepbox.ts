import { effectScope, EffectScope, markRaw, reactive, Ref, ref, toRaw, watch } from 'vue';
import { webWorkerSupported } from '@/constants';
import { DeepPartial } from '@/components/utils';
import Playback from './playback';
import perfMetrics from './drawLoop';
import BeepboxData, { BeepboxJsonSkeleton } from './beepboxData';
import { BeepboxFallbackRenderer, BeepboxRenderer, BeepboxWorkerRenderer } from './beepboxRenderer';

/**
 * Rendering context of BeepBox tiles. BeepBox tile only handles visual rendering of notes
 * in the piano roll, not synthesizing the audio. That's for BeepBox to do, not Sound Tile.
 */
class BeepboxVisualizer {
    /**Reactive state of visualizer - all settings & stuff */
    readonly data: BeepboxData;

    readonly renderer: BeepboxRenderer;
    readonly canvas: HTMLCanvasElement;
    readonly ctx: CanvasRenderingContext2D;

    /**Sets if the visualizer is visible */
    readonly visible: Ref<boolean> = ref(false);

    private readonly effectScope: EffectScope;

    private duration: number = 0;

    constructor(initData: BeepboxData, canvas: HTMLCanvasElement) {
        this.data = reactive(initData);
        this.canvas = canvas;
        this.ctx = this.canvas.getContext('2d')!;
        this.renderer = webWorkerSupported ? new BeepboxWorkerRenderer(this.data) : new BeepboxFallbackRenderer(this.data);
        this.effectScope = effectScope();
        this.effectScope.run(() => {
            watch(this.visible, () => {
                if (this.visible.value) BeepboxVisualizer.instances.add(this);
                else BeepboxVisualizer.instances.delete(this);
            }, { immediate: true });
            watch(() => this.data.song, () => {
                this.duration = 0;
                BeepboxVisualizer.recalculateDuration();
            }, { immediate: true, deep: false });
        });
    }

    private drawing: boolean = false;
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
    private async draw(_time: number): Promise<void> {
        if (this.drawing || this.data.song === null || !this.visible.value) return;
        // beepbox tile uses workers if possible since some note effects will involve a lot of
        // cpu-heavy searching + note/texture building will also be cpu heavy
        this.drawing = true;
        this.debug.startTime = performance.now();
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
                this.renderer.isWorker ? 'Worker (asynchronous) renderer' : 'Fallback (synchronous) renderer',
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
    resize(w: number, h: number): void {
        this.renderer.resize(w, h);
    }


    destroy(): void {
        this.effectScope.stop();
        BeepboxVisualizer.instances.delete(toRaw(this));
    }

    /**
     * Attempt to extract BeepBox song data from a JSON object.
     * @param raw An object (e.g., parsed from a JSON string)
     * @returns Converted and filtered song data, **MARKED RAW** to avoid unnecessary reactivity lag
     * @throws Will throw an error if the object is not a valid BeepBox song JSON
     */
    static parseRawJSON(raw: any): BeepboxData['song'] {
        // we probably don't need such a bulletproof data valiation thing but like...
        // it's also probably not bulletproof
        if (raw == undefined) throw new TypeError('Invalid song data: data is nullish');
        const json = raw as DeepPartial<BeepboxJsonSkeleton>;
        if (BeepboxData.ScaleKeys[json.key as any] === undefined) console.warn(`Unrecognized key ${json.key}, will default to C`);
        if (typeof json.beatsPerMinute !== 'number') throw new TypeError('Invalid song data: missing beatsPerMinute');
        if (typeof json.beatsPerBar !== 'number') throw new TypeError('Invalid song data: missing beatsPerBar');
        if (typeof json.ticksPerBeat !== 'number') throw new TypeError('Invalid song data: missing ticksPerBeat');
        if (typeof json.loopBars !== 'number') throw new TypeError('Invalid song data: missing loopBars');
        if (typeof json.introBars !== 'number') throw new TypeError('Invalid song data: missing introBars');
        if (!Array.isArray(json.channels)) throw new TypeError('Invalid song data: missing channel data');
        const allowedChannelTypes = new Set(['pitch', 'drum', 'mod']);
        const allowedInstrumentTypes = new Set(['chip', 'custom chip', 'pwm', 'supersaw', 'fm', 'fm6op', 'harmonics', 'picked string', 'spectrum', 'noise', 'drumset', 'mod']);
        const abortInvalidNoteData = (): never => {
            throw new TypeError('Invalid song data: invalid note data');
        };
        const song: BeepboxData['song'] = {
            key: BeepboxData.ScaleKeys[json.key as any] as any ?? BeepboxData.ScaleKeys.C,
            tickSpeed: json.beatsPerMinute * json.ticksPerBeat / 60,
            barLength: json.beatsPerBar * json.ticksPerBeat,
            loopBars: {
                length: json.loopBars,
                offset: json.introBars
            },
            channels: json.channels.map((channel, i) => {
                if (channel == null) throw new TypeError('Invalid song data: null channel data');
                if (!allowedChannelTypes.has(channel.type!)) throw new TypeError(`Invalid song data: unrecognized channel type ${channel.type}`);
                if (!Array.isArray(channel.instruments)) throw new TypeError('Invalid song data: Missing instrument data');
                if (!Array.isArray(channel.patterns)) throw new TypeError('Invalid song data: Missing pattern data');
                if (!Array.isArray(channel.sequence)) throw new TypeError('Invalid song data: Missing sequence');
                return {
                    type: channel.type!,
                    name: channel.name?.length! > 0 ? channel.name! : `${channel.type![0].toUpperCase()}${channel.type!.substring(1)} ${i + 1}`,
                    instruments: channel.instruments.map((instrument) => {
                        if (!allowedInstrumentTypes.has((instrument.type ?? '').toLowerCase())) throw new TypeError(`Invalid song data: unrecognized instrument type ${instrument.type}`);
                        return {
                            type: instrument.type!.toLowerCase() as any
                        };
                    }),
                    patterns: channel.patterns.map((pattern) => {
                        if (pattern == null) throw new TypeError('Invalid song data: null pattern data');
                        if (!Array.isArray(pattern.notes)) throw new TypeError('Invalid song data: Missing note data');
                        return {
                            notes: pattern.notes.map((dat) => {
                                if (dat == null) throw new TypeError('Invalid song data: null note data');
                                if (!Array.isArray(dat.pitches)) throw new TypeError('Invalid song data: missing note pitches');
                                if (!Array.isArray(dat.points)) throw new TypeError('Invalid song data: missing note points');
                                return {
                                    pitches: dat.pitches!,
                                    points: dat.points.map((pt) => ({
                                        tick: pt.tick ?? abortInvalidNoteData(),
                                        pitchBend: pt.pitchBend ?? abortInvalidNoteData(),
                                        volume: pt.volume ?? abortInvalidNoteData(),
                                    })),
                                    continueLast: dat.continuesLastPattern ?? false,
                                } satisfies NonNullable<BeepboxData['song']>['channels'][number]['patterns'][number]['notes'][number]; // buh
                            }),
                            instruments: pattern.instruments!
                        }
                    }),
                    sequence: channel.sequence as number[]
                } satisfies NonNullable<BeepboxData['song']>['channels'][number];
            })
        };
        return markRaw(song);
    }

    /**All **VISIBLE** instances of visualizers - maintained by the visualizer instances themselves */
    private static readonly instances: Set<BeepboxVisualizer> = new Set();
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

    // because playback is less complex with no audio context beepbox tile just uses media player time

    /**Await this to wait for all renders to complete, or decouple visualizers and drop frames individually */
    static async draw(): Promise<void> {
        await Promise.all(Array.from(this.instances.values()).map((v) => v.draw(Playback.time.value)));
    }
}

export default BeepboxVisualizer;
