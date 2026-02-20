import { reactive, watch } from 'vue';
import { useLocalStorage, useWakeLock } from '@vueuse/core';
import { Media, defaultCoverArt } from './media';
import TileEditor from './editor';
import { GroupTile, VisualizerTile, ImageTile, TextTile } from './tiles';
import Playback from './playback';
import VisualizerData from './visualizerData';
import Modulation from './modulation';

/**
 * Global media controls, coordinates visualizer & controls.
 */
namespace MediaPlayer {
    export const state: {
        shuffle: boolean
        loop: boolean
        volume: number
        mediaDataTabOpen: boolean
    } = reactive({
        // the one time automatic ref unwrapping is good
        // oops these settings sync across sessions
        shuffle: useLocalStorage('shuffle', false),
        loop: useLocalStorage('loop', false),
        volume: useLocalStorage('volume', 1),
        mediaDataTabOpen: false
    });
    export const media: {
        current: Media
    } = reactive({
        current: new Media({
            title: '',
            subtitle: '',
            coverArt: defaultCoverArt
        })
    }) as any; // how the fuck was there no error with GroupTile until changed an unrelated thing and then there was an error

    const wakeLock = useWakeLock();

    export function formatTime(t: number): string {
        const minutes = Math.floor(t / 60);
        const seconds = ((Math.floor(t) % 60) / 100).toFixed(2).substring(2);
        return `${minutes}:${seconds}`;
    }

    watch(() => state.volume, () => Playback.gain.gain.value = state.volume, { immediate: true });
    watch(Playback.playing, () => {
        if (Playback.playing.value) wakeLock.request('screen');
        else wakeLock.release();
        // looping
        if (state.loop && Playback.time.value + 0.01 >= Playback.duration.value && Playback.duration.value > 0) Playback.start();
    });

    // playlist and session
    watch(() => media.current, async (_session, oldSession) => {
        // pause (this is a bit of a bandaid for not pausing but the root cause is just deferred updates)
        Playback.stop();
        // put the old tree back into old session
        await TileEditor.lock.acquire();
        oldSession.tree = TileEditor.detachRoot();
        media.current.tree = TileEditor.attachRoot(media.current.tree);
        TileEditor.lock.release();
        state.mediaDataTabOpen = media.current.title.trim().length > 0;
    });
    watch([() => media.current.title, () => media.current.subtitle], () => {
        const nowPlaying = [
            media.current.title.trim(),
            media.current.subtitle.trim()
        ].map((s) => s.length > 32 ? s.substring(0, 32) + '...' : s).filter((s) => s.length > 0).join(' - ');
        const title = [nowPlaying, 'Sound Title'].filter((s) => s.length > 0).join(' | ');
        document.title = title;
    });
}

export default MediaPlayer;


// default state
{
    const root = new GroupTile();
    const subA = new GroupTile();
    const subB = new GroupTile();
    subA.orientation = GroupTile.Orientation.VERTICAL;
    subA.addChild(new VisualizerTile());
    const img = new ImageTile();
    subB.addChild(img);
    subB.addChild(new TextTile());
    subA.addChild(subB);
    subA.addChild(new VisualizerTile());
    subA.size = 2;
    root.addChild(subA);
    const visA = new VisualizerTile();
    visA.visualizer.data.mode = VisualizerData.Mode.WAVE_CORRELATED;
    visA.visualizer.data.fftSize = 2048;
    visA.size = 2;
    visA.modulator.connect(img, 'peak', 'imgScale', [new Modulation.LinearTransform([0.5, 0.25])]);
    root.addChild(visA);
    const visB = new VisualizerTile();
    visB.visualizer.data.mode = VisualizerData.Mode.CHANNEL_PEAKS;
    root.addChild(visB);
    root.label = 'Root Group Tile';
    MediaPlayer.media.current = new Media({
        title: '',
        subtitle: '',
        coverArt: defaultCoverArt
    }, root);
};
