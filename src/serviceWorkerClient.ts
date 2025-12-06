import { version } from './constants';
import ErrorQueue from "./errorQueue";
import { newVersionNumber, newVersionReload, showNewVersionNotice } from "./main/App.vue";

export async function setupServiceWorker() {
    try {
        navigator.serviceWorker?.register('/serviceWorker.js', { scope: '/', type: 'module' });
    } catch (err) {
        console.error('Service worker installation failed:', err);
        ErrorQueue.warn('You can safely ignore this message unless you wish to use Sound Tile offline.', 'Service worker installation failed')
    }
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.info('Service worker was updated, indicating a new version is potentially available.');
    });
    navigator.serviceWorker.addEventListener('message', (e) => {
        // still only one message type oof
        if (typeof e.data == 'string') {
            if (e.data !== version) {
                // service worker updated past the current version uh oh
                console.info(`Running outdated version! Current: ${version}. New: ${e.data}`);
                showNewVersionNotice.value = true;
                newVersionReload.value = true;
                newVersionNumber.value = e.data;
            }
        }
    });
    // detects when the app itself updates, not the service worker
    if (localStorage.getItem('version') !== version) {
        showNewVersionNotice.value = true;
        newVersionReload.value = false;
    }
    localStorage.setItem('version', version);
}