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
                this.data.channelStyles.length = this.data.song?.channels.reduce((ct, { type }) => ct + (type != 'mod' ? 1 : 0), 0) ?? 0;
                this.data.channelStyles = this.data.channelStyles.map((style) => style ?? BeepboxData.createDefaultChannelStyle());
            }, { immediate: true, deep: false });
            watch(this.renderer.loadResult, () => {
                const res = this.renderer.loadResult.value;
                this.duration = res.songLength;
                BeepboxVisualizer.recalculateDuration();
            });
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
    private async draw(time: number): Promise<void> {
        if (this.drawing || this.data.song === null || !this.visible.value) return;
        this.drawing = true;
        this.debug.startTime = performance.now();
        await this.renderer.draw(time);
        this.ctx.reset();
        if (this.canvas.width !== this.renderer.canvas.width || this.canvas.height !== this.renderer.canvas.height) {
            this.canvas.width = this.renderer.canvas.width;
            this.canvas.height = this.renderer.canvas.height;
        }
        this.ctx.drawImage(this.renderer.canvas, 0, 0);
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
                ...this.renderer.frameResult.value.debugText,
                `Load: ${this.renderer.loadResult.value.loadTime.toFixed(2)}ms`
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
        BeepboxVisualizer.recalculateDuration();
    }

    /**
     * Attempt to extract BeepBox song data from a JSON object.
     * @param raw An object (e.g., parsed from a JSON string)
     * @returns Converted and filtered song data, **MARKED RAW** to avoid unnecessary reactivity lag
     * @throws Will throw an error if the object is not a valid BeepBox song JSON
     */
    static parseRawJSON(raw: any): BeepboxData.Song {
        // we probably don't need such a bulletproof data valiation thing but like...
        // it's also probably not bulletproof
        const start = performance.now();
        if (raw == undefined) throw new InvalidBeepBoxError('data is nullish');
        const json = raw as DeepPartial<BeepboxJsonSkeleton>;
        if (BeepboxData.ScaleKeys[json.key as BeepboxData.ScaleKeys] === undefined) console.warn(`Unrecognized key ${json.key}, will default to C`);
        if (typeof json.beatsPerMinute !== 'number') throw new InvalidBeepBoxError('missing beatsPerMinute');
        if (typeof json.beatsPerBar !== 'number') throw new InvalidBeepBoxError('missing beatsPerBar');
        if (typeof json.ticksPerBeat !== 'number') throw new InvalidBeepBoxError('missing ticksPerBeat');
        if (typeof json.loopBars !== 'number') throw new InvalidBeepBoxError('missing loopBars');
        if (typeof json.introBars !== 'number') throw new InvalidBeepBoxError('missing introBars');
        if (!Array.isArray(json.channels)) throw new InvalidBeepBoxError('missing channel data');
        const allowedChannelTypes = new Set(['pitch', 'drum', 'mod']);
        const allowedInstrumentTypes = new Set(Object.values(BeepboxData.InstrumentType));
        const abortInvalidNoteData = (): never => {
            throw new InvalidBeepBoxError('invalid note data');
        };
        const abortInvalidInstrumentData = (): never => {
            throw new InvalidBeepBoxError('invalid instrument data');
        };
        const song: BeepboxData.Song = {
            key: BeepboxData.ScaleKeys[json.key as BeepboxData.ScaleKeys] ?? BeepboxData.ScaleKeys.C,
            tickSpeed: json.beatsPerMinute * json.ticksPerBeat / 60,
            beatLength: json.ticksPerBeat,
            barLength: json.beatsPerBar * json.ticksPerBeat,
            meterLength: json.beatsPerBar,
            loopBars: {
                offset: json.introBars,
                length: json.loopBars
            },
            songLength: Math.max(...json.channels.map((ch) => ch.sequence?.length ?? 0)),
            channels: json.channels.map((channel, i) => {
                if (channel == null) throw new InvalidBeepBoxError('null channel data');
                if (!allowedChannelTypes.has(channel.type!)) throw new InvalidBeepBoxError(`unrecognized channel type "${channel.type}"`);
                if (!Array.isArray(channel.instruments)) throw new InvalidBeepBoxError('missing instrument data');
                if (!Array.isArray(channel.patterns)) throw new InvalidBeepBoxError('missing pattern data');
                if (!Array.isArray(channel.sequence)) throw new InvalidBeepBoxError('missing sequence');
                return {
                    type: channel.type!,
                    name: channel.name?.length! > 0 ? channel.name! : `${channel.type![0].toUpperCase()}${channel.type!.substring(1)} ${i + 1}`,
                    instruments: channel.instruments.map((instrument) => {
                        const type = (instrument.type?.toLowerCase() ?? '') as BeepboxData.InstrumentType;
                        if (!allowedInstrumentTypes.has(type)) throw new InvalidBeepBoxError(`unrecognized instrument type "${instrument.type}"`);
                        if (type == BeepboxData.InstrumentType.MOD) return {
                            type: BeepboxData.InstrumentType.MOD,
                            modChannels: !Array.isArray(instrument.modChannels) ? abortInvalidInstrumentData() : instrument.modChannels,
                            modInstruments: !Array.isArray(instrument.modInstruments) ? abortInvalidInstrumentData() : instrument.modInstruments,
                            modSettings: !Array.isArray(instrument.modSettings) ? abortInvalidInstrumentData() : instrument.modSettings,
                        } satisfies BeepboxData.Song['channels'][number]['instruments'][number] & { type: BeepboxData.InstrumentType.MOD };
                        else return {
                            type: type,
                            envelopes: instrument.envelopes?.map((env) => {
                                if (env.target === undefined) return abortInvalidInstrumentData();
                                const dictEntry = BeepboxData.Envelope.beepboxEnvelopeTable[env.envelope as keyof typeof BeepboxData.Envelope.beepboxEnvelopeTable];
                                if (dictEntry === undefined) return abortInvalidInstrumentData();
                                const invert = env.inverse ?? env.envelopeInverse ?? false;
                                const boundMin = env.perEnvelopeLowerBound ?? dictEntry.min ?? 0;
                                const boundMax = env.perEnvelopeUpperBound ?? dictEntry.max ?? 1;
                                const partial = {
                                    target: env.target,
                                    min: invert ? boundMax : boundMin,
                                    max: invert ? boundMin : boundMax,
                                    speed: env.perEnvelopeSpeed ?? dictEntry.speed ?? 1,
                                    discrete: env.discrete ?? env.discreteEnvelope ?? false
                                };
                                switch (dictEntry.envelope) {
                                    case BeepboxData.EnvelopeType.PITCH:
                                        return {
                                            ...partial,
                                            envelope: BeepboxData.EnvelopeType.PITCH,
                                            pitchMin: env.pitchEnvelopeStart ?? 0,
                                            pitchMax: env.pitchEnvelopeEnd ?? 96,
                                        };
                                    case BeepboxData.EnvelopeType.RANDOM:
                                        return {
                                            ...partial,
                                            envelope: BeepboxData.EnvelopeType.RANDOM,
                                            randomType: (['time', 'pitch', 'note', 'time smooth'] as const)[env.waveform ?? 0],
                                            seed: env.seed ?? 2,
                                            steps: env.steps ?? 2
                                        };
                                    case BeepboxData.EnvelopeType.LFO:
                                        return {
                                            ...partial,
                                            envelope: BeepboxData.EnvelopeType.LFO,
                                            waveform: (['sine', 'square', 'triangle', 'sawtooth', 'trapezoid', 'stepped saw', 'stepped tri'] as const)[env.waveform ?? 0]
                                        };
                                    default:
                                        return {
                                            ...partial,
                                            envelope: dictEntry.envelope
                                        };
                                }
                            }) ?? abortInvalidInstrumentData()
                        } satisfies Exclude<BeepboxData.Song['channels'][number]['instruments'][number], { type: BeepboxData.InstrumentType.MOD }>;
                    }),
                    patterns: channel.patterns.map((pattern) => {
                        if (pattern == null) throw new InvalidBeepBoxError('null pattern data');
                        if (!Array.isArray(pattern.notes)) throw new InvalidBeepBoxError('missing note data');
                        return {
                            notes: pattern.notes.map((dat) => {
                                if (dat == null) throw new InvalidBeepBoxError('null note data');
                                if (!Array.isArray(dat.pitches)) throw new InvalidBeepBoxError('missing note pitches');
                                if (!Array.isArray(dat.points)) throw new InvalidBeepBoxError('missing note points');
                                return {
                                    pitches: dat.pitches!,
                                    points: dat.points.map((pt) => ({
                                        tick: pt.tick ?? abortInvalidNoteData(),
                                        pitchBend: pt.pitchBend ?? abortInvalidNoteData(),
                                        volume: pt.volume ?? abortInvalidNoteData(),
                                    })),
                                    continueLast: dat.continuesLastPattern ?? false,
                                } satisfies BeepboxData.Song['channels'][number]['patterns'][number]['notes'][number]; // buh
                            }),
                            // if "different instruments per pattern" is off this just doesn't exist
                            instruments: pattern.instruments ?? new Array(channel.instruments!.length).fill(0).map((_, i) => i + 1)
                        }
                    }),
                    sequence: channel.sequence as number[]
                } satisfies BeepboxData.Song['channels'][number];
            })
        };
        if (perfMetrics.debugLevel.value > 0) console.debug('Loaded BeepBox JSON in ' + (performance.now() - start) + 'ms');
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

    /**Await this to wait for all renders to complete, or decouple visualizers and drop frames individually */
    static async draw(): Promise<void> {
        await Promise.all(Array.from(this.instances.values()).map((v) => v.draw(Playback.time.value)));
    }
}

export default BeepboxVisualizer;

class InvalidBeepBoxError extends Error {
    readonly name = 'InvalidBeepBoxError';
    constructor(message: string) {
        super('Invalid song data: ' + message);
        if (Error.captureStackTrace) Error.captureStackTrace(this, InvalidBeepBoxError);
    }
}
