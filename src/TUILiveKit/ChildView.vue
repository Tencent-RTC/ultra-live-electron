<template>
  <div class="tui-live-kit-child dark-theme">
    <live-camera-source
      v-if="currentViewName === 'camera'"
      :data="dataInEdit"
    ></live-camera-source>
    <live-screen-share-source
      v-if="currentViewName === 'screen'"
      :data="dataInEdit"
    ></live-screen-share-source>
    <live-phone-mirror
      v-if="currentViewName === 'phone-mirror'"
      :data="dataInEdit"
    ></live-phone-mirror>
    <live-connection
      v-if="currentViewName === 'connection'"
      :data="dataInEdit"
    ></live-connection>
    <live-setting v-if="currentViewName === 'setting'"></live-setting>
    <live-add-bgm v-if="currentViewName === 'add-bgm'"></live-add-bgm>
    <live-reverb-voice v-if="currentViewName === 'reverb-voice'"></live-reverb-voice>
    <live-change-voice v-if="currentViewName === 'change-voice'"></live-change-voice>
  </div>
</template>

<script setup lang='ts'>
import { onMounted, ref, Ref } from 'vue';
import { storeToRefs } from 'pinia';
import trtcCloud from './utils/trtcCloud';
import { TRTCScreenCaptureSourceInfo, TRTCScreenCaptureSourceType, TRTCDeviceType, TRTCDeviceState } from 'trtc-electron-sdk';
import LiveCameraSource from './components/LiveSource/LiveCameraSource.vue';
import LiveScreenShareSource from './components/LiveSource/LiveScreenShareSource.vue';
import LiveConnection from './components/LiveChildView/LiveConnection.vue';
import LiveSetting from './components/LiveChildView/LiveSetting.vue';
import LiveAddBgm from './components/LiveMoreTool/LiveAddBgm.vue';
import LiveReverbVoice from './components/LiveMoreTool/LiveReverbVoice.vue';
import LiveChangeVoice from './components/LiveMoreTool/LiveChangeVoice.vue';
import LivePhoneMirror from './components/LiveSource/LivePhoneMirror.vue';
import TUIMessageBox from './common/base/MessageBox';
import { useCurrentSourceStore } from './store/child/currentSource';
import useDeviceManager from './utils/useDeviceManager';
import { useI18n } from './locales/index';
import { useAudioEffectStore } from './store/child/audioEffect';
import { changeTheme } from './utils/utils';
import logger from './utils/logger';

const logPrefix = '[ChildView]';

const audioEffectStore = useAudioEffectStore();
const { t } = useI18n();
const currentSourceStore = useCurrentSourceStore();
const { currentViewName } = storeToRefs(currentSourceStore);
const deviceManager = useDeviceManager();

const screenList: Ref<TRTCScreenCaptureSourceInfo[]> = ref([]);
const windowList: Ref<TRTCScreenCaptureSourceInfo[]> = ref([]);
const dataInEdit: Ref<Record<string, any> | undefined> = ref(undefined);

onMounted(() => {
  initMainWindowMessageListener();
});

function initMainWindowMessageListener() {
  logger.log(`${logPrefix}initMainWindowMessageListener`);
  if (window.mainWindowPortInChild) {
    window.mainWindowPortInChild.addEventListener('message', (event) => {
      logger.log(`${logPrefix}message from main window:`, event.data, event);
      const { key, data } = event.data;
      switch (key) {
      case 'set-apply-list':
        currentSourceStore.setApplyToAnchorList(JSON.parse(data));
        break;
      case 'set-anchor-list':
        currentSourceStore.setAnchorList(JSON.parse(data));
        break;
      case 'set-apply-and-anchor-list':
        currentSourceStore.setApplyAndAnchorList(JSON.parse(data));
        break;
      case 'reset':
        currentSourceStore.reset();
        break;
      case 'update-audio-volume':
        currentSourceStore.updateAudioVolume(data);
        break;
      case 'update-speaker-volume':
        currentSourceStore.updateSpeakerVolume(data);
        break;
      case 'on-device-changed':
        onDeviceChanged(data);
        break;
      case 'update-playing-music-id':
        if(data !== audioEffectStore.playingMusicId){
          audioEffectStore.updatePlayingMusicId(data);
        }else{
          window.mainWindowPortInChild?.postMessage({
            key:'singleLoopPlay',
            data,
          });
        }
        break;
      case 'change-theme':
        {
          const childWindowElement = document.querySelector('.tui-live-kit-child');
          changeTheme(childWindowElement,data);
        }
        break;
      case 'update-phone-list':
        currentSourceStore.setPhoneDeviceList(data);
        break;
      default:
        logger.warn(`${logPrefix}message from main: not supported message key: ${key}`);
        break;
      }
    });
    window.mainWindowPortInChild.addEventListener('messageerror', (event) => {
      logger.error(`${logPrefix}message from main window error:`, event.data, event);
    });
    window.mainWindowPortInChild.start();
    window.mainWindowPortInChild.postMessage({
      key: 'notice-from-child',
      data: 'child window port started',
    });
  } else {
    logger.warn(`${logPrefix}initMainWindowMessageListener port not ready, will retry in 1s`);
    setTimeout(()=>{
      initMainWindowMessageListener();
    }, 1000);
  }
}

function onDeviceChanged(data: { deviceId: string; type: TRTCDeviceType; state: TRTCDeviceState; }) {
  logger.log(`${logPrefix}onDeviceChanged:`, data);
  let deviceList = null;
  if (data.type === TRTCDeviceType.TRTCDeviceTypeCamera) {
    deviceList = deviceManager.getCameraDevicesList();
    if (deviceList) {
      currentSourceStore.setCameraList(deviceList);
      if (data.state === TRTCDeviceState.TRTCDeviceStateRemove && data.deviceId === currentSourceStore.currentCameraId) {
        currentSourceStore.setCurrentCameraId(deviceList[0].deviceId);
      }
    }
  } else if (data.type === TRTCDeviceType.TRTCDeviceTypeMic) {
    if (data.state === TRTCDeviceState.TRTCDeviceStateRemove || data.state === TRTCDeviceState.TRTCDeviceStateAdd) {
      deviceList = deviceManager.getMicDevicesList();
      deviceList && currentSourceStore.setMicrophoneList(deviceList);
    } else if (data.state === TRTCDeviceState.TRTCDeviceStateActive) {
      currentSourceStore.setCurrentMicrophoneId(data.deviceId)
    }
  } else if (data.type === TRTCDeviceType.TRTCDeviceTypeSpeaker) {
    if (data.state === TRTCDeviceState.TRTCDeviceStateRemove || data.state === TRTCDeviceState.TRTCDeviceStateAdd) {
      deviceList = deviceManager.getSpeakerDevicesList();
      deviceList && currentSourceStore.setSpeakerList(deviceList);
    } else if (data.state === TRTCDeviceState.TRTCDeviceStateActive) {
      currentSourceStore.setCurrentSpeakerId(data.deviceId)
    }
  } else {
    logger.warn(`${logPrefix}onDeviceChanged un-supported device type:`, data);
  }
}

function refreshCameraDeviceList() {
  if (deviceManager) {
    const cameraList = deviceManager.getCameraDevicesList();
    logger.debug(`${logPrefix}camera device list:`, cameraList);
    if (cameraList && cameraList.length > 0) {
      currentSourceStore.setCameraList(cameraList);
    } else {
      currentSourceStore.setCameraList([]);
      TUIMessageBox({
        title: t('Note'),
        message: t('No camera'),
        confirmButtonText: t('Sure'),
      });
    }
  }
}

function refreshMicrophoneDeviceList() {
  if (deviceManager) {
    const microphoneList = deviceManager.getMicDevicesList();
    logger.debug(`${logPrefix}microphone device list:`, microphoneList);

    if (microphoneList && microphoneList.length > 0) {
      currentSourceStore.setMicrophoneList(microphoneList);
    } else {
      currentSourceStore.setMicrophoneList([]);
      TUIMessageBox({
        title: t('Note'),
        message: t('No microphone'),
        confirmButtonText: t('Sure'),
      });
    }
  }
}

function refreshSpeakerDeviceList() {
  if (deviceManager) {
    const speakerList = deviceManager.getSpeakerDevicesList();
    logger.debug(`${logPrefix}speaker device list:`, speakerList);

    if (speakerList && speakerList.length > 0) {
      currentSourceStore.setSpeakerList(speakerList);
    } else {
      currentSourceStore.setSpeakerList([]);
      TUIMessageBox({
        title: t('Note'),
        message: t('No speaker'),
        confirmButtonText: t('Sure'),
      });
    }
  }
}

function refreshMediaDeviceList() {
  if (deviceManager) {
    refreshCameraDeviceList();
    refreshMicrophoneDeviceList();
    refreshSpeakerDeviceList();
  } else {
    logger.warn(
      `${logPrefix}init device list failed, deviceManager is not existed`
    );
  }
}

async function refreshScreenList() {
  const thumbWidth = 640;
  const thumbHeight = 360;
  const iconWidth = 48;
  const iconHeight = 48;

  logger.debug(`${logPrefix}refreshScreenList`);
  try {
    const screenCaptureList = await trtcCloud.getScreenCaptureSources(
      thumbWidth,
      thumbHeight,
      iconWidth,
      iconHeight
    );
    screenList.value = [];
    windowList.value = [];
    screenCaptureList.forEach((screen: TRTCScreenCaptureSourceInfo) => {
      if (screen.type === TRTCScreenCaptureSourceType.TRTCScreenCaptureSourceTypeWindow) {
        windowList.value.push(screen);
      } else {
        screenList.value.push(screen);
      }
    });
    currentSourceStore.setScreenList(screenList.value);
    currentSourceStore.setWindowList(windowList.value);
  } catch (err) {
    logger.error(`${logPrefix}refreshScreenList failed:`, err);
  }
}

const commandHandlers = new Map([
  [
    'camera',
    () => {
      refreshMediaDeviceList();
      currentViewName.value = 'camera';
    },
  ],
  [
    'screen',
    () => {
      refreshScreenList();
      currentViewName.value = 'screen';
    },
  ],
  [
    'connection',
    () => {
      currentViewName.value = 'connection';
    },
  ],
  [
    'setting',
    () => {
      refreshMediaDeviceList();
      currentViewName.value = 'setting';
    },
  ],
  [
    'add-bgm',
    () => {
      currentViewName.value = 'add-bgm';
    },
  ],
  [
    'reverb-voice',
    () => {
      currentViewName.value = 'reverb-voice';
    },
  ],
  [
    'change-voice',
    () => {
      currentViewName.value = 'change-voice';
    },
  ],
  [
    'phone-mirror',
    () => {
      currentViewName.value = 'phone-mirror';
    },
  ]
]);

window.ipcRenderer.on('logout', () => {
  logger.log(`${logPrefix}on child logout`);
  currentSourceStore.setCurrentViewName('');
});

window.ipcRenderer.on('show', (event: any, args: Record<string, any>) => {
  logger.log(`${logPrefix}on child show`, args);
  if(args?.command === currentViewName.value) return;
  const handler = commandHandlers.get(args?.command);
  if (handler) {
    handler();
  }
  if (args?.data) {
    dataInEdit.value = args.data; // Edit
  } else {
    dataInEdit.value = undefined; // Add
  }
  currentSourceStore.setCurrentViewName(currentViewName.value);
});
</script>
<style lang='scss'>
@import './assets/global.scss';

.tui-live-kit-child {
  height: 100%;
  color: $font-sub-window-color;
}
</style>
