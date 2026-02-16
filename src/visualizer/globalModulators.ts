import { ref } from 'vue';
import Playback from './playback';
import Modulation from './modulation';

/**
 * External modulation sources and targets that exist outside of the layout scope.
 */
export type GlobalModulator = Modulation.Source<{
    playbackTime: () => number
}>;

const playbackTime = ref(0);
setInterval(() => playbackTime.value = Playback.playing.value ? Playback.time.value : performance.now() / 1000, 10);

export function createGlobalModulator(): GlobalModulator {
    return new Modulation.Source({
        playbackTime: () => playbackTime.value // giving it the ref directly interacts weirdly with the effect scope... so we don't
    }, { label: 'Global Modulator' }); // genuinely dont know what to call this
}