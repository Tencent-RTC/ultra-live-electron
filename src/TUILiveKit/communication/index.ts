import { TRTCMediaSourceType, TRTCVideoRotation, TRTCAudioMusicParam, TRTCDeviceType } from 'trtc-electron-sdk';
import { TUIMediaSourceViewModel, TUIMusicPlayMode } from '../types';
import { useAudioEffectStore } from '../store/audioEffect';
import TUIMessageBox from '../common/base/MessageBox';
import useAudioEffectManager from '../utils/useAudioEffectManager';
import useDeviceManager from "../utils/useDeviceManager";
import useMediaMixingManager from '../utils/useMediaMixingManager';
import trtcCloud from '../utils/trtcCloud';
import { TRTCXmagicFactory, XmagicLicense, } from "../utils/beauty";
import {useI18n} from '../locales/index';

const audioEffectStore = useAudioEffectStore();
const deviceManager = useDeviceManager();
const audioEffectManager = useAudioEffectManager();
const mediaMixingManager = useMediaMixingManager();
const {t} = useI18n();
const logger = console;
const logPrefix = '[MainWindow Message Handler]';
let mediaSourcesStore: any = null;
let roomStore: any = null;


export const messageChannels: {
  messagePortToChild: MessagePort|null;
} = {
  messagePortToChild: null,
};

export async function addMediaSource(data: Record<string, any>) {
  const mediaSource: TUIMediaSourceViewModel = {
    sourceName: data.name,
    aliasName: data.name,
    left: 0,
    top: 0,
    muted: false,
    mediaSourceInfo: {
      sourceType: data.type,
      sourceId: data.id,
      zOrder: 1,
      rect: {
        left: 0,
        top: 0,
        right: data.width ||
            640,
        bottom: data.height ||
            320,
      }
    },
  };
  if (data.type === TRTCMediaSourceType.kCamera) {
    mediaSource.resolution = {width: data.width, height: data.height};
    mediaSource.mediaSourceInfo.mirrorType = data.mirrorType;
    if (data.beautyConfig) {
      mediaSource.beautyConfig = data.beautyConfig;
    }
  } else if (data.type === TRTCMediaSourceType.kScreen) {
    mediaSource.screenType = data.screenType;
  }

  if (mediaSource) {
    logger.log(`${logPrefix}addMediaSource:`, mediaSource);
    try {
      await mediaSourcesStore.addMediaSource(mediaSource);
      await mediaSourcesStore.selectMediaSource(mediaSource);
    } catch (error) {
      TUIMessageBox({
        title: t('Note'),
        message: (error as any).message,
        confirmButtonText: t('Sure'),
      });
    }
  }
}


function checkRectAndResolution(
  newSize: {width: number, height: number},
  rect: {left: number, top: number, right: number, bottom: number},
  rotation: TRTCVideoRotation) {
  let width = rect.right - rect.left;
  let height = rect.bottom - rect.top;
  if (rotation === TRTCVideoRotation.TRTCVideoRotation90 ||
      rotation === TRTCVideoRotation.TRTCVideoRotation270) {
    const temp = width;
    width = height;
    height = temp;
  }
  const shrinkRate = width / newSize.width > height / newSize.height ?
    height / newSize.height :
    width / newSize.width;

  if (rotation === TRTCVideoRotation.TRTCVideoRotation90 ||
      rotation === TRTCVideoRotation.TRTCVideoRotation270) {
    rect.right = rect.left + Math.round(newSize.height * shrinkRate);
    rect.bottom = rect.top + Math.round(newSize.width * shrinkRate);
  } else {
    rect.right = rect.left + Math.round(newSize.width * shrinkRate);
    rect.bottom = rect.top + Math.round(newSize.height * shrinkRate);
  }
  return rect;
}

async function _updateScreenImageMediaSource(data: Record<string, any>) {
  logger.log(
    `${logPrefix}updateMediaSource predata:`, JSON.stringify(data.predata));
  if (data.id !== data.predata?.mediaSourceInfo.sourceId) {
    const newMediaSource: TUIMediaSourceViewModel = {
      sourceName: data.name,
      aliasName: data.predata.aliasName,
      left: data.predata?.left,
      top: data.predata?.top,
      muted: false,
      mediaSourceInfo: {
        sourceType: data.type,
        sourceId: data.id,
        zOrder: data.predata?.mediaSourceInfo.zOrder,
        rect: checkRectAndResolution({ width: data.width, height: data.height }, data.predata?.mediaSourceInfo.rect, data.predata?.mediaSourceInfo.rotation),
        rotation: data.predata?.mediaSourceInfo.rotation,
      }
    };

    if (data.type === TRTCMediaSourceType.kScreen) {
      newMediaSource.screenType = data.screenType;
    }

    if (data.predata && newMediaSource) {
      logger.log(
        `${logPrefix}updateMediaSource newdata:`,
        JSON.stringify(newMediaSource));
      try {
        await mediaSourcesStore.replaceMediaSource(
          data.predata, newMediaSource);
        await mediaSourcesStore.selectMediaSource(newMediaSource);
      } catch (error) {
        TUIMessageBox({
          title: t('Note'),
          message: (error as any).message,
          confirmButtonText: t('Sure'),
        });
      }
    } else {
      logger.error(
        `${logPrefix}updateMediaSource invalid data:`, data.predata,
        newMediaSource);
    }
  } else {
    logger.warn(`${logPrefix}updateMediaSource with data not changed:`, data);
  }
}

async function _updateCameraMediaSource(data: Record<string, any>) {
  logger.log(
    `${logPrefix}updateMediaSource predata:`, JSON.stringify(data.predata));
  const newMediaSource: TUIMediaSourceViewModel = {
    sourceName: data.name,
    aliasName: data.predata.aliasName,
    left: data.predata?.left,
    top: data.predata?.top,
    muted: false,
    resolution: {
      width: data.width,
      height: data.height
    },
    mediaSourceInfo: {
      sourceType: data.type,
      sourceId: data.id,
      zOrder: data.predata?.mediaSourceInfo.zOrder,
      rect: checkRectAndResolution({ width: data.width, height: data.height }, data.predata?.mediaSourceInfo.rect, data.predata?.mediaSourceInfo.rotation),
      mirrorType: data.mirrorType,
      rotation: data.predata?.mediaSourceInfo.rotation,
    },
    beautyConfig: data.beautyConfig
  };
  logger.log(
    `${logPrefix}updateMediaSource newdata:`, JSON.stringify(newMediaSource));


  try {
    if (data.id === data.predata?.mediaSourceInfo.sourceId) {
      await mediaSourcesStore.updateMediaSource(newMediaSource);
    } else {
      await mediaSourcesStore.replaceMediaSource(data.predata, newMediaSource);
    }
    await mediaSourcesStore.selectMediaSource(newMediaSource);
  } catch (error) {
    TUIMessageBox({
      title: t('Note'),
      message: (error as any).message,
      confirmButtonText: t('Sure'),
    });
  }
}

export async function updateMediaSource(data: Record<string, any>) {
  switch (data.type) {
  case TRTCMediaSourceType.kScreen:
  case TRTCMediaSourceType.kImage:
    await _updateScreenImageMediaSource(data);
    break;
  case TRTCMediaSourceType.kCamera:
    await _updateCameraMediaSource(data);
    break;
  default:
    logger.warn(
      `${logPrefix}updateMediaSource un-supported media type:`, data);
    break;
  }
}

async function handleUserApply(data: Record<string, any>) {
  const {agree} = data;
  const user = JSON.parse(data.user);
  if (user.userId) {
    roomStore.handleApplyToAnchorUser(user.userId, agree);
  }
}

async function handleKickSeat(data: Record<string, any>) {
  const {userId} = data;
  roomStore.kickUserOffSeat(userId);
}

async function handleKickOut(data: Record<string, any>) {
  const {userId} = data;
  roomStore.kickUserOutOfRoom(userId);
}

async function handleChildWindowMessage(event: MessageEvent<any>) {
  logger.log(`${logPrefix}handleChildWindowMessage:`, event.data);
  const {key, data} = event.data;

  switch (key) {
  case 'setCurrentDevice':
    switch (data.deviceType) {
    case TRTCDeviceType.TRTCDeviceTypeCamera:
      deviceManager.setCurrentCameraDevice(data.deviceId);
      break;
    case TRTCDeviceType.TRTCDeviceTypeMic:
      deviceManager.setCurrentMicDevice(data.deviceId);
      break;
    case TRTCDeviceType.TRTCDeviceTypeSpeaker:
      deviceManager.setCurrentSpeakerDevice(data.deviceId);
      break;
    default:
      break;
    }
    break;
  case 'startCameraDeviceTest':
    mediaMixingManager.startCameraDeviceTest(data.windowID, data.rect);
    if (data.log) {
      trtcCloud?.log(data.log);
    }
    break;
  case 'setCameraTestRenderMirror':
    mediaMixingManager.setCameraTestRenderMirror(data.mirror);
    break;
  case 'setCameraTestResolution':
    mediaMixingManager.setCameraTestResolution(data.width, data.height);
    break;
  case 'setCameraTestDeviceId':
    mediaMixingManager.setCameraTestDeviceId(data.cameraId);
    break;
  case 'stopCameraDeviceTest':
    mediaMixingManager.stopCameraDeviceTest();
    break;
  case 'setCameraTestVideoPluginPath':
    if (data) {
      const beautyLibPath = await TRTCXmagicFactory.getEffectPluginLibPath();
      const beautyInitParam = await TRTCXmagicFactory.buildEffectInitParam(XmagicLicense);
      mediaMixingManager.setCameraTestVideoPluginPath(beautyLibPath);
      mediaMixingManager.setCameraTestVideoPluginParameter(JSON.stringify(beautyInitParam));
    }else{
      mediaMixingManager.setCameraTestVideoPluginPath('');
    }
    break;
  case "setCameraTestVideoPluginParameter":
    mediaMixingManager.setCameraTestVideoPluginParameter(JSON.stringify({
      beautySetting: Array.isArray(data) ? data : [data],
    }));
    break;
  case 'addMediaSource':
    addMediaSource(data);
    break;
  case 'updateMediaSource':
    updateMediaSource(data);
    break;
  case 'handleUserApply':
    handleUserApply(data);
    break;
  case 'cancelWheatPosition':
    handleKickSeat(data);
    break;
  case 'kickOut':
    handleKickOut(data);
    break;
  case 'startTestSpeaker':
    deviceManager.startSpeakerDeviceTest(data);
    break;
  case 'stopTestSpeaker':
    deviceManager.stopSpeakerDeviceTest();
    break;
  case 'startTestMic':
    deviceManager.startMicDeviceTest(data.interval, data.playback);
    break;
  case 'stopTestMic':
    deviceManager.stopMicDeviceTest();
    break;
  case 'resumePlayMusic':
    if (data !== -1) {
      audioEffectManager.resumePlayMusic(data);
    }
    break;
  case 'pausePlayMusic':
    if (data !== -1) {
      audioEffectManager.pausePlayMusic(data);
    }
    break;
  case 'stopPlayMusic':
    if (data !== -1) {
      audioEffectManager.stopPlayMusic(data);
    }
    break;
  case 'setAllMusicVolume':
    if (data >= 0) {
      audioEffectManager.setAllMusicVolume(data);
    }
    break;
  case 'setCurrentDeviceVolume':
    if (data) {
      switch(data.type) {
      case TRTCDeviceType.TRTCDeviceTypeMic:
        deviceManager.setCurrentMicDeviceVolume(data.volume);
        break;
      case TRTCDeviceType.TRTCDeviceTypeSpeaker:
        deviceManager.setCurrentSpeakerVolume(data.volume);
        break;
      default:
        break;
      }
    }
    break;
  case 'setMusicPublishVolume':
    if (data) {
      data.id ? audioEffectManager.setMusicPublishVolume(data.id, data.volume) : null;
    }
    break;
  case 'seekMusicToPosInTime':
    if (data) {
      const {id, startTimeMS} = data;
      id && audioEffectManager.seekMusicToPosInTime(id, startTimeMS);
    }
    break;
  case 'singleLoopPlay':
    singleLoopPlay(data);
    break;
  case 'sequentialPlay':
    sequentialPlay(data);
    break;
  case 'updateMusicData':
    if (data) {
      audioEffectStore.updateMusicData(data);
    }
    break;
  case 'updatePlayingMusicId':
    if (data) {
      audioEffectStore.updatePlayingMusicId(data);
      if (messageChannels.messagePortToChild) {
        messageChannels.messagePortToChild.postMessage({
          key:"update-playing-music-id",
          data
        });
      } else {
        logger.error(`${logPrefix}updatePlayingMusicId failed. No message port.`);
      }
    }
    break;
  case 'setVoiceReverbType':
    if (data>=0) {
      audioEffectManager.setVoiceReverbType(data);
    }
    break;
  case 'setVoiceChangerType':
    if (data>=0) {
      audioEffectManager.setVoiceChangerType(data);
    }
    break;
  default:
    logger.warn(
      `${logPrefix}handleChildWindowMessage: unsupported key: ${key}`);
    break;
  }
}

audioEffectManager.setMusicObserver({
  onStart: () => {
    return;
  },
  onPlayProgress: () => {
    return;
  },
  onComplete: (id: number) => {
    if (messageChannels.messagePortToChild) {
      if (audioEffectStore.audioEffect.currentPlayMode === TUIMusicPlayMode.SingleLoopPlay) {
        messageChannels.messagePortToChild.postMessage({key: 'update-playing-music-id', data:id});
      } else if (audioEffectStore.audioEffect.currentPlayMode === TUIMusicPlayMode.SequentialPlay) {
        let nextPlayingIndex = audioEffectStore.getMusicIndex(id) + 1;
        if (nextPlayingIndex === audioEffectStore.getMusicDataLength()) {
          nextPlayingIndex = 0;
        }
        const nextPlayingId = audioEffectStore.audioEffect.musicDataList[nextPlayingIndex].id;
        messageChannels.messagePortToChild.postMessage({key: 'update-playing-music-id', data:nextPlayingId});
      }
    } else {
      logger.error(`${logPrefix}musicObserver.onComplete failed. No message port.`);
    }
  }
});

async function singleLoopPlay(id:number) {
  if(id === -1) return;
  const startTimeMS = await audioEffectManager.getMusicCurrentPosInMS(id);
  const path = audioEffectStore.getMusicPath(id);
  const playParams: TRTCAudioMusicParam = {
    id,
    path,
    publish: true,
    loopCount: 0,
    isShortFile: false,
    startTimeMS: startTimeMS,
    endTimeMS: 0,
  };
  audioEffectManager.startPlayMusic(playParams);
}

async function sequentialPlay(playingMusicIndex: number) {
  const id = audioEffectStore.audioEffect.musicDataList[playingMusicIndex].id;
  const path = audioEffectStore.audioEffect.musicDataList[playingMusicIndex].path;
  const startTimeMS = await audioEffectManager.getMusicCurrentPosInMS(id);
  const playParams: TRTCAudioMusicParam = {
    id,
    path,
    publish: true,
    loopCount: 0,
    isShortFile: false,
    startTimeMS: startTimeMS === -1 ? 0 : startTimeMS,
    endTimeMS: 0,
  };
  audioEffectManager.startPlayMusic(playParams);
}

export function initCommunicationChannels(data: Record<string, any>) {
  logger.log(`${logPrefix}initCommunicationChannels`);
  mediaSourcesStore = data.mediaSourcesStore;
  roomStore = data.roomStore;

  if (!messageChannels.messagePortToChild) {
    const messageChannel = new MessageChannel();

    messageChannels.messagePortToChild = messageChannel.port1;
    const messagePortToMain = messageChannel.port2;
    messageChannels.messagePortToChild.onmessage = handleChildWindowMessage;
    messageChannels.messagePortToChild.onmessageerror = (event) => {
      logger.log(`${logPrefix}onmessageerror from child window:`, event.data);
    };
    messageChannels.messagePortToChild.start();
    window.ipcRenderer.postMessage('port-to-child', null, [messagePortToMain]);
  } else {
    logger.warn(`${logPrefix}initCommunicationChannels MessageChannel already existed.`);
  }
}
