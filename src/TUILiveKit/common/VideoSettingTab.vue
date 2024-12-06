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
      <BeautyConfigPanel :init-value="beautyProperties" @on-change="handleBeautyEffectChange" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, Ref, defineProps, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import { storeToRefs } from 'pinia';
import { TRTCMediaSourceType, TRTCVideoMirrorType } from 'trtc-electron-sdk';
import { TUIMediaSourceViewModel } from '../types';
import DeviceSelect from './DeviceSelect.vue';
import VideoProfile from './VideoProfile.vue';
import CameraMirror from '../common/icons/CameraMirror.vue';
import CameraUnmirror from '../common/icons/CameraUnmirror.vue';
import BeautyConfigPanel from '../common/BeautyConfigPanel.vue';
import { useI18n } from '../locales/index';
import { useCurrentSourceStore } from '../store/child/currentSource';
import { TRTCXmagicEffectProperty } from '../utils/beauty';

const { t } = useI18n()
const currentSourceStore = useCurrentSourceStore();
const { isCurrentCameraMirrored, beautyProperties } = storeToRefs(currentSourceStore);
interface Props {
  withBeauty?: boolean;
  data?: Record<string, any>;
}
const logger = console;
const logPrefix = '[VideoSettingTab]';
const props = defineProps<Props>();

const cameraPreviewRef: Ref<HTMLDivElement | undefined> = ref();
const isFirstBeautyEffectProperty: Ref<boolean> = ref(false);
const handleChangeMirror = async () => {
  logger.log(`${logPrefix}handleChangeMirror: ${isCurrentCameraMirrored.value}`);
  currentSourceStore.setIsCurrentCameraMirrored(!isCurrentCameraMirrored.value);
  window.mainWindowPort?.postMessage({
    key: "setCameraTestRenderMirror",
    data: {
      mirror: isCurrentCameraMirrored.value
    }
  });
}

function startCameraPreview() {
  logger.log(`${logPrefix}startCameraPreview`, cameraPreviewRef.value, window.nativeWindowHandle);
  setTimeout(() => {
    if (cameraPreviewRef.value && window.nativeWindowHandle) {
      const bodyRect = document.body.getBoundingClientRect();
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
          },
          log: `-----startCameraPreview
            body area left:${bodyRect.left} right:${bodyRect.right} top:${bodyRect.top} bottom: ${bodyRect.bottom}
            view area left:${clientRect.left} right:${clientRect.right} top:${clientRect.top} bottom: ${clientRect.bottom}
            devicePixelRatio: ${window.devicePixelRatio}`
        }
      });
    } else {
      logger.error(`${logPrefix}Preview camera failed, not DIV view or native window ID.`, cameraPreviewRef.value, window.nativeWindowHandle);
    }
  }, 100);
}

function stopCameraPreview() {
  logger.debug(`${logPrefix}stopCameraPreview`);
  window.mainWindowPort?.postMessage({
    key: "stopCameraDeviceTest"
  });
  logger.log(`${logPrefix}stopCameraPreview finished`);
}

function setBeautyEffectProperty(properties: TRTCXmagicEffectProperty[]) {
  if (!isFirstBeautyEffectProperty.value) {
    isFirstBeautyEffectProperty.value = true;
    window.mainWindowPort?.postMessage({
      key: "setCameraTestVideoPluginPath",
      data: true
    });
    setTimeout(() => {
      window.mainWindowPort?.postMessage({
        key: "setCameraTestVideoPluginParameter",
        data: properties
      });
    }, 3000); // There is a delay when the camera is turned on and when beauty effects are enabled for the first time. Here, setting beauty effect parameters requires a delay. The beauty effect parameters can only take effect after the camera is turned on and the beauty effect plugin is created.
  } else {
    window.mainWindowPort?.postMessage({
      key: "setCameraTestVideoPluginParameter",
      data: properties
    });
  }
}

function handleBeautyEffectChange(properties: TRTCXmagicEffectProperty[]) {
  logger.log(`${logPrefix}handleBeautyEffectChange:`, properties);
  currentSourceStore.setBeautyProperties(properties);
  setBeautyEffectProperty(properties);
}

onMounted(() => {
  logger.log(`${logPrefix}onMounted`);
  startCameraPreview();
});

onBeforeUnmount(() => {
  logger.log(`${logPrefix}onBeforeUnmount`);
  stopCameraPreview();
  if (isFirstBeautyEffectProperty.value) {
    window.mainWindowPort?.postMessage({
      key: "setCameraTestVideoPluginPath",
      data: false
    });
    isFirstBeautyEffectProperty.value = false;
  }
});

watch(props, async (val) => {
  logger.log(`${logPrefix}watch props.data`, val);
  if (val.data?.mediaSourceInfo) {
    const { mediaSourceInfo, beautyConfig, resolution } = val.data as TUIMediaSourceViewModel;
    if (mediaSourceInfo.sourceType === TRTCMediaSourceType.kCamera && resolution && beautyConfig) {
      const { sourceId, mirrorType } = mediaSourceInfo;
      const { width, height } = resolution;
      const beautyProperties = JSON.parse(JSON.stringify(beautyConfig.beautyProperties));
      currentSourceStore.setCurrentCameraId(sourceId);
      currentSourceStore.setCurrentCameraResolution({ width, height });
      currentSourceStore.setIsCurrentCameraMirrored(mirrorType === TRTCVideoMirrorType.TRTCVideoMirrorType_Enable);
      currentSourceStore.setBeautyProperties(beautyProperties);

      await nextTick(); // Wait for parent Vue component rendered and camera started.
      if (beautyProperties.length) {
        setBeautyEffectProperty(beautyProperties);
      }
    } else {
      logger.warn(`${logPrefix}watch props.data error. Invalid data:`, val);
    }
  }
}, {
  immediate: true
});
</script>

<style lang="scss" scoped>
@import "../assets/variable.scss";
.camera-setting-container{
  width: 100%;
  display: flex;
  align-items: center;
  height: 4.625rem;
  padding: 0.5rem 0;
}
.camera-setting{
  width: 20rem;
}
.resolution-setting{
  width: 12rem;
  padding-left: 0.75rem;
}
.beauty-setting{
  width: 100%;
  height: calc(100% - 21.625rem);
  background-color: var(--bg-color-dialog-module);
  border: 1px solid var(--stroke-color-primary);
  border-radius: 0.5rem;
  overflow: hidden;
}
.video-tab {
    width: 100%;
    height: 100%;
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
}
.title {
  color: var(--text-color-tertiary);
  font-size: $font-video-setting-tab-size;
  font-style: $font-video-setting-tab-style;
  font-weight: $font-video-setting-tab-weight;
  line-height: 1rem;
}
.video-preview-container {
  position: relative;
  width: 100%;
  height: 0;
  padding-top: calc(100% * 9 / 16);
  background-color: $color-video-setting-tab-preview-container-background;
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
  width: 100%;
  height: 17rem;
  overflow: hidden;
}
.mirror-container {
  display: flex;
  align-self: flex-end;
  padding-left: 0.75rem;
  font-size: $font-video-setting-tab-mirror-container-size;
  cursor: pointer;
  span {
    background-color: var(--bg-color-input);
    color: var(--text-color-primary);
    border-radius: 0.5rem;
  }
}
.item {
  width: 100%;
  height: 1.25rem;
  cursor: pointer;
  color: var(--font-color-3);
}
</style>
