import { createRouter, createWebHashHistory, RouteLocationNormalized, RouteRecordRaw } from 'vue-router'
import Loading from '../views/Loading.vue';
import Login from '../views/Login/Index.vue';

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
  },
  {
    path: '/tui-live-kit-cover',
    name: 'tui-live-kit-cover',
    component: () => import(/* webpackChunkName: "TUILiveKitCover" */ '../views/TUILiveKitCover.vue'),
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
  const storedUserInfo = window.localStorage.getItem('TUILiveKit-userInfo');
  if (!storedUserInfo && to.name !== 'login') {
    return { name: 'login' };
  }
});

export default router;
