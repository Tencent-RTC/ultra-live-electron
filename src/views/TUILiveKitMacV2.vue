<template>
  <UIKitProvider language="zh-CN" theme="dark">
    <div class="tui-livekit-mac-v2">
      <LiveHeader @logout="handleLogout" />
      <div class="live-pusher-main">
        <div class="main-left">
          <div class="main-left-top">
            <div class="main-left-top-title card-title">
              <div class="title-text">
                {{ t('Video Source') }}
              </div>
            </div>
            <div class="main-left-top-content">
              <LiveScenePanel />
            </div>
          </div>
        </div>
        <div class="main-center">
          <div class="main-center-top">
            <div class="main-center-top-left">
              {{ currentLive?.liveName || liveParams.liveName }}
              <LiveSettingButton
                v-if="!isInLive && loginUserInfo?.userId"
                :live-name="liveParams.liveName"
                @confirm="handleLiveSettingConfirm"
              />
              <IconCopy
                v-if="isInLive"
                class="copy-icon"
                size="16"
                @click="handleCopyLiveID"
              />
            </div>
            <div class="main-center-top-right">
              {{ audienceCount }} {{ t('People watching') }}
            </div>
          </div>
          <div class="main-center-center">
            <StreamMixer />
          </div>
          <div class="main-center-bottom">
            <div class="main-center-bottom-content">
              <div class="main-center-bottom-left">
                <MicVolumeSetting />
                <SpeakerVolumeSetting />
                <div class="main-center-bottom-tools">
                  <CoGuestButton />
                  <OrientationSwitch />
                  <LayoutSwitch />
                  <SettingButton />
                </div>
              </div>
              <div class="main-center-bottom-right">
                <TUIButton
                  v-if="!isInLive"
                  type="primary"
                  :disabled="loading"
                  @click="handleCreateLive"
                >
                  <IconLiveLoading
                    v-if="loading"
                    class="loading-icon"
                  />
                  <IconLiveStart v-else />
                  {{ t('Start live') }}
                </TUIButton>
                <TUIButton
                  v-else
                  color="red"
                  :disabled="loading"
                  @click="showEndLiveDialog"
                >
                  <IconLiveLoading
                    v-if="loading"
                    class="loading-icon"
                  />
                  <IconEndLive v-else />
                  {{ t('End live') }}
                </TUIButton>
              </div>
            </div>
          </div>
        </div>
        <div class="main-right">
          <div class="main-right-top">
            <div class="main-right-top-title card-title">
              <div class="title-text">
                {{ t('Online viewers') }}
              </div>
              <div class="title-count">
                ({{ audienceCount }})
              </div>
            </div>
            <LiveAudienceList height="calc(100% - 40px)" />
          </div>
          <div class="main-right-bottom">
            <div class="main-right-bottom-header">
              <div class="main-right-bottom-title card-title">
                {{ t('Barrage list') }}
              </div>
            </div>
            <div class="message-list-container">
              <BarrageList />
            </div>
            <div class="message-input-container">
              <BarrageInput
                height="56px"
                :disabled="!isInLive"
                :placeholder="isInLive ? '' : t('Live not started')"
              />
            </div>
          </div>
        </div>
        <LivePusherNotification />
        <TUIDialog
          v-model:visible="exitLiveDialogVisible"
          :title="t('End live')"
        >
          {{ endLiveDialogMessage }}
          <template #footer>
            <div class="action-buttons">
              <TUIButton
                color="gray"
                @click="exitLiveDialogVisible = false"
              >
                {{ t('Cancel') }}
              </TUIButton>
              <TUIButton
                color="red"
                @click="handleEndLive"
              >
                {{ t('End live') }}
              </TUIButton>
            </div>
          </template>
        </TUIDialog>
      </div>
    </div>
  </UIKitProvider>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, computed, ref, defineProps } from 'vue';
import { useRouter } from 'vue-router';
import trtcCloud from '../TUILiveKit/utils/trtcCloud';
import {
  IconArrowStrokeBack,
  IconArrowStrokeSelectDown,
  IconCopy,
  IconEndLive,
  IconLiveLoading,
  IconLiveStart,
  TUIButton,
  TUIDialog,
  TUIMessageBox,
  TUIToast,
  UIKitProvider,
  useUIKit
} from '@tencentcloud/uikit-base-component-vue3';
import {
  useLoginState,
  useLiveAudienceState,
  useLiveListState,
  useDeviceState,
  useCoGuestState,
  LiveScenePanel,
  StreamMixer,
  LiveAudienceList,
  BarrageList,
  BarrageInput,
} from 'tuikit-atomicx-vue3-electron';
import TUIRoomEngine, { TUISeatMode } from '@tencentcloud/tuiroom-engine-electron';
import { useElectronLogin } from '../TUILiveKit/hooks/useElectronLogin';

import CoGuestButton from '../TUILiveKit/components/v2/CoGuestButton.vue';
import LayoutSwitch from '../TUILiveKit/components/v2/LayoutSwitch.vue';
import MicVolumeSetting from '../TUILiveKit/components/v2/MicVolumeSetting.vue';
import OrientationSwitch from '../TUILiveKit/components/v2/OrientationSwitch.vue';
import SettingButton from '../TUILiveKit/components/v2/SettingButton.vue';
import SpeakerVolumeSetting from '../TUILiveKit/components/v2/SpeakerVolumeSetting.vue';
import LiveHeader from '../TUILiveKit/components/v2/LiveHeader/index.vue';
import LiveSettingButton from '../TUILiveKit/components/v2/LiveSettingButton.vue';
import LivePusherNotification from '../TUILiveKit/components/v2/LivePusherNotification.vue';
import { copyToClipboard, isNetworkOffline, isNetworkTimeoutError } from '../TUILiveKit/utils/utils';

console.log('TRTC SDK version:', trtcCloud.getSDKVersion());

const router = useRouter();
const { loginUserInfo } = useLoginState();
const { t, language } = useUIKit();

const props = defineProps<{
  liveId?: string;
  liveName?: string;
  seatMode?: TUISeatMode;
}>();

const { currentLive, createLive, endLive, joinLive } = useLiveListState();
const { audienceCount } = useLiveAudienceState();
const { openLocalMicrophone } = useDeviceState();
const { connected: coGuestConnected } = useCoGuestState();
const isInLive = computed(() => !!currentLive.value?.liveId);
const loading = ref(false);
const exitLiveDialogVisible = ref(false);
const liveParamsEditForm = ref({
  liveName: '',
});

const liveParams = computed(() => ({
  liveId: props.liveId || `live_${loginUserInfo.value?.userId}`,
  liveName:
    liveParamsEditForm.value.liveName
    || props.liveName
    || loginUserInfo.value?.userName
    || loginUserInfo.value?.userId
    || '',
  seatMode: props.seatMode || TUISeatMode.kApplyToTake,
}));

TUIRoomEngine.once('ready', () => {
  TUIRoomEngine.callExperimentalAPI(JSON.stringify({
    api: 'enableMultiPlaybackQuality',
    params: {
      enable: true,
    },
  }));
});

const showEndLiveDialog = async () => {
  if (loading.value) {
    return;
  }
  exitLiveDialogVisible.value = true;
};


// Setup useElectronLogin Hook
const {
  loginWithRetry,
  setupEventListeners,
  cleanupEventListeners,
  handleLogout: handleElectronLogout,
} = useElectronLogin({
  onLogout: () => {
    router.replace({ name: 'login' });
  },
  onLoginFailed: () => {
    router.replace({ name: 'login' });
  },
});

// Handle logout with live status check
const handleLogout = async () => {
  try {
    await handleElectronLogout();
  } catch (error) {
    redirectToLogin();
  }
};

function redirectToLogin() {
  window.localStorage.removeItem('TUILiveKit-userInfo');
  router.replace({ name: 'login' });
}

const endLiveDialogMessage = computed(() => {
  if (coGuestConnected.value.length > 1) {
    return t('You are currently co-guesting with other streamers. Would you like to [End Live] ?');
  }
  return t('You are currently live streaming. Do you want to end it?');
});

const handleCreateLive = async () => {
  try {
    if (loading.value) {
      return;
    }
    if (!loginUserInfo.value?.userId) {
      TUIToast.info({
        message: t('Please login first'),
      });
      return;
    }
    if (isNetworkOffline()) {
      TUIToast.error({
        message: t('Network error, please check your connection and try again'),
      });
      return;
    }
    loading.value = true;
    await TUIRoomEngine.callExperimentalAPI(JSON.stringify({
      api: 'enableUnlimitedRoom',
      params: {
        enable: true,
      },
    }));
    await TUIRoomEngine.callExperimentalAPI(JSON.stringify({
      api: 'setCurrentLanguage',
      params: {
        language: language.value === 'zh-CN' ? 'zh-Hans' : 'en',
      },
    }));
    await createLive({
      liveId: liveParams.value.liveId,
      liveName: liveParams.value.liveName,
    });
    await joinLive({
      liveId: liveParams.value.liveId,
    });
    loading.value = false;
    await openLocalMicrophone();
  } catch (error: any) {
    loading.value = false;
    if (isNetworkTimeoutError(error)) {
      TUIToast.error({
        message: t('Network error, please check your connection and try again'),
      });
      return;
    }
    if (typeof error.message === 'string'
      && error.message.indexOf('this room already exists, and you are the owner') !== -1) {
      await joinLive({
        liveId: liveParams.value.liveId,
      });
      await openLocalMicrophone();
      return;
    }
    TUIToast.error({
      message: t('Failed to create live'),
    });
  }
};

const handleEndLive = async () => {
  try {
    if (isNetworkOffline()) {
      TUIToast.error({
        message: t('Network error, please check your connection and try again'),
      });
      return;
    }
    loading.value = true;
    exitLiveDialogVisible.value = false;
    await endLive();
    loading.value = false;
  } catch (error: any) {
    console.error('End live error:', error);
    loading.value = false;
    if (isNetworkTimeoutError(error)) {
      TUIToast.error({
        message: t('Network error, please check your connection and try again'),
      });
      return;
    }
    exitLiveDialogVisible.value = false;
  }
};

/** Handles app quit request (e.g. Cmd+Q / close main window): confirm end live then quit or cancel. */
const handleAppRequestQuit = () => {
  if (!isInLive.value) {
    window.ipcRenderer?.send('app-quit-confirmed');
    return;
  }
  TUIMessageBox.confirm({
    title: t('End live and quit?'),
    content: t('You are currently live streaming. Do you want to end the live and quit the app?'),
    confirmText: t('End live and quit'),
    cancelText: t('Cancel'),
    callback: async (action) => {
      if (action !== 'confirm') {
        window.ipcRenderer?.send('app-quit-cancel');
        return;
      }
      await handleEndLive();
      if (isInLive.value) {
        TUIToast.error({
          message: t('Failed to end live, please try again later'),
        });
        window.ipcRenderer?.send('app-quit-cancel');
      } else {
        window.ipcRenderer?.send('app-quit-confirmed');
      }
    },
  });
};

onMounted(async () => {
  // Setup event listeners
  setupEventListeners();
  if (window.ipcRenderer) {
    window.ipcRenderer.on('app-request-quit', handleAppRequestQuit);
  }

  // Read user info from localStorage
  const currentUserInfo = window.localStorage.getItem('TUILiveKit-userInfo');
  if (!currentUserInfo) {
    router.replace({ name: 'login' });
    return;
  }

  try {
    const userInfo = JSON.parse(currentUserInfo);
    const { sdkAppId, userSig, userId, userName, avatarUrl } = userInfo;

    // Use retry mechanism for login
    await loginWithRetry({
      sdkAppId,
      userId,
      userSig,
      userName,
      avatarUrl,
    });
  } catch (e) {
    redirectToLogin();
  }
});

const handleLiveSettingConfirm = (form: { liveName: string }) => {
  liveParamsEditForm.value = form;
};

const handleCopyLiveID = async () => {
  if (!currentLive.value?.liveId) {
    TUIToast.error({
      message: t('Copy failed'),
    });
    return;
  }

  try {
    await copyToClipboard(currentLive.value?.liveId || '');
    TUIToast.success({
      message: t('Copy successful'),
    });
  } catch (error) {
    TUIToast.error({
      message: t('Copy failed'),
    });
  }
};

onBeforeUnmount(() => {
  cleanupEventListeners();
  if (window.ipcRenderer) {
    window.ipcRenderer.off('app-request-quit', handleAppRequestQuit);
  }
});

</script>

<style lang="scss" scoped>
@import "../TUILiveKit/assets/mac.scss";

.tui-livekit-mac-v2 {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;

  .live-pusher-main {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: row;
    user-select: none;
    padding: 0 12px 12px 12px;
    border-radius: 8px;
    background-color: var(--bg-color-topbar);
    @include scrollbar;

    .main-left {
      width: 20%;
      max-width: 320px;
      flex: 0 0 20%;
      height: 100%;
      color: $text-color1;
      display: flex;
      flex-direction: column;
      gap: 6px;

      .main-left-top {
        flex: 1;
        background-color: var(--bg-color-operate);
        padding: 16px;

        .main-left-top-title {
          display: flex;
          align-items: center;
          color: $text-color1;
          height: 40px;
          box-sizing: border-box;
          margin-bottom: 16px;

          .title-text {
            @include text-size-16;
            display: inline-flex;
            align-items: center;
            justify-content: start;

            .icon-back {
              &:hover {
                cursor: pointer;
              }
            }
          }
        }

        .main-left-top-content {
          height: calc(100% - 56px);
        }
      }

      .main-left-bottom {
        display: flex;
        flex-direction: column;
        justify-content: center;
        background-color: var(--bg-color-operate);
        padding: 16px;

        .main-left-bottom-header {
          display: flex;
          justify-content: space-between;
          align-items: center;

          .main-left-bottom-fold {
            display: flex;
            align-items: center;
            gap: 4px;
            cursor: pointer;
            color: $text-color2;
            @include text-size-12;
          }
        }

        .main-left-bottom-title {
          @include text-size-16;
        }

        .main-left-bottom-tools {
          @include dividing-line('top');
          margin-top: 16px;
          display: flex;
        }
      }
    }

    .main-center {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
      min-height: 0;
      margin: 0 6px;

      .main-center-top {
        box-sizing: border-box;
        padding: 0 16px;
        width: 100%;
        height: 56px;
        background-color: var(--bg-color-operate);
        color: $text-color1;
        display: flex;
        justify-content: space-between;
        align-items: center;
        position: relative;

        .main-center-top-left {
          @include text-size-16;
          display: flex;
          align-items: center;
          gap: 8px;

          .copy-icon {
            cursor: pointer;

            &:hover {
              color: $icon-hover-color;
            }
          }
        }

        .main-center-top-right {
          @include text-size-12;
        }

        &::after {
          content: "";
          position: absolute;
          bottom: 0;
          left: 16px;
          right: 16px;
          height: 1px;
          background-color: var(--stroke-color-primary);
        }
      }

      .main-center-center {
        flex: 1;
        min-width: 0;
        min-height: 0;
        color: #131417;
      }

      .main-center-bottom {
        width: 100%;
        background-color: var(--bg-color-operate);
        display: flex;
        justify-content: space-between;
        padding: 0 16px;
        box-sizing: border-box;
        flex-direction: column;
        position: relative;

        &::before {
          content: "";
          position: absolute;
          top: 0;
          left: 16px;
          right: 16px;
          height: 1px;
          background-color: var(--stroke-color-primary);
        }

        .main-center-bottom-header {
          @include text-size-14;
        }

        .main-center-bottom-content {
          display: flex;
          justify-content: space-between;
          height: 72px;

          .main-center-bottom-left {
            flex: 1;
            height: 100%;
            display: flex;
            align-items: center;
            gap: 16px;

            .main-center-bottom-tools {
              display: flex;
              gap: 6px;
              flex-wrap: wrap;
            }
          }

          .main-center-bottom-right {
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
          }
        }
      }
    }

    .main-right {
      height: 100%;
      width: 20%;
      flex: 0 0 20%;
      max-width: 320px;
      color: $text-color1;
      display: flex;
      flex-direction: column;
      gap: 6px;
      min-width: 200px;

      .main-right-top {
        background-color: var(--bg-color-operate);
        color: $text-color1;
        height: 30%;
        padding: 16px;
        user-select: text;

        .main-right-top-title {
          display: flex;
          align-items: center;
          color: $text-color1;
          height: 40px;
          box-sizing: border-box;
          user-select: none;

          .title-text {
            @include text-size-16;
          }

          .title-count {
            font-weight: 400;
            color: $text-color2;
          }
        }
      }

      .main-right-bottom {
        flex: 1;
        background-color: var(--bg-color-operate);
        color: $text-color1;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        padding: 16px;

        .main-right-bottom-header {
          display: flex;
          flex-direction: column;
        }

        .message-list-container {
          flex: 1 1 auto;
          user-select: text;
        }
      }
    }
  }
  .card-title {
    @include text-size-16;
    @include dividing-line;
  }
  .action-buttons {
    display: flex;
    gap: 10px;
  }
}
</style>
