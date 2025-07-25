import { computed, ComputedRef, reactive, ref, Ref, watch, WritableComputedRef } from 'vue';
import { Media, defaultCoverArt } from './media';
import Visualizer from './visualizer';
import { throttledWatch, useWakeLock } from '@vueuse/core';
import TileEditor from './editor';
import { GroupTile, VisualizerTile, ImageTile, TextTile } from './tiles';

type MediaPlayerState = {
    current: Media
    shuffle: boolean
    loop: boolean
    volume: number
    mediaDataTabOpen: boolean
};

/**
 * Global media controls, coordinates visualizer & controls.
 */
export class MediaPlayer {
    static readonly state: MediaPlayerState = reactive<MediaPlayerState>({
        current: new Media({
            title: '',
            subtitle: '',
            coverArt: defaultCoverArt
        }),
        shuffle: localStorage.getItem('shuffle') == 'true',
        loop: localStorage.getItem('loop') == 'true',
        volume: Number(localStorage.getItem('volume') ?? '1'),
        mediaDataTabOpen: false
    }) as MediaPlayerState;
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
        watch(() => this.state.shuffle, () => localStorage.setItem('shuffle', this.state.shuffle + ''));
        watch(() => this.state.loop, () => localStorage.setItem('loop', this.state.loop + ''));
        watch(() => this.state.volume, () => {
            Visualizer.gain.gain.value = this.state.volume;
            localStorage.setItem('volume', this.state.volume.toString());
        }, { immediate: true });
        watch(() => this.internalTimer.now, () => this.updateTime());
        throttledWatch([this.playing, () => this.internalTimer.startTime], ([], [wasPlaying]) => {
            if (this.playing.value && Visualizer.duration > 0) {
                if (this.internalTimer.currentTime + 0.01 >= Visualizer.duration) this.setTime(0);
                else Visualizer.start(this.internalTimer.currentTime); // reactivity will run this if above runs
                this.wakeLock.request('screen');
            } else if (wasPlaying) {
                Visualizer.stop();
                this.wakeLock.release();
            }
        }, { throttle: 10, leading: true, trailing: true });
        watch(() => Visualizer.duration, () => {
            if (this.internalTimer.currentTime >= Visualizer.duration) this.setTime(Visualizer.duration);
        });
        setInterval(() => this.internalTimer.now = performance.now() / 1000, 20);
    }

    // playlist and session
    static {
        watch(() => this.state.current, async (_session, oldSession) => {
            // put the old tree back into old session
            await TileEditor.state.lock.acquire();
            oldSession.tree = TileEditor.detachRoot();
            this.state.current.tree = TileEditor.attachRoot(this.state.current.tree);
            TileEditor.state.lock.release();
            this.state.mediaDataTabOpen = this.state.current.title.trim().length > 0;
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
    subB.addChild(new ImageTile());
    subB.addChild(new TextTile());
    subA.addChild(subB);
    subA.addChild(new VisualizerTile());
    root.addChild(subA);
    root.addChild(new VisualizerTile());
    root.addChild(new VisualizerTile());
    root.label = 'Root Group Tile';
    MediaPlayer.state.current = new Media({
        title: '',
        subtitle: '',
        coverArt: defaultCoverArt
    }, root);
}

export default MediaPlayer;
