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
} from '@tencentcloud/tuiroom-engine-electron';
import { TUIMediaSourceViewModel } from './types';
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
import { MEDIA_SOURCE_STORAGE_KEY } from './constants/tuiConstant';
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
  if (basicStore.isLiving) {
    await stopLiving();
  }
  mediaMixingManager.bindPreviewArea(0, null);
  basicStore.reset();
  roomStore.reset();
  chatStore.reset();
  audioEffectStore.reset();
  mediaSourcesStore.clear();
  emit('on-logout');
}

const onBeforeUnload = () => {
  logger.log(`${logPrefix}onBeforeUnload`);
  if (basicStore.isLiving) {
    stopLiving();
  }
  audioEffectStore.reset();
  mediaSourcesStore.clear();
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
let loginError:any;

async function retryInit(options: RoomInitData) {
  logger.log(`${logPrefix}retryInit:`, options);
  if (loginRetryTimer) {
    loginRetryTimer = null;
  }

  loginRetryCount++;
  if (loginRetryCount > MAX_LOGIN_RETRY_COUNT) {
    TUIMessageBox({
      title: t('Note'),
      message: loginError?.message || t('Login failed, please try again.'),
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
    await TUIRoomEngine.login({ sdkAppId, userId, userSig });
  } catch (error) {
    logger.error(`${logPrefix}retryInit login() error:`, error);
    loginError = error;
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
    userId && roomStore.addApplyToAnchorUser({ userId, requestId, timestamp });
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

TUIRoomEngine.once('ready', () => {
  roomEngine.instance?.on(TUIRoomEvents.onError, onError);
  roomEngine.instance?.on(
    TUIRoomEvents.onRemoteUserEnterRoom,
    onRemoteUserEnterRoom
  );
  roomEngine.instance?.on(
    TUIRoomEvents.onRemoteUserLeaveRoom,
    onRemoteUserLeaveRoom
  );
  roomEngine.instance?.on(TUIRoomEvents.onRequestReceived, onRequestReceived);
  roomEngine.instance?.on(TUIRoomEvents.onRequestCancelled, onRequestCancelled);
  roomEngine.instance?.on(TUIRoomEvents.onSeatListChanged, onSeatListChanged);
});

onUnmounted(() => {
  roomEngine.instance?.off(TUIRoomEvents.onError, onError);
  roomEngine.instance?.off(
    TUIRoomEvents.onRemoteUserEnterRoom,
    onRemoteUserEnterRoom
  );
  roomEngine.instance?.off(
    TUIRoomEvents.onRemoteUserLeaveRoom,
    onRemoteUserLeaveRoom
  );
  roomEngine.instance?.off(TUIRoomEvents.onRequestReceived, onRequestReceived);
  roomEngine.instance?.off(TUIRoomEvents.onRequestCancelled, onRequestCancelled);
  roomEngine.instance?.off(TUIRoomEvents.onSeatListChanged, onSeatListChanged);
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
