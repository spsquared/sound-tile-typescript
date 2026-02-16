import { computed, reactive, watch } from "vue";
import Visualizer from "./visualizer";
import BeepboxVisualizer from "./beepbox";

/**
 * Playback timer and audio context for visualizer/audio synchronization.
 */
namespace Playback {
    export const audioContext: AudioContext = new AudioContext({ sampleRate: 48000 });
    export const gain: GainNode = audioContext.createGain();
    gain.connect(audioContext.destination);
    audioContext.suspend();

    /**Playback is active and audio context is running */
    export const playing = computed<boolean>({
        get: () => internalTimer.playing,
        set: (state) => state ? start() : stop()
    });
    /**The current playback time */
    export const time = computed<number>({
        get: () => internalTimer.currentTime,
        set: (t) => setTime(t)
    });
    /**The time where the start of playback would be (used for seeking) */
    export const startTime = computed<number>(() => internalTimer.startTime);
    /**The maximum playback time */
    export const duration = computed<number>(() => internalTimer.duration);
    /**The current audio context time */
    export const audioTime = computed<number>(() => internalTimer.now);

    const internalTimer = reactive<{
        // playback state
        playing: boolean
        // "offset" - where the start of audio is in audiocontext time
        startTime: number
        // the playback time since the startTime (this is necessary for reactivity)
        currentTime: number
        // the length of media - maximum currentTime
        duration: number
        // the audio context time, but only updated every 10ms (for reactivity purposes)
        now: number
    }>({
        playing: false,
        startTime: 0,
        currentTime: 0,
        duration: 0,
        now: 0
    });

    /**Start playback from the current time, or the beginning if at the end */
    export function start(): void {
        if (time.value + 0.01 >= duration.value) setTime(0);
        internalTimer.playing = true;
        updateTime();
        audioContext.resume();
    }
    /**Pause playback */
    export function stop(): void {
        internalTimer.playing = false;
        updateTime();
        audioContext.suspend();
    }
    /**Seek playback to a certain time */
    export function setTime(t: number): void {
        const clamped = Math.max(0, Math.min(t, internalTimer.duration));
        internalTimer.startTime = internalTimer.now - clamped;
        internalTimer.currentTime = clamped;
        updateTime();
    }

    function updateTime(): void {
        if (internalTimer.duration == 0) {
            internalTimer.playing = false;
            audioContext.suspend();
        } else if (internalTimer.playing) {
            internalTimer.currentTime = internalTimer.now - internalTimer.startTime;
            if (internalTimer.currentTime >= internalTimer.duration) {
                internalTimer.playing = false;
                setTime(internalTimer.duration);
                audioContext.suspend();
            }
        } else {
            internalTimer.startTime = internalTimer.now - internalTimer.currentTime;
        }
    }
    setInterval(() => {
        internalTimer.now = audioContext.currentTime;
        updateTime();
    }, 10);
    // defer to after loading
    setTimeout(() => watch([() => Visualizer.duration, () => BeepboxVisualizer.duration], (durations) => internalTimer.duration = Math.max(...durations)));

    // handle audio context interruptions that would cause desync
    audioContext.addEventListener('statechange', () => {
        const contextPlaying = audioContext.state == 'running';
        if (contextPlaying != internalTimer.playing) {
            if (contextPlaying) internalTimer.playing = true;
            else internalTimer.playing = false;
        }
    });
}

export default Playback;