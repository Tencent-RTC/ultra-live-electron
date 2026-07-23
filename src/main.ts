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
import { buildBeautyTranslation } from './i18n/beauty';
import { beauty as beautyZhCN } from './i18n/zh-CN/beauty';
import { beauty as beautyEnUS } from './i18n/en-US/beauty';
import { beauty as beautyZhTW } from './i18n/zh-TW/beauty';
import { beauty as beautyJaJP } from './i18n/ja-JP/beauty';
import { beauty as beautyKoKR } from './i18n/ko-KR/beauty';

import App from './App.vue'

// Beauty panel baseline translations derived from the xmagic plugin's built-in
// labelKey table (zh / en only). Kept as a LAST-RESORT fallback so any labelKey
// the app maps below happen to miss still resolves to the plugin's zh/en text
// rather than the raw key.
const beautyZh = buildBeautyTranslation('zh');
const beautyEn = buildBeautyTranslation('en');

// i18n merge order (later wins): plugin baseline (zh/en) < app per-language
// beauty map (full 5-language, keyed by labelKey, in src/i18n/<lang>/beauty.ts)
// < app UI strings (src/i18n/<lang>/index.ts). This is what lets zh-TW / ja-JP /
// ko-KR finally show their own beauty text instead of falling back to zh / en.
addI18n('en-US', { translation: { ...beautyEn, ...beautyEnUS, ...enResource } });
addI18n('zh-CN', { translation: { ...beautyZh, ...beautyZhCN, ...zhResource } });
addI18n('zh-TW', { translation: { ...beautyZh, ...beautyZhTW, ...zhTWResource } });
addI18n('ja-JP', { translation: { ...beautyEn, ...beautyJaJP, ...jaResource } });
addI18n('ko-KR', { translation: { ...beautyEn, ...beautyKoKR, ...koResource } });
initLanguageSync();

const app = createApp(App);
app.use(createPinia()).use(router);

app.mount('#app');
