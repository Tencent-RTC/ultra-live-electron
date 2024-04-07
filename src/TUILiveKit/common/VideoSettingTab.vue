<!--
  * Name: VideoTab
  * @param name String required
  * @param size String 'large'|'medium'|'small'
  * Usage:
  * Use <video-tab></video-tab> in the template
  *
  * 名称: VideoTab
  * @param name String required
  * @param size String 'large'|'medium'|'small'
  * 使用方式：
  * 在 template 中使用 <video-tab></video-tab>
-->
<template>
  <div class="video-tab">
    <div class="tui-camera-preview" ref="cameraPreviewRef"></div>
    <div class="camera-setting-container">
      <div class="camera-setting">
        <span class="title">{{ t('Camera') }}</span>
        <device-select device-type="camera"></device-select>
      </div>
      <div class="resolution-setting">
        <span class="title">{{ t('Resolution') }}</span>
        <video-profile></video-profile>
      </div>
      <div class="mirror-container">
        <span @click="handleChangeMirror">
          <CameraMirror v-if="isCurrentCameraMirrored"/>
          <CameraUnmirror v-else />
        </span>
      </div>
    </div>
    <div class="beauty-setting" v-if="props.withBeauty">
      <span class="title">{{ t('Adjusting the video screen') }}  </span>
      <BeautySelect></BeautySelect>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, onBeforeUnmount, onMounted, Ref, ref } from 'vue';
import { storeToRefs } from 'pinia';
import DeviceSelect from './DeviceSelect.vue';
import VideoProfile from './VideoProfile.vue';
import CameraMirror from '../common/icons/CameraMirror.vue';
import CameraUnmirror from '../common/icons/CameraUnmirror.vue';
import BeautySelect from '../common/BeautySelect.vue';
import { useI18n } from '../locales/index';
import { useCurrentSourcesStore } from '../store/currentSources';
// import useGetRoomEngine from '../utils/useRoomEngine';
// import { TRTCVideoFillMode, TRTCVideoMirrorType, TRTCVideoRotation } from '@tencentcloud/tuiroom-engine-electron';
// const roomEngine = useGetRoomEngine();
const { t } = useI18n()
const sourcesStore = useCurrentSourcesStore();
const { isCurrentCameraMirrored } = storeToRefs(sourcesStore);
interface Props {
  withBeauty?: boolean;
}
const logger = console;
const logPrefix = '[LiveCameraSource]';
const props = defineProps<Props>();

const cameraPreviewRef: Ref<HTMLDivElement | undefined> = ref();
const handleChangeMirror = async () => {
  logger.log(`${logPrefix}handleChangeMirror: ${isCurrentCameraMirrored.value}`);
  sourcesStore.setIsCurrentCameraMirrored(!isCurrentCameraMirrored.value);
}

function startCameraPreview() {
  logger.log(`${logPrefix}startCameraPreview`, cameraPreviewRef.value, window.nativeWindowHandle);
  if (cameraPreviewRef.value && window.nativeWindowHandle) {
    const clientRect = cameraPreviewRef.value.getBoundingClientRect();
    window.mainWindowPort?.postMessage({
      key: "startCameraDeviceTest",
      data: {
        windowID: window.nativeWindowHandle,
        rect: {
          left: Math.round(clientRect.left * window.devicePixelRatio),
          right: Math.round(clientRect.right * window.devicePixelRatio),
          top: Math.round(clientRect.top * window.devicePixelRatio),
          bottom: Math.round(clientRect.bottom * window.devicePixelRatio),
        }
      }
    });
  } else {
    logger.error(`${logPrefix}Preview camera failed, not DIV view or native window ID.`, cameraPreviewRef.value, window.nativeWindowHandle);
  }
}

function stopCameraPreview() {
  logger.debug(`${logPrefix}stopCameraPreview`);
  window.mainWindowPort?.postMessage({
    key: "stopCameraDeviceTest"
  });
  logger.log(`${logPrefix}stopCameraPreview finished`);
}

const onShow = () => {
  logger.log(`${logPrefix}onShow`);
  startCameraPreview();
}

onMounted(() => {
  logger.log(`${logPrefix}onMounted`);
  startCameraPreview();
  window.ipcRenderer.on('show', onShow);
});

onBeforeUnmount(() => {
  logger.log(`${logPrefix}onBeforeUnmount`);
  stopCameraPreview()
  window.ipcRenderer.off('show', onShow);
});
</script>

<style lang="scss" scoped>
.camera-setting-container{
  width: 100%;
  display: flex;
}
.camera-setting{
    width: 23.25rem;
}
.resolution-setting{
    width: 7.125rem;
    padding-left: 0.75rem;
}
.beauty-setting{
    padding-top: 1.25rem;
}
.video-tab {
    width: 100%;
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
  }
  .title {
    color: #4F586B;
    font-family: PingFang SC;
    font-size: 0.875rem;
    font-style: normal;
    font-weight: 400;
    line-height: 1.375rem;
  }
  .video-preview-container {
    position: relative;
    width: 100%;
    height: 0;
    padding-top: calc(100% * 9 / 16);
    background-color: #000000;
    border-radius: 0.5rem;
    overflow: hidden;
    .video-preview {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    }
  }
  .tui-camera-preview{
    width: 34.5rem;
    height: 19.75rem;
    border-radius: 2%;
    margin: 1rem 0;
    overflow: hidden;
}
  .mirror-container {
    display: flex;
    align-self: end;
    padding-left: 0.75rem;
    cursor: pointer;
  }
  .item {
    width: 100%;
    height: 1.25rem;
    cursor: pointer;
    color: var(--font-color-3);
  }
</style>
