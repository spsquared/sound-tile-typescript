import { effectScope, EffectScope, markRaw, reactive, Ref, ref, watch } from "vue";
import { DeepPartial } from "@/components/utils";
import { BeepboxJsonSkeleton, BeepboxVisualizerData, ScaleKeys } from "./beepboxData";

/**
 * Rendering context of BeepBox tiles. BeepBox tile only handles visual rendering of notes
 * in the piano roll, not synthesizing the audio. That's for BeepBox to do, not Sound Tile.
 */
export class BeepboxVisualizer {
    /**Reactive state of visualizer - all settings & stuff */
    readonly data: BeepboxVisualizerData;
    
    /**Sets if the visualizer is visible */
    readonly visible: Ref<boolean> = ref(false);

    private readonly effectScope: EffectScope;

    constructor(initData: BeepboxVisualizerData) {
        this.data = reactive(initData);
        this.effectScope = effectScope();
        this.effectScope.run(() => {
            watch(this.visible, () => {
                if (this.visible.value) BeepboxVisualizer.instances.add(this);
                else BeepboxVisualizer.instances.delete(this);
            });
        });
    }

    private async draw(): Promise<void> {
        // i guess workers would be a good idea for canvas rendering? canvas better for effects
        // beepbox suffers from svg lag
    }
    // resize(w: number, h: number): void {
    // }

    /**
     * Attempt to extract BeepBox song data from a JSON object. 
     * @param raw An object (e.g., parsed from a JSON string)
     * @returns Converted and filtered song data, marked raw to avoid unnecessary reactivity lag
     * @throws Will throw an error if the object is not a valid BeepBox song JSON
     */
    static parseRawJSON(raw: any): BeepboxVisualizerData['song'] {
        // we probably don't need such a bulletproof data valiation thing but like...
        // it's also probably not bulletproof
        if (raw == undefined) throw new TypeError('Invalid song data: data is nullish');
        const json = raw as DeepPartial<BeepboxJsonSkeleton>;
        if (ScaleKeys[json.key as any] === undefined) console.warn(`Unrecognized key ${json.key}, will default to C`);
        if (typeof json.beatsPerMinute !== 'number') throw new TypeError('Invalid song data: missing beatsPerMinute');
        if (typeof json.beatsPerBar !== 'number') throw new TypeError('Invalid song data: missing beatsPerBar');
        if (typeof json.ticksPerBeat !== 'number') throw new TypeError('Invalid song data: missing ticksPerBeat');
        if (typeof json.loopBars !== 'number') throw new TypeError('Invalid song data: missing loopBars');
        if (typeof json.introBars !== 'number') throw new TypeError('Invalid song data: missing introBars');
        if (!Array.isArray(json.channels)) throw new TypeError('Invalid song data: missing channel data');
        const allowedChannelTypes = new Set(['pitch', 'drum', 'mod']);
        const abortInvalidNoteData = (): never => {
            throw new TypeError('Invalid song data: invalid note data');
        };
        const song: BeepboxVisualizerData['song'] = {
            key: ScaleKeys[json.key as any] as any ?? ScaleKeys.C,
            bpm: json.beatsPerMinute,
            barLength: json.beatsPerBar * json.ticksPerBeat,
            loopBars: {
                length: json.loopBars,
                offset: json.introBars
            },
            channels: json.channels.map((channel, i) => {
                if (channel == null) throw new TypeError('Invalid song data: null channel data');
                if (!allowedChannelTypes.has(channel.type!)) throw new TypeError(`Invalid song data: unrecognized channel type ${channel?.type}`);
                if (!Array.isArray(channel.patterns)) throw new TypeError('Invalid song data: Missing pattern data');
                if (!Array.isArray(channel.sequence)) throw new TypeError('Invalid song data: Missing sequence');
                return {
                    type: channel.type!,
                    name: channel.name?.length! > 0 ? channel.name! : `${channel.type![0].toUpperCase()}${channel.type!.substring(1)} ${i + 1}`,
                    patterns: channel.patterns.map((pattern) => {
                        if (pattern == null) throw new TypeError('Invalid song data: null pattern data');
                        if (!Array.isArray(pattern.notes)) throw new TypeError('Invalid song data: Missing note data');
                        return pattern.notes.map((dat) => {
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
                                continueLast: dat.continuesLastPattern ?? false
                            } satisfies NonNullable<BeepboxVisualizerData['song']>['channels'][number]['patterns'][number][number]; // buh
                        });
                    }),
                    sequence: channel.sequence as number[]
                } satisfies NonNullable<BeepboxVisualizerData['song']>['channels'][number];
            })
        };
        return markRaw(song);
    }

    destroy(): void {
        this.effectScope.stop();
    }

    /**All **VISIBLE** instances of visualizers - maintained by the visualizer instances themselves */
    private static readonly instances: Set<BeepboxVisualizer> = new Set();

    // because playback is less complex with no audio context beepbox tile just uses media player time

    /**Await this to wait for all renders to complete, or decouple visualizers and drop frames individually */
    static async draw(): Promise<void> {
        await Promise.all(Array.from(this.instances.values()).map((v) => v.draw()));
    }
}

export default BeepboxVisualizer;
