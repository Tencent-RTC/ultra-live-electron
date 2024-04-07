<template>
  <live-kit ref="liveKitRef" @on-logout="handleLogout"/>
</template>

<script setup lang="ts">
import { ref } from "vue";
import LiveKit from "../TUILiveKit/Index.vue";
import TUIMessageBox from '../TUILiveKit/common/base/MessageBox';
import { useI18n } from '../TUILiveKit/locales';
import { getBasicInfo } from '../config/basic-info-config';

const logger = console;
const logPrefix = '[LiveStudioView]';
const liveKitRef = ref();
const { t } = useI18n();

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
    return;
  }
}

async function handleInit() {
  const currentUserInfo = await getBasicInfo();
  if (currentUserInfo) {
    init(currentUserInfo);

  }
}
handleInit();

const handleLogout = () => {
  window.localStorage.removeItem('TUILiveKit-userInfo');
}
</script>

<style scoped lang="scss">
</style>