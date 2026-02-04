<template>
  <div class="tui-loading" v-tui-loading="{ visible: true, background: 'transparent' }">
  </div>
</template>
<script setup lang="ts">
import { onMounted } from 'vue';
import { vTuiLoading } from '@tencentcloud/uikit-base-component-vue3';
import router from '../router';
import { isMainWindow } from '../TUILiveKit/utils/envUtils';
import { getBasicInfo } from '../debug/basic-info-config.js';
import { LoginType } from './Login/types';
import logger from '../TUILiveKit/utils/logger';

const logPrefix = '[Loading.vue]';

const gotoLogin = () => {
  window.localStorage.removeItem('TUILiveKit-userInfo');
  router.push('/login');
}

async function init(userInfo: Record<string, any>) {
  logger.log(`${logPrefix}init:`, userInfo);
  const isMain = await isMainWindow();
  if (isMain) {
    window.ipcRenderer.send('openTUILiveKit', {
      userInfo
    });
    router.push('/tui-live-kit-main');
  }
}

onMounted(() => {
  const storedUserInfo = window.localStorage.getItem('TUILiveKit-userInfo');
  let userInfo;
  if (!storedUserInfo) {
    userInfo = getBasicInfo();
    if (userInfo) {
      window.localStorage.setItem('TUILiveKit-userInfo', JSON.stringify({
        sdkAppId: userInfo.sdkAppId,
        userId: userInfo.userId,
        userName: userInfo.userName,
        userSig: userInfo.userSig,
        avatarUrl: userInfo.avatarUrl,
        loginType: LoginType.SDKSecretKey,
      }));
    } else {
      gotoLogin();
      return;
    }
  } else {
    try {
      userInfo = JSON.parse(storedUserInfo);
    } catch (e) {
      logger.error(`${logPrefix}onMounted parse userInfo error:`, e);
      gotoLogin();
      return;
    }
  }

  init(userInfo);
});
</script>

<style lang="scss" scoped>
.tui-loading {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  width: 100vw;
}
</style>
