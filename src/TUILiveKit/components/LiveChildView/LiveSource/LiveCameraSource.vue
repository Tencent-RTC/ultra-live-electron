<template>
  <div class="tui-camera-source">
    <LiveChildHeader :title="t('Add Camera')"></LiveChildHeader>
    <div class="tui-camera-middle" >
      <video-setting-tab v-if="isPreviewing" :with-beauty="true" :data="props.data"></video-setting-tab>
    </div>
    <div class="tui-camera-footer" >
      <button v-if="mode === TUIMediaSourceEditMode.Add" class="tui-button-confirm" @click="handleAddCamera">{{ t('Add Camera') }}</button>
      <button v-else class="tui-button-confirm" @click="handleEditCamera">{{ t('Edit Camera') }}</button>
      <button class="tui-button-cancel" @click="handleCloseSetting">{{ t('Cancel') }}</button>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, Ref, defineProps, computed, onMounted, onBeforeUnmount } from 'vue';
import { storeToRefs } from 'pinia';
import { TRTCDeviceInfo, TRTCMediaSourceType, TRTCVideoMirrorType } from 'trtc-electron-sdk';
import { useI18n } from '../../../locales';
import { useCurrentSourceStore } from '../../../store/child/currentSource';
import LiveChildHeader from '../LiveChildHeader.vue';
import VideoSettingTab from '../../../common/VideoSettingTab.vue';
import { TUIMediaSourceEditMode } from '../../../constants/tuiConstant';
import logger from '../../../utils/logger';


interface TUIMediaSourceEditProps {
  data?: Record<string, any>;
}

const logPrefix = '[LiveCameraSource]';

const props = defineProps<TUIMediaSourceEditProps>();
const mode = computed(() => props.data?.mediaSourceInfo ? TUIMediaSourceEditMode.Edit : TUIMediaSourceEditMode.Add);

const { t } = useI18n();
const currentSourceStore = useCurrentSourceStore();

const isPreviewing: Ref<boolean> = ref(true);

const {
  cameraList,
  currentCameraId,
  currentCameraResolution,
  isCurrentCameraMirrored,
  beautyProperties,
} = storeToRefs(currentSourceStore);

const handleCloseSetting = () => {
  window.ipcRenderer.send('close-child');
  resetCurrentView();
}

const handleAddCamera = () => {
  logger.debug(`${logPrefix}handleAddCamera`);
  const currentCamera = cameraList.value.find((item: TRTCDeviceInfo) => item.deviceId === currentCameraId.value);
  if (currentCamera) {
    const cameraSource = {
      type: TRTCMediaSourceType.kCamera,
      id: currentCameraId.value,
      name: currentCamera.deviceName,
      width: currentCameraResolution.value.width,
      height: currentCameraResolution.value.height,
      mirrorType: isCurrentCameraMirrored.value ? TRTCVideoMirrorType.TRTCVideoMirrorType_Enable : TRTCVideoMirrorType.TRTCVideoMirrorType_Disable,
      beautyConfig: {
        isEnabled: true,
        beautyProperties: JSON.parse(JSON.stringify(beautyProperties.value))
      },
      colorSpace: currentSourceStore.currentCameraColorSpace,
      colorRange: currentSourceStore.currentCameraColorRange,
    }

    resetCurrentView();
    window.mainWindowPortInChild?.postMessage({
      key: 'addMediaSource',
      data: cameraSource
    });
    window.ipcRenderer.send('close-child');
  } else {
    // To do: Message('Please choose a camera')；
    logger.warn('Please choose a camera');
  }
}

const handleEditCamera = () => {
  logger.debug(`${logPrefix}handleEditCamera`);
  const currentCamera = cameraList.value.find((item: TRTCDeviceInfo) => item.deviceId === currentCameraId.value);
  if (currentCamera) {
    const newData = {
      type: TRTCMediaSourceType.kCamera,
      id: currentCameraId.value,
      name: currentCamera.deviceName,
      width: currentCameraResolution.value.width,
      height: currentCameraResolution.value.height,
      mirrorType: isCurrentCameraMirrored.value ? TRTCVideoMirrorType.TRTCVideoMirrorType_Enable : TRTCVideoMirrorType.TRTCVideoMirrorType_Disable,
      beautyConfig: {
        isEnabled: true,
        beautyProperties: JSON.parse(JSON.stringify(beautyProperties.value))
      },
      colorSpace: currentSourceStore.currentCameraColorSpace,
      colorRange: currentSourceStore.currentCameraColorRange,
      predata: JSON.parse(JSON.stringify(props.data)),
    };

    resetCurrentView();
    window.mainWindowPortInChild?.postMessage({
      key: 'updateMediaSource',
      data: newData,
    });
    window.ipcRenderer.send('close-child');
  } else {
    // To do: Message('Please choose a camera')；
    logger.warn('Please choose a camera');
  }
}

const resetCurrentView = () => {
  isPreviewing.value = false;
  currentSourceStore.setCurrentViewName('');
  currentSourceStore.resetCurrentCamera();
}

const onShow = () => {
  logger.log(`${logPrefix}onShow`);
  isPreviewing.value = true;
}

onMounted(() => {
  logger.log(`${logPrefix}onMounted`);
  isPreviewing.value = true;
  window.ipcRenderer.on('show', onShow);
});

onBeforeUnmount(() => {
  logger.log(`${logPrefix}onBeforeUnmount`);
  isPreviewing.value = false;
  window.ipcRenderer.off('show', onShow);
});
</script>
<style scoped lang="scss">
@import "../../../assets/global.scss";

.tui-camera-source{
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    height: 100%;
    overflow-y: auto;
    color: var(--text-color-primary);
}
.tui-camera-middle{
    padding: 0 1.5rem;
    height: calc(100% - 5.75rem);
    background-color: var(--bg-color-dialog);
}
.tui-camera-footer{
    height: 3rem;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding: 0 1.5rem;
    background-color: var(--bg-color-dialog);
}
.video{
    width: 100%;
    height: 100%;
}
</style>
