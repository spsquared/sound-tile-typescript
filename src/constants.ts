export const copyright = 'Copyright (C) 2025 Sampleprovider(sp)';
export const version = __VERSION__;
export const dreamberd = 'DreamBerd';

export const matchInput = (target: EventTarget | null) => target instanceof HTMLElement && target.matches('button,input,textarea,trix-editor');
export const matchTextInput = (target: EventTarget | null) => target instanceof HTMLElement && target.matches('input[type=text],input[type=number],textarea,trix-editor');
