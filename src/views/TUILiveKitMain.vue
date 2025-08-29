<template>
    <TUILiveKitMain ref="liveKitRef" @on-logout="handleLogout"/>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import router from '../router';
import TUILiveKitMain from '../TUILiveKit/MainView.vue';
import TUIMessageBox from '../TUILiveKit/common/base/MessageBox';
import { useI18n } from '../TUILiveKit/locales';
import logger from '../TUILiveKit/utils/logger';

const logPrefix = '[LiveStudioView]';
const liveKitRef = ref();
const { t } = useI18n();

const gotoLogin = () => {
  window.localStorage.removeItem('TUILiveKit-userInfo');
  window.ipcRenderer.send('user-logout');
  router.push('/login');
}

const handleLogout = () => {
  gotoLogin();
}

async function init(userInfo: Record<string, any>) {
  const { sdkAppId, userSig, userId, userName, avatarUrl} = userInfo;
  try {
    await liveKitRef.value.init({
      sdkAppId,
      userId,
      userSig,
      userName,
      avatarUrl,
    });
  } catch (error) {
    logger.error(`${logPrefix}onMounted init RoomEngine and State error:`, error);
    TUIMessageBox({
      title: t('Note'),
      message: t('init RoomEngine and State error'),
      confirmButtonText: t('Sure'),
    });
    gotoLogin();
  }
}

function openTUILiveKit(event: any, userInfo: Record<string, any>) {
  logger.log(`${logPrefix}openTUILiveKit:`, userInfo);
  init(userInfo);
}

onMounted(async () => {
  window.ipcRenderer.on('openTUILiveKit', openTUILiveKit);

  const currentUserInfo = window.localStorage.getItem('TUILiveKit-userInfo');
  if (!currentUserInfo) {
    gotoLogin();
  }
});

onBeforeUnmount(() => {
  window.ipcRenderer.off('openTUILiveKit', openTUILiveKit);
});
</script>

<style>
html, body, #app {
  width: 100%;
  height: 100%;
  margin: 0;
  text-align: initial;
}
</style>
