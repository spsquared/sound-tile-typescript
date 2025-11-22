import '@/assets/common.css';

import '@/components/inputs/trix';

import { createApp } from 'vue';
import App from '@/main/App.vue';

const app = createApp(App);
app.mount("#root");

import ErrorQueue from './errorQueue';

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

// register service worker
if (import.meta.env.PROD) (async () => {
    try {
        navigator.serviceWorker?.register('/serviceWorker.js', { scope: '/', type: 'module' });
    } catch (err) {
        console.error('Service worker installation failed:', err);
        ErrorQueue.warn('You can safely ignore this message unless you wish to use Sound Tile offline.', 'Service worker installation failed')
    }
})();