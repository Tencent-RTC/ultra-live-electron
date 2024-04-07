import useDeviceManagerPlugin from "../utils/useDeviceManagerPlugin";
import { TUIMediaSourceType } from "../utils/useMediaMixingPlugin";
import { TUIMediaSourceViewModel } from '../store/mediaSources';
import { TUIMediaDevice } from '@tencentcloud/tuiroom-engine-electron';
import useGetRoomEngine from "../utils/useRoomEngine";

const logger = console;
const logPrefix = "[MainWindow Message Handler]";

const roomEngine = useGetRoomEngine()
const deviceManagerPlugin = useDeviceManagerPlugin();
let mediaSourcesStore: any = null;
let roomStore: any = null;

export const messageChannels: {
  childWindowPort: MessagePort | null;
  contextWindowPort: MessagePort | null;
} = {
  childWindowPort: null,
  contextWindowPort: null,
};

(window as any)._messageChannels = messageChannels; // To do: 待删除，方便调试

function addMediaSource(data: Record<string, any>) {
  const mediaSource: TUIMediaSourceViewModel = {
    sourceName: data.name,
    left: 0,
    top: 0,
    mediaSourceInfo: {
      sourceType: data.type,
      sourceId: data.id,
      zOrder: 1,
      rect: {
        left: 0,
        top: 0,
        right: data.width || 640, // To do：bugfix 偶尔会拿不到摄像头支持的采集分辨率
        bottom: data.height || 320, // To do：bugfix 偶尔会拿不到摄像头支持的采集分辨率
      }
    },
  }
  if (data.type === TUIMediaSourceType.kCamera) {
    mediaSource.resolution = {
      width: data.width,
      height: data.height,
    }
    mediaSource.mediaSourceInfo.mirrorType = data.mirrorType;

    if (data.beautyConfig) {
      mediaSource.beautyConfig = data.beautyConfig;
    }
  }

  if (mediaSource) {
    logger.log(`${logPrefix}addMediaSource:`, mediaSource);
    mediaSourcesStore.addMediaSource(mediaSource);
    mediaSourcesStore.selectMediaSource(mediaSource);
  }
}

async function _updateScreenImageMediaSource(data: Record<string, any>) {
  if (data.id !== data.predata?.mediaSourceInfo.sourceId) {
    const newMediaSource: TUIMediaSourceViewModel = {
      sourceName: data.name,
      left: data.predata?.left,
      top: data.predata?.top,
      mediaSourceInfo: {
        sourceType: data.type,
        sourceId: data.id,
        zOrder: data.predata?.mediaSourceInfo.zOrder,
        rect: data.predata?.mediaSourceInfo.rect
      }
    };
    if (data.predata && newMediaSource) {
      logger.log(`${logPrefix}updateMediaSource:`, data.predata, newMediaSource);
      await mediaSourcesStore.replaceMediaSource(data.predata, newMediaSource);
      await mediaSourcesStore.selectMediaSource(newMediaSource);
    } else {
      logger.error(`${logPrefix}updateMediaSource invalid data:`, data.predata, newMediaSource);
    }
  } else {
    logger.warn(`${logPrefix}updateMediaSource with data not changed:`, data);
  }
}

async function _updateCameraMediaSource(data: Record<string, any>) {
  const newMediaSource: TUIMediaSourceViewModel = {
    sourceName: data.name,
    left: data.predata?.left,
    top: data.predata?.top,
    resolution: {
      width: data.width,
      height: data.height
    },
    mediaSourceInfo: {
      sourceType: data.type,
      sourceId: data.id,
      zOrder: data.predata?.mediaSourceInfo.zOrder,
      rect: data.predata?.mediaSourceInfo.rect,
      mirrorType: data.mirrorType
    },
    beautyConfig: data.beautyConfig
  };
  logger.log(`${logPrefix}updateMediaSource:`, data.predata, newMediaSource);


  if (data.id === data.predata?.mediaSourceInfo.sourceId) {
    await mediaSourcesStore.updateMediaSource(newMediaSource);
  } else {
    await mediaSourcesStore.replaceMediaSource(data.predata, newMediaSource);
  }
  await mediaSourcesStore.selectMediaSource(newMediaSource);
}

async function updateMediaSource(data: Record<string, any>) {
  switch (data.type) {
  case TUIMediaSourceType.kScreen:
  case TUIMediaSourceType.kImage:
    await _updateScreenImageMediaSource(data);
    break;
  case TUIMediaSourceType.kCamera:
    await _updateCameraMediaSource(data);
    break;
  default:
    logger.warn(`${logPrefix}updateMediaSource un-supported media type:`, data);
    break;
  }
}

async function handleUserApply(data: Record<string, any>) {
  const { agree } = data;
  const user = JSON.parse(data.user);
  const userInfo = roomStore.remoteUserObj[user.userId];
  if (userInfo) {
    const requestId = userInfo.applyToAnchorRequestId;
    requestId && await roomEngine.instance?.responseRemoteRequest({
      requestId,
      agree,
    });
    userInfo.agree = agree;
  }
  roomStore.removeApplyToAnchorUser(user.userId);
  messageChannels.childWindowPort?.postMessage({
    key: "set-anchor-list",
    data: JSON.stringify(userInfo)
  });
  messageChannels.childWindowPort?.postMessage({
    key: "update-apply-list",
    data: JSON.stringify(userInfo)
  });
}

async function handleMuteAudio(data: Record<string, any>) {
  const { userId } = data;
  await roomEngine.instance?.closeRemoteDeviceByAdmin({
    userId,
    device: TUIMediaDevice.kMicrophone,
  });
}

async function handleCloseCamera(data: Record<string, any>) {
  const { userId } = data;
  await roomEngine.instance?.closeRemoteDeviceByAdmin({
    userId,
    device: TUIMediaDevice.kCamera,
  });
}

async function handleKickSeat(data: Record<string, any>) {
  const { userId } = data;
  roomEngine.instance?.kickUserOffSeatByAdmin({
    seatIndex: -1,
    userId
  });
  messageChannels.childWindowPort?.postMessage({
    key: "update-anchor-list",
    data: userId
  });
}

async function handleKickOut(data: Record<string, any>) {
  const { userId } = data;
  await roomEngine.instance?.kickRemoteUserOutOfRoom({
    userId
  });
  messageChannels.childWindowPort?.postMessage({
    key: "update-anchor-list",
    data: userId
  });
}

function handleCloseVoiceChat(data: Record<string, any>){
  roomStore.setIsShowVoiceChat(false)
}

function handleChildWindowMessage(event: MessageEvent<any>) {
  console.log(`${logPrefix}handleChildWindowMessage:`, event.data);
  const { key, data } = event.data;

  switch (key) {
  case "setCurrentDevice":
    deviceManagerPlugin.setCurrentDevice(data.deviceType, data.deviceId);
    break;
  case "startCameraDeviceTest":
    deviceManagerPlugin.startCameraDeviceTest(data.windowID, data.rect);
    break;
  case "stopCameraDeviceTest":
    deviceManagerPlugin.stopCameraDeviceTest();
    break;
  case "addMediaSource":
    addMediaSource(data);
    break;
  case "updateMediaSource":
    updateMediaSource(data);
    break;
  case "handleUserApply":
    handleUserApply(data);
    break;
  case "muteAudio":
    handleMuteAudio(data);
    break;
  case "closeCamera":
    handleCloseCamera(data);
    break;
  case "cancelWheatPosition":
    handleKickSeat(data);
    break;
  case "kickOut":
    handleKickOut(data);
    break;
  case "closeVoiceChat":
    handleCloseVoiceChat(data);
    break;
  case "startTestSpeaker":
    deviceManagerPlugin.startSpeakerDeviceTest(data);
    break;
  case "stopTestSpeaker":
    deviceManagerPlugin.stopSpeakerDeviceTest();
    break;
  case "startTestMic":
    deviceManagerPlugin.startMicDeviceTest(data.interval, data.playback);
    break;
  case "stopTestMic":
    deviceManagerPlugin.stopMicDeviceTest();
    break;
  default:
    console.warn(`${logPrefix}handleChildWindowMessage: unsupported key: ${key}`);
    break;
  }
}

export function initCommunicationChannels(data: Record<string, any>) {
  mediaSourcesStore = data.mediaSourcesStore;
  roomStore = data.roomStore;
  const childChannel = new MessageChannel();

  const childChannelServer = childChannel.port1
  const childChannelClient = childChannel.port2

  childChannelServer.onmessage = handleChildWindowMessage
  childChannelServer.onmessageerror = (event) => {
    console.log('onMessageFromChildWindowError', event.data)
  }
  childChannelServer.start();

  console.log('port-to-child')
  window.ipcRenderer.postMessage('port-to-child', null, [childChannelClient]);

  messageChannels.childWindowPort = childChannelServer;


  const contextChannel = new MessageChannel();

  const contextChannelServer = contextChannel.port1;
  const contextChannelClient = contextChannel.port2;

  contextChannelServer.onmessage = (event) => {
    console.log('onMessageFromContextWindow', event.data)
  }
  contextChannelServer.onmessageerror = (event) => {
    console.log('onMessageFromContextWindowError', event.data)
  }
  contextChannelServer.start();

  console.log('port-to-context')
  window.ipcRenderer.postMessage('port-to-context', null, [contextChannelClient]);

  messageChannels.contextWindowPort = contextChannelServer;
}
