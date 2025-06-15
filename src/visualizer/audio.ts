if (!('AudioContext' in window)) {
    throw new TypeError('AudioContext is not enabled - Sound Tile requires the Web Audio API to function!');
}

export const audioContext = new AudioContext();
export const globalGain = audioContext.createGain();
globalGain.connect(audioContext.destination);
