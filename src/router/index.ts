import { createRouter, createWebHashHistory, RouteRecordRaw } from 'vue-router'
import Loading from '../views/Loading.vue';
import Login from '../views/Login/Index.vue';
import { isMacPlatform } from '../TUILiveKit/utils/platform';
import { USER_INFO_STORAGE_KEY } from '../TUILiveKit/utils/userInfoStorage';

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'loading',
    component: Loading,
  },
  // TODO: v1 legacy routes kept as redirects for IPC compatibility, remove after IPC messages are updated to v2 names
  {
    path: '/tui-live-kit-main',
    name: 'tui-live-kit-main',
    redirect: { name: 'tui-live-kit-main-v2' },
  },
  {
    path: '/tui-live-kit-main-v2',
    name: 'tui-live-kit-main-v2',
    component: () => import(/* webpackChunkName: "TUILiveKitMainV2" */ '../views/TUILiveKitMainV2.vue')
  },
  {
    path: '/tui-livekit-mac-v2',
    name: 'tui-livekit-mac-v2',
    component: () => import(/* webpackChunkName: "TUILiveKitMacV2" */ '../views/TUILiveKitMacV2.vue')
  },
  {
    path: '/tui-live-kit-child',
    name: 'tui-live-kit-child',
    redirect: { name: 'tui-live-kit-child-v2' },
  },
  {
    path: '/tui-live-kit-child-v2',
    name: 'tui-live-kit-child-v2',
    component: () => import(/* webpackChunkName: "TUILiveKitChildV2" */ '../views/TUILiveKitChild2.vue'),
  },
  {
    path: '/tui-live-kit-cover',
    name: 'tui-live-kit-cover',
    redirect: { name: 'tui-live-kit-cover-v2' },
  },
  {
    path: '/tui-live-kit-cover-v2',
    name: 'tui-live-kit-cover-v2',
    component: () => import(/* webpackChunkName: "TUILiveKitCoverV2" */ '../views/TUILiveKitCoverV2.vue'),
  },
  {
    path: '/tui-live-kit-confirm',
    name: 'tui-live-kit-confirm',
    component: () => import(/* webpackChunkName: "TUILiveKitConfirm" */ '../views/TUILiveKitConfirm.vue'),
  },
  {
    path: '/login',
    name: 'login',
    component: Login,
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

router.beforeEach((to) => {
  if (isMacPlatform() && to.name === 'tui-live-kit-main-v2') {
    return { name: 'tui-livekit-mac-v2' };
  }
  if (to.name === 'tui-live-kit-main-v2') {
    let storedUserInfo: string | null = null;
    try {
      storedUserInfo = window.localStorage.getItem(USER_INFO_STORAGE_KEY);
    } catch (e) {
      console.warn('[router] Failed to read localStorage:', e);
    }
    if (!storedUserInfo) {
      return { name: 'login' };
    }
  }
});

export default router;
