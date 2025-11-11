<template>
  <div class="tui-live-kit-main dark-theme">
    <live-header
      :user="{ name: userName, userId: userId, avatarUrl: avatarUrl as string }"
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
import { ref, Ref, defineExpose, defineEmits, toRaw, onMounted, onUnmounted, onBeforeUnmount, nextTick } from 'vue';
import { storeToRefs } from 'pinia';
import { TRTCStatistics, TRTCDeviceType, TRTCMediaSourceType, TRTCDeviceState } from 'trtc-electron-sdk';
import trtcCloud from './utils/trtcCloud';
import TUIRoomEngine, {
  TUIRoomEvents, TUIRoomType, TUIRoomInfo, TUIRequest, TUIRequestAction, TUISeatInfo, TUIUserInfo,
  TencentCloudChat,
  TUILiveConnectionManagerEvents,
  TUILiveConnectionUser,
  TUILiveBattleManagerEvents,
  TUIBattleInfo,
  TUIBattleStoppedReason,
  TUIBattleUser,
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
import { useMediaSourcesStore, TUIMediaSourcesState } from './store/main/mediaSources';
import { useAudioEffectStore } from './store/main/audioEffect';
import useDeviceManager from './utils/useDeviceManager';
import useMediaMixingManager from './utils/useMediaMixingManager';
import useVideoEffectManager from './utils/useVideoEffectManager';
import useRoomEngine from './utils/useRoomEngine';
import { useI18n } from './locales/index';
import useMessageHook from './components/LiveMessage/useMessageHook';
import useErrorHandler from './hooks/useRoomErrorHandler';
import useMediaEventhander from './hooks/useMediaEventHandler';
import { MEDIA_SOURCE_STORAGE_KEY, INVITATION_TIMEOUT } from './constants/tuiConstant';
import logger from './utils/logger';


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
  'on-create-room',
  'on-enter-room',
  'on-destroy-room',
  'on-exit-room'
]);

const mediaMixingManager = useMediaMixingManager();
const deviceManager = useDeviceManager();

const basicStore = useBasicStore();
const roomStore = useRoomStore();
const chatStore = useChatStore();
const mediaSourcesStore = useMediaSourcesStore();
const audioEffectStore = useAudioEffectStore();
const { userName, userId, avatarUrl } = storeToRefs(basicStore);
const { connectionMode } = storeToRefs(roomStore);
const { onError } = useErrorHandler();

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
  } catch (error) {
    logger.error(`${logPrefix}onLogout error:`, error);
  } finally {
    emit('on-logout');
  }
}

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

  window.addEventListener('beforeunload', onBeforeUnload);
});

onUnmounted(() => {
  videoEffectManager.clear();
  if (basicStore.isLiving) {
    stopLiving();
  }
  window.removeEventListener('beforeunload', onBeforeUnload);
});

// ***************** LiveKit interface start *****************
function _generateRoomId () {
  return `live_${Math.floor(Math.random() * 1000 * 1000)}`;
}

async function startLiving () {
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

      basicStore.setRoomId(roomId);
      const liveInfo = (await roomEngine.instance?.getLiveListManager().startLive({
        roomId: roomId,
        roomType: TUIRoomType.kLive,
        name: `${basicStore.roomName}${roomId}`,
        notice: '',
        isMessageDisableForAllUser: false,
        isGiftEnabled: true,
        isLikeEnabled: true,
        isPublicVisible: true,
        isSeatEnabled: true,
        keepOwnerOnSeat: true,
        seatLayoutTemplateId: roomStore.seatLayoutTemplateId,
        maxSeatCount: roomStore.maxSeatCount,
        seatMode: roomStore.seatMode,
        coverUrl: '',
        backgroundUrl: '',
        categoryList: [],
        activityStatus: 0,
      }));
      logger.log(`${logPrefix}startLiving success:`, liveInfo);

      basicStore.setIsLiving(true);
      if (liveInfo) {
        roomStore.setRoomInfo({
          roomId: liveInfo.roomId,
          roomOwner: liveInfo.roomOwner,
          isMicrophoneDisableForAllUser: false,
          isCameraDisableForAllUser: false,
          isMessageDisableForAllUser: liveInfo.isMessageDisableForAllUser,
          isSeatEnabled: liveInfo.isSeatEnabled,
          seatMode: liveInfo.seatMode,
          maxSeatCount: liveInfo.maxSeatCount,
          roomName: liveInfo.name
        } as TUIRoomInfo);
      }

      const loginUserInfo = await TUIRoomEngine.getSelfInfo();
      roomStore.setLocalUser(loginUserInfo);
      roomEngine.instance?.unmuteLocalAudio();
      roomEngine.instance?.openLocalMicrophone();
      basicStore.setIsOpenMic(true);

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
    onError(error);
  }
}

async function stopLiving () {
  logger.log(`${logPrefix}stopLiving`);
  try {
    const liveStatistic = await roomEngine.instance?.getLiveListManager().stopLive();
    if (liveStatistic) {
      logger.log(`${logPrefix}stopLiving success:`, liveStatistic);
    }
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
    emit('on-stop-living');
  } catch (error) {
    logger.error(`${logPrefix}stopLiving error:`, error);
  }
}

type RoomInitData = {
  sdkAppId: number;
  userId: string;
  userSig: string;
  userName: string;
  avatarUrl: string;
}

async function init(options: RoomInitData) {
  logger.log(`${logPrefix}init:`, options);
  await retryInit(options);
}

const MAX_LOGIN_RETRY_COUNT = 10;
let loginRetryCount = 0;
// eslint-disable-next-line no-undef
let loginRetryTimer: NodeJS.Timeout | null;

async function retryInit(options: RoomInitData) {
  logger.log(`${logPrefix}retryInit:`, options);
  if (loginRetryTimer) {
    loginRetryTimer = null;
  }

  loginRetryCount++;
  if (loginRetryCount > MAX_LOGIN_RETRY_COUNT) {
    TUIMessageBox({
      title: t('Note'),
      message: t('Login failed.'),
      confirmButtonText: t('Sure'),
    });
    onLogout();
    loginRetryCount = 0;
    return;
  }

  basicStore.setBasicInfo(options);
  roomStore.setLocalUser(options);
  const { sdkAppId, userId, userSig, userName, avatarUrl } = options;
  try {
    const chat = TencentCloudChat.create({
      SDKAppID: sdkAppId,
    });
    await TUIRoomEngine.login({ sdkAppId, userId, userSig, tim: chat });
  } catch (error) {
    logger.error(`${logPrefix}retryInit login() error:`, error);
    loginRetryTimer = setTimeout(() => {
      retryInit(options);
    }, 200);
    return;
  }

  try {
    await TUIRoomEngine.setSelfInfo({ userName, avatarUrl });
  } catch (error) {
    logger.error(`${logPrefix}retryInit setSelfInfo() error:`, error);
  }
}
// ***************** LiveKit interface end *****************

// ***************** Room Engine event listener start *****************
function onRemoteUserEnterRoom (eventInfo: { userInfo: TUIUserInfo }) {
  roomStore.addRemoteUser(eventInfo.userInfo);
}

function onRemoteUserLeaveRoom (eventInfo: { userInfo: TUIUserInfo }) {
  roomStore.removeRemoteUser(eventInfo.userInfo.userId);
}

function onRequestReceived (eventInfo: { request: TUIRequest }) {
  const { requestAction, requestId, userId, timestamp } = eventInfo.request;
  if (requestAction === TUIRequestAction.kRequestToTakeSeat) {
    if (connectionMode.value === TUIConnectionMode.CoAnchor) {
      roomEngine.instance?.responseRemoteRequest({
        requestId,
        agree: false,
      });
    } else {
      userId && roomStore.addApplyToAnchorUser({ userId, requestId, timestamp });
    }
  }
}

function onRequestCancelled (eventInfo: {
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

function onSeatListChanged (eventInfo: {
  seatList: TUISeatInfo[]
  seatedList: TUISeatInfo[]
  leftList: TUISeatInfo[]
}) {
  logger.log(`${logPrefix}onSeatListChanged:`, eventInfo);
  const { seatedList, leftList } = eventInfo;
  roomStore.updateOnSeatList(seatedList, leftList);
}

let countdownTimer: number | undefined = undefined;
const countdownTime: Ref<number> = ref(INVITATION_TIMEOUT); // seconds
const connectionRequestParams: { inviter: TUILiveConnectionUser | null; } = {
  inviter: null
};

async function acceptConnectionRequest () {
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

async function rejectConnectionRequest () {
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
  if (connectionMode.value === TUIConnectionMode.CoAudience) {
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

    TUIMessageBox({
      message: t('is inviting you to connect', { userName: inviter.userName }),
      confirmButtonText: t('Accept'),
      cancelButtonText: `${t('Reject')}`,
      callback: acceptConnectionRequest,
      cancelCallback: rejectConnectionRequest,
      timeout: INVITATION_TIMEOUT * 1000,
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
    message: t('canceled connection invitation', { userName: inviter.userName}),
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

function onBattleStarted(options: { battleInfo: TUIBattleInfo}) {
  logger.debug(`${logPrefix}onBattleStarted:`, options.battleInfo);
  roomStore.onBattleStarted(options.battleInfo);
}

function onBattleEnded(options: { battleInfo: TUIBattleInfo; reason: TUIBattleStoppedReason; }) {
  logger.debug(`${logPrefix}onBattleEnded:`, options.battleInfo, options.reason);
  roomStore.onBattleEnded(options.battleInfo.battleId);
}

function onUserJoinBattle(options: { battleId: string; user: TUIBattleUser}) {
  logger.debug(`${logPrefix}onUserJoinBattle:`, options.battleId, options.user);
  roomStore.addBattleUser(options.battleId, options.user);
}

function onUserExitBattle(options: { battleId: string; user: TUIBattleUser}) {
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

function onBattleRequestReceived(options: {
  battleInfo: TUIBattleInfo;
  inviter: TUIBattleUser;
  invitee: TUIBattleUser;
}) {
  logger.debug(`${logPrefix}onBattleRequestReceived:`, options.battleInfo, options.inviter, options.invitee);
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

TUIRoomEngine.once('ready', () => {
  if (roomEngine.instance) {
    roomEngine.instance.on(TUIRoomEvents.onError, onError);
    roomEngine.instance.on(TUIRoomEvents.onRemoteUserEnterRoom, onRemoteUserEnterRoom);
    roomEngine.instance.on(TUIRoomEvents.onRemoteUserLeaveRoom, onRemoteUserLeaveRoom);
    roomEngine.instance.on(TUIRoomEvents.onRequestReceived, onRequestReceived);
    roomEngine.instance.on(TUIRoomEvents.onRequestCancelled, onRequestCancelled);
    roomEngine.instance.on(TUIRoomEvents.onSeatListChanged, onSeatListChanged);
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

});

onUnmounted(() => {
  roomEngine.instance?.off(TUIRoomEvents.onError, onError);
  roomEngine.instance?.off(TUIRoomEvents.onRemoteUserEnterRoom, onRemoteUserEnterRoom);
  roomEngine.instance?.off(TUIRoomEvents.onRemoteUserLeaveRoom, onRemoteUserLeaveRoom);
  roomEngine.instance?.off(TUIRoomEvents.onRequestReceived, onRequestReceived);
  roomEngine.instance?.off(TUIRoomEvents.onRequestCancelled, onRequestCancelled);
  roomEngine.instance?.off(TUIRoomEvents.onSeatListChanged, onSeatListChanged);

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
});
// ***************** Room Engine event listener end *****************

// ***************** Device event listener start *****************
function onDeviceChange(deviceId: string, type: TRTCDeviceType, state: TRTCDeviceState): void{
  logger.debug(`${logPrefix}onDeviceChange: deviceId:${deviceId}, type:${type}, state:${state}`);
  messageChannels.messagePortToChild?.postMessage({
    key: 'on-device-changed',
    data: {
      deviceId,
      type,
      state
    }
  });
}

function onTestMicVolume (volume: number) {
  messageChannels.messagePortToChild?.postMessage({
    key: 'update-audio-volume',
    data: volume
  });
}

function onTestSpeakerVolume (volume: number) {
  messageChannels.messagePortToChild?.postMessage({
    key: 'update-speaker-volume',
    data: volume
  });
}

function onStatistics (statis: TRTCStatistics) {
  basicStore.setStatistics(statis);
}

onMounted(() => {
  deviceManager.on('onDeviceChange', onDeviceChange);
  trtcCloud.on('onTestMicVolume', onTestMicVolume);
  trtcCloud.on('onTestSpeakerVolume', onTestSpeakerVolume);
  trtcCloud.on('onStatistics', onStatistics);
});

onBeforeUnmount(() => {
  deviceManager.off('onDeviceChange', onDeviceChange);
  trtcCloud.off('onTestMicVolume', onTestMicVolume);
  trtcCloud.off('onTestSpeakerVolume', onTestSpeakerVolume);
  trtcCloud.off('onStatistics', onStatistics);

  if (loginRetryTimer) {
    clearTimeout(loginRetryTimer);
    loginRetryTimer = null;
  }
});
// ***************** Device event listener end *****************

// ***************** Media source restore start *****************
onMounted(() => {
  const storedMediaStateStr = window.localStorage.getItem(MEDIA_SOURCE_STORAGE_KEY);
  if (storedMediaStateStr) {
    logger.log(`${logPrefix}restore media state:`, storedMediaStateStr);
    try {
      const storedMediaState: TUIMediaSourcesState = JSON.parse(storedMediaStateStr);
      roomStore.restoreMediaSource(storedMediaState);
    } catch (error) {
      logger.warn(`${logPrefix}invalid store media source state:`, storedMediaStateStr, error);
      window.localStorage.removeItem(MEDIA_SOURCE_STORAGE_KEY);
    }
  }
});
// ***************** Media source restore end *****************
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
    border-bottom-left-radius:1rem;
    background-color: var(--bg-color-operate);
  }

  .tui-live-preview-container {
    flex: 1 1 auto;
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
