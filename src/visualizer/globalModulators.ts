import { ref } from "vue";
import Modulation from "./modulation";
import MediaPlayer from "./mediaPlayer";

/**
 * External modulation sources and targets that exist outside of the layout scope.
 */
export type GlobalModulator = Modulation.Source<{
    playbackTime: () => number
}>;

const playbackTime = ref(0);
let started = false;
/**Exists solely as a workaround for circular imports */
export const startMediaPlayerPlaybackTime = async (player: typeof MediaPlayer) => {
    // I love circular imports
    if (!started) setInterval(() => playbackTime.value = player.playing.value ? player.currentTime.value : performance.now() / 1000, 10);
    started = true;
};

export function createGlobalModulator(): GlobalModulator {
    return new Modulation.Source({
        playbackTime: () => playbackTime.value // giving it the ref directly interacts weirdly with the effect scope... so we don't
    }, { label: 'Global Modulator' }); // genuinely dont know what to call this
}