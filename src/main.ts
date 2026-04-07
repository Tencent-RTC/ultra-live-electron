import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import 'tuikit-atomicx-vue3-electron/styles'
import './TUILiveKit/assets/theme.css'
import { addI18n } from 'tuikit-atomicx-vue3-electron';
import {
  enResource,
  zhResource,
  zhTWResource,
  jaResource,
  koResource,
} from './i18n';
import { initLanguageSync } from './i18n/sync';

import App from './App.vue'

// Register i18n resources and sync language before mounting to avoid first-frame translation flicker
addI18n('en-US', { translation: enResource });
addI18n('zh-CN', { translation: zhResource });
addI18n('zh-TW', { translation: zhTWResource });
addI18n('ja-JP', { translation: jaResource });
addI18n('ko-KR', { translation: koResource });
initLanguageSync();

const app = createApp(App);
app.use(createPinia()).use(router);

app.mount('#app');
