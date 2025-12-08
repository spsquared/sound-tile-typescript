import '@/assets/common.css';
import '@/components/inputs/trix';

import { createApp } from 'vue';
import App from '@/main/App.vue';
import { setupServiceWorker } from './serviceWorkerClient';

const app = createApp(App);
app.mount("#root");
if (import.meta.env.PROD) setupServiceWorker();

import '@/visualizer/drawLoop';

import TileEditor from './visualizer/editor';
import MediaPlayer from './visualizer/mediaPlayer';
import { Media } from './visualizer/media';

// remove keybinds we dont want
document.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    // disable saving, opening, printing - these get overridden
    if (key == 's' && e.ctrlKey && !e.shiftKey && !e.metaKey && !e.altKey) e.preventDefault();
    else if (key == 'o' && e.ctrlKey && !e.shiftKey && !e.metaKey && !e.altKey) e.preventDefault();
    else if (key == 'p' && e.ctrlKey && !e.metaKey && !e.altKey) e.preventDefault();
    // really annoying when pressing space triggers a button or checkbox
    if (key == ' ' && e.target instanceof HTMLElement && e.target.matches('button,input[type=button],input[type=checkbox]')) e.preventDefault();
    // for some reason enter doesn't trigger checkboxes (also jank label button)
    if (key == 'enter' && e.target instanceof HTMLElement && e.target.matches('input[type=checkbox],label[button]')) e.target.click();
});

// PWA code that got slapped on at the end
window.launchQueue?.setConsumer(async (params) => {
    console.log('launchQueue', params)
    const folders = params.files.filter((f) => f.kind == 'directory') as FileSystemDirectoryHandle[];
    const files = params.files.filter((f) => f.kind == 'file') as FileSystemFileHandle[];
    if (folders.length > 0) {
        throw new Error('Playlists are not yet implemented');
        // add files to file list from folder idk
    }
    if (files.length > 1) {
        throw new Error('Playlists are not yet implemented');
    } else if (files.length == 1) {
        await TileEditor.lock.acquire();
        const media = await Media.decompress(await files[0].getFile());
        if (media === null) {
            TileEditor.lock.release();
            console.error('Failed to decompress media from uploaded file');
            return;
        }
        MediaPlayer.media.current.destroy(); // beware resource leak
        MediaPlayer.media.current = media;
        TileEditor.lock.release();
    }
});
