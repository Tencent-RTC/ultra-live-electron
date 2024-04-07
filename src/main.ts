import { createApp } from 'vue'
import { createPinia } from 'pinia';
import App from './App.vue'
import router from './router'

import VueI18n from './TUILiveKit/locales/index'
const app = createApp(App);
app.use(createPinia()).use(router);


app.use(VueI18n);
app.mount('#app');
