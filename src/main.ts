import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './TUILiveKit/assets/theme.css'

const app = createApp(App);
app.use(createPinia()).use(router);

app.mount('#app');
