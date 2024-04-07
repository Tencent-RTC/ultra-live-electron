<template>
    <div class="tui-camera-source">
        <div class="tui-camera-title" >
            <span>{{ t('Add Camera') }}</span>
            <svg-icon :icon="CloseIcon" @click="handleCloseSetting"></svg-icon>
        </div>
        <div class="tui-camera-middle" >
            <video-setting-tab v-if="isPreviewing" :with-beauty="true"></video-setting-tab>
        </div>
        <div class="tui-camera-footer" >
            <button v-if="mode === TUIMediaSourceEditMode.Add" class="tui-button-confirm" @click="handleAddCamera">{{ t('Add Camera') }}</button>
            <button v-else class="tui-button-confirm" @click="handleEditCamera">{{ t('Edit Camera') }}</button>
            <button class="tui-button-cancel" @click="handleCloseSetting">{{ t('Cancel') }}</button>
        </div>
    </div>
</template>
<script setup lang="ts">
import { ref, Ref, defineProps, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { storeToRefs } from 'pinia';
import { TRTCVideoMirrorType } from 'trtc-electron-sdk';
import { TUIDeviceInfo } from '@tencentcloud/tuiroom-engine-electron/plugins/device-manager-plugin';
import { TUIMediaSourceType } from '@tencentcloud/tuiroom-engine-electron/plugins/media-mixing-plugin';
import { useI18n } from '../../locales';
import { useCurrentSourcesStore } from '../../store/currentSources';
import SvgIcon from '../../common/base/SvgIcon.vue';
import CloseIcon from '../../common/icons/CloseIcon.vue';
import VideoSettingTab from '../../common/VideoSettingTab.vue';
import { TUIMediaSourceEditMode } from './constant';
import { TUIMediaSourceViewModel } from '../../store/mediaSources';

interface TUIMediaSourceEditProps {
  data?: Record<string, any>;
}

const logger = console;
const logPrefix = '[LiveCameraSource]';

const props = defineProps<TUIMediaSourceEditProps>();
const mode = computed(() => props.data?.mediaSourceInfo ? TUIMediaSourceEditMode.Edit : TUIMediaSourceEditMode.Add);

const { t } = useI18n();
const sourcesStore = useCurrentSourcesStore();

const isPreviewing: Ref<boolean> = ref(true);

const {
  cameraList,
  currentCameraId,
  currentCameraResolution,
  isCurrentCameraMirrored,
  currentBeautySetting,
} = storeToRefs(sourcesStore);

const handleCloseSetting = () => {
  window.ipcRenderer.send("close-child");
  resetCurrentView();
}

const handleAddCamera = () => {
  logger.debug(`${logPrefix}handleAddCamera`);
  const currentCamera = cameraList.value.find((item: TUIDeviceInfo) => item.deviceId === currentCameraId.value);
  if (currentCamera) {
    const cameraSource = {
      type: TUIMediaSourceType.kCamera,
      id: currentCameraId.value,
      name: currentCamera.deviceName,
      width: currentCameraResolution.value.width,
      height: currentCameraResolution.value.height,
      mirrorType: isCurrentCameraMirrored.value ? TRTCVideoMirrorType.TRTCVideoMirrorType_Enable : TRTCVideoMirrorType.TRTCVideoMirrorType_Disable,
      beautyConfig: {
        isEnabled: true,
        beautySetting: JSON.parse(JSON.stringify(currentBeautySetting.value))
      }
    }

    resetCurrentView();
    window.mainWindowPort?.postMessage({
      key: "addMediaSource",
      data: cameraSource
    });
    window.ipcRenderer.send("close-child");
  } else {
    // To do: Message('Please choose a camera')；
    logger.warn('Please choose a camera');
  }
}

const handleEditCamera = () => {
  logger.debug(`${logPrefix}handleEditCamera`);
  const currentCamera = cameraList.value.find((item: TUIDeviceInfo) => item.deviceId === currentCameraId.value);
  if (currentCamera) {
    const newData = {
      type: TUIMediaSourceType.kCamera,
      id: currentCameraId.value,
      name: currentCamera.deviceName,
      width: currentCameraResolution.value.width,
      height: currentCameraResolution.value.height,
      mirrorType: isCurrentCameraMirrored.value ? TRTCVideoMirrorType.TRTCVideoMirrorType_Enable : TRTCVideoMirrorType.TRTCVideoMirrorType_Disable,
      beautyConfig: {
        isEnabled: true,
        beautySetting: JSON.parse(JSON.stringify(currentBeautySetting.value))
      },
      predata: JSON.parse(JSON.stringify(props.data)),
    };

    resetCurrentView();
    window.mainWindowPort?.postMessage({
      key: "updateMediaSource",
      data: newData,
    });
    window.ipcRenderer.send("close-child");
  } else {
    // To do: Message('Please choose a camera')；
    logger.warn('Please choose a camera');
  }
}

const resetCurrentView = () => {
  isPreviewing.value = false;
  sourcesStore.setCurrentViewName('');
  sourcesStore.reset();
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

watch(props, (val) => {
  logger.log(`${logPrefix}watch props.data`, val);
  if (val.data?.mediaSourceInfo) {
    const { mediaSourceInfo, beautyConfig, resolution } = val.data as TUIMediaSourceViewModel;
    if (mediaSourceInfo.sourceType === TUIMediaSourceType.kCamera && resolution && beautyConfig) {
      const { sourceId, mirrorType } = mediaSourceInfo;
      const { width, height } = resolution;
      sourcesStore.setCurrentCameraId(sourceId);
      sourcesStore.setCurrentCameraResolution({ width, height });
      sourcesStore.setIsCurrentCameraMirrored(mirrorType === TRTCVideoMirrorType.TRTCVideoMirrorType_Enable);
      sourcesStore.setBeautySettings(beautyConfig.beautySetting);
    } else {
      logger.warn(`${logPrefix}watch props.data error. Invalid data:`, val);
    }
  }
}, {
  immediate: true
})
</script>
<style scoped lang="scss">
@import './style.scss';

.tui-camera-source{
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    height: 100%;
    overflow-y: scroll;    
}
.tui-camera-title{
    height: 4rem;
    line-height: 2.5rem;
    border-bottom: 1px solid rgba(230, 236, 245, 0.80);
    font-weight: 500;
    padding: 0 1.5rem 0 1.375rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
}
.tui-camera-middle{
    padding: 0 1.5rem;
}
.tui-camera-footer{
    height: 4.375rem;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding: 0 1.5rem;
}
.video{
    width: 100%;
    height: 100%;
}
</style>