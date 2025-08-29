<template>
  <div class="tui-loading">
    {{ t("Loading...") }}
  </div>
</template>
<script setup lang="ts">
import { onMounted } from 'vue';
import router from '../router';
import { isMainWindow } from '../TUILiveKit/utils/envUtils';
import { useI18n } from '../TUILiveKit/locales';
import logger from '../TUILiveKit/utils/logger';

const logPrefix = '[Loading.vue]';
const { t } = useI18n();

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
  }
}

onMounted(() => {
  const currentUserInfo = window.localStorage.getItem('TUILiveKit-userInfo');
  if (!currentUserInfo) {
    gotoLogin();
    return;
  }

  let userInfo;
  try {
    userInfo = JSON.parse(currentUserInfo);
  } catch (e) {
    logger.error(`${logPrefix}onMounted parse userInfo error:`, e);
    gotoLogin();
    return;
  }
  init(userInfo);
});
</script>
