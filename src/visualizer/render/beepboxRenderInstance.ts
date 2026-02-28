import { useThrottleFn } from '@vueuse/core';
import chroma from 'chroma-js';
import { webgpuSupported } from '@/constants';
import { ColorData } from '@/components/inputs/colorPicker';
import type { RendererMessageData, RendererMessageEvent, BeepboxRendererFrameResults, BeepboxSettingsData, BeepboxRendererLoadResults } from './beepboxRenderer';
import BeepboxData from '../beepboxData';

const isInWorker = 'importScripts' in globalThis;

/**
 * Renderer class used by both the worker renderer and the fallback renderer.
 */
abstract class BeepboxRenderInstance {
    readonly canvas: OffscreenCanvas;
    protected data: BeepboxSettingsData;
    protected resized: [number, number] | undefined = undefined;

    playing: boolean = false;
    debugInfo: 0 | 1 | 2 = 0;
    protected readonly debugText: string[] = [];

    /**
     * Time, progress (ticks), and tempo (ticks per second), sorted by time. Binary-searchable.
     * Tempo linearly interpolates to the next lookup point with respect to ticks.
     */
    private tickLookupKeyframes: [number, number, number][] = [];
    private songLength: number = 0;

    frameResult: BeepboxRendererFrameResults = {
        renderTime: 0,
        debugText: []
    };

    constructor(canvas: OffscreenCanvas, data: BeepboxSettingsData) {
        this.canvas = canvas;
        this.data = data;
    }

    /**Attempt to create a WebGPU renderer, and if WGPU isn't supported, use fallback Canvas2D renderer */
    static createInstance(canvas: OffscreenCanvas, data: BeepboxSettingsData): BeepboxRenderInstance {
        if (webgpuSupported) return new WGPURenderer(canvas, data);
        return new Canvas2dRenderer(canvas, data);
    }

    draw(time: number): void {
        const startTime = performance.now();
        this.debugText.length = 0;
        const tick = this.lookupTicks(time);
        if (this.debugInfo > 0) this.debugText.push(`Tick=${this.ticksToBar(tick)}/${this.ticksInBar(tick).toFixed(2)} (${tick.toFixed(2)}) KF=${this.tickLookupKeyframes.length}`);
        this.drawFrame(tick);
        // track performance metrics
        const endTime = performance.now();
        if (this.playing && this.debugInfo == 2) this.printDebugInfo(time);
        // finalize
        this.frameResult = {
            renderTime: endTime - startTime,
            debugText: this.debugText
        }
        this.resized = undefined;
    }

    protected abstract drawFrame(tick: number): void

    protected lookupTicks(time: number): number {
        if (this.tickLookupKeyframes.length == 0) return 0;
        if (this.tickLookupKeyframes.length == 1) return this.tickLookupKeyframes[0][2] * time;
        // we binary search the tempo modulations to find what part of the song we're in
        let start = 0, end = this.tickLookupKeyframes.length - 1;
        // this search is a bit weird because we want the start/end to point to the before/after points
        while (end - start > 1) {
            const mid = Math.floor((start + end) / 2);
            const [t, tk] = this.tickLookupKeyframes[mid];
            if (t == time) return tk;
            if (t < time) {
                start = mid;
            } else {
                end = mid;
            }
        }
        // the search stops early and will always have end adjacent to start
        const [t1, tk1, tps1] = this.tickLookupKeyframes[start];
        const [t2, tk2, tps2] = this.tickLookupKeyframes[end];
        // I forsee an edge case if the time is after the last lookup tick
        if (time == t1) return tk1;
        if (time == t2) return tk2;
        if (time > t2) return tk2 + (tps2 * (time - t2));
        // k = tick, r = slope of tempo change with respect to k, r0 = start tempo, k0 = start tick, t0 = start time
        // dk/dt = r(k-k0) + r0
        // k(t) = (r0/r)e^r(t-t0) + k0 - r0/r
        // this looks weird but it works i guess
        // also an edge case if tempo1 and tempo2 are the same, it divides by 0
        if (tps1 == tps2) return tk1 + tps1 * (time - t1);
        const r = (tps2 - tps1) / (tk2 - tk1);
        return tps1 / r * (Math.E ** (r * (time - t1))) + tk1 - tps1 / r;
    }
    protected ticksToBar(tick: number): number {
        // skipped beats don't cut bars short
        return Math.floor(tick / (this.data.song?.barLength ?? 1));
    }
    protected ticksInBar(tick: number): number {
        return tick % (this.data.song?.barLength ?? 1);
    }

    protected calcViewportSize(): { readonly width: number, readonly height: number } {
        return {
            width: this.data.rotate ? this.canvas.height : this.canvas.width,
            height: this.data.rotate ? this.canvas.width : this.canvas.height
        };
    }

    resize(w: number, h: number): void {
        this.resized = [w, h];
    }
    updateData(data: BeepboxSettingsData): BeepboxRendererLoadResults {
        this.data = data;
        const start = performance.now();
        this.createTickLUT();
        const loadTime = performance.now() - start;
        return {
            songLength: this.songLength,
            loadTime: loadTime
        };
    }
    private createTickLUT() {
        const keyframes: typeof this.tickLookupKeyframes = [];
        if (this.data.song !== null) {
            const song = this.data.song;
            // create initial point with just normal tempo
            keyframes.push([0, 0, song.tickSpeed]);
            // track if bar ended with a next bar mod, to avoid advancing time
            let skippedTime = false;
            const modChannels: BeepboxData.Channel[] = song.channels.filter((ch) => ch.type == 'mod');
            // pre-generated sequence for the sequence
            const loopSequence = new Array(song.songLength).fill(0).map((_, i) => i);
            for (let i = 1; i < this.data.loopCount; i++) {
                loopSequence.splice(song.loopBars.offset, 0, ...loopSequence.slice(song.loopBars.offset, song.loopBars.offset + song.loopBars.length));
            }
            for (let i = 0; i < loopSequence.length; i++) {
                const seqIndex = loopSequence[i];
                // keyframes do not store time; in 1 bar overriding mods will invalidate times anyway + no
                // discontinuity (deferred time integration + allowing next bar to splice keyframes)
                // we store intermediate "hold" flag that signals the keyframe doesn't interpolate to
                // the next keyframe to resolve a case where the note is between two existing notes, where
                // we have to overwrite the keyframe extending between the two notes holding the tempo;
                // without this we wouldn't be able to distinguish this from interrupting the middle of
                // a note where we want to splice and keep the old tempo
                const barKeyframes: [number, number, boolean][] = [];
                let firstNextBarTick = song.barLength;
                // lower channels & lines override previous mods (by splicing)
                for (const channel of modChannels) {
                    if (channel.sequence[seqIndex] == 0) continue; // 0 pattern
                    const pattern = channel.patterns[channel.sequence[seqIndex] - 1];
                    if (pattern === undefined) throw new CorruptSongError(`pattern ${channel.sequence[seqIndex]} at ${seqIndex} (in ${channel.name})`);
                    // lower mod channels will override and splice existing keyframes to be consistent
                    // with how Jummbox/derivatives handle conflicts
                    // next bar modulators immediately place a keyframe and... go to the next bar
                    // next bar is also deferred to after tempo mods are processed
                    const instrument = channel.instruments[pattern.instruments[0] - 1]; // only one instrument can be active for mod
                    if (instrument === undefined || instrument.type !== BeepboxData.InstrumentType.MOD) throw new CorruptSongError(`instrument ${pattern.instruments[0]} at ${seqIndex} (in ${channel.name})`);
                    // me when I next bar my chip wave (not checking channel here)
                    for (let j = 0; j < instrument.modSettings.length; j++) {
                        // reference for modulator enum:
                        // https://github.com/ultraabox/ultrabox_typescript/blob/main/synth/SynthConfig.ts#L1563
                        // channel -1 is song, modulator 2 is tempo and 4 is next bar
                        const pitch = 5 - j; // pitches are bottom up and settings top down buh
                        if (instrument.modSettings[j] == 2) {
                            // tempo mod - pitch is "channel"
                            const notes = pattern.notes.filter(({ pitches }) => pitches[0] == pitch);
                            for (const note of notes) {
                                // we can assume points are sorted
                                const startTick = note.points[0].tick;
                                const endTick = note.points[note.points.length - 1].tick;
                                // append to end with no overlap
                                // we can create keyframes for all pins normally, and create a second keyframe
                                // at the start to prevent unwanted interpolation from the previous one
                                if (barKeyframes.length == 0 || startTick >= barKeyframes[barKeyframes.length - 1][0]) {
                                    for (const pt of note.points) barKeyframes.push([pt.tick, (pt.volume + 1) * song.beatLength / 60, false]);
                                    barKeyframes[barKeyframes.length - 1][2] = true;
                                    continue;
                                }
                                // start/end insertion are independent and can be handled separately
                                // keyframes at the same tick should be overriden so search is inclusive
                                const insertionStart = barKeyframes.findIndex(([tk]) => tk >= startTick);
                                const insertionEnd = barKeyframes.findIndex(([tk]) => tk > endTick);
                                // for both we are either overriding an interpolation or a hold
                                // splice and create keyframe if there is previous interpolation (no hold)
                                // and delete all existing keyframes within the note (start <= i <= end)
                                const splicedFrames: typeof barKeyframes = [];
                                if (insertionStart > 0 && !barKeyframes[insertionStart - 1][2]) {
                                    // splice linear interpolation with a new keyframe
                                    const [tk1, tps1] = barKeyframes[insertionStart - 1];
                                    const [tk2, tps2] = barKeyframes[insertionStart];
                                    const spliceTempo = (tps2 - tps1) / (tk2 - tk1) * (startTick - tk1) + tps1;
                                    splicedFrames.push([startTick, spliceTempo, false]); // bool ultimately doesn't matter
                                }
                                for (const pt of note.points) splicedFrames.push([pt.tick, (pt.volume + 1), false]);
                                splicedFrames.at(-1)![2] = true;
                                if (insertionEnd > 0 && !barKeyframes[insertionEnd - 1][2]) {
                                    // more splicing
                                    const [tk1, tps1] = barKeyframes[insertionEnd - 1];
                                    const [tk2, tps2] = barKeyframes[insertionEnd];
                                    const spliceTempo = (tps2 - tps1) / (tk2 - tk1) * (endTick - tk1) + tps1;
                                    splicedFrames.push([endTick, spliceTempo, false]);
                                }
                                barKeyframes.splice(insertionStart, insertionEnd - insertionStart, ...splicedFrames);
                            }
                        } else if (instrument.modSettings[j] == 4) {
                            // next bar mod
                            const notes = pattern.notes.filter(({ pitches }) => pitches[0] == pitch);
                            for (const note of notes) {
                                // notes can be out of order in JSON
                                if (note.points[0].tick < firstNextBarTick) firstNextBarTick = note.points[0].tick;
                            }
                        }
                    }
                }
                // now splice next bar mod by deleting all keyframes strictly after the mod
                // if the next bar is at the start of the bar it will leave only one keyframe at the start
                // as it's not possible to have multiple keyframes at tick 0 with the above algorithm
                const nextBarCutoff = barKeyframes.findIndex(([tk]) => tk > firstNextBarTick);
                // if it's 0 we actually cut all the keyframes, so we don't splice
                if (nextBarCutoff > 0) {
                    const [tk1, tps1] = barKeyframes[nextBarCutoff - 1];
                    const [tk2, tps2] = barKeyframes[nextBarCutoff];
                    barKeyframes.splice(nextBarCutoff);
                    // also don't splice if it's just going to duplicate the keyframe
                    if (firstNextBarTick != tk1) {
                        const spliceTempo = (tps2 - tps1) / (tk2 - tk1) * (firstNextBarTick - tk1) + tps1;
                        barKeyframes.push([firstNextBarTick, spliceTempo, false]);
                    }
                }
                // tick at start of bar
                const tickOffset = i * song.barLength;
                // if time was skipped in the last bar we create a new keyframe at the start of
                // this bar without advancing the time (holding the tempo of course)
                if (skippedTime) {
                    // if there's multiple next bar at the start of bars this creates many
                    // keyframes at the same time which is... suboptimal and may look weird
                    // should be fine though...
                    const prev = keyframes[keyframes.length - 1];
                    keyframes.push([prev[0], tickOffset, prev[2]]);
                }
                skippedTime = firstNextBarTick < song.barLength;
                // we processed this bar in isolation, so to avoid unintended ramping from the
                // previous bar we create a new keyframe before the first keyframe of this bar
                // if the tempos are different and there's a gap to the start of this bar
                const prevFrame = keyframes[keyframes.length - 1];
                if (barKeyframes.length > 0 && prevFrame[2] != barKeyframes[0][1] && prevFrame[1] != tickOffset) {
                    const tk = barKeyframes[0][0] + tickOffset;
                    const t = prevFrame[0] + (tk - prevFrame[1]) / prevFrame[2]; // hold tempo
                    // additional optimization - move the previous frame if same tempo as the frame before that
                    if (keyframes.length > 1 && prevFrame[2] == keyframes[keyframes.length - 2][2]) {
                        prevFrame[0] = t;
                        prevFrame[1] = tk;
                    } else {
                        keyframes.push([t, tk, prevFrame[2]]);
                    }
                }
                // now finalize our keyframes into the lookup table
                let [t, tk1, tps1] = keyframes[keyframes.length - 1];
                for (const [tk2Raw, tps2] of barKeyframes) {
                    const tk2 = tk2Raw + tickOffset;
                    if (tk1 == tk2) {
                        keyframes.push([t, tk2, tps2]);
                    } else if (tps1 == tps2) {
                        keyframes.push([t += (tk2 - tk1) / tps1, tk2, tps2])
                    } else {
                        // k = tick, r = slope of tempo change with respect to k, r0 = start tempo, k0 = start tick, k1 = end tick, t0 = start time
                        // dk/dt = r(k-k0) + r0
                        // t1 = t0 + integral(dt/dk dk, k0 -> k1)
                        // we integrate inverse of tempo (ticks/s -> s/tick) with respect to ticks to find time elapsed
                        // t1 = t0 + 1/r * ln(r(k1-k0)/r0 + 1)
                        const r = (tps2 - tps1) / (tk2 - tk1);
                        t += 1 / r * Math.log(r * (tk2 - tk1) / tps1 + 1);
                        keyframes.push([t, tk2, tps2]);
                    }
                    tk1 = tk2;
                    tps1 = tps2;
                }
            }
            // create final point at song end by extrapolating from last keyframe
            const finalLength = loopSequence.length * song.barLength;
            const prevFrame = keyframes[keyframes.length - 1];
            keyframes.push([prevFrame[0] + (finalLength - prevFrame[1]) / prevFrame[2], finalLength, prevFrame[2]]);
        }
        this.tickLookupKeyframes = keyframes;
        this.songLength = keyframes.length > 0 ? keyframes[keyframes.length - 1][0] : 0;
    }

    private printDebugInfo = useThrottleFn((time: number) => {
        console.debug({
            width: this.canvas.width,
            height: this.canvas.height,
            debug: this.debugText,
            data: this.data,
            time: time,
            tickLut: this.tickLookupKeyframes
        });
    }, 500);
}

export default BeepboxRenderInstance;

class WGPURenderer extends BeepboxRenderInstance {
    protected drawFrame(tick: number): void {
        tick
    }
}

class Canvas2dRenderer extends BeepboxRenderInstance {
    readonly ctx: OffscreenCanvasRenderingContext2D;

    constructor(canvas: OffscreenCanvas, data: BeepboxSettingsData) {
        super(canvas, data);
        this.ctx = this.canvas.getContext('2d')!;
    }

    protected drawFrame(tick: number): void {
        this.ctx.reset();
        if (this.resized !== undefined) {
            this.canvas.width = this.resized[0];
            this.canvas.height = this.resized[1];
        }
        // move origin to bottom left and apply transforms
        this.ctx.translate(0, this.canvas.height);
        this.ctx.scale(1, -1);
        this.ctx.scale(this.data.flipX ? -1 : 1, this.data.flipY ? -1 : 1);
        this.ctx.translate(this.data.flipX ? -this.canvas.width : 0, this.data.flipY ? -this.canvas.height : 0);
        if (this.data.rotate) this.ctx.transform(0, 1, 1, 0, 0, 0);
        // spaghetti v2
        this.ctx.save();

        this.drawStaticNotes(tick)
    }

    private drawStaticNotes(tick: number): void {
        tick
        this.createColorScale
        this.createColorStyle
    }

    private createColorStyle(color: ColorData, alpha: number = 1): CanvasGradient | string {
        if (color.type == 'solid') {
            return chroma(color.color).alpha(color.alpha * alpha).hex();
        } else if (color.type == 'gradient') {
            const { width, height } = this.calcViewportSize();
            const angle = color.angle * Math.PI / 180;
            const halfWidth = width / 2;
            const halfHeight = height / 2;
            const edgeX = ((Math.abs(Math.tan(angle)) > width / height) ? (halfWidth * Math.sign(Math.sin(angle))) : (Math.tan(angle) * halfHeight * Math.sign(Math.cos(angle))));
            const edgeY = ((Math.abs(Math.tan(angle)) < width / height) ? (halfHeight * Math.sign(Math.cos(angle))) : (((angle % 180) == 0) ? (halfHeight * Math.sign(Math.cos(angle))) : (halfWidth / Math.tan(angle * Math.sign(Math.sin(angle))))));
            const gradient = color.pattern == 'linear'
                ? this.ctx.createLinearGradient(halfWidth - edgeX, halfHeight - edgeY, halfWidth + edgeX, halfHeight + edgeY)
                : (color.pattern == 'radial'
                    ? this.ctx.createRadialGradient(color.x * width, color.y * height, 0, color.x * width, color.y * height, color.radius * Math.min(width, height))
                    : this.ctx.createConicGradient(angle, color.x * width, color.y * height));
            for (const stop of color.stops) {
                gradient.addColorStop(Math.max(0, Math.min(1, stop.t)), chroma(stop.c).alpha(stop.a * alpha).hex());
            }
            return gradient;
        }
        return 'white';
    }
    private createColorScale(color: ColorData, alpha: number = 1): chroma.Scale {
        if (color.type == 'solid') {
            return chroma.scale([chroma(color.color).alpha(color.alpha * alpha)]);
        } else if (color.type == 'gradient') {
            return chroma.scale(color.stops.map((c) => chroma(c.c).alpha(c.a * alpha))).domain(color.stops.map((c) => Math.max(0, Math.min(1, c.t))));
        }
        // idk
        return chroma.scale(['#FFFFFF']);
    }
}

class CorruptSongError extends Error {
    readonly name = 'CorruptSongError';
    constructor(field: string) {
        super('BeepBox song ' + field + ' is missing or invalid');
        if (Error.captureStackTrace) Error.captureStackTrace(this, CorruptSongError);
    }
}

// wrap a visualizer render instance for communication
if (isInWorker) {
    onmessage = (e) => {
        const renderer = BeepboxRenderInstance.createInstance(e.data[0], e.data[1]);
        onmessage = (e: RendererMessageEvent) => {
            switch (e.data.type) {
                case 'draw':
                    renderer.playing = e.data.playing;
                    renderer.debugInfo = e.data.debug;
                    renderer.draw(e.data.time);
                    postMessage({
                        type: 'drawResponse',
                        ...renderer.frameResult
                    } satisfies RendererMessageData);
                    break;
                case 'resize':
                    renderer.resize(e.data.w, e.data.h);
                    break;
                case 'settings':
                    const res = renderer.updateData(e.data.data);
                    postMessage({
                        type: 'loadResult',
                        ...res
                    } satisfies RendererMessageData);
                    break;
                case 'stop':
                    // everything should be blocking in the worker, no async, so no need for locks
                    close();
                    break;
            }
        };
    }
}
