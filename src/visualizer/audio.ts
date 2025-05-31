import { watch } from "vue";
import MediaPlayer from "./mediaPlayer";

if (!('AudioContext' in window)) {
    throw new TypeError('AudioContext is not enabled - Sound Tile requires the Web Audio API to function!');
}

export const audioContext = new AudioContext();
export const globalGain = audioContext.createGain();
globalGain.connect(audioContext.destination);
watch(() => MediaPlayer.state.volume, () => globalGain.gain.value = MediaPlayer.state.volume, { immediate: true });
