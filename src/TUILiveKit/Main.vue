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
  TUIRoomEvents, TUIRoomType, TUIRoomInfo, TUIRequest, TUIRequestAction, TUISeatMode, TUISeatInfo, TUIUserInfo
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
import { initCommunicationChannels, messageChannels } from "./communication";
import { useBasicStore } from "./store/main/basic";
import { useRoomStore } from "./store/main/room";
import { useChatStore } from './store/main/chat'
import { useMediaSourcesStore } from './store/main/mediaSources';
import useDeviceManager from './utils/useDeviceManager';
import useMediaMixingManager from './utils/useMediaMixingManager';
import useVideoEffectManager from './utils/useVideoEffectManager';
import useRoomEngine from "./utils/useRoomEngine";
import { useI18n } from './locales/index';
import useMessageHook from './components/LiveMessage/useMessageHook';
import useErrorHandler from './hooks/useErrorHandler';

const logger = console;
const logPrefix = '[LiveKit]';

const { t } = useI18n();
const roomEngine = useRoomEngine();
const videoEffectManager = useVideoEffectManager();

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
  default:
    logger.error(
      'onEditMediaSource: sourceType not supported',
      mediaSource.mediaSourceInfo.sourceType
    );
  }
  if (!command) {
    return;
  }
  window.ipcRenderer.send("open-child", {
    command,
    data: JSON.parse(JSON.stringify(mediaSource))
  });
};

onMounted(() => {
  // init MessageChannel for communication between Main window and child window
  initCommunicationChannels({
    mediaSourcesStore,
    roomStore
  });

  window.addEventListener("beforeunload", onBeforeUnload);
});

onUnmounted(() => {
  videoEffectManager.clear();
  window.removeEventListener("beforeunload", onBeforeUnload);
});

function resetRoomStore() {
  basicStore.reset();
  roomStore.reset();
  chatStore.reset();
}

function resetMediaStore() {
  mediaSourcesStore.reset();
}

function onLogout () {
  logger.log(`${logPrefix}onLogout`);
  mediaMixingManager.setDisplayParams(0, null);
  resetRoomStore();
  resetMediaStore();
  emit('on-logout');
}

function onBeforeUnload () {
  logger.log(`${logPrefix}onBeforeUnload`);
  resetMediaStore();
  if (basicStore.isLiving) {
    stopLiving();
  }
}

// ***************** LiveKit interface start *****************
function _generateRoomId () {
  return Math.floor(Math.random() * 1000 * 1000);
}

async function startLiving () {
  logger.log(`${logPrefix}startLiving`);
  try {
    if (basicStore.userId) {
      const roomId = _generateRoomId().toString();
      await createRoom({
        roomId,
        roomName: basicStore.roomName,
        roomMode: 'SpeakAfterTakingSeat'
      });
      basicStore.setRoomId(roomId);
      basicStore.setIsLiving(true);
      useMessageHook();
      emit('on-start-living');
    } else {
      logger.error(`${logPrefix}startLiving failed due to no valid userId`);
      TUIMessageBox({
        title: t("Note"),
        message: t("No user ID"),
        confirmButtonText: t("Sure"),
      });
    }
  } catch (error) {
    onError(error);
  }
}


async function stopLiving () {
  logger.log(`${logPrefix}stopLiving`);
  try {
    await dismissRoom();
    basicStore.setIsLiving(false);
    basicStore.setRoomId("");
    resetRoomStore();
    messageChannels.childWindowPort?.postMessage({
      key: 'reset',
      data: {}
    });
    emit("on-stop-living");
  } catch (error) {
    logger.error(`${logPrefix}stopLiving error:`, error);
  }
}

type DeviceParams = {
  isOpenCamera: boolean
  isOpenMicrophone: boolean
  defaultCameraId: string
  defaultMicrophoneId: string
  defaultSpeakerId: string
}

type RoomInitData = {
  sdkAppId: number
  userId: string
  userSig: string
  userName: string
  avatarUrl: string
}

async function init (options: RoomInitData) {
  logger.log(`${logPrefix}init:`, options);
  basicStore.setBasicInfo(options);
  roomStore.setLocalUser(options);
  const { sdkAppId, userId, userSig, userName, avatarUrl } = options;
  await TUIRoomEngine.login({ sdkAppId, userId, userSig });
  await TUIRoomEngine.setSelfInfo({ userName, avatarUrl });
}

async function doEnterRoom (roomId: string) {
  trtcCloud.setDefaultStreamRecvMode(true, false);
  // trtcCloud.enableSmallVideoStream(true, smallParam);// To do
  trtcCloud.startSystemAudioLoopback();
  const roomInfo = (await roomEngine.instance?.enterRoom({
    roomId,
    roomType: TUIRoomType.kLive
  })) as TUIRoomInfo;
  roomEngine.instance?.muteLocalAudio();
  if (!roomInfo.isSeatEnabled) {
    roomEngine.instance?.openLocalMicrophone();
    basicStore.setIsOpenMic(true);
  }
  return roomInfo;
}


async function createRoom (options: {
  roomId: string
  roomName: string
  roomMode: 'SpeakAfterTakingSeat'
  deviceParam?: DeviceParams
}) {
  const { roomId, roomName, roomMode, deviceParam } = options;
  try {
    if (!roomEngine.instance) {
      return;
    }
    basicStore.setRoomId(roomId);
    logger.debug(`${logPrefix}createRoom:`, roomId, roomMode, deviceParam);
    const roomParams = {
      roomId,
      roomName,
      roomType: TUIRoomType.kLive,
      isSeatEnabled: true,
      seatMode: TUISeatMode.kApplyToTake,
      maxSeatCount: 9
    };
    await roomEngine.instance?.createRoom(roomParams);
    emit('on-create-room', { code: 0, message: 'create room success' });
    await enterRoom(options);
  } catch (error) {
    logger.error(`${logPrefix}createRoom error:`, error);
    basicStore.reset();
    throw error;
  }
}

async function enterRoom (options: {
  roomId: string
  roomParam?: DeviceParams
}) {
  const { roomId, roomParam } = options;
  try {
    if (!roomEngine.instance) {
      return;
    }
    basicStore.setRoomId(roomId);
    logger.debug(`${logPrefix}enterRoom:`, roomId, roomParam);
    const roomInfo = await doEnterRoom(roomId);
    roomStore.setRoomInfo(roomInfo);

    const loginUserInfo = await TUIRoomEngine.getSelfInfo();
    roomStore.setLocalUser(loginUserInfo);
    // await this.getUserList();
    if (roomInfo.isSeatEnabled) {
      // await this.getSeatList();
      if (roomStore.isMaster) {
        await roomEngine.instance?.takeSeat({ seatIndex: -1, timeout: 0 });
        roomEngine.instance?.unmuteLocalAudio();
        roomEngine.instance?.openLocalMicrophone();
        basicStore.setIsOpenMic(true);
      }
    }
    /**
     * setRoomParam must come after setRoomInfo,because roomInfo contains information
     * about whether or not to turn on the no-mac ban.
     **/
    // roomStore.setRoomParam(roomParam);
    emit('on-enter-room', { code: 0, message: 'enter room success' });
  } catch (error) {
    logger.error(`${logPrefix}enterRoom error:`, error);
    basicStore.reset();
    throw error;
  }
}

async function dismissRoom () {
  try {
    logger.log(`${logPrefix}dismissRoom: enter`);
    await closeMediaBeforeLeave();
    await roomEngine.instance?.destroyRoom();
    trtcCloud.stopSystemAudioLoopback();
    emit('on-destroy-room');
  } catch (error) {
    logger.error(`${logPrefix}dismissRoom error:`, error);
  }
}

async function leaveRoom () {
  try {
    await closeMediaBeforeLeave();
    const response = await roomEngine.instance?.exitRoom();
    trtcCloud.stopSystemAudioLoopback();
    emit('on-exit-room');
    logger.log(`${logPrefix}leaveRoom:`, response);
  } catch (error) {
    logger.error(`${logPrefix}leaveRoom error:`, error);
  }
}

async function closeMediaBeforeLeave () {
  // To do: to be implemented
  // if (localUser.value.hasAudioStream) {
  //   await roomEngine.instance?.closeLocalMicrophone();
  // }
  // if (localUser.value.hasVideoStream) {
  //   // await roomEngine.instance?.closeLocalCamera();
  //   await mediaMixingManager.stopPublish();
  // }
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

TUIRoomEngine.once("ready", () => {
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
  messageChannels.childWindowPort?.postMessage({
    key: 'on-device-changed',
    data: {
      deviceId,
      type,
      state
    }
  });
}

function onTestMicVolume (volume: number) {
  messageChannels.childWindowPort?.postMessage({
    key: 'update-audio-volume',
    data: volume
  });
}

function onTestSpeakerVolume (volume: number) {
  messageChannels.childWindowPort?.postMessage({
    key: 'update-speaker-volume',
    data: volume
  });
}

function onStatistics (statis: TRTCStatistics) {
  basicStore.setStatistics(statis);
}

onMounted(() => {
  deviceManager.on("onDeviceChange", onDeviceChange);
  trtcCloud.on("onTestMicVolume", onTestMicVolume);
  trtcCloud.on("onTestSpeakerVolume", onTestSpeakerVolume);
  trtcCloud.on("onStatistics", onStatistics);
});

onBeforeUnmount(() => {
  deviceManager.off("onDeviceChange", onDeviceChange);
  trtcCloud.off("onTestMicVolume", onTestMicVolume);
  trtcCloud.off("onTestSpeakerVolume", onTestSpeakerVolume);
  trtcCloud.off("onStatistics", onStatistics);
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
