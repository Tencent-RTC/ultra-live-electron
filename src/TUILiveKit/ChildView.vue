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
    <live-online-video
      v-if="currentViewName === 'online-video'"
      :data="dataInEdit"
    ></live-online-video>
    <live-video-file
      v-if="currentViewName === 'video-file'"
      :data="dataInEdit"
    ></live-video-file>
    <live-co-guest
      v-if="currentViewName === 'co-guest-connection'"
      :data="dataInEdit"
    ></live-co-guest>
    <live-anchor-connection
      v-if="currentViewName === 'co-host-connection'"
      :data="dataInEdit"
    ></live-anchor-connection>
    <live-setting v-if="currentViewName === 'setting'"></live-setting>
    <live-add-bgm v-if="currentViewName === 'add-bgm'"></live-add-bgm>
    <live-reverb-voice v-if="currentViewName === 'reverb-voice'"></live-reverb-voice>
    <live-change-voice v-if="currentViewName === 'change-voice'"></live-change-voice>
    <live-user-profile v-if="currentViewName === 'user-profile'" :data="dataInEdit" :isLiving="!!roomId"></live-user-profile>
  </div>
</template>

<script setup lang='ts'>
import { onMounted, ref, Ref } from 'vue';
import { storeToRefs } from 'pinia';
import trtcCloud from './utils/trtcCloud';
import { TRTCScreenCaptureSourceInfo, TRTCScreenCaptureSourceType, TRTCDeviceType, TRTCDeviceState } from 'trtc-electron-sdk';
import LiveCameraSource from './components/LiveChildView/LiveSource/LiveCameraSource.vue';
import LiveScreenShareSource from './components/LiveChildView/LiveSource/LiveScreenShareSource.vue';
import LiveCoGuest from './components/LiveChildView/LiveCoGuest/Index.vue';
import LiveAnchorConnection from './components/LiveChildView/LiveMoreTool/LiveCoHost/Index.vue';
import LiveSetting from './components/LiveChildView/LiveSetting.vue';
import LiveAddBgm from './components/LiveChildView/LiveMoreTool/LiveAddBgm.vue';
import LiveReverbVoice from './components/LiveChildView/LiveMoreTool/LiveReverbVoice.vue';
import LiveChangeVoice from './components/LiveChildView/LiveMoreTool/LiveChangeVoice.vue';
import LivePhoneMirror from './components/LiveChildView/LiveSource/LivePhoneMirror.vue';
import LiveOnlineVideo from './components/LiveChildView/LiveSource/LiveOnlineVideo.vue';
import LiveVideoFile from './components/LiveChildView/LiveSource/LiveVideoFile.vue';
import LiveUserProfile from './components/LiveChildView/LiveUserProfile.vue';
import { useCurrentSourceStore } from './store/child/currentSource';
import { useI18n } from './locales/index';
import { useAudioEffectStore } from './store/child/audioEffect';
import { changeTheme } from './utils/utils';
import logger from './utils/logger';

const logPrefix = '[ChildView]';

const audioEffectStore = useAudioEffectStore();
const { t } = useI18n();
const currentSourceStore = useCurrentSourceStore();
const { currentViewName, roomId } = storeToRefs(currentSourceStore);

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
      case 'set-room-info':
        currentSourceStore.setRoomInfo(JSON.parse(data));
        break;
      case 'set-apply-list':
        currentSourceStore.setApplyOnSeatList(JSON.parse(data));
        break;
      case 'set-apply-and-seated-list':
        currentSourceStore.setApplyAndSeatedList(JSON.parse(data));
        break;
      case 'set-live-list':
        currentSourceStore.setLiveList(JSON.parse(data));
        break;
      case 'append-live-list':
        currentSourceStore.appendLiveList(JSON.parse(data));
        break;
      case 'set-host-connection':
        currentSourceStore.setHostConnection(JSON.parse(data));
        break;
      case 'set-host-battle':
        currentSourceStore.setHostBattle(JSON.parse(data));
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
      case 'update-device-list':
        updateDeviceList(data);
        break;
      case 'update-current-device':
        updateCurrentDevice(data);
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

function updateDeviceList(data: { cameraList: string, microphoneList: string, speakerList: string}) {
  logger.log(`${logPrefix}updateDeviceList:`, data);
  try {
    currentSourceStore.setCameraList(JSON.parse(data.cameraList));
    currentSourceStore.setMicrophoneList(JSON.parse(data.microphoneList));
    currentSourceStore.setSpeakerList(JSON.parse(data.speakerList));
  } catch (error: any) {
    logger.error(`${logPrefix}updateDeviceList failed:`, error);
  }
}

function updateCurrentDevice(data: { cameraId: string, microphoneId: string, speakerId: string }) {
  logger.log(`${logPrefix}updateCurrentDevice:`, data);
  data.cameraId && currentSourceStore.setCurrentCameraId(data.cameraId);
  data.microphoneId && currentSourceStore.setCurrentMicrophoneId(data.microphoneId);
  data.speakerId && currentSourceStore.setCurrentSpeakerId(data.speakerId);
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
    'co-guest-connection',
    () => {
      currentViewName.value = 'co-guest-connection';
    },
  ],
  [
    'co-host-connection',
    () => {
      currentViewName.value = 'co-host-connection';
    },
  ],
  [
    'setting',
    () => {
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
  ],
  [
    'online-video',
    () => {
      currentViewName.value = 'online-video';
    },
  ],
  [
    'video-file',
    () => {
      currentViewName.value = 'video-file';
    },
  ],
  [
    'user-profile',
    () => {
      currentViewName.value = 'user-profile';
    },
  ],
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
  font-size: 0.875rem;
}
</style>
