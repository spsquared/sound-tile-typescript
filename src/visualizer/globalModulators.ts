import { ref } from "vue";
import Modulation from "./modulation";
const mediaPlayer = import('./mediaPlayer');

/**
 * External modulation sources and targets that exist outside of the layout scope.
 */
export type GlobalModulator = Modulation.Source<{
    playbackTime: () => number
}>;

const playbackTime = ref(0);
(async () => {
    // I love circular imports
    const MediaPlayer = (await mediaPlayer).MediaPlayer;
    setInterval(() => playbackTime.value = MediaPlayer.playing.value ? MediaPlayer.currentTime.value : performance.now() / 1000, 10);
})();

export function createGlobalModulator(): GlobalModulator {
    return new Modulation.Source({
        playbackTime: () => playbackTime.value // giving it the ref directly interacts weirdly with the effect scope... so we don't
    }, { label: 'Page Sources' });
}