import { effectScope, EffectScope, reactive } from "vue";
import { BeepboxJsonSkeleton, BeepboxVisualizerData, ScaleKeys } from "./beepboxData";

/**
 * Rendering context of BeepBox tiles.
 */
export class BeepboxVisualizer {
    /**Reactive state of visualizer - all settings & stuff */
    readonly data: BeepboxVisualizerData;

    private readonly effectScope: EffectScope;

    constructor(initData: BeepboxVisualizerData) {
        this.data = reactive(initData);
        this.effectScope = effectScope();
        this.effectScope.run(() => {
        });
    }

    /**
     * Attempt to extract BeepBox song data from a JSON object. 
     * @param raw An object (e.g., parsed from a JSON string)
     * @throws Will throw an error if the object is not a valid BeepBox song JSON
     */
    static parseRawJSON(raw: any): BeepboxVisualizerData['song'] {
        if (raw == undefined) throw new TypeError('Invalid song data: data is nullish');
        const json = raw as Partial<BeepboxJsonSkeleton>;
        if (ScaleKeys[json.key as any] === undefined) console.warn(`Unrecognized key ${json.key}, will default to C`);
        if (typeof json.beatsPerMinute !== 'number') throw new TypeError('Invalid song data: missing beatsPerMinute');
        if (typeof json.beatsPerBar !== 'number') throw new TypeError('Invalid song data: missing beatsPerBar');
        if (typeof json.ticksPerBeat !== 'number') throw new TypeError('Invalid song data: missing ticksPerBeat');
        if (typeof json.loopBars !== 'number') throw new TypeError('Invalid song data: missing loopBars');
        if (typeof json.introBars !== 'number') throw new TypeError('Invalid song data: missing introBars');
        return {
            key: ScaleKeys[json.key as any] as any ?? ScaleKeys.C,
            bpm: json.beatsPerMinute,
            barLength: json.beatsPerBar * json.ticksPerBeat,
            loopBars: {
                length: json.loopBars,
                offset: json.introBars
            },
            channels: [
                
            ]
        } ;
    }

    destroy(): void {
        this.effectScope.stop();
    }
}
