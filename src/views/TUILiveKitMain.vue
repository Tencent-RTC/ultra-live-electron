<template>
  <TUILiveKitMain ref="liveKitRef" @on-logout="handleLogout"/>
</template>

<script setup lang="ts">
import { ref } from "vue";
import TUILiveKitMain from "../TUILiveKit/Main.vue";
import TUIMessageBox from '../TUILiveKit/common/base/MessageBox';
import { useI18n } from '../TUILiveKit/locales';

const logger = console;
const logPrefix = '[LiveStudioView]';
const liveKitRef = ref();
const { t } = useI18n();

const handleLogout = () => {
  window.localStorage.removeItem('TUILiveKit-userInfo');
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
    logger.error(`${logPrefix}onMounted init RoomEngine and State failed:`, error);
    TUIMessageBox({
      title: t('Note'),
      message: t('init RoomEngine and State failed'),
      confirmButtonText: t('Sure'),
    });
  }
}

window.ipcRenderer.on("openTUILiveKit", (event: any, userInfo: Record<string, any>) => {
  init(userInfo);
});
</script>

<style scoped lang="scss">
</style>