import { createRouter, createWebHashHistory, RouteLocationNormalized, RouteRecordRaw } from 'vue-router'
import Loading from '../views/Loading.vue';
import Login from '../views/Login/Index.vue';
import { isMacPlatform, isWindowPlatform } from '../TUILiveKit/utils/platform';
import { USER_INFO_STORAGE_KEY } from '../TUILiveKit/utils/userInfoStorage';

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
    component: () => import(/* webpackChunkName: "TUILiveKitChild" */ '../views/TUILiveKitChild.vue'),
  },
  {
    path: '/tui-live-kit-child-v2',
    name: 'tui-live-kit-child-v2',
    component: () => import(/* webpackChunkName: "TUILiveKitChildV2" */ '../views/TUILiveKitChild2.vue'),
  },
  {
    path: '/tui-live-kit-cover',
    name: 'tui-live-kit-cover',
    component: () => import(/* webpackChunkName: "TUILiveKitCover" */ '../views/TUILiveKitCover.vue'),
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

router.beforeEach((to: RouteLocationNormalized) => {
  if (to.name === 'tui-live-kit-main') {
    const storedUserInfo = window.localStorage.getItem(USER_INFO_STORAGE_KEY);
    if (!storedUserInfo) {
      return { name: 'login' };
    }
    if (isMacPlatform()) {
      return { name: 'tui-livekit-mac-v2' };
    } else if (isWindowPlatform()) {
      return { name: 'tui-live-kit-main-v2' };
    }
  } else if (isWindowPlatform()) {
    if (to.name === 'tui-live-kit-child') {
      return { name: 'tui-live-kit-child-v2' };
    } else if (to.name === 'tui-live-kit-cover') {
      return { name: 'tui-live-kit-cover-v2' };
    }
  }
});

export default router;
