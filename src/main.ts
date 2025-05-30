import '@/assets/fonts.css';
import '@/assets/common.css';

import { createApp } from 'vue';
import App from '@/App.vue';

const app = createApp(App);
app.mount("#root");

// pip requires mounting new app in window
// how to communicate between apps?