import { onMounted, onBeforeUnmount } from 'vue';
import { storeToRefs } from 'pinia';
import { TRTCMediaMixingEvent, TRTCMediaSource, TRTCPhoneMirrorParam } from 'trtc-electron-sdk';
import { useMediaSourcesStore } from '../store/main/mediaSources';
import useMediaMixingManager, { fitMediaSourceToNewSize } from '../utils/useMediaMixingManager';
import { TUIMediaSourceViewModel } from '../types';
import { messageChannels } from '../communication'
import logger from '../utils/logger';

const logPrefix = '[useMediaEventHander]';

const mediaSourcesStore = useMediaSourcesStore();
const { mediaList } = storeToRefs(mediaSourcesStore);

const mediaMixingManager = useMediaMixingManager();

type PhoneDeviceInfo =  {
  device: TRTCPhoneMirrorParam;
  state: number;
}

const phoneMirrorDeviceList: Array<PhoneDeviceInfo> = [];

function onMediaSourceSizeChanged(mediaInfo: TRTCMediaSource, size: {width: number; height: number}) {
  const target = mediaList.value.filter(item => item.mediaSourceInfo.sourceType === mediaInfo.sourceType && item.mediaSourceInfo.sourceId === mediaInfo.sourceId);
  if (target.length) {
    const mediaSourceInfo = (target[0] as TUIMediaSourceViewModel).mediaSourceInfo;
    mediaSourcesStore.updateMediaSource({
      ...target[0],
      mediaSourceInfo: {
        ...mediaSourceInfo,
        rect: fitMediaSourceToNewSize({ rect: mediaSourceInfo.rect, rotation: mediaSourceInfo.rotation }, size)
      }
    })
  } else {
    logger.warn(`${logPrefix}onMediaSourceSizeChanged media not exited:`, mediaInfo, size);
  }
}

function onSourcePlugged(phoneMirror: TRTCPhoneMirrorParam, detail: string) {
  logger.log(`${logPrefix}onSourcePlugged:`, phoneMirror, detail);
  const filted = phoneMirrorDeviceList.filter(item => item.device.deviceId === phoneMirror.deviceId);
  if (filted.length) {
    filted[0].state = 0;
  } else {
    phoneMirrorDeviceList.push({
      device: phoneMirror,
      state: 0,
    });
  }
  sendPhoneDeviceToChildWindow();
}

function onSourceConnected(phoneMirror: TRTCPhoneMirrorParam, detail: string) {
  logger.log(`${logPrefix}onSourceConnected:`, phoneMirror, detail);
  const length = phoneMirrorDeviceList.length;
  for (let i = 0; i < length; i++) {
    if (phoneMirrorDeviceList[i].device.deviceId === phoneMirror.deviceId) {
      phoneMirrorDeviceList[i].state = 1;
      sendPhoneDeviceToChildWindow();
      break;
    }
  }
}

function onSourceDisconnected(phoneMirror: TRTCPhoneMirrorParam, detail: string) {
  logger.log(`${logPrefix}onSourceDisconnected:`, phoneMirror, detail);
  const length = phoneMirrorDeviceList.length;
  for (let i = 0; i < length; i++) {
    if (phoneMirrorDeviceList[i].device.deviceId === phoneMirror.deviceId) {
      phoneMirrorDeviceList[i].state = 2;
      sendPhoneDeviceToChildWindow();
      break;
    }
  }
}

function onSourceUnplugged(phoneMirror: TRTCPhoneMirrorParam, detail: string) {
  logger.log(`${logPrefix}onSourceUnplugged:`, phoneMirror, detail);
  const length = phoneMirrorDeviceList.length;
  for (let i = 0; i < length; i++) {
    if (phoneMirrorDeviceList[i].device.deviceId === phoneMirror.deviceId) {
      phoneMirrorDeviceList[i].state = 3;
      sendPhoneDeviceToChildWindow();
      break;
    }
  }
}

function sendPhoneDeviceToChildWindow() {
  if (messageChannels.messagePortToChild) {
    const data = phoneMirrorDeviceList.filter(item => item.state !== 3).map(item => item.device);
    messageChannels.messagePortToChild?.postMessage({
      key: 'update-phone-list',
      data: data,
    });
  } else {
    logger.error(`${logPrefix}sendPhoneDeviceToChildWindow error: MessagePort not inited`);
  }
}

function useMediaEventhander() {
  onMounted(() => {
    mediaMixingManager.on(TRTCMediaMixingEvent.onMediaSourceSizeChanged, onMediaSourceSizeChanged);
    mediaMixingManager.on(TRTCMediaMixingEvent.onSourcePlugged, onSourcePlugged);
    mediaMixingManager.on(TRTCMediaMixingEvent.onSourceConnected, onSourceConnected);
    mediaMixingManager.on(TRTCMediaMixingEvent.onSourceDisconnected, onSourceDisconnected);
    mediaMixingManager.on(TRTCMediaMixingEvent.onSourceUnplugged, onSourceUnplugged);
  });

  onBeforeUnmount(() => {
    mediaMixingManager.off(TRTCMediaMixingEvent.onMediaSourceSizeChanged, onMediaSourceSizeChanged);
    mediaMixingManager.off(TRTCMediaMixingEvent.onSourcePlugged, onSourcePlugged);
    mediaMixingManager.off(TRTCMediaMixingEvent.onSourceConnected, onSourceConnected);
    mediaMixingManager.off(TRTCMediaMixingEvent.onSourceDisconnected, onSourceDisconnected);
    mediaMixingManager.off(TRTCMediaMixingEvent.onSourceUnplugged, onSourceUnplugged);
  });
}

export default useMediaEventhander;
