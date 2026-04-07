<template>
  <UIKitProvider theme="dark">
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
              <span class="live-title" :title="currentLive?.liveName || liveParams.liveName">
                {{ currentLive?.liveName || liveParams.liveName }}
              </span>
              <LiveSettingButton
                v-if="loginUserInfo?.userId"
                :live-name="currentLive?.liveName || liveParams.liveName"
                :cover-url="liveParams.coverUrl"
                @confirm="handleLiveSettingConfirm"
              />
              <LiveURLCopy
                v-if="isInLive"
                :live-id="currentLive?.liveId"
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
import { onMounted, onBeforeUnmount, computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import trtcCloud from '../TUILiveKit/utils/trtcCloud';
import {
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
  useLiveErrorModal,
  LiveListEvent,
  LiveEndedReason,
  LiveListEventInfo,
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
import LiveURLCopy from '../TUILiveKit/components/v2/LiveURLCopy.vue';
import LivePusherNotification from '../TUILiveKit/components/v2/LivePusherNotification.vue';
import {
  isNetworkOffline,
  isNetworkTimeoutError,
  isSvgCoverUrl,
} from '../TUILiveKit/utils/utils';
import { USER_INFO_STORAGE_KEY } from '../TUILiveKit/utils/userInfoStorage';
import { useSystemAudioLoopback } from '../TUILiveKit/hooks/useSystemAudioLoopback';
import useRoomEngine from '../TUILiveKit/utils/useRoomEngine';
import { mapToRoomEngineLanguage } from '../TUILiveKit/utils/common';

console.log('TRTC SDK version:', trtcCloud.getSDKVersion());

const router = useRouter();
const { loginUserInfo } = useLoginState();
const { t, language } = useUIKit();

const props = defineProps<{
  liveId?: string;
  liveName?: string;
  seatMode?: TUISeatMode;
}>();

const { currentLive, createLive, endLive, joinLive, subscribeEvent, unsubscribeEvent } = useLiveListState();
const { handleErrorWithModal } = useLiveErrorModal();
const { audienceCount } = useLiveAudienceState();
const { openLocalMicrophone } = useDeviceState();
const { connected: coGuestConnected } = useCoGuestState();
const roomEngine = useRoomEngine();
const isInLive = computed(() => !!currentLive.value?.liveId);
const loading = ref(false);
const exitLiveDialogVisible = ref(false);
const isAppQuitConfirming = ref(false);
const liveParamsEditForm = ref({
  liveName: '',
  coverUrl: undefined as string | undefined,
});

const liveParams = computed(() => ({
  liveId: props.liveId || `live_${loginUserInfo.value?.userId}`,
  liveName:
    liveParamsEditForm.value.liveName
    || props.liveName
    || loginUserInfo.value?.userName
    || loginUserInfo.value?.userId
    || '',
  coverUrl: liveParamsEditForm.value.coverUrl ?? currentLive.value?.coverUrl ?? '',
  seatMode: props.seatMode || TUISeatMode.kApplyToTake,
}));
const {
  startSystemAudioLoopbackSafely,
  stopSystemAudioLoopbackSafely,
} = useSystemAudioLoopback('TUILiveKitMacV2');

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
  window.localStorage.removeItem(USER_INFO_STORAGE_KEY);
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
        language: mapToRoomEngineLanguage(language.value),
      },
    }));
    await createLive({
      liveId: liveParams.value.liveId,
      liveName: liveParams.value.liveName,
      coverUrl: liveParams.value.coverUrl,
    });
    await joinLive({
      liveId: liveParams.value.liveId,
    });
    loading.value = false;
    await openLocalMicrophone();
    startSystemAudioLoopbackSafely();
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
      startSystemAudioLoopbackSafely();
      return;
    }
    if (handleErrorWithModal(error)) {
      return;
    }
    TUIToast.error({
      message: t('Failed to create live'),
    });
  }
};

const handleEndLive = async (options: { showErrorToast?: boolean } = {}): Promise<boolean> => {
  const { showErrorToast = true } = options;
  try {
    if (isNetworkOffline()) {
      if (showErrorToast) {
        TUIToast.error({
          message: t('Network error, please check your connection and try again'),
        });
      }
      return false;
    }
    loading.value = true;
    exitLiveDialogVisible.value = false;
    await endLive();
    stopSystemAudioLoopbackSafely();
    return true;
  } catch (error: any) {
    console.error('End live error:', error);
    if (showErrorToast && isNetworkTimeoutError(error)) {
      TUIToast.error({
        message: t('Network error, please check your connection and try again'),
      });
      return false;
    }
    if (showErrorToast && handleErrorWithModal(error)) {
      return false;
    }
    exitLiveDialogVisible.value = false;
    return false;
  } finally {
    loading.value = false;
  }
};

/** Handles app quit request (e.g. Cmd+Q / close main window): always ask confirm before quit. */
const handleAppRequestQuit = () => {
  if (isAppQuitConfirming.value) {
    return;
  }
  isAppQuitConfirming.value = true;
  const shouldEndLiveBeforeQuit = isInLive.value;
  TUIMessageBox.confirm({
    title: shouldEndLiveBeforeQuit ? t('End live and quit?') : t('Quit app?'),
    content: shouldEndLiveBeforeQuit
      ? t('You are currently live streaming. Do you want to end the live and quit the app?')
      : t('Do you want to quit the app? Scene source settings will not be saved.'),
    confirmText: shouldEndLiveBeforeQuit ? t('End live and quit') : t('Quit app'),
    cancelText: t('Cancel'),
    callback: async (action) => {
      try {
        if (action !== 'confirm') {
          window.ipcRenderer?.send('app-quit-cancel');
          return;
        }
        if (!shouldEndLiveBeforeQuit) {
          window.ipcRenderer?.send('app-quit-confirmed');
          return;
        }
        const endLiveSuccess = loading.value
          ? !isInLive.value
          : await handleEndLive({ showErrorToast: false });
        if (!endLiveSuccess || isInLive.value) {
          TUIToast.error({
            message: t('Failed to end live, please try again later'),
          });
          window.ipcRenderer?.send('app-quit-cancel');
        } else {
          window.ipcRenderer?.send('app-quit-confirmed');
        }
      } finally {
        isAppQuitConfirming.value = false;
      }
    },
  });
};

const handleLiveEnded = (eventInfo: LiveListEventInfo) => {
  if (eventInfo.reason === LiveEndedReason.endedByHost) {
    return;
  }
  if (eventInfo.reason === LiveEndedReason.endedByServer) {
    TUIToast.warning({
      message: t('Stream closed due to content violation'),
      duration: 5000,
    });
    return;
  }
  // Fallback for unknown ending reasons
  TUIToast.warning({
    message: t('The live room has been closed'),
    duration: 5000,
  });
};

onMounted(async () => {
  // Subscribe to live ended event
  subscribeEvent(LiveListEvent.onLiveEnded, handleLiveEnded);

  // Setup event listeners
  setupEventListeners();
  if (window.ipcRenderer) {
    window.ipcRenderer.on('app-request-quit', handleAppRequestQuit);
  }

  // Read user info from localStorage
  const currentUserInfo = window.localStorage.getItem(USER_INFO_STORAGE_KEY);
  if (!currentUserInfo) {
    router.replace({ name: 'login' });
    return;
  }

  try {
    const userInfo = JSON.parse(currentUserInfo);
    const { sdkAppId, userSig, userId } = userInfo;

    // Use retry mechanism for login
    await loginWithRetry({
      sdkAppId,
      userId,
      userSig,
    });
  } catch (e) {
    redirectToLogin();
  }
});

const handleLiveSettingConfirm = async (form: { liveName: string; coverUrl?: string }) => {
  const updatedForm = {
    liveName: form.liveName.trim(),
    coverUrl: (form.coverUrl || '').trim(),
  };
  if (isSvgCoverUrl(updatedForm.coverUrl)) {
    TUIToast.error({
      message: t('Unsupported image format'),
    });
    return;
  }
  if (!isInLive.value || !currentLive.value?.liveId) {
    liveParamsEditForm.value = updatedForm;
    return;
  }

  if (isNetworkOffline()) {
    TUIToast.error({
      message: t('Network error, please check your connection and try again'),
    });
    return;
  }

  try {
    loading.value = true;
    const liveListManager = roomEngine.instance?.getLiveListManager();
    if (!liveListManager) {
      throw new Error('live list manager is unavailable');
    }
    await liveListManager.setLiveInfo({
      roomId: currentLive.value.liveId,
      name: updatedForm.liveName,
      coverUrl: updatedForm.coverUrl,
    });
    if (currentLive.value) {
      currentLive.value.liveName = updatedForm.liveName;
      currentLive.value.coverUrl = updatedForm.coverUrl;
    }
    liveParamsEditForm.value = updatedForm;
  } catch (error: unknown) {
    if (isNetworkTimeoutError(error)) {
      TUIToast.error({
        message: t('Network error, please check your connection and try again'),
      });
      return;
    }
    TUIToast.error({
      message: t('Save failed'),
    });
  } finally {
    loading.value = false;
  }
};

onBeforeUnmount(() => {
  unsubscribeEvent(LiveListEvent.onLiveEnded, handleLiveEnded);
  stopSystemAudioLoopbackSafely();
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
    height: calc(100% - 44px);
    display: flex;
    flex-direction: row;
    user-select: none;
    padding: 0 12px 12px 12px;
    border-radius: 8px;
    background-color: var(--bg-color-topbar);
    @include scrollbar;

    .main-left {
      flex: 0 0 20%;
      width: 20%;
      max-width: 320px;
      height: 100%;
      display: flex;
      flex-direction: column;
      gap: 6px;
      color: $text-color1;
      background-color: var(--bg-color-operate);

      .main-left-top {
        flex: 1;
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
        position: relative;
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        height: 56px;
        box-sizing: border-box;
        padding: 0 16px;
        color: $text-color1;
        background-color: var(--bg-color-operate);

        .main-center-top-left {
          @include text-size-16;
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 1;
          min-width: 0;

          .live-title {
            min-width: 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
        }

        .main-center-top-right {
          @include text-size-12;
          flex-shrink: 0;
          margin-left: 12px;
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
        position: relative;
        display: flex;
        justify-content: space-between;
        flex-direction: column;
        width: 100%;
        box-sizing: border-box;
        padding: 0 16px;
        background-color: var(--bg-color-operate);

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
