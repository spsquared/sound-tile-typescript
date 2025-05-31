import { reactive, watch } from 'vue';
import { Media, defaultCoverArt } from './media';

/**
 * Global media controls, coordinates visualizer & controls.
 */
export class MediaPlayer {
    static readonly state = reactive<{
        current: Media
        shuffle: boolean
        loop: boolean
        volume: number
    }>({
        current: new Media({
            title: '',
            subtitle: '',
            coverArt: defaultCoverArt
        }),
        shuffle: localStorage.getItem('shuffle') === 'true',
        loop: localStorage.getItem('loop') === 'true',
        volume: Number(localStorage.getItem('volume') ?? '100')
    });

    static {
        watch(() => this.state.shuffle, () => localStorage.setItem('shuffle', this.state.shuffle + ''));
        watch(() => this.state.loop, () => localStorage.setItem('loop', this.state.loop + ''));
        watch(() => this.state.volume, () => localStorage.setItem('volume', this.state.volume.toString()));
    }
}

export default MediaPlayer;
