import { TRTCMediaSourceType, TRTCDeviceType } from 'trtc-electron-sdk';
import { TUIMediaMixingError, TUIMediaSourceViewModel, TUIMusicPlayMode } from '../types';
import { defaultCameraCaptureWidth, defaultCameraCaptureHeight } from '../constants/tuiConstant';
import { useAudioEffectStore } from '../store/main/audioEffect';
import TUIMessageBox from '../common/base/MessageBox';
import useAudioEffectManager from '../utils/useAudioEffectManager';
import useDeviceManager from '../utils/useDeviceManager';
import useMediaMixingManager, { fitMediaSourceToOldRect } from '../utils/useMediaMixingManager';
import trtcCloud from '../utils/trtcCloud';
import { TRTCXmagicFactory, XmagicLicense, } from '../utils/beauty';
import { useI18n } from '../locales/index';
import onMediaMixingError from '../hooks/useMediaMixingErrorHandler';
import logger from '../utils/logger';

const audioEffectStore = useAudioEffectStore();
const deviceManager = useDeviceManager();
const audioEffectManager = useAudioEffectManager();
const mediaMixingManager = useMediaMixingManager();
const {t} = useI18n();
const logPrefix = '[MainWindow Message Handler]';
let mediaSourcesStore: any = null;
let roomStore: any = null;

export const messageChannels: {
  messagePortToChild: MessagePort|null;
  messagePortToCover: MessagePort|null;
} = {
  messagePortToChild: null,
  messagePortToCover: null,
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
        right: data.width || defaultCameraCaptureWidth,
        bottom: data.height || defaultCameraCaptureHeight,
      }
    },
  };
  if (data.type === TRTCMediaSourceType.kCamera) {
    mediaSource.resolution = {width: data.width, height: data.height};
    mediaSource.mediaSourceInfo.mirrorType = data.mirrorType;
    mediaSource.colorSpace = data.colorSpace;
    mediaSource.colorRange = data.colorRange;
    if (data.beautyConfig) {
      mediaSource.beautyConfig = data.beautyConfig;
    }
  } else if (data.type === TRTCMediaSourceType.kScreen) {
    mediaSource.screenType = data.screenType;
  } else if (data.type === TRTCMediaSourceType.kPhoneMirror) {
    mediaSource.mirrorParams = {
      frameRate: data.frameRate,
      bitrateKbps: data.bitrateKbps,
      connectType: data.connectType,
      platformType: data.platformType,
      deviceId: data.deviceId,
      deviceName: data.deviceName,
      placeholderImagePath: data.placeholderImagePath,
    };
    if (data.connectType === 0) {
      window.ipcRenderer.send('start-use-driver-installer', data.platformType);
    }
  }

  if (mediaSource) {
    logger.log(`${logPrefix}addMediaSource:`, mediaSource);
    try {
      await mediaSourcesStore.addMediaSource(mediaSource);
      await mediaSourcesStore.selectMediaSource(mediaSource);
    } catch (error) {
      onMediaMixingError(error as TUIMediaMixingError);
    }
  }
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
        rect: fitMediaSourceToOldRect(
          {
            rect: data.predata?.mediaSourceInfo.rect,
            rotation: data.predata?.mediaSourceInfo.rotation,
          },
          { width: data.width, height: data.height }
        ),
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
      rect: fitMediaSourceToOldRect(
        {
          rect: data.predata?.mediaSourceInfo.rect,
          rotation: data.predata?.mediaSourceInfo.rotation,
        },
        { width: data.width, height: data.height }
      ),
      mirrorType: data.mirrorType,
      rotation: data.predata?.mediaSourceInfo.rotation,
    },
    colorSpace: data.colorSpace,
    colorRange: data.colorRange,
    beautyConfig: data.beautyConfig
  };
  logger.log(`${logPrefix}updateMediaSource newdata:`, JSON.stringify(newMediaSource));

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

async function _updatePhoneMirrorMediaSource(data: Record<string, any>) {
  logger.log(`${logPrefix}updateMediaSource predata:`, JSON.stringify(data));
  const newMediaSource: TUIMediaSourceViewModel = {
    sourceName: data.predata.name,
    aliasName: data.predata.aliasName,
    left: data.predata.left,
    top: data.predata.top,
    muted: false,
    mediaSourceInfo: data.predata.mediaSourceInfo,
    mirrorParams: {
      frameRate: data.frameRate,
      bitrateKbps: data.bitrateKbps,
      connectType: data.connectType,
      platformType: data.platformType,
      deviceId: data.deviceId,
      deviceName: data.deviceName,
      placeholderImagePath: data.placeholderImagePath,
    }
  }
  if (data.connectType === 0) {
    window.ipcRenderer.send('start-use-driver-installer', data.platformType);
  }
  try {
    await mediaSourcesStore.updateMediaSource(newMediaSource);
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
  case TRTCMediaSourceType.kPhoneMirror:
    await _updatePhoneMirrorMediaSource(data);
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
  case 'setCameraTestVideoPluginParameter':
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
  case 'kickOffSeat':
    handleKickSeat(data);
    break;
  case 'kickOutRoom':
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
      audioEffectStore.resumePlayMusic(data);
    }
    break;
  case 'pausePlayMusic':
    if (data !== -1) {
      audioEffectStore.pausePlayMusic(data);
    }
    break;
  case 'stopPlayMusic':
    if (data !== -1) {
      audioEffectStore.stopPlayMusic(data);
    }
    break;
  case 'setAllMusicVolume':
    if (data >= 0) {
      audioEffectStore.setAllMusicVolume(data);
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
    audioEffectStore.setMusicPublishVolume(data);
    break;
  case 'seekMusicToPosInTime':
    audioEffectStore.seekMusicToPosInTime(data);
    break;
  case 'singleLoopPlay':
    singleLoopPlay(data);
    break;
  case 'sequentialPlay':
    sequentialPlay(data);
    break;
  case 'updateAudioEffectData':
    if (data) {
      audioEffectStore.updateAudioEffectData(data);
    }
    break;
  case 'updatePlayingMusicId':
    if (data) {
      audioEffectStore.updatePlayingMusicId(data);
      if (messageChannels.messagePortToChild) {
        messageChannels.messagePortToChild.postMessage({
          key:'update-playing-music-id',
          data
        });
      } else {
        logger.error(`${logPrefix}updatePlayingMusicId failed. No message port.`);
      }
    }
    break;
  case 'setVoiceReverbType':
    if (data>=0) {
      audioEffectStore.setVoiceReverbType(data);
    }
    break;
  case 'setVoiceChangerType':
    if (data>=0) {
      audioEffectStore.setVoiceChangerType(data);
    }
    break;
  case 'setStreamLayoutMode':
    roomStore.setStreamLayoutMode(data.layoutMode);
    break;
  case 'setStreamLayoutAutoAdjust':
    roomStore.setStreamLayoutAutoAdjust(data.isAutoAdjusting);
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
  audioEffectStore.startPlayMusic(id);
}

async function sequentialPlay(playingMusicIndex: number) {
  const id = audioEffectStore.audioEffect.musicDataList[playingMusicIndex].id;
  if (id !== -1) {
    audioEffectStore.startPlayMusic(id);
  }
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

  if (!messageChannels.messagePortToCover) {
    const messageChannel = new MessageChannel();

    messageChannels.messagePortToCover = messageChannel.port1;
    const messagePortToMain = messageChannel.port2;
    messageChannels.messagePortToCover.onmessage = handleChildWindowMessage;
    messageChannels.messagePortToCover.onmessageerror =  (event) => {
      logger.log(`${logPrefix}onmessageerror from cover window:`, event.data);
    };
    messageChannels.messagePortToCover.start();
    window.ipcRenderer.postMessage('port-to-cover', null, [messagePortToMain]);
  } else {
    logger.warn(`${logPrefix}initCommunicationChannels MessageChannel already existed.`);
  }
}
