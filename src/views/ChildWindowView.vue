<template>
  <div class="child-window">
    <live-camera-source v-if="currentViewName === 'camera'" :data="dataInEdit"></live-camera-source>
    <live-screen-share-source v-if="currentViewName === 'screen'" :data="dataInEdit"></live-screen-share-source>
    <live-image-source v-if="currentViewName === 'image'" :data="dataInEdit"></live-image-source>
    <live-voice-chat v-if="currentViewName === 'voice-chat'"></live-voice-chat>
    <live-setting v-if="currentViewName === 'setting'"></live-setting>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, Ref } from 'vue';
import { TRTCScreenCaptureSourceInfo, TRTCScreenCaptureSourceType } from '@tencentcloud/tuiroom-engine-electron';
import { TUIDeviceType, TUIDeviceState } from '@tencentcloud/tuiroom-engine-electron/plugins/device-manager-plugin';
import LiveCameraSource from '../TUILiveKit/components/LiveSource/LiveCameraSource.vue';
import LiveScreenShareSource from '../TUILiveKit/components/LiveSource/LiveScreenShareSource.vue';
import LiveImageSource from '../TUILiveKit/components/LiveSource/LiveImageSource.vue';
import LiveVoiceChat from '../TUILiveKit/components/LiveToolbar/LiveVoiceChat.vue';
import LiveSetting from '../TUILiveKit/components/LiveToolbar/LiveSetting.vue';
import { useCurrentSourcesStore } from '../TUILiveKit/store/currentSources';
import useDeviceManagerPlugin from '../TUILiveKit/utils/useDeviceManagerPlugin';
import trtcCloud from "../TUILiveKit/utils/trtcCloud";

const logger = console;
const logPrefix = "[ChildWindowView]"

const currentSourceStore = useCurrentSourcesStore();
const currentViewName = ref(currentSourceStore.currentViewName);

const deviceManagerPlugin = useDeviceManagerPlugin();

const screenList: Ref<TRTCScreenCaptureSourceInfo[]> = ref([]);
const windowList: Ref<TRTCScreenCaptureSourceInfo[]> = ref([]);

const dataInEdit: Ref<Record<string, any> | undefined> = ref(undefined);

onMounted(() => {
  setTimeout(() => {
    initMainWindowMessageListener();
  }, 3000); // To do: 需要等待一下，主窗口才能把 MessagePort 发送过来。实现不够优先，待优化。
});

function initMainWindowMessageListener() {
  if (window.mainWindowPort) {
    window.mainWindowPort.addEventListener("message", (event) => {
      console.log(`${logPrefix}message from main window:`, event.data, event);
      const { key, data } = event.data;
      switch (key) {
      case "voice-chat":
        currentSourceStore.setApplyToAnchorList(JSON.parse(data))
        break;
      case "update-apply-list":
        currentSourceStore.updateApplyToAnchorList(JSON.parse(data))
        break;
      case "set-anchor-list":
        currentSourceStore.setAnchorList(JSON.parse(data))
        break;
      case "update-anchor-list":
        currentSourceStore.updateAnchorList(data)
        break;
      case "reset":
        currentSourceStore.reset();
        break;
      case "update-audio-volume":
        currentSourceStore.updateAudioVolume(data);
        break;
      case "update-speaker-volume":
        currentSourceStore.updateSpeakerVolume(data);
        break;
      default:
        logger.warn(`${logPrefix}message from main: not supported message key: ${key}`);
        break;
      }
    });
    window.mainWindowPort.addEventListener("messageerror", (event) => {
      logger.error(`${logPrefix}message from main window error:`, event.data, event);
    });
    window.mainWindowPort.start();
    window.mainWindowPort.postMessage({ key: "notice", data: "child port started"});
  } else {
    logger.error('Cannot add event listener to main window port');
  }
}

async function getMediaDeviceList() {
  if (deviceManagerPlugin) {
    const cameraList = deviceManagerPlugin.getCameraDevicesList();
    const microphoneList = deviceManagerPlugin.getMicDevicesList();
    const speakerList = deviceManagerPlugin.getSpeakerDevicesList();
    logger.debug(`${logPrefix}device list:`, cameraList, microphoneList, speakerList);
    cameraList && currentSourceStore.setCameraList(cameraList);
    microphoneList && currentSourceStore.setMicrophoneList(microphoneList);
    speakerList && currentSourceStore.setSpeakerList(speakerList);

    // const cameraInfo = deviceManagerPlugin.getCurrentDevice(TUIDeviceType.DeviceTypeCamera);
    // const micInfo = deviceManagerPlugin.getCurrentMicDevice();
    // const speakerInfo = deviceManagerPlugin.getCurrentSpeakerDevice();
    // if (cameraInfo) {
    //   logger.log('current camera:', cameraInfo);
    //   // currentSourceStore.setCurrentCameraId(cameraInfo.deviceId);
    // }
    // if (micInfo && micInfo.deviceId) {
    //   currentSourceStore.setCurrentMicrophoneId(micInfo.deviceId);
    // }
    // if (speakerInfo && speakerInfo.deviceId) {
    //   currentSourceStore.setCurrentSpeakerId(speakerInfo.deviceId);
    // }
  } else {
    logger.warn(`${logPrefix}init device list failed, deviceManagerPlugin is not existed`);
  }
}

function onDeviceChanged(deviceId: string, type: TUIDeviceType, state: TUIDeviceState): void{
  logger.debug(`${logPrefix}onDeviceChanged: deviceId:${deviceId}, type:${type}, state:${state}`);
}

onMounted(() => {
  deviceManagerPlugin.on("onDeviceChanged", onDeviceChanged);
});

onBeforeUnmount(() => {
  deviceManagerPlugin.off("onDeviceChanged", onDeviceChanged);
});

async function getScreenList() {
  const thumbWidth = 640;
  const thumbHeight = 360;
  const  iconWidth = 48;
  const iconHeight = 48;

  try {
    const screenCaptureList = await trtcCloud.getScreenCaptureSources(thumbWidth, thumbHeight, iconWidth, iconHeight);
    screenList.value = [];
    windowList.value = [];
    screenCaptureList.forEach((screen: TRTCScreenCaptureSourceInfo) => {
      if (screen.type === TRTCScreenCaptureSourceType.TRTCScreenCaptureSourceTypeWindow) {
        windowList.value.push(screen);
      } else {
        screenList.value.push(screen);
      }
    })
    currentSourceStore.setScreenList(screenList.value);
    currentSourceStore.setWindowList(windowList.value);
  } catch (err) {
    logger.error('获取屏幕/窗口列表失败：',err);
  }
}

const commandHandlers = new Map([
  ['camera', () => {
    getMediaDeviceList();
    currentViewName.value = 'camera';
  }],
  ['screen', () => {
    getScreenList();
    currentViewName.value = 'screen';
  }],
  ['image', () => {
    currentViewName.value = 'image';
  }],
  ['voice-chat', () => {
    currentViewName.value = 'voice-chat';
  }],
  ['setting', () => {
    getMediaDeviceList();
    currentViewName.value = 'setting';
  }],
]);

window.ipcRenderer.on('show', (event, args: Record<string, any>) => {
  console.log('on child show:', args);

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
<style scoped lang="scss" >
.child-window{
  height: 100%;
}
</style>