<template>
  <div class="tui-loading">
    {{ t("Loading...") }}
  </div>
</template>
<script setup lang="ts">
import { onMounted } from 'vue';
import TUIMessageBox from '../TUILiveKit/common/base/MessageBox';
import { useI18n } from '../TUILiveKit/locales';
import { getBasicInfo } from '../debug/basic-info-config';
import { isMainWindow } from '../TUILiveKit/utils/envUtils';

const logger = console;
const logPrefix = "[Loading.vue]";
const { t } = useI18n();

async function init(userInfo: Record<string, any>) {
  logger.log(`${logPrefix}init:`, userInfo);
  const isMain = await isMainWindow();
  if (isMain) {
    window.ipcRenderer.send("openTUILiveKit", {
      userInfo
    });
  }
}

async function handleInit() {
  logger.log(`${logPrefix}handleInit`);
  const currentUserInfo = await getBasicInfo();
  if (currentUserInfo) {
    await init(currentUserInfo);
  } else {
    TUIMessageBox({
      title: t('Note'),
      message: t('Please configure the basic information'),
      confirmButtonText: t('Sure'),
    });
  }
}

onMounted(() => {
  handleInit();
});
</script>
