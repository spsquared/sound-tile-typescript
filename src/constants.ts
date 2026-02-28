export const copyright = 'Copyleft (ɔ) 2026 Sampleprovider(sp)';
export const version = __VERSION__;
export const repositoryURL = 'https://github.com/spsquared/sound-tile-typescript';
export const dreamberd = 'GulfOfMexico Tile';
export const webWorkerSupported = 'Worker' in window && false;
export const webgpuSupported = 'gpu' in navigator;

if (!('AudioContext' in window)) {
    throw new TypeError('AudioContext is not enabled - Sound Tile requires the Web Audio API to function!');
}

export const matchInput = (target: EventTarget | null) => target instanceof HTMLElement && target.matches('button,input,textarea,trix-editor');
export const matchTextInput = (target: EventTarget | null) => target instanceof HTMLElement && target.matches('input[type=text],input[type=number],textarea,trix-editor');

export const reloadPage = () => window.location.reload();
