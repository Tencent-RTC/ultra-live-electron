<template>
    <TUILiveKitMain
      ref="liveKitRef"
      @on-logout="handleLogout"
      @on-login-failed="handleLoginFailed"
      @on-kicked-off-line="handleKickedOffLine"
      @on-user-sig-expired="handleUserSigExpired"
      @on-user-auth-changed="handleUserAuthChanged"/>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, onBeforeMount } from 'vue';
import router from '../router';
import TUILiveKitMain from '../TUILiveKit/MainView.vue';
import TUIMessageBox from '../TUILiveKit/common/base/MessageBox';
import { useI18n } from '../TUILiveKit/locales';
import logger from '../TUILiveKit/utils/logger';
import { LoginType } from './Login/types';

const logPrefix = '[LiveKitMain]';
const liveKitRef = ref();
const { t } = useI18n();

const isInited = ref(false);

const gotoLogin = () => {
  window.localStorage.removeItem('TUILiveKit-userInfo');
  window.ipcRenderer.send('user-logout');
  router.replace('/login');
};

const handleLogout = () => {
  gotoLogin();
};

const handleLoginFailed = () => {
  gotoLogin();
}

const handleKickedOffLine = () => {
  gotoLogin();
}

const handleUserSigExpired = () => {
  gotoLogin();
};

const handleUserAuthChanged = (userInfo: Record<string, any>) => {
  window.localStorage.setItem('TUILiveKit-userInfo', JSON.stringify({
    ...userInfo,
    loginType: LoginType.UserSig
  }));
};

async function init(userInfo: Record<string, any>) {
  if (isInited.value) return;
  isInited.value = true;

  logger.debug(`${logPrefix}init LiveKit:`, userInfo);
  const { sdkAppId, userSig, userId, userName, avatarUrl, phone} = userInfo;
  try {
    await liveKitRef.value.init({
      sdkAppId,
      userId,
      userSig,
      userName,
      avatarUrl,
      phone: phone || '',
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

function onerror(
  message: string | Event,
  source?: string,
  lineno?: number,
  colno?: number,
  error?: Error
) {
  logger.error(`${logPrefix}onerror:`, message, source, lineno, colno, error);
}

function handleUnhandledRejection(event: PromiseRejectionEvent) {
  logger.error(`${logPrefix}Unhandled promise rejection:`, event);
}

function handleResourceError(event: ErrorEvent) {
  logger.error(`${logPrefix}Resource error:`, event);
}

onBeforeMount(() => {
  window.onerror = onerror;
  window.addEventListener('unhandledrejection', handleUnhandledRejection);
  window.addEventListener('error', handleResourceError, true);
});

onMounted(async () => {
  window.ipcRenderer.on('openTUILiveKit', openTUILiveKit);

  const currentUserInfo = window.localStorage.getItem('TUILiveKit-userInfo');
  if (!currentUserInfo) {
    gotoLogin();
  } else {
    let userInfo;
    try {
      userInfo = JSON.parse(currentUserInfo);
      logger.debug(`${logPrefix}onMounted parse userInfo:`, userInfo);
    } catch (e) {
      logger.error(`${logPrefix}onMounted parse userInfo error:`, e);
      gotoLogin();
      return;
    }
    init(userInfo);
  }
});

onBeforeUnmount(() => {
  isInited.value = false;
  window.onerror = null;
  window.removeEventListener('unhandledrejection', handleUnhandledRejection);
  window.removeEventListener('error', handleResourceError, true);
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
