import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import 'tuikit-atomicx-vue3-electron/styles'
import './TUILiveKit/assets/theme.css'
import { addI18n } from 'tuikit-atomicx-vue3-electron';
import { enResource, zhResource } from './i18n';

import App from './App.vue'

const app = createApp(App);
app.use(createPinia()).use(router);

app.mount('#app');

addI18n('en-US', { translation: enResource });
addI18n('zh-CN', { translation: zhResource });

