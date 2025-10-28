import { computed, ComputedRef, reactive, ref, Ref, watch, WritableComputedRef } from 'vue';
import { Media, defaultCoverArt } from './media';
import Visualizer from './visualizer';
import { useLocalStorage, useWakeLock } from '@vueuse/core';
import TileEditor from './editor';
import { GroupTile, VisualizerTile, ImageTile, TextTile } from './tiles';
import { VisualizerMode } from './visualizerData';
import Modulation from './modulation';

/**
 * Global media controls, coordinates visualizer & controls.
 */
export class MediaPlayer {
    static readonly state: {
        shuffle: boolean
        loop: boolean
        volume: number
        mediaDataTabOpen: boolean
    } = reactive({
        // the one time automatic ref unwrapping is good
        shuffle: useLocalStorage('shuffle', false),
        loop: useLocalStorage('loop', false),
        volume: useLocalStorage('volume', 1),
        mediaDataTabOpen: false
    });
    static readonly media = reactive({
        current: new Media({
            title: '',
            subtitle: '',
            coverArt: defaultCoverArt
        })
    }) as {
        current: Media
    };
    private static readonly internalTimer = reactive<{
        // setting startTime essentially determines the offset of the audio
        startTime: number
        // actual current time, so it can be frozen when paused
        currentTime: number
        // just performance.now() / 1000 but updated every 20ms
        now: number
    }>({
        startTime: 0,
        currentTime: 0,
        now: 0
    });
    static readonly playing: Ref<boolean> = ref(false);
    static readonly currentTime: WritableComputedRef<number> = computed({
        get: () => this.internalTimer.currentTime,
        set: (t) => this.setTime(t)
    });
    static readonly currentDuration: ComputedRef<number> = computed(() => Visualizer.duration);
    private static readonly wakeLock = useWakeLock();

    static play(t?: number): void {
        if (t !== undefined) this.setTime(t);
        this.playing.value = true;
        this.updateTime();
    }
    static pause(): void {
        this.playing.value = false;
        this.updateTime();
    }
    static setTime(t: number): void {
        const clamped = Math.max(0, Math.min(t, Visualizer.duration));
        this.internalTimer.startTime = this.internalTimer.now - clamped;
        this.internalTimer.currentTime = clamped;
        this.updateTime();
    }
    private static updateTime(): void {
        if (Visualizer.duration == 0) {
            this.playing.value = false;
        } else if (this.playing.value) {
            this.internalTimer.currentTime = this.internalTimer.now - this.internalTimer.startTime;
            if (this.internalTimer.currentTime >= Visualizer.duration) {
                if (this.state.loop) {
                    this.setTime(0);
                } else {
                    this.playing.value = false;
                    this.setTime(Visualizer.duration);
                }
            }
        } else {
            this.internalTimer.startTime = this.internalTimer.now - this.internalTimer.currentTime;
        }
    }

    static formatTime(t: number): string {
        const minutes = Math.floor(t / 60);
        const seconds = ((Math.floor(t) % 60) / 100).toFixed(2).substring(2);
        return `${minutes}:${seconds}`;
    }

    // playback
    static {
        watch(() => this.state.volume, () => {
            Visualizer.gain.gain.value = this.state.volume;
        }, { immediate: true });
        watch(() => this.internalTimer.now, () => this.updateTime());
        watch([this.playing, () => this.internalTimer.startTime], ([], [wasPlaying]) => {
            if (this.playing.value && Visualizer.duration > 0) {
                if (this.internalTimer.currentTime + 0.01 >= Visualizer.duration) this.setTime(0);
                else Visualizer.start(this.internalTimer.currentTime); // reactivity runs this with the above line and restarts playback
                this.wakeLock.request('screen');
            } else if (wasPlaying) {
                Visualizer.stop();
                this.wakeLock.release();
            }
        });
        watch(() => Visualizer.duration, () => {
            if (this.internalTimer.currentTime >= Visualizer.duration) this.setTime(Visualizer.duration);
        });
        watch(() => Visualizer.playing, () => {
            // handles audio context interruptions
            if (Visualizer.playing != this.playing.value) this.playing.value = Visualizer.playing;
        });
        setInterval(() => this.internalTimer.now = performance.now() / 1000, 20);
    }

    // playlist and session
    static {
        watch(() => this.media.current, async (_session, oldSession) => {
            // put the old tree back into old session
            await TileEditor.lock.acquire();
            oldSession.tree = TileEditor.detachRoot();
            this.media.current.tree = TileEditor.attachRoot(this.media.current.tree);
            TileEditor.lock.release();
            this.state.mediaDataTabOpen = this.media.current.title.trim().length > 0;
        });
        watch([() => this.media.current.title, () => this.media.current.subtitle], () => {
            const titleTrim = this.media.current.title.trim();
            const subtitleTrim = this.media.current.subtitle.trim();
            document.title = `Sound Tile - ${titleTrim.substring(0, 32)}${titleTrim.length > 32 ? '...' : ''}${subtitleTrim.length > 0 ? ' - ' : ''}${subtitleTrim.substring(0, 32)}${subtitleTrim.length > 32 ? '...' : ''}`;
        });
    }
}

// default state
{
    const root = new GroupTile();
    const subA = new GroupTile();
    const subB = new GroupTile();
    subA.orientation = GroupTile.VERTICAL;
    subA.addChild(new VisualizerTile());
    const img = new ImageTile();
    subB.addChild(img);
    subB.addChild(new TextTile());
    subA.addChild(subB);
    subA.addChild(new VisualizerTile());
    subA.size = 2;
    root.addChild(subA);
    const visA = new VisualizerTile();
    visA.visualizer.data.mode = VisualizerMode.WAVE_CORRELATED;
    visA.visualizer.data.fftSize = 2048;
    visA.size = 2;
    visA.modulator.connect(img, 'peak', 'imgScale', [new Modulation.LinearTransform([0.5, 0.25])]);
    root.addChild(visA);
    const visB = new VisualizerTile();
    visB.visualizer.data.mode = VisualizerMode.CHANNEL_PEAKS;
    root.addChild(visB);
    root.label = 'Root Group Tile';
    MediaPlayer.media.current = new Media({
        title: '',
        subtitle: '',
        coverArt: defaultCoverArt
    }, root);
}

export default MediaPlayer;
