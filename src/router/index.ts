import { createRouter, createWebHashHistory, RouteRecordRaw } from 'vue-router'
import Loading from '../views/Loading.vue';

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'loading',
    component: Loading,
  }, 
  {
    path: '/tui-live-kit-main',
    name: 'tui-live-kit-main',
    component: () => import(/* webpackChunkName: "TUILiveKitMain" */ '../views/TUILiveKitMain.vue')
  },
  {
    path: '/tui-live-kit-child',
    name: 'tui-live-kit-child',
    component: () => import(/* webpackChunkName: "TUILiveKitChild" */ '../views/TUILiveKitChild.vue'),
  }
];

const router = createRouter({
  history: createWebHashHistory(),
  routes
});

window.ipcRenderer.on('window-type', (event: any, type: string) => {
  console.log(`[router]on('window-type'):${type} current href:${window.location.href}`);
  router.replace({ name: `tui-live-kit-${type}`});
});

export default router
