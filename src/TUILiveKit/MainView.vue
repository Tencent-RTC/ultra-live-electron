<template>
  <div class="tui-live-kit-main dark-theme">
    <live-header
      :user="{ userName: userName, userId: userId, avatarUrl: avatarUrl, sdkAppId: basicStore.sdkAppId, userSig: basicStore.userSig, phone: basicStore.phone, isUserSigExpired: basicStore.isUserSigExpired }"
      @logout="onLogout"
    />
    <div class="tui-live-layout">
      <div class="tui-layout-left">
        <div class="tui-live-config-container">
          <live-config @edit-media-source="onEditMediaSource" />
        </div>
        <div class="tui-live-more-tool">
          <live-more-tool />
        </div>
      </div>
      <div class="tui-layout-middle">
        <div class="tui-live-preview-container">
          <live-preview @edit-media-source="onEditMediaSource" />
        </div>
        <div class="tui-live-controller-container">
          <live-controller
            @on-start-living="startLiving"
            @on-stop-living="stopLiving"
          />
        </div>
      </div>
      <div class="tui-layout-right">
        <div class="tui-live-member-container">
          <live-member />
        </div>
        <div class="tui-live-message-container">
          <live-message />
        </div>
      </div>
      <live-image-source
        ref="imageSourceRef"
        v-if="mediaSourceInEdit"
        v-show="false"
        :data="mediaSourceInEdit"
      ></live-image-source>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, Ref, defineExpose, defineEmits, toRaw, onMounted, onUnmounted, onBeforeUnmount, watch, nextTick } from 'vue';
import { storeToRefs } from 'pinia';
import { TRTCStatistics, TRTCDeviceType, TRTCMediaSourceType, TRTCDeviceState, TRTCVolumeInfo } from 'trtc-electron-sdk';
import trtcCloud from './utils/trtcCloud';
import TUIRoomEngine, {
  TUIRoomEvents, TUIRoomType, TUIRequest, TUIRequestAction, TUISeatInfo, TUIUserInfo,
  TencentCloudChat,
  TUILiveConnectionManagerEvents,
  TUILiveConnectionUser,
  TUILiveBattleManagerEvents,
  TUIBattleInfo,
  TUIBattleStoppedReason,
  TUIBattleUser,
  TUIKickedOutOfRoomReason,
  TUIRoomDismissedReason,
  TUILiveGiftManagerEvents,
  TUIGiftInfo,
} from '@tencentcloud/tuiroom-engine-electron';
import { TUIConnectionMode, TUIMediaSourceViewModel } from './types';
import LiveHeader from './components/LiveHeader/Index.vue';
import LiveConfig from './components/LiveConfig/Index.vue';
import LiveMoreTool from './components/LiveMoreTool/Index.vue';
import LivePreview from './components/LivePreview/Index.vue';
import LiveController from './components/LiveController/Index.vue';
import LiveMember from './components/LiveMember/Index.vue';
import LiveMessage from './components/LiveMessage/Index.vue';
import LiveImageSource from './components/LiveSource/LiveImageSource.vue';
import TUIMessageBox from './common/base/MessageBox';
import { initCommunicationChannels, messageChannels } from './communication';
import { useBasicStore } from './store/main/basic';
import { useRoomStore } from './store/main/room';
import { useChatStore } from './store/main/chat';
import { useMediaSourcesStore } from './store/main/mediaSources';
import { useAudioEffectStore } from './store/main/audioEffect';
import { useDeviceStore } from './store/main/device';
import useDeviceManager from './utils/useDeviceManager';
import useMediaMixingManager from './utils/useMediaMixingManager';
import useVideoEffectManager from './utils/useVideoEffectManager';
import useRoomEngine from './utils/useRoomEngine';
import { useI18n } from './locales/index';
import useMessageHook from './components/LiveMessage/useMessageHook';
import { onRoomError } from './hooks/useRoomErrorHandler';
import useMediaEventhander from './hooks/useMediaEventHandler';
import { INVITATION_TIMEOUT, DEFAULT_USER_AVATAR_URL } from './constants/tuiConstant';
import logger from './utils/logger';
import { safelyParse } from './utils/utils';

const logPrefix = '[MainView]';

const { t } = useI18n();
const roomEngine = useRoomEngine();
const videoEffectManager = useVideoEffectManager();
useMediaEventhander();

defineExpose({
  init
});

const emit = defineEmits([
  'on-start-living',
  'on-stop-living',
  'on-logout',
  'on-login-failed',
  'on-kicked-off-line',
  'on-user-sig-expired',
  'on-user-auth-changed',
]);

const mediaMixingManager = useMediaMixingManager();
const deviceManager = useDeviceManager();

const basicStore = useBasicStore();
const roomStore = useRoomStore();
const chatStore = useChatStore();
const deviceStore = useDeviceStore();
const mediaSourcesStore = useMediaSourcesStore();
const audioEffectStore = useAudioEffectStore();
const { userName, userId, avatarUrl } = storeToRefs(basicStore);
const { connectionMode } = storeToRefs(roomStore);
const { microphoneList } = storeToRefs(deviceStore);

const mediaSourceInEdit: Ref<TUIMediaSourceViewModel | null> = ref(null);
const imageSourceRef = ref();

const onEditMediaSource = (mediaSource: TUIMediaSourceViewModel) => {
  logger.log(logPrefix, 'onEditMediaSource:', mediaSource);
  let command = '';
  switch (mediaSource.mediaSourceInfo.sourceType) {
  case TRTCMediaSourceType.kCamera:
    command = 'camera';
    break;
  case TRTCMediaSourceType.kScreen:
    command = 'screen';
    break;
  case TRTCMediaSourceType.kImage:
    mediaSourceInEdit.value = toRaw(mediaSource);
    nextTick(() => {
      imageSourceRef.value.triggerFileSelect();
    });
    return;
  case TRTCMediaSourceType.kPhoneMirror:
    command = 'phone-mirror';
    break;
  case TRTCMediaSourceType.kOnlineVideo:
    command = 'online-video';
    break;
  case TRTCMediaSourceType.kVideoFile:
    command = 'video-file';
    break;
  default:
    logger.error(
      'onEditMediaSource: sourceType not supported',
      mediaSource.mediaSourceInfo.sourceType
    );
  }
  if (!command) {
    return;
  }
  window.ipcRenderer.send('open-child', {
    command,
    data: JSON.parse(JSON.stringify(mediaSource))
  });
};

const onLogout = async () => {
  logger.log(`${logPrefix}onLogout`);
  try {
    if (basicStore.isLiving) {
      await stopLiving();
    }
    mediaMixingManager.bindPreviewArea(0, null);
    basicStore.reset();
    roomStore.reset();
    chatStore.reset();
    audioEffectStore.reset();
    await mediaSourcesStore.asyncClear();
    await TUIRoomEngine.logout();
  } catch (error) {
    logger.error(`${logPrefix}onLogout error:`, error);
  } finally {
    emit('on-logout');
  }
};

const onBeforeUnload = () => {
  logger.log(`${logPrefix}onBeforeUnload`);
  if (basicStore.isLiving) {
    stopLiving();
  }
  audioEffectStore.reset();
  mediaSourcesStore.syncClear();
};

onMounted(() => {
  // init MessageChannel for communication between Main window and child window
  initCommunicationChannels({
    mediaSourcesStore,
    roomStore
  });
  deviceStore.init();
  window.addEventListener('beforeunload', onBeforeUnload);
});

onUnmounted(() => {
  videoEffectManager.clear();
  if (basicStore.isLiving) {
    stopLiving();
  }
  window.removeEventListener('beforeunload', onBeforeUnload);
});

watch(() => [basicStore.userId, basicStore.userName, basicStore.userSig, basicStore.avatarUrl, basicStore.sdkAppId], () => {
  logger.log(`${logPrefix}watch user auth info changed`);
  emit('on-user-auth-changed', {
    userId: basicStore.userId,
    userName: basicStore.userName,
    userSig: basicStore.userSig,
    avatarUrl: basicStore.avatarUrl,
    sdkAppId: basicStore.sdkAppId,
  });
});

// ***************** LiveKit interface start *****************
function _generateRoomId() {
  return `live_${Math.floor(Math.random() * 1000 * 1000)}`;
}

async function startLiving() {
  logger.log(`${logPrefix}startLiving`);
  try {
    if (basicStore.userId) {
      const roomId = _generateRoomId().toString();
      TUIRoomEngine.callExperimentalAPI(JSON.stringify({
        api: 'enableUnlimitedRoom',
        params: {
          enable: true,
        },
      }));
      TUIRoomEngine.once('ready', () => {
        TUIRoomEngine.callExperimentalAPI(JSON.stringify({
          api: 'enableMultiPlaybackQuality',
          params: {
            enable: true,
          },
        }));
      });

      basicStore.setRoomId(roomId);
      const liveInfo = (await roomEngine.instance?.getLiveListManager().startLive({
        roomId: roomId,
        roomType: TUIRoomType.kLive,
        name: `${basicStore.roomName}${roomId}`,
        notice: '',
        isMessageDisableForAllUser: roomStore.currentLive.isMessageDisableForAllUser,
        isGiftEnabled: roomStore.currentLive.isGiftEnabled,
        isLikeEnabled: roomStore.currentLive.isLikeEnabled,
        isPublicVisible: roomStore.currentLive.isPublicVisible,
        isSeatEnabled: roomStore.currentLive.isSeatEnabled,
        keepOwnerOnSeat: roomStore.currentLive.keepOwnerOnSeat,
        seatLayoutTemplateId: roomStore.currentLive.seatLayoutTemplateId || 0,
        maxSeatCount: 0,
        seatMode: roomStore.currentLive.seatMode,
        coverUrl: '',
        backgroundUrl: '',
        categoryList: [],
        activityStatus: 0,
      }));
      logger.log(`${logPrefix}startLiving success:`, liveInfo);

      basicStore.setIsLiving(true);
      const loginUserInfo = await TUIRoomEngine.getSelfInfo();
      roomStore.setLocalUser(loginUserInfo);

      if (liveInfo) {
        roomStore.setCurrentLive(liveInfo);
      }

      if (microphoneList.value.length > 0) {
        roomEngine.instance?.unmuteLocalAudio();
        roomEngine.instance?.openLocalMicrophone();
        basicStore.setIsOpenMic(true);
      } else {
        TUIMessageBox({
          title: t('Note'),
          message: t('No microphone'),
          confirmButtonText: t('Sure'),
        });
      }

      trtcCloud.enableAudioVolumeEvaluation(300);

      trtcCloud.startSystemAudioLoopback();
      trtcCloud.setSystemAudioLoopbackVolume(100);

      useMessageHook();
      emit('on-start-living');
    } else {
      logger.error(`${logPrefix}startLiving failed due to no valid userId`);
      TUIMessageBox({
        title: t('Note'),
        message: t('No user ID'),
        confirmButtonText: t('Sure'),
      });
    }
  } catch (error) {
    onRoomError(error as { code?: number; message: string });
  }
}

async function stopLiving() {
  logger.log(`${logPrefix}stopLiving`);
  try {
    const liveStatistic = await roomEngine.instance?.getLiveListManager().stopLive();
    if (liveStatistic) {
      logger.log(`${logPrefix}stopLiving success:`, liveStatistic);
    }

    trtcCloud.stopSystemAudioLoopback();
  } catch (error) {
    logger.error(`${logPrefix}stopLiving error:`, error);
    let detail = '';
    if ((error as any)?.message?.indexOf('the room identifier is null, please check room is created.') !== -1) {
      detail = t('Live room does not existed. Or you enterred the room on another device.');
    }
    TUIMessageBox({
      title: t('Error'),
      message: t('Stop living failed.') + detail,
      confirmButtonText: t('OK')
    });
  } finally {
    clearLiveRoomInfo();
    emit('on-stop-living');
  }
}

function clearLiveRoomInfo() {
  basicStore.setIsLiving(false);
  basicStore.setRoomId('');
  roomStore.reset();
  chatStore.reset();
  audioEffectStore.reset();
  window.ipcRenderer.send('close-child');
  messageChannels.messagePortToChild?.postMessage({
    key: 'reset',
    data: {}
  });
}

type RoomInitData = {
  sdkAppId: number;
  userId: string;
  userSig: string;
  userName: string;
  avatarUrl: string;
  phone?: string;
}

async function init(options: RoomInitData) {
  logger.log(`${logPrefix}init:`, options);
  await retryInit(options);
}

const MAX_LOGIN_RETRY_COUNT = 10;
let loginRetryCount = 0;
// eslint-disable-next-line no-undef
let loginRetryTimer: NodeJS.Timeout | null;
let loginError: any;

async function retryInit(options: RoomInitData) {
  logger.log(`${logPrefix}retryInit:`, options);
  if (loginRetryTimer) {
    loginRetryTimer = null;
  }

  loginRetryCount++;
  if (loginRetryCount > MAX_LOGIN_RETRY_COUNT) {
    let errorNotice = t('Login failed.');
    if (loginError?.message) {
      if (loginError.message.indexOf('The UserSig in use is expired') !== -1) {
        errorNotice += t('The UserSig in use is expired.');
      } else if (loginError.message.indexOf('does not match the Usersig') !== -1) {
        errorNotice += t('The UserSig does not match.');
      } else if (loginError.message.indexOf('Invaild parameters.') !== -1) {
        errorNotice += t('Invalid login parameters.');
      } else {
        errorNotice += t('Please check login parameter.');
      }
    }
    TUIMessageBox({
      title: t('Note'),
      message: errorNotice,
      confirmButtonText: t('Sure'),
    });
    loginRetryCount = 0;
    loginError = null;
    emit('on-login-failed');
    return;
  }

  const { sdkAppId, userId, userSig, userName, avatarUrl } = options;
  try {
    // const chat = TencentCloudChat.create({
    //   SDKAppID: sdkAppId,
    // });
    await TUIRoomEngine.login({ sdkAppId, userId, userSig }); // , tim: chat
  } catch (error) {
    logger.error(`${logPrefix}retryInit login() error:`, error);
    loginError = error;
    loginRetryTimer = setTimeout(() => {
      retryInit(options);
    }, 200);
    return;
  }

  try {
    const selfInfo = await TUIRoomEngine.getSelfInfo();
    logger.debug(`${logPrefix}retryInit getSelfInfo result:`, selfInfo);
    if ((options.avatarUrl && options.avatarUrl !== selfInfo.avatarUrl)
      || (options.userName && options.userName !== selfInfo.userName)) {
      await TUIRoomEngine.setSelfInfo({
        userName: userName || selfInfo.userName,
        avatarUrl: avatarUrl || selfInfo.avatarUrl
      });
    } else {
      options.userName = selfInfo.userName;
      options.avatarUrl = selfInfo.avatarUrl || DEFAULT_USER_AVATAR_URL;
    }
  } catch (error) {
    logger.error(`${logPrefix}retryInit get/setSelfInfo() error:`, error);
  }

  basicStore.setBasicInfo(options);
  roomStore.setLocalUser(options);
}
// ***************** LiveKit interface end *****************

// ***************** Room Engine event listener start *****************
function onRemoteUserEnterRoom(eventInfo: { userInfo: TUIUserInfo }) {
  roomStore.addRemoteUser(eventInfo.userInfo);
}

function onRemoteUserLeaveRoom(eventInfo: { userInfo: TUIUserInfo }) {
  roomStore.removeRemoteUser(eventInfo.userInfo.userId);
}

function onRequestReceived(eventInfo: { request: TUIRequest }) {
  const { requestAction, requestId, userId, timestamp } = eventInfo.request;
  if (requestAction === TUIRequestAction.kRequestToTakeSeat) {
    if (connectionMode.value === TUIConnectionMode.CoHost) {
      roomEngine.instance?.responseRemoteRequest({
        requestId,
        agree: false,
      });
    } else {
      userId && roomStore.addApplyToAnchorUser({ userId, requestId, timestamp });
    }
  }
}

function onRequestCancelled(eventInfo: {
  requestId: string
  userId: string
  request: TUIRequest
}) {
  logger.log(`${logPrefix}onRequestCancelled:`, eventInfo);
  const { userId, request } = eventInfo;
  if (request.requestAction === TUIRequestAction.kRequestToTakeSeat) {
    roomStore.removeApplyToAnchorUser(userId);
  }
}

function onSeatListChanged(eventInfo: {
  seatList: TUISeatInfo[]
  seatedList: TUISeatInfo[]
  leftList: TUISeatInfo[]
}) {
  logger.log(`${logPrefix}onSeatListChanged:`, eventInfo);
  const { seatedList, leftList } = eventInfo;
  roomStore.updateOnSeatList(seatedList, leftList);
}

function onKickedOffLine(eventInfo: {
  roomId: string;
  message: string;
}) {
  logger.log(`${logPrefix}onKickedOffLine:`, eventInfo);
  TUIMessageBox({
    title: t('Note'),
    message: t('You have been kicked off line.'),
    confirmButtonText: t('Sure'),
  });
  try {
    mediaMixingManager.bindPreviewArea(0, null);
    basicStore.reset();
    roomStore.reset();
    chatStore.reset();
    audioEffectStore.reset();
    mediaSourcesStore.syncClear();
  } catch (error) {
    logger.error(`${logPrefix}onKickedOffLine error:`, error);
  }
  emit('on-kicked-off-line');
}

async function onKickedOutOfRoom(eventInfo: {
  roomId: string;
  reason: TUIKickedOutOfRoomReason;
  message: string;
}) {
  logger.log(`${logPrefix}onKickedOutOfRoom:`, eventInfo);
  let detail = '';
  switch (eventInfo.reason) {
  case TUIKickedOutOfRoomReason.kKickedByAdmin:
    detail = t('Kicked out of live room by admin or room owner.');
    break;
  case TUIKickedOutOfRoomReason.kKickedByLoggedOnOtherDevice:
    detail = t('Kicked out of live room by logged on other device.');
    break;
  case TUIKickedOutOfRoomReason.kKickedByServer:
    detail = t('Kicked out of live room by server.');
    break;
  case TUIKickedOutOfRoomReason.kNetworkDisconnected:
    detail = t('Kicked out of live room due to network disconnected.');
    break;
  case TUIKickedOutOfRoomReason.kJoinRoomStatusInvalidDuringOffline:
    detail = t('Kicked out of live room due to join room status invalid during offline.');
    break;
  case TUIKickedOutOfRoomReason.kCountOfJoinedRoomsExceedLimit:
    detail = t('Kicked out of live room due to count of joined rooms exceed limit.');
    break;
  default:
    detail = t('Kicked out of live room.') + eventInfo.message;
    break;
  }
  TUIMessageBox({
    title: t('Note'),
    message: detail,
    confirmButtonText: t('Sure'),
  });

  clearLiveRoomInfo();
}

function onUserSigExpired() {
  logger.log(`${logPrefix}onUserSigExpired:`);
  TUIMessageBox({
    title: t('Note'),
    message: t('The UserSig in use is expired. Please log in again.'),
    confirmButtonText: t('Sure'),
  });
  emit('on-user-sig-expired');
  basicStore.setIsUserSigExpired(true);
  // To do: support relogin from 'User Profile'
  // syncLogout();
  // TUIRoomEngine.logout();
}

function onRoomDismissed(eventInfo: {
  roomId: string;
  reason: TUIRoomDismissedReason;
}) {
  logger.log(`${logPrefix}onRoomDismissed:`, eventInfo);
  let detail = '';
  switch (eventInfo.reason) {
  case TUIRoomDismissedReason.kByOwner:
    detail = ''; // Live room dismissed by room owner.
    break;
  case TUIRoomDismissedReason.kByServer:
    detail = t('Live room dismissed by server.');
    break;
  default:
    detail = t('Live room dismissed.') + t('Reason:') + eventInfo.reason;
    break;
  }

  if (detail) {
    TUIMessageBox({
      title: t('Note'),
      message: detail,
      confirmButtonText: t('Sure'),
    });
  }

  clearLiveRoomInfo();
}

// function onNetStateChange(event: Record<string, any>) {
//   logger.log(`${logPrefix}onNetStateChange:`, event);
//   const { state } = event.data;
//   if (state) {
//     switch (state) {
//     case TencentCloudChat.TYPES.NET_STATE_CONNECTED:
//       break;
//     case TencentCloudChat.TYPES.NET_STATE_CONNECTING:
//       break;
//     case TencentCloudChat.TYPES.NET_STATE_DISCONNECTED:
//       TUIMessageBox({
//         title: t('Note'),
//         message: t('network unavailable. Please check your network configuration and security software settings.'),
//         confirmButtonText: t('Sure'),
//       });
//       break;
//     }
//   }
// }

let countdownTimer: number | undefined = undefined;
const countdownTime: Ref<number> = ref(INVITATION_TIMEOUT); // seconds
const connectionRequestParams: { inviter: TUILiveConnectionUser | null; } = {
  inviter: null
};

async function acceptConnectionRequest() {
  if (connectionRequestParams.inviter) {
    logger.log(`${logPrefix}acceptConnectionRequest accept:`, connectionRequestParams.inviter);
    const { inviter } = connectionRequestParams;
    const liveConnectionManager = roomEngine.instance?.getLiveConnectionManager();
    if (liveConnectionManager) {
      try {
        roomStore.acceptConnectionRequest(inviter);
        if (countdownTimer) {
          clearInterval(countdownTimer);
          countdownTimer = undefined;
        }
        countdownTime.value = INVITATION_TIMEOUT;
        connectionRequestParams.inviter = null;
      } catch (error) {
        logger.error(`${logPrefix}acceptConnectionRequest accept failed:`, error);
      }
    } else {
      logger.error(`${logPrefix}acceptConnectionRequest accept failed: no liveConnectionManager`);
    }
  } else {
    logger.error(`${logPrefix}acceptConnectionRequest accept failed: no inviter`);
  }
}

async function rejectConnectionRequest() {
  if (connectionRequestParams.inviter) {
    logger.log(`${logPrefix}rejectConnectionRequest reject:`, connectionRequestParams.inviter);
    const { inviter } = connectionRequestParams;
    const liveConnectionManager = roomEngine.instance?.getLiveConnectionManager();
    if (liveConnectionManager) {
      try {
        roomStore.rejectConnectionRequest(inviter);
      } catch (error) {
        logger.error(`${logPrefix}rejectConnectionRequest reject failed:`, error);
      }
    } else {
      logger.error(`${logPrefix}rejectConnectionRequest reject failed: no liveConnectionManager`);
    }
  } else {
    logger.error(`${logPrefix}rejectConnectionRequest reject failed: no inviter`);
  }

  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = undefined;
  }
  countdownTime.value = INVITATION_TIMEOUT;
  connectionRequestParams.inviter = null;
}

function onConnectionRequestReceived(eventInfo: {
  inviter: TUILiveConnectionUser;
  inviteeList: Array<TUILiveConnectionUser>;
  extensionInfo: string;
}) {
  logger.log(`${logPrefix}onConnectionRequestReceived:`, eventInfo);
  const { inviter, inviteeList, extensionInfo } = eventInfo;

  connectionRequestParams.inviter = inviter;
  if (connectionMode.value === TUIConnectionMode.CoGuest) {
    const liveConnectionManager = roomEngine.instance?.getLiveConnectionManager();
    if (liveConnectionManager) {
      rejectConnectionRequest();
    } else {
      logger.error(`${logPrefix}onConnectionRequestReceived error: no liveConnectionManager`);
    }
    return;
  } else {
    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = undefined;
    }
    const extensionInfoObj = safelyParse(extensionInfo);
    const withBattle = extensionInfoObj.withBattle || false;
    countdownTime.value = (extensionInfoObj.timeout || INVITATION_TIMEOUT) * 1000

    TUIMessageBox({
      message: !withBattle ? t('is inviting you to connect', { userName: inviter.userName }) : t('is inviting you to battle', { userName: inviter.userName }),
      confirmButtonText: t('Accept'),
      cancelButtonText: `${t('Reject')}`,
      callback: acceptConnectionRequest,
      cancelCallback: rejectConnectionRequest,
      timeout: countdownTime.value,
    });
    roomStore.onConnectionRequestReceived(inviter, inviteeList, extensionInfo);
  }
}

function onConnectionUserListChanged(eventInfo: {
  connectedList: Array<TUILiveConnectionUser>;
  joinedList: Array<TUILiveConnectionUser>
  leavedList: Array<TUILiveConnectionUser>
}) {
  logger.log(`${logPrefix}onConnectionUserListChanged:`, eventInfo);
  const { connectedList, joinedList, leavedList } = eventInfo;
  if (connectedList.find(user => user.roomId === basicStore.roomId)) {
    const joinedUsers = joinedList.map(user => user.userName).join(',');
    const leavedUsers = leavedList.map(user => user.userName).join(',');
    let message = joinedList.length ? `${joinedUsers} ${t('joined connection')}.` : '';
    message += leavedList.length ? `${leavedUsers} ${t('left connection')}.` : '';
    TUIMessageBox({
      message,
      confirmButtonText: t('Sure'),
      callback: () => Promise.resolve(),
      timeout: 3000,
    });
  }
  roomStore.onConnectionUserListChanged(connectedList, joinedList, leavedList);
}

function onConnectionRequestCancelled(eventInfo: { inviter: TUILiveConnectionUser; }) {
  logger.log(`${logPrefix}onConnectionRequestCancelled:`, eventInfo);
  const { inviter } = eventInfo;
  TUIMessageBox({
    message: t('canceled connection invitation', { userName: inviter.userName }),
    confirmButtonText: t('Sure'),
    callback: () => Promise.resolve(),
    timeout: 3000,
  });
  roomStore.onConnectionRequestCancelled(inviter);
}

function onConnectionRequestAccept(eventInfo: { invitee: TUILiveConnectionUser; }) {
  logger.log(`${logPrefix}onConnectionRequestAccept:`, eventInfo);
  const { invitee } = eventInfo;
  roomStore.onConnectionRequestAccept(invitee);
}

function onConnectionRequestReject(eventInfo: { invitee: TUILiveConnectionUser; }) {
  logger.log(`${logPrefix}onConnectionRequestReject:`, eventInfo);
  const { invitee } = eventInfo;
  TUIMessageBox({
    message: t('rejected connection invitation', { userName: invitee.userName }),
    confirmButtonText: t('Sure'),
    callback: () => Promise.resolve(),
    timeout: 3000,
  });
  roomStore.onConnectionRequestReject(invitee);
}

function onConnectionRequestTimeout(eventInfo: { inviter: TUILiveConnectionUser; invitee: TUILiveConnectionUser; }) {
  logger.log(`${logPrefix}onConnectionRequestTimeout:`, eventInfo);
  const { inviter, invitee } = eventInfo;
  if (inviter.userId === basicStore.userId) {
    TUIMessageBox({
      message: t('\'s connection invitation timeout', { userName: inviter.userName }),
      confirmButtonText: t('Sure'),
      callback: () => Promise.resolve(),
      timeout: 3000,
    });
  }

  roomStore.onConnectionRequestTimeout(inviter, invitee);
}

function onBattleStarted(options: { battleInfo: TUIBattleInfo }) {
  logger.debug(`${logPrefix}onBattleStarted:`, options.battleInfo);
  roomStore.onBattleStarted(options.battleInfo);
}

function onBattleEnded(options: { battleInfo: TUIBattleInfo; reason: TUIBattleStoppedReason; }) {
  logger.debug(`${logPrefix}onBattleEnded:`, options.battleInfo, options.reason);
  roomStore.onBattleEnded(options.battleInfo.battleId);
}

function onUserJoinBattle(options: { battleId: string; user: TUIBattleUser }) {
  logger.debug(`${logPrefix}onUserJoinBattle:`, options.battleId, options.user);
  roomStore.addBattleUser(options.battleId, options.user);
}

function onUserExitBattle(options: { battleId: string; user: TUIBattleUser }) {
  logger.debug(`${logPrefix}onUserExitBattle:`, options.battleId, options.user);
  roomStore.removeBattleUser(options.battleId, options.user);
}

function onBattleScoreChanged(options: {
  battleId: string;
  battleUserList: Array<TUIBattleUser>;
}) {
  logger.debug(`${logPrefix}onBattleScoreChanged:`, options.battleId, options.battleUserList);
  roomStore.updateBattleScore(options.battleId, options.battleUserList);
}

const battleRequestParams: {
  battleInfo: TUIBattleInfo | null;
  inviter: TUIBattleUser | null;
  invitee: TUIBattleUser | null;
} = {
  battleInfo: null,
  inviter: null,
  invitee: null,
};
async function acceptBattleRequest() {
  logger.debug(`${logPrefix}acceptBattleRequest`);
  roomStore.acceptBattleRequest();
}

async function rejectBattleRequest() {
  logger.debug(`${logPrefix}rejectBattleRequest`);
  roomStore.rejectBattleRequest();
}

function onBattleRequestReceived(options: {
  battleInfo: TUIBattleInfo;
  inviter: TUIBattleUser;
  invitee: TUIBattleUser;
}) {
  logger.debug(`${logPrefix}onBattleRequestReceived:`, options.battleInfo, options.inviter, options.invitee);
  // To do: to be implemented
  const { battleInfo, inviter, invitee } = options;
  battleRequestParams.battleInfo = battleInfo;
  battleRequestParams.inviter = inviter;
  battleRequestParams.invitee = invitee;
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = undefined;
  }
  TUIMessageBox({
    message: t('is inviting you to battle', { userName: inviter.userName }),
    confirmButtonText: t('Accept'),
    cancelButtonText: `${t('Reject')}`,
    callback: acceptBattleRequest,
    cancelCallback: rejectBattleRequest,
    timeout: countdownTime.value,
  });
  roomStore.onBattleRequestReceived(battleInfo, inviter, invitee);

  roomStore.addBattleRequest(options.battleInfo, options.inviter, options.invitee);
}

function onBattleRequestCancelled(options: {
  battleInfo: TUIBattleInfo;
  inviter: TUIBattleUser;
  invitee: TUIBattleUser;
}) {
  logger.debug(`${logPrefix}onBattleRequestCancelled:`, options.battleInfo, options.inviter, options.invitee);
  roomStore.removeBattleRequest(options.battleInfo, options.inviter, options.invitee);
}

function onBattleRequestTimeout(options: {
  battleInfo: TUIBattleInfo;
  inviter: TUIBattleUser;
  invitee: TUIBattleUser;
}) {
  logger.debug(`${logPrefix}onBattleRequestTimeout:`, options.battleInfo, options.inviter, options.invitee);
  const { battleInfo, inviter, invitee } = options;
  if (inviter.userId === basicStore.userId && inviter.roomId === basicStore.roomId) {
    TUIMessageBox({
      message: t('\'s battle invitation timeout', { userName: invitee.userName }),
      confirmButtonText: t('Sure'),
      callback: () => Promise.resolve(),
      timeout: 3000,
    });
  }
  roomStore.removeBattleRequest(battleInfo, inviter, invitee);
}

function onBattleRequestAccept(options: {
  battleInfo: TUIBattleInfo;
  inviter: TUIBattleUser;
  invitee: TUIBattleUser;
}) {
  logger.debug(`${logPrefix}onBattleRequestAccept:`, options.battleInfo, options.inviter, options.invitee);
  const { battleInfo, inviter, invitee } = options;
  TUIMessageBox({
    message: t('accepted battle invitation', { userName: invitee.userName }),
    confirmButtonText: t('Sure'),
    callback: () => Promise.resolve(),
    timeout: 3000,
  });
  roomStore.addBattleRequest(battleInfo, inviter, invitee);
}

function onBattleRequestReject(options: {
  battleInfo: TUIBattleInfo;
  inviter: TUIBattleUser;
  invitee: TUIBattleUser;
}) {
  logger.debug(`${logPrefix}onBattleRequestReject:`, options.battleInfo, options.inviter, options.invitee);
  const { battleInfo, inviter, invitee } = options;
  TUIMessageBox({
    message: t('rejected battle invitation', { userName: invitee.userName }),
    confirmButtonText: t('Sure'),
    callback: () => Promise.resolve(),
    timeout: 3000,
  });
  roomStore.removeBattleRequest(battleInfo, inviter, invitee);
}

function onReceiveGiftMessage(eventInfo: { roomId: string; giftInfo: TUIGiftInfo; sender: TUIUserInfo; count: number;}) {
  logger.debug(`${logPrefix}onReceiveGiftMessage:`, eventInfo);
  const { roomId, giftInfo, sender, count } = eventInfo;
  chatStore.addReceivedGift(roomId, giftInfo, sender, count);
}

function onReceiveLikesMessage(eventInfo: any) {
  logger.debug(`${logPrefix}onReceiveLikesMessage:`, eventInfo);
}

function onGiftCountChanged(eventInfo: { roomId: string; totalGiftCoins: number; totalGiftsSent: number; totalUniqueGiftSenders: number;}) {
  logger.debug(`${logPrefix}onGiftCountChanged:`, eventInfo);
  const { totalGiftCoins, totalGiftsSent, totalUniqueGiftSenders } = eventInfo;
  chatStore.updateGiftStatistics(totalGiftCoins, totalGiftsSent, totalUniqueGiftSenders);
}

TUIRoomEngine.once('ready', () => {
  if (roomEngine.instance) {
    roomEngine.instance.on(TUIRoomEvents.onError, onRoomError);
    roomEngine.instance.on(TUIRoomEvents.onRemoteUserEnterRoom, onRemoteUserEnterRoom);
    roomEngine.instance.on(TUIRoomEvents.onRemoteUserLeaveRoom, onRemoteUserLeaveRoom);
    roomEngine.instance.on(TUIRoomEvents.onRequestReceived, onRequestReceived);
    roomEngine.instance.on(TUIRoomEvents.onRequestCancelled, onRequestCancelled);
    roomEngine.instance.on(TUIRoomEvents.onSeatListChanged, onSeatListChanged);
    roomEngine.instance.on(TUIRoomEvents.onKickedOffLine, onKickedOffLine);
    roomEngine.instance.on(TUIRoomEvents.onKickedOutOfRoom, onKickedOutOfRoom);
    roomEngine.instance.on(TUIRoomEvents.onUserSigExpired, onUserSigExpired);
    roomEngine.instance.on(TUIRoomEvents.onRoomDismissed, onRoomDismissed);

    // const chat = roomEngine.instance.getTIM();
    // if (chat) {
    //   chat.on(TencentCloudChat.EVENT.NET_STATE_CHANGE, onNetStateChange);
    // }
  } else {
    logger.error(`${logPrefix}TUIRoomEngine ready but instance is null`);
    return;
  }

  const liveConnectionManager = roomEngine.instance?.getLiveConnectionManager();
  if (liveConnectionManager) {
    liveConnectionManager.on(TUILiveConnectionManagerEvents.onConnectionRequestReceived, onConnectionRequestReceived);
    liveConnectionManager.on(TUILiveConnectionManagerEvents.onConnectionUserListChanged, onConnectionUserListChanged);
    liveConnectionManager.on(TUILiveConnectionManagerEvents.onConnectionRequestCancelled, onConnectionRequestCancelled);
    liveConnectionManager.on(TUILiveConnectionManagerEvents.onConnectionRequestAccept, onConnectionRequestAccept);
    liveConnectionManager.on(TUILiveConnectionManagerEvents.onConnectionRequestReject, onConnectionRequestReject);
    liveConnectionManager.on(TUILiveConnectionManagerEvents.onConnectionRequestTimeout, onConnectionRequestTimeout);
  } else {
    logger.warn(`${logPrefix}getLiveConnectionManager failed`);
  }

  const liveBattleManager = roomEngine.instance?.getLiveBattleManager();
  if (liveBattleManager) {
    liveBattleManager.on(TUILiveBattleManagerEvents.onBattleStarted, onBattleStarted);
    liveBattleManager.on(TUILiveBattleManagerEvents.onBattleEnded, onBattleEnded);
    liveBattleManager.on(TUILiveBattleManagerEvents.onUserJoinBattle, onUserJoinBattle);
    liveBattleManager.on(TUILiveBattleManagerEvents.onUserExitBattle, onUserExitBattle);
    liveBattleManager.on(TUILiveBattleManagerEvents.onBattleScoreChanged, onBattleScoreChanged);
    liveBattleManager.on(TUILiveBattleManagerEvents.onBattleRequestReceived, onBattleRequestReceived);
    liveBattleManager.on(TUILiveBattleManagerEvents.onBattleRequestCancelled, onBattleRequestCancelled);
    liveBattleManager.on(TUILiveBattleManagerEvents.onBattleRequestTimeout, onBattleRequestTimeout);
    liveBattleManager.on(TUILiveBattleManagerEvents.onBattleRequestAccept, onBattleRequestAccept);
    liveBattleManager.on(TUILiveBattleManagerEvents.onBattleRequestReject, onBattleRequestReject);
  } else {
    logger.warn(`${logPrefix}getLiveBattleManager failed`);
  }

  const liveGiftManager = roomEngine.instance?.getLiveGiftManager();
  if (liveGiftManager) {
    liveGiftManager.on(TUILiveGiftManagerEvents.onReceiveGiftMessage, onReceiveGiftMessage);
    liveGiftManager.on(TUILiveGiftManagerEvents.onReceiveLikesMessage, onReceiveLikesMessage);
    liveGiftManager.on(TUILiveGiftManagerEvents.onGiftCountChanged, onGiftCountChanged);
  }else {
    logger.warn(`${logPrefix}getLiveGiftManager failed`);
  }
});

onUnmounted(() => {
  if (roomEngine.instance) {
    roomEngine.instance.off(TUIRoomEvents.onError, onRoomError);
    roomEngine.instance.off(TUIRoomEvents.onRemoteUserEnterRoom, onRemoteUserEnterRoom);
    roomEngine.instance.off(TUIRoomEvents.onRemoteUserLeaveRoom, onRemoteUserLeaveRoom);
    roomEngine.instance.off(TUIRoomEvents.onRequestReceived, onRequestReceived);
    roomEngine.instance.off(TUIRoomEvents.onRequestCancelled, onRequestCancelled);
    roomEngine.instance.off(TUIRoomEvents.onSeatListChanged, onSeatListChanged);
    roomEngine.instance.off(TUIRoomEvents.onKickedOffLine, onKickedOffLine);
    roomEngine.instance.off(TUIRoomEvents.onKickedOutOfRoom, onKickedOutOfRoom);
    roomEngine.instance.off(TUIRoomEvents.onUserSigExpired, onUserSigExpired);
    roomEngine.instance.off(TUIRoomEvents.onRoomDismissed, onRoomDismissed);

    // const chat = roomEngine.instance.getTIM();
    // if (chat) {
    //   chat.off(TencentCloudChat.EVENT.NET_STATE_CHANGE, onNetStateChange);
    // }
  }

  const liveConnectionManager = roomEngine.instance?.getLiveConnectionManager();
  liveConnectionManager?.off(TUILiveConnectionManagerEvents.onConnectionRequestReceived, onConnectionRequestReceived);
  liveConnectionManager?.off(TUILiveConnectionManagerEvents.onConnectionUserListChanged, onConnectionUserListChanged);
  liveConnectionManager?.off(TUILiveConnectionManagerEvents.onConnectionRequestCancelled, onConnectionRequestCancelled);
  liveConnectionManager?.off(TUILiveConnectionManagerEvents.onConnectionRequestAccept, onConnectionRequestAccept);
  liveConnectionManager?.off(TUILiveConnectionManagerEvents.onConnectionRequestReject, onConnectionRequestReject);
  liveConnectionManager?.off(TUILiveConnectionManagerEvents.onConnectionRequestTimeout, onConnectionRequestTimeout);

  const liveBattleManager = roomEngine.instance?.getLiveBattleManager();
  liveBattleManager?.off(TUILiveBattleManagerEvents.onBattleStarted, onBattleStarted);
  liveBattleManager?.off(TUILiveBattleManagerEvents.onBattleEnded, onBattleEnded);
  liveBattleManager?.off(TUILiveBattleManagerEvents.onUserJoinBattle, onUserJoinBattle);
  liveBattleManager?.off(TUILiveBattleManagerEvents.onUserExitBattle, onUserExitBattle);
  liveBattleManager?.off(TUILiveBattleManagerEvents.onBattleScoreChanged, onBattleScoreChanged);
  liveBattleManager?.off(TUILiveBattleManagerEvents.onBattleRequestReceived, onBattleRequestReceived);
  liveBattleManager?.off(TUILiveBattleManagerEvents.onBattleRequestCancelled, onBattleRequestCancelled);
  liveBattleManager?.off(TUILiveBattleManagerEvents.onBattleRequestTimeout, onBattleRequestTimeout);
  liveBattleManager?.off(TUILiveBattleManagerEvents.onBattleRequestAccept, onBattleRequestAccept);
  liveBattleManager?.off(TUILiveBattleManagerEvents.onBattleRequestReject, onBattleRequestReject);

  const liveGiftManager = roomEngine.instance?.getLiveGiftManager();
  liveGiftManager?.off(TUILiveGiftManagerEvents.onReceiveGiftMessage, onReceiveGiftMessage);
  liveGiftManager?.off(TUILiveGiftManagerEvents.onReceiveLikesMessage, onReceiveLikesMessage);
  liveGiftManager?.off(TUILiveGiftManagerEvents.onGiftCountChanged, onGiftCountChanged);
});
// ***************** Room Engine event listener end *****************

// ***************** Device event listener start *****************
function onDeviceChange(deviceId: string, type: TRTCDeviceType, state: TRTCDeviceState): void {
  logger.debug(`${logPrefix}onDeviceChange: deviceId:${deviceId}, type:${type}, state:${state}`);
  deviceStore.changeDevice(deviceId, type, state);
}

function onTestMicVolume(volume: number) {
  messageChannels.messagePortToChild?.postMessage({
    key: 'update-audio-volume',
    data: volume
  });
}

function onTestSpeakerVolume(volume: number) {
  messageChannels.messagePortToChild?.postMessage({
    key: 'update-speaker-volume',
    data: volume
  });
}

function onStatistics(statis: TRTCStatistics) {
  basicStore.setStatistics(statis);
}
function onUserVoiceVolume(userVolumes: TRTCVolumeInfo, userVolumesCount: number, totalVolume: number) {
  logger.debug(`${logPrefix}onUserVoiceVolume: userVolumesCount:${userVolumesCount}, totalVolume:${totalVolume},  userVolumes:`, userVolumes);
}

onMounted(() => {
  deviceManager.on('onDeviceChange', onDeviceChange);
  trtcCloud.on('onTestMicVolume', onTestMicVolume);
  trtcCloud.on('onTestSpeakerVolume', onTestSpeakerVolume);
  trtcCloud.on('onStatistics', onStatistics);
  trtcCloud.on('onUserVoiceVolume', onUserVoiceVolume);
});

onBeforeUnmount(() => {
  deviceManager.off('onDeviceChange', onDeviceChange);
  trtcCloud.off('onTestMicVolume', onTestMicVolume);
  trtcCloud.off('onTestSpeakerVolume', onTestSpeakerVolume);
  trtcCloud.off('onStatistics', onStatistics);
  trtcCloud.off('onUserVoiceVolume', onUserVoiceVolume);

  if (loginRetryTimer) {
    clearTimeout(loginRetryTimer);
    loginRetryTimer = null;
  }
});
// ***************** Device event listener end *****************
</script>

<style lang="scss">
@import './assets/variable.scss';
@import './assets/global.scss';

.tui-live-kit-main {
  width: 100%;
  height: 100%;
  padding: 0 0.5rem 0.5rem 0.5rem;
  background-color: var(--bg-color-topbar);
  color: var(--text-color-primary);
  font-size: $font-main-size;

  .tui-live-layout {
    width: 100%;
    height: calc(100% - 2.75rem);
    border-radius: 0.5rem;

    display: flex;
    flex-direction: row;
  }

  .tui-layout-left,
  .tui-layout-right {
    flex: 0 0 18rem;
    width: 18px;
    display: flex;
    flex-direction: column;
    background-color: var(--bg-color-topbar);
  }

  .tui-layout-middle {
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    padding: 0 0.5rem;
  }

  .tui-live-config-container {
    height: 65%;
    flex: 1 1 auto;
    border-radius: 0.5rem 0 0 0;
    background-color: var(--bg-color-operate);
  }

  .tui-live-more-tool {
    margin-top: 0.5rem;
    border-bottom-left-radius: 1rem;
    background-color: var(--bg-color-operate);
  }

  .tui-live-preview-container {
    flex: 1 1 auto;
    height: calc(100% - 4rem);
    background-color: var(--bg-color-operate);
    color: var(--text-color-primary);
  }

  .tui-live-controller-container {
    flex: 0 0 4rem;
    height: 4rem;
    background-color: $color-main-live-controller-container-background;
  }

  .tui-live-member-container {
    flex: 1 1 40%;
    height: 40%;
    background-color: $color-main-live-member-container-background;
    border-radius: 0 0.5rem 0 0;
  }

  .tui-live-message-container {
    flex: 1 1 auto;
    margin-top: 0.5rem;
    height: calc(60% - 0.5rem);
    background-color: $color-main-live-message-container-background;
    border-radius: 0 0 0.5rem 0;
  }
}
</style>
