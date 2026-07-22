<template>
  <UIKitProvider theme="dark">
    <div class="tui-livekit-win" :class="{ 'is-logout-transitioning': isGoingToLoginPage }">
      <LiveHeader @logout="handleLogout" :is-showing-in-child-window="true"/>
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
          <div class="main-left-bottom">
            <div class="main-left-bottom-header">
              <div class="main-left-bottom-title">
                {{ t('Live tool') }}
              </div>
              <div
                class="main-left-bottom-fold"
                @click="isToolsExpanded = !isToolsExpanded"
              >
                <IconArrowStrokeSelectDown
                  class="arrow-icon"
                  :class="{ expanded: isToolsExpanded, collapsed: !isToolsExpanded }"
                />
                <span>{{ isToolsExpanded ? t('Close') : t('Expand') }}</span>
              </div>
            </div>
            <div
              v-show="isToolsExpanded"
              class="main-left-bottom-tools"
            >
              <CoGuestButton :isShowingInChildWindow="true" />
              <CoHostButton :isShowingInChildWindow="true" />
              <MusicButton :isShowingInChildWindow="true" />
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
                v-if="loginUserInfo?.userId && !isGoingToLoginPage"
                :live-name="liveParams.liveName"
                :cover-url="liveParams.coverUrl"
                @confirm="showLiveSettingChildWindow"
                :isShowingInChildWindow="true"
              />
              <LiveURLCopy
                v-if="isInLive && !isGoingToLoginPage"
                :live-id="currentLive?.liveId"
              />
            </div>
            <div class="main-center-top-right">
              {{ audienceCount }} {{ t('People watching') }}
            </div>
          </div>
          <div class="main-center-center">
            <StreamMixer
              v-if="nativeId !== null && !isGoingToLoginPage"
              :windowId="nativeId"
              @on-user-on-seat-info-changed="onUserOnSeatInfoChanged"
              @on-stream-layout-changed="onStreamLayoutChanged"
              @on-stream-layout-area-changed="onStreamLayoutAreaChanged"
            />
          </div>
          <div class="main-center-bottom">
            <div class="main-center-bottom-content">
              <div class="main-center-bottom-left">
                <MicVolumeSetting />
                <SpeakerVolumeSetting />
                <div class="main-center-bottom-tools">
                  <OrientationSwitch />
                  <LayoutSwitch :isShowingInChildWindow="true"/>
                  <SettingButton :isShowingInChildWindow="true"/>
                </div>
              </div>
              <div class="main-center-bottom-right">
                <TUIButton
                  v-if="!isInLive"
                  type="primary"
                  :disabled="loading || isGoingToLoginPage"
                  @click="handleStartLive"
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
                  :disabled="loading || isGoingToLoginPage"
                  @click="showEndLiveConfirmWindow"
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
                emoji-popup-mode="inset"
              />
            </div>
          </div>
        </div>
        <LivePusherNotification />
      </div>
    </div>
  </UIKitProvider>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeMount, onBeforeUnmount, watch, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import trtcCloud from '../TUILiveKit/utils/trtcCloud';
import { releaseMediaResourcesBeforeQuit } from '../TUILiveKit/utils/appQuitCleanup';
import TUIRoomEngine, { TUISeatMode } from '@tencentcloud/tuiroom-engine-electron';
import {
  UIKitProvider,
  useUIKit,
  TUIButton,
  IconLiveLoading,
  IconLiveStart,
  IconEndLive,
  IconArrowStrokeSelectDown,
} from '@tencentcloud/uikit-base-component-vue3';
import { showMessage, MessageToastType } from '../TUILiveKit/base-component/MessageToast';
import {
  LiveAudienceList,
  BarrageList,
  BarrageInput,
  useLoginState,
  useLiveListState,
  useLiveAudienceState,
  useDeviceState,
  useCoGuestState,
  useCoHostState,
  useBattleState,
  useLiveSeatState,
  CoHostStatus,
  StreamMixer,
  LiveListEvent,
  LiveEndedReason,
  LiveListEventInfo,
  BattleEvent,
} from 'tuikit-atomicx-vue3-electron';
import { useElectronLogin, type ForceLogoutNoticePayload } from '../TUILiveKit/hooks/useElectronLogin';
import { releaseBeautyResourcesOnLogout } from '../TUILiveKit/utils/beautyLogoutCleanup';
import LiveHeader from '../TUILiveKit/components/LiveHeader/index.vue';
import LiveScenePanel from '../TUILiveKit/components/LiveScenePanel/index.vue';
import LiveSettingButton from '../TUILiveKit/components/LiveSettingButton.vue';
import LiveURLCopy from '../TUILiveKit/components/LiveURLCopy.vue';
import CoGuestButton from '../TUILiveKit/components/CoGuestButton.vue';
import CoHostButton from '../TUILiveKit/components/CoHostButton.vue';
import LivePusherNotification from '../TUILiveKit/components/LivePusherNotification.vue';
import {
  isNetworkOffline,
  isNetworkTimeoutError,
  isSvgCoverUrl,
  throttle,
} from '../TUILiveKit/utils/utils';
import { getWindowID } from '../TUILiveKit/utils/envUtils';
import { TUIButtonAction, TUIButtonActionType } from '../TUILiveKit/types';
import {
  ipcBridge,
  IPCMessageType,
  ConfirmDialogActionPayload,
  ApplyLiveTitlePayload,
  ChildPanelType,
  WindowType,
  BattleStateSnapshot,
  EndLiveActionValue,
} from '../TUILiveKit/ipc';
import MicVolumeSetting from '../TUILiveKit/components/MicVolumeSetting.vue';
import SpeakerVolumeSetting from '../TUILiveKit/components/SpeakerVolumeSetting.vue';
import OrientationSwitch from '../TUILiveKit/components/OrientationSwitch.vue';
import SettingButton from '../TUILiveKit/components/SettingButton.vue';
import LayoutSwitch from '../TUILiveKit/components/LayoutSwitch.vue';
import MusicButton from '../TUILiveKit/components/MusicButton.vue';
import { USER_INFO_STORAGE_KEY } from '../TUILiveKit/utils/userInfoStorage';
import { useSystemAudioLoopback } from '../TUILiveKit/hooks/useSystemAudioLoopback';
import useRoomEngine from '../TUILiveKit/utils/useRoomEngine';
import { mapToRoomEngineLanguage } from '../TUILiveKit/utils/common';
import { LIVE_NAME_MAX_UTF8_BYTES } from '../TUILiveKit/constants/tuiConstant';

console.log('TRTC SDK version:', trtcCloud.getSDKVersion());

const nativeId = ref<number | Uint8Array | null>(null);

const router = useRouter();
const { loginUserInfo } = useLoginState();
const { t, language } = useUIKit();
const loading = ref(false);
const isToolsExpanded = ref(true);

const props = defineProps<{
  liveId?: string;
  liveName?: string;
  seatMode?: TUISeatMode;
}>();

const { currentLive, startLive, endLive, joinLive, subscribeEvent, unsubscribeEvent } = useLiveListState();
const { audienceCount } = useLiveAudienceState();
const { openLocalMicrophone } = useDeviceState();
const { connected: coGuestConnected } = useCoGuestState();
const { connected: coHostConnected, coHostStatus, exitHostConnection } = useCoHostState();
const {
  currentBattleInfo,
  battleUsers,
  battleScore,
  subscribeEvent: subscribeBattleEvent,
  unsubscribeEvent: unsubscribeBattleEvent,
} = useBattleState();
const { seatList } = useLiveSeatState();
const roomEngine = useRoomEngine();
const isInLive = computed(() => !!currentLive.value?.liveId);
const isGoingToLoginPage = ref(false);
const isTransitioningToLogin = () => isGoingToLoginPage.value;
// Dialog message follows the same priority as the Web LivePusherView
// (PK > CoHost > CoGuest > default). While in PK the host can only end the
// whole live (ending the battle alone is no longer offered), so the PK
// branch shows a dedicated PK exit confirmation. The end-live
// confirm dialog actions (assembled in `showEndLiveDialog`) follow the same
// priority — see the `actions` array there.
const endLiveDialogMessage = computed(() => {
  if (currentBattleInfo.value?.battleId) {
    return t('You are currently live streaming and in a PK battle. Are you sure you want to exit?');
  }
  if (coHostStatus.value === CoHostStatus.Connected) {
    return t('Currently connected, do you need to "exit connection" or "end live broadcast"');
  }
  if (coGuestConnected.value.length > 1) {
    return t('You are currently co-guesting with other streamers. Would you like to [End Live] ?');
  }
  return t('You are currently live streaming. Do you want to end it?');
});

/**
 * Delay (ms) before redirecting to login page after logout/kick-off.
 * The C++ native rendering (bindPreviewArea) bypasses the Chromium compositor
 * and needs time to fully shut down after unbinding. We must wait for it to
 * finish before navigating away, otherwise the stale render surface remains
 * visible on the login page.
 */
const NATIVE_RENDERING_SHUTDOWN_DELAY_MS = 5000;
let loginRedirectTimer: ReturnType<typeof setTimeout> | null = null;
// Explicit re-entry guard for logout-triggered redirect scheduling.
let hasStartedLogoutRedirect = false;

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
const currentLiveSettingDialogId = ref('');
const pendingLiveSettingName = ref('');
const pendingLiveSettingCoverUrl = ref('');
const currentAppQuitDialogId = ref('');
const currentAppQuitNeedsEndLive = ref(false);
const isAppQuitHandling = ref(false);
const currentForceLogoutDialogId = ref('');
const currentLogoutDialogId = ref('');
const {
  startSystemAudioLoopbackSafely,
  stopSystemAudioLoopbackSafely,
} = useSystemAudioLoopback('TUILiveKitWin');

const enableMultiPlaybackQuality = async () => {
  try {
    await TUIRoomEngine.callExperimentalAPI(JSON.stringify({
      api: 'enableMultiPlaybackQuality',
      params: {
        enable: true,
      },
    }));
  } catch (error) {
    console.warn('[TUILiveKitWin] enableMultiPlaybackQuality failed', error);
  }
};

TUIRoomEngine.once('ready', async () => {
  await enableMultiPlaybackQuality();
});

const handleStartLive = async () => {
  try {
    if (loading.value || isTransitioningToLogin()) {
      return;
    }
    if (!loginUserInfo.value?.userId) {
      showMessage({
        type: MessageToastType.Info,
        message: t('Please login first'),
      });
      return;
    }
    if (isNetworkOffline()) {
      showMessage({
        type: MessageToastType.Error,
        message: t('Network error, please check your connection and try again'),
      });
      return;
    }
    loading.value = true;
    await TUIRoomEngine.callExperimentalAPI(JSON.stringify({
      api: 'setCurrentLanguage',
      params: {
        language: mapToRoomEngineLanguage(language.value),
      },
    }));
    await startLive({
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
      showMessage({
        type: MessageToastType.Error,
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
    showMessage({ type: MessageToastType.Error,
      message: t('Failed to create live'),
    });
  }
};

const showEndLiveConfirmWindow = () => {
  if (loading.value || isTransitioningToLogin()) {
    return;
  }

  const dialogId = `end-live-${Date.now()}`;
  // Action ordering mirrors the Web LivePusherView dialog footer:
  //   [Cancel, End live, Exit connection?]
  // The third action ("Exit connection") only appears when the host is
  // co-hosting but NOT in PK. During PK no third action is offered: a host
  // in PK can only end the whole live, not exit the PK alone. This matches
  // the gating in `endLiveDialogMessage` above so the dialog content and the
  // visible actions stay consistent.
  const actions: Array<TUIButtonAction> = [
    { text: t('Cancel'), value: EndLiveActionValue.Cancel, type: TUIButtonActionType.Normal },
    { text: t('End live'), value: EndLiveActionValue.EndLive, type: TUIButtonActionType.Dangerous },
  ];
  if (!currentBattleInfo.value?.battleId && coHostStatus.value === CoHostStatus.Connected) {
    actions.push({ text: t('Exit connection'), value: EndLiveActionValue.ExitConnection, type: TUIButtonActionType.Dangerous });
  }

  ipcBridge.sendToConfirm(IPCMessageType.SHOW_CONFIRM_DIALOG, {
    scene: 'end-live',
    dialogId,
    title: t('End live'),
    content: endLiveDialogMessage.value,
    actions,
  });
};

const showLiveSettingChildWindow = (form: { liveName: string; coverUrl?: string }) => {
  if (isTransitioningToLogin()) {
    return;
  }
  const dialogId = `live-setting-${Date.now()}`;
  currentLiveSettingDialogId.value = dialogId;
  pendingLiveSettingName.value = form?.liveName || '';
  pendingLiveSettingCoverUrl.value = form?.coverUrl || '';

  ipcBridge.sendToChild(IPCMessageType.SHOW_CHILD_PANEL, {
    panelType: ChildPanelType.LiveTitleSetting,
    initialData: {
      dialogId,
      liveName: pendingLiveSettingName.value,
      coverUrl: pendingLiveSettingCoverUrl.value,
      maxLength: LIVE_NAME_MAX_UTF8_BYTES,
    },
  });
};

const showAppQuitConfirmWindow = () => {
  if (isTransitioningToLogin() || isAppQuitHandling.value || currentAppQuitDialogId.value) {
    return;
  }

  const shouldEndLiveBeforeQuit = isInLive.value;
  const dialogId = `app-quit-${Date.now()}`;
  currentAppQuitDialogId.value = dialogId;
  currentAppQuitNeedsEndLive.value = shouldEndLiveBeforeQuit;

  const actions: Array<TUIButtonAction> = shouldEndLiveBeforeQuit
    ? [
      { text: t('Cancel'), value: 'cancel', type: TUIButtonActionType.Normal },
      { text: t('End live and quit'), value: 'end-live-and-quit', type: TUIButtonActionType.Dangerous },
    ]
    : [
      { text: t('Cancel'), value: 'cancel', type: TUIButtonActionType.Normal },
      { text: t('Quit app'), value: 'quit-app', type: TUIButtonActionType.Dangerous },
    ];

  ipcBridge.sendToConfirm(IPCMessageType.SHOW_CONFIRM_DIALOG, {
    scene: 'app-quit',
    dialogId,
    title: shouldEndLiveBeforeQuit ? t('End live and quit?') : t('Quit app?'),
    content: shouldEndLiveBeforeQuit
      ? t('You are currently live streaming. Do you want to end the live and quit the app?')
      : t('Do you want to quit the app? Scene source settings will not be saved.'),
    actions,
  });
};

const showForceLogoutConfirmWindow = (payload: ForceLogoutNoticePayload) => {
  if (currentForceLogoutDialogId.value) {
    return;
  }
  const dialogId = `force-logout-${Date.now()}`;
  currentForceLogoutDialogId.value = dialogId;
  const actions: Array<TUIButtonAction> = [
    { text: t('Sure'), value: 'ack-force-logout', type: TUIButtonActionType.Normal },
  ];
  ipcBridge.sendToConfirm(IPCMessageType.SHOW_CONFIRM_DIALOG, {
    scene: 'force-logout',
    dialogId,
    title: payload.title,
    content: payload.content,
    actions,
  });
};

/**
 * Active logout confirm: shown when the host clicks "Logout" while still
 * live streaming. Reuses the independent confirm BrowserWindow (same as
 * end-live / app-quit) since the Win main window renders via native C++ and
 * cannot host an in-window TUIMessageBox reliably.
 */
const showLogoutConfirmWindow = () => {
  if (isTransitioningToLogin() || currentLogoutDialogId.value) {
    return;
  }
  const dialogId = `logout-${Date.now()}`;
  currentLogoutDialogId.value = dialogId;
  const actions: Array<TUIButtonAction> = [
    { text: t('Cancel'), value: 'cancel', type: TUIButtonActionType.Normal },
    { text: t('Logout'), value: 'logout-confirm', type: TUIButtonActionType.Dangerous },
  ];
  ipcBridge.sendToConfirm(IPCMessageType.SHOW_CONFIRM_DIALOG, {
    scene: 'logout',
    dialogId,
    title: t('Logout'),
    content: t('You are currently live streaming. Logging out will automatically end the live stream. Are you sure you want to log out?'),
    actions,
  });
};

const onConfirmDialogAction = async (payload: ConfirmDialogActionPayload) => {
  if (!payload?.scene) {
    return;
  }

  if (payload.scene === 'logout') {
    const dialogId = payload.dialogId || currentLogoutDialogId.value || undefined;
    ipcBridge.sendToConfirm(IPCMessageType.CLOSE_CONFIRM_DIALOG, {
      scene: payload.scene,
      dialogId,
    });
    currentLogoutDialogId.value = '';
    // Only the explicit "Logout" action proceeds; closing / cancel is a no-op.
    if (payload.action === 'logout-confirm') {
      await performLogout();
    }
    return;
  }

  if (payload.scene === 'force-logout') {
    const dialogId = payload.dialogId || currentForceLogoutDialogId.value || undefined;
    ipcBridge.sendToConfirm(IPCMessageType.CLOSE_CONFIRM_DIALOG, {
      scene: payload.scene,
      dialogId,
    });
    currentForceLogoutDialogId.value = '';
    return;
  }

  if (payload.scene === 'end-live') {
    ipcBridge.sendToConfirm(IPCMessageType.CLOSE_CONFIRM_DIALOG, {
      scene: payload.scene,
      dialogId: payload.dialogId,
    });
    // Route the contextual third button back to the appropriate SDK call.
    // Mirrors `LivePusherView.handleExitConnection` on the Web side. We
    // swallow exitHostConnection errors here (just log to console) because
    // there's no toast surface above this IPC handler — the user has already
    // dismissed the dialog and an error would otherwise be silently
    // re-thrown into the void. Ending the PK alone is no longer offered, so
    // there is no `EndBattle` action to route here.
    if (payload.action === EndLiveActionValue.ExitConnection) {
      if (coHostStatus.value === CoHostStatus.Connected) {
        try {
          await exitHostConnection();
        } catch (error) {
          console.error('[TUILiveKitWin] exitHostConnection from end-live dialog failed', error);
        }
      }
      return;
    }
    if (payload.action !== EndLiveActionValue.EndLive) {
      return;
    }
    if (!loading.value) {
      await handleEndLive();
    }
    return;
  }

  if (payload.scene === 'app-quit') {
    if (isAppQuitHandling.value) {
      // First handler is still processing; it will resolve quit/cancel.
      return;
    }
    if (payload.dialogId && currentAppQuitDialogId.value && payload.dialogId !== currentAppQuitDialogId.value) {
      return;
    }

    const dialogId = payload.dialogId || currentAppQuitDialogId.value || undefined;
    ipcBridge.sendToConfirm(IPCMessageType.CLOSE_CONFIRM_DIALOG, {
      scene: payload.scene,
      dialogId,
    });

    const shouldEndLiveBeforeQuit = currentAppQuitNeedsEndLive.value;
    const confirmAction = shouldEndLiveBeforeQuit ? 'end-live-and-quit' : 'quit-app';
    if (payload.action !== confirmAction) {
      currentAppQuitDialogId.value = '';
      currentAppQuitNeedsEndLive.value = false;
      window.ipcRenderer?.send('app-quit-cancel');
      return;
    }

    isAppQuitHandling.value = true;
    try {
      let canQuit = true;
      if (shouldEndLiveBeforeQuit) {
        const endLiveSuccess = loading.value
          ? !isInLive.value
          : await handleEndLive({ showErrorToast: false });
        canQuit = endLiveSuccess && !isInLive.value;
      }
      if (!canQuit) {
        showMessage({
          type: MessageToastType.Error,
          message: t('Failed to end live, please try again later'),
        });
        window.ipcRenderer?.send('app-quit-cancel');
      } else {
        // Release the camera/mic held by the native (isIPCMode) TRTC engine
        // BEFORE signalling quit. The main process hard-exits right after
        // receiving app-quit-confirmed, so without this the camera LED would
        // linger for a few seconds. See releaseMediaResourcesBeforeQuit.
        await releaseMediaResourcesBeforeQuit();
        window.ipcRenderer?.send('app-quit-confirmed');
      }
    } finally {
      currentAppQuitDialogId.value = '';
      currentAppQuitNeedsEndLive.value = false;
      isAppQuitHandling.value = false;
    }
  }
};

const onApplyLiveTitle = (payload: ApplyLiveTitlePayload, from?: WindowType) => {
  if (from !== 'child') {
    return;
  }
  if (!payload?.dialogId || payload.dialogId !== currentLiveSettingDialogId.value) {
    return;
  }
  if (payload.action === 'confirm') {
    handleLiveSettingConfirm({
      liveName: payload.liveName || pendingLiveSettingName.value,
      coverUrl: payload.coverUrl ?? pendingLiveSettingCoverUrl.value,
    });
  }
  currentLiveSettingDialogId.value = '';
  pendingLiveSettingName.value = '';
  pendingLiveSettingCoverUrl.value = '';
};

const handleEndLive = async (options: { showErrorToast?: boolean } = {}): Promise<boolean> => {
  const { showErrorToast = true } = options;
  try {
    if (isTransitioningToLogin()) {
      return false;
    }
    if (isNetworkOffline()) {
      if (showErrorToast) {
        showMessage({
          type: MessageToastType.Error,
          message: t('Network error, please check your connection and try again'),
        });
      }
      return false;
    }

    loading.value = true;
    await endLive();
    stopSystemAudioLoopbackSafely();
    return true;
  } catch (error: any) {
    console.error('End live error:', error);
    if (showErrorToast && isNetworkTimeoutError(error)) {
      showMessage({
        type: MessageToastType.Error,
        message: t('Network error, please check your connection and try again'),
      });
    }
    return false;
  } finally {
    loading.value = false;
  }
};

/** Handles app quit request (e.g. Cmd+Q / close main window): always ask confirm before quit. */
const handleAppRequestQuit = () => {
  if (isTransitioningToLogin()) {
    return;
  }
  showAppQuitConfirmWindow();
};

/**
 * Called when logged-in user is kicked off or userSig expires.
 * StreamMixer is already active, so we must tear it down first
 * and wait for native rendering to fully shut down before redirecting.
 */
const onLoggedOut = async () => {
  if (hasStartedLogoutRedirect) {
    return;
  }
  hasStartedLogoutRedirect = true;
  isGoingToLoginPage.value = true;
  await nextTick();
  loginRedirectTimer = setTimeout(() => {
    redirectToLogin();
  }, NATIVE_RENDERING_SHUTDOWN_DELAY_MS);
};

/**
 * Called when login fails after all retries.
 * StreamMixer was never initialized, so redirect immediately.
 */
const onLoginFailed = () => {
  redirectToLogin();
};

// Setup useElectronLogin Hook
const {
  loginWithRetry,
  setupEventListeners,
  cleanupEventListeners,
  handleLogout: handleElectronLogout,
} = useElectronLogin({
  onBeforeLogout: releaseBeautyResourcesOnLogout,
  onLogout: onLoggedOut,
  onLoginFailed,
  onForceLogoutNotice: (payload) => {
    isGoingToLoginPage.value = true;
    showForceLogoutConfirmWindow(payload);
  },
  forceLogoutMode: 'immediate',
});

// Perform the actual logout. On failure fall back to the local logout
// redirect so the user is never stuck on the pusher view.
const performLogout = async () => {
  try {
    await handleElectronLogout();
  } catch (error) {
    onLoggedOut();
  }
};

// Handle logout with live status check
const handleLogout = async () => {
  if (isTransitioningToLogin()) {
    return;
  }
  // When still live streaming, ask the host to confirm first: logging out
  // will automatically end the ongoing live stream.
  if (isInLive.value) {
    showLogoutConfirmWindow();
    return;
  }
  await performLogout();
};

function redirectToLogin() {
  hasStartedLogoutRedirect = true;
  if (currentForceLogoutDialogId.value) {
    ipcBridge.sendToConfirm(IPCMessageType.CLOSE_CONFIRM_DIALOG, {
      scene: 'force-logout',
      dialogId: currentForceLogoutDialogId.value,
    });
    currentForceLogoutDialogId.value = '';
  }
  if (currentLogoutDialogId.value) {
    ipcBridge.sendToConfirm(IPCMessageType.CLOSE_CONFIRM_DIALOG, {
      scene: 'logout',
      dialogId: currentLogoutDialogId.value,
    });
    currentLogoutDialogId.value = '';
  }
  window.localStorage.removeItem(USER_INFO_STORAGE_KEY);
  router.replace({ name: 'login' });
}

watch(
  () => [currentLive.value?.liveId, loginUserInfo.value?.userId],
  ([newLiveId, newUserId]) => {
    ipcBridge.sendToCover(IPCMessageType.SYNC_LIVE_INFO, {
      liveId: newLiveId || '',
      liveOwner: newUserId || '',
    });
  },
  { immediate: true }
);

// Whether the most recent battle teardown was a "normal" end, i.e. the SDK
// fired `BattleEvent.onBattleEnded` (countdown timed out, or the battle was
// stopped because the remaining members dropped to <= 1). This is the ONLY
// case in which the cover window should play the PK result animation.
//
// Why a dedicated flag: in a 3+ host PK, when THIS host actively quits, the
// state layer only fires `onUserExitBattle` + `reset()` and never fires
// `onBattleEnded` (see BattleState.ts). Both paths clear `currentBattleInfo`
// identically, so the cover cannot tell them apart from `battleId` alone. We
// latch this flag on `onBattleEnded` and ship it inside the snapshot so the
// cover animates only on a genuine end, matching the Mac / Web kits whose
// `BattleDecorate` likewise animate solely on `onBattleEnded`.
//
// The flag is reset on every `onBattleStarted` (next PK round). A stale `true`
// lingering between battles is harmless because the cover reads it only at the
// instant `battleId` transitions from non-empty to empty.
const battleEndedNormally = ref(false);
const handleBattleEndedForCover = () => {
  battleEndedNormally.value = true;
};
const handleBattleStartedForCover = () => {
  battleEndedNormally.value = false;
};

// Aggregate the slice of battle / seat / co-host state that the cover window
// needs to render the PK overlay (score bar, countdown, start animation,
// per-seat ranking badge). The cover owns no atomicx state, so the main
// window pushes a fully-derived snapshot whenever any input ref changes.
const battleStateSnapshot = computed<BattleStateSnapshot>(() => ({
  battleId: currentBattleInfo.value?.battleId || '',
  battleDuration: currentBattleInfo.value?.config?.duration || 0,
  startTime: currentBattleInfo.value?.startTime || 0,
  battleUsers: (battleUsers.value || []).map(user => ({
    userId: user.userId,
    userName: user.userName,
    avatarUrl: user.avatarUrl,
  })),
  // Map cannot be structured-cloned safely across IPC; serialize to plain entries.
  battleScore: Array.from(
    (battleScore.value || new Map<string, number>()).entries(),
  ) as Array<[string, number]>,
  layoutTemplate: currentLive.value?.layoutTemplate ?? 0,
  connectedSeatCount: (seatList.value || []).filter(seat => seat.userInfo).length,
  connectedHostCount: (coHostConnected.value || []).length,
  battleEndedNormally: battleEndedNormally.value,
}));

// IPC throttle: during an active PK, `battleScore` updates can fire once per
// second from the SDK, and any concurrent seat join / layout switch causes
// `battleStateSnapshot` to recompute again. Without throttling we'd push a
// fresh structured-clone payload to the cover process on every flush, which
// then fans out to multiple Vue reactivity patches (score bar transition,
// per-seat badge re-render, countdown re-render) inside the cover window.
//
// `throttle(..., { leading: true, trailing: true })` semantics:
//   - The first change after a quiet period is sent IMMEDIATELY so PK
//     start (battleId 0 -> id) and layout switches feel instant.
//   - Subsequent changes within the throttle window are coalesced; only
//     the latest snapshot is sent when the timer fires.
const BATTLE_STATE_SYNC_THROTTLE_MS = 200;
const sendBattleStateToCover = throttle((snapshot: BattleStateSnapshot) => {
  ipcBridge.sendToCover(IPCMessageType.SYNC_BATTLE_STATE, snapshot);
}, BATTLE_STATE_SYNC_THROTTLE_MS);

watch(
  battleStateSnapshot,
  (snapshot) => sendBattleStateToCover(snapshot),
  { immediate: true },
);

const onUserOnSeatInfoChanged = (userOnSeatInfos: Array<Record<string, any>>) => {
  console.log('[TUILiveKitWin] onUserOnSeatInfoChanged:', userOnSeatInfos);
  ipcBridge.sendToCover(IPCMessageType.UPDATE_USER_ON_SEAT, userOnSeatInfos);
};

const onStreamLayoutChanged = (streamLayout: Record<string, any>) => {
  console.log('[TUILiveKitWin] onStreamLayoutChanged:', streamLayout);
  window.ipcRenderer.send('stream-layout', streamLayout);
};

const onStreamLayoutAreaChanged = (layoutArea: { left: number; top: number; right: number; bottom: number; width: number; height: number }) => {
  console.log('[TUILiveKitWin] onStreamLayoutAreaChanged:', layoutArea);
  window.ipcRenderer.send('stream-layout-area', layoutArea);
};

onBeforeMount(async () => {
  nativeId.value = await getWindowID();
});

const handleLiveEnded = (eventInfo: LiveListEventInfo) => {
  if (eventInfo.reason === LiveEndedReason.endedByHost) {
    return;
  }
  if (eventInfo.reason === LiveEndedReason.endedByServer) {
    showMessage({ type: MessageToastType.Warning,
      message: t('Stream closed due to content violation'),
      duration: 5000,
    });
    return;
  }
  // Fallback for unknown ending reasons
  showMessage({ type: MessageToastType.Warning,
    message: t('The live room has been closed'),
    duration: 5000,
  });
};

onMounted(async () => {
  // Subscribe to live ended event
  subscribeEvent(LiveListEvent.onLiveEnded, handleLiveEnded);

  // Track genuine battle end vs. active-exit so the cover plays the result
  // animation only on a real `onBattleEnded` (see `battleEndedNormally`).
  subscribeBattleEvent(BattleEvent.onBattleStarted, handleBattleStartedForCover);
  subscribeBattleEvent(BattleEvent.onBattleEnded, handleBattleEndedForCover);

  // Setup event listeners
  setupEventListeners();
  ipcBridge.on(IPCMessageType.CONFIRM_DIALOG_ACTION, onConfirmDialogAction);
  ipcBridge.on(IPCMessageType.APPLY_LIVE_TITLE, onApplyLiveTitle);
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
    showMessage({ type: MessageToastType.Error,
      message: t('Unsupported image format'),
    });
    return;
  }
  if (!isInLive.value || !currentLive.value?.liveId) {
    liveParamsEditForm.value = updatedForm;
    return;
  }

  if (isNetworkOffline()) {
    showMessage({ type: MessageToastType.Error,
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
      showMessage({
        type: MessageToastType.Error,
        message: t('Network error, please check your connection and try again'),
      });
      return;
    }
    console.error('[handleLiveSettingConfirm] failed to save live settings', error, {
      liveId: currentLive.value?.liveId,
      liveName: updatedForm.liveName,
      hasCoverUrl: Boolean(updatedForm.coverUrl),
    });
    showMessage({ type: MessageToastType.Error,
      message: t('Save failed'),
    });
  } finally {
    loading.value = false;
  }
};

onBeforeUnmount(() => {
  unsubscribeEvent(LiveListEvent.onLiveEnded, handleLiveEnded);
  unsubscribeBattleEvent(BattleEvent.onBattleStarted, handleBattleStartedForCover);
  unsubscribeBattleEvent(BattleEvent.onBattleEnded, handleBattleEndedForCover);
  if (loginRedirectTimer) {
    clearTimeout(loginRedirectTimer);
    loginRedirectTimer = null;
  }
  hasStartedLogoutRedirect = false;
  stopSystemAudioLoopbackSafely();
  if (currentForceLogoutDialogId.value) {
    ipcBridge.sendToConfirm(IPCMessageType.CLOSE_CONFIRM_DIALOG, {
      scene: 'force-logout',
      dialogId: currentForceLogoutDialogId.value,
    });
    currentForceLogoutDialogId.value = '';
  }
  if (currentLogoutDialogId.value) {
    ipcBridge.sendToConfirm(IPCMessageType.CLOSE_CONFIRM_DIALOG, {
      scene: 'logout',
      dialogId: currentLogoutDialogId.value,
    });
    currentLogoutDialogId.value = '';
  }
  // Drop any pending throttled SYNC_BATTLE_STATE push so we don't fire
  // after the main window has already torn down its IPC bridge.
  sendBattleStateToCover.cancel();
  cleanupEventListeners();
  ipcBridge.off(IPCMessageType.CONFIRM_DIALOG_ACTION, onConfirmDialogAction);
  ipcBridge.off(IPCMessageType.APPLY_LIVE_TITLE, onApplyLiveTitle);
  if (window.ipcRenderer) {
    window.ipcRenderer.off('app-request-quit', handleAppRequestQuit);
  }
});
</script>

<style lang="scss" scoped>
@import "../TUILiveKit/assets/mac.scss";

.tui-livekit-win {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  --live-shell-bg: #1c2638;
  --live-panel-bg: #232f44;
  --live-panel-border: #3a4f6d;
  --live-stage-bg: #0a1018;
  --live-stage-border: rgba(146, 190, 255, 0.36);
  --live-stage-highlight: rgba(171, 210, 255, 0.24);
  --live-stage-shadow:
    0 14px 36px rgba(0, 0, 0, 0.48),
    0 0 0 1px rgba(125, 170, 240, 0.18);
  --live-empty-slot-bg: #0e1728;
  --live-placeholder-text: rgba(255, 255, 255, 0.74);

  // Scoped dark-theme contrast tuning for Electron main view.
  --bg-color-topbar: var(--live-shell-bg);
  --bg-color-operate: var(--live-panel-bg);
  --bg-color-bubble-reciprocal: rgba(255, 255, 255, 0.08);
  --stroke-color-primary: var(--live-panel-border);

  &.is-logout-transitioning {
    pointer-events: none;
  }

  .live-pusher-main {
    width: 100%;
    height: calc(100% - 44px);
    display: flex;
    flex-direction: row;
    user-select: none;
    padding: 0 12px 12px 12px;
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

      .main-left-top {
        flex: 1;
        padding: 16px;
        background-color: var(--bg-color-operate);
        min-height: 0;

        .main-left-top-title {
          display: flex;
          align-items: center;
          height: 40px;
          box-sizing: border-box;
          user-select: none;
          margin-bottom: 16px;

          .title-text {
            @include text-size-16;
            display: inline-flex;
            align-items: center;
            justify-content: start;
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
        flex-shrink: 0;

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

            .arrow-icon {
              transition: transform 0.2s ease;

              &.expanded {
                transform: rotate(0deg);
              }

              &.collapsed {
                transform: rotate(180deg);
              }
            }
          }
        }

        .main-left-bottom-title {
          @include text-size-16;
        }

        .main-left-bottom-tools {
          @include dividing-line('top');
          margin-top: 16px;
          padding-top: 16px;
          display: flex;
          gap: 6px;
        }
      }
    }

    .main-center {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      height: 100%;
      margin: 0 6px;
      background-color: var(--bg-color-operate);

      .main-center-top {
        position: relative;
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        height: 56px;
        padding: 0 16px;
        box-sizing: border-box;
        color: $text-color1;

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
        position: relative;
        flex: 1;
        min-width: 0;
        min-height: 0;
        overflow: hidden;
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

        :deep(.viewers-panel) {
          --uikit-color-gray-3: rgba(92, 122, 255, 0.1);
          --uikit-color-gray-4: rgba(92, 122, 255, 0.2);

          .viewer-item:hover {
            background: var(--uikit-color-gray-3);
          }

          .action-menu-item {
            background: var(--uikit-color-gray-3);

            &:hover {
              background: var(--uikit-color-gray-4);
            }
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

  .loading-icon {
    animation: rotate 1s linear infinite;
  }

  @keyframes rotate {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  .card-title {
    @include text-size-16;
    @include dividing-line;
  }
}
</style>
