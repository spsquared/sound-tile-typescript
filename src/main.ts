import '@/assets/fonts.css';
import '@/assets/common.css';

import { createApp } from 'vue';
import App from '@/App.vue';

const app = createApp(App);
app.mount("#root");

// remove keybinds we dont want
document.addEventListener('keypress', (e) => {
    const key = e.key.toLowerCase();
    if (key == 'r' && e.ctrlKey && !e.shiftKey && !e.metaKey && !e.altKey) e.preventDefault();
    else if (key == 's' && e.ctrlKey && !e.shiftKey && !e.metaKey && !e.altKey) e.preventDefault();
    else if (key == 'o' && e.ctrlKey && !e.shiftKey && !e.metaKey && !e.altKey) e.preventDefault();
    else if (key == 'p' && e.ctrlKey && !e.metaKey && !e.altKey) e.preventDefault();
});
// warn leaving page
window.addEventListener('beforeunload', (e) => {
    e.preventDefault();
});
