import '@/assets/fonts.css';
import '@/assets/common.css';

import('@/trixConfig');

import { createApp } from 'vue';
import App from '@/App.vue';

const app = createApp(App);
app.mount("#root");

// remove keybinds we dont want
document.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    // disable saving, opening, printing - these get overridden
    if (key == 's' && e.ctrlKey && !e.shiftKey && !e.metaKey && !e.altKey) e.preventDefault();
    else if (key == 'o' && e.ctrlKey && !e.shiftKey && !e.metaKey && !e.altKey) e.preventDefault();
    else if (key == 'p' && e.ctrlKey && !e.metaKey && !e.altKey) e.preventDefault();
    // really annoying when pressing space triggers a button or checkbox
    if (key == ' ' && e.target instanceof HTMLElement && e.target.matches('button,input[type=button],input[type=checkbox]')) e.preventDefault();
});

// warn leaving page
// window.addEventListener('beforeunload', (e) => {
//     e.preventDefault();
// });
