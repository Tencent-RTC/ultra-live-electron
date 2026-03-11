<template>
    <TUIDialog
      :visible="true"
      width="100%"
      :confirmText="confirmText"
      :cancelText="cancelText"
      @close="handleClose"
      @cancel="handleClose"
      @confirm="handleConfirm"
      :confirmDisabled="cameraList.length === 0"
      :title="title"
      :customClasses="dialogCustomClasses"
    >
      <div class="basic-setting">
        <div class="item-setting">
          <span class="title">{{ t('Camera') }}</span>
          <TUISelect class="camera-select" v-model="currentCameraId" @change="handleCameraChange">
            <TUIOption v-for="item in cameraList" :key="item.deviceId" :value="item.deviceId" :label="item.deviceName" />
          </TUISelect>
        </div>
        <div class="item-setting">
          <span class="title">{{ t('Resolution') }}</span>
          <TUISelect class="resolution-select" v-model="currentResolution">
            <TUIOption v-for="item in videoResolutionList" :key="item.value" :value="item.value" :label="item.label" />
          </TUISelect>
        </div>
      </div>
    </TUIDialog>
</template>

<script setup lang="ts">
import { ref, Ref, computed, watch, onMounted } from 'vue';
import { useDeviceState, useRoomEngine } from 'tuikit-atomicx-vue3-electron';
import type { MediaSource } from 'tuikit-atomicx-vue3-electron';
import {
  TRTCVideoMirrorType,
  TRTCVideoResolution,
  TRTCMediaSourceType,
} from '@tencentcloud/tuiroom-engine-electron';
import { TUIDialog, TUISelect, TUIOption, useUIKit } from '@tencentcloud/uikit-base-component-vue3';
import { useDialogClasses } from '../../../hooks/useDialogClasses';

const roomEngine = useRoomEngine();
const previewTRTCCloud = roomEngine.instance?.getTRTCCloud();

const { t } = useUIKit();
const { cameraList, getCameraList } = useDeviceState();

const props = defineProps<{
  mediaSource: MediaSource | null;
  customClasses?: string;
}>();

const emits = defineEmits(['addCameraMaterial', 'updateCameraMaterial', 'close']);

const dialogCustomClasses = useDialogClasses('camera-setting-dialog', () => props.customClasses);

const title = computed(() => {
  return props.mediaSource ? t('Update Camera') : t('Add Camera');
});

const confirmText = computed(() => {
  return props.mediaSource ? t('Update Camera') : t('Add Camera');
});
const cancelText = t('Cancel');

const currentCameraId = ref(props.mediaSource?.sourceId || cameraList.value[0]?.deviceId);
const currentResolution = ref(TRTCVideoResolution.TRTCVideoResolution_1280_720);
const isMirror: Ref<boolean> = ref(
  props.mediaSource?.mirrorType === TRTCVideoMirrorType.TRTCVideoMirrorType_Enable || true
);

const videoResolutionList = computed(() => [
  { label: '640x360', value: TRTCVideoResolution.TRTCVideoResolution_640_360 },
  { label: '960x540', value: TRTCVideoResolution.TRTCVideoResolution_960_540 },
  { label: '1280x720', value: TRTCVideoResolution.TRTCVideoResolution_1280_720 },
  { label: '1920x1080', value: TRTCVideoResolution.TRTCVideoResolution_1920_1080 },
]);

watch(() => cameraList.value, async () => {
  if (!cameraList.value.find(item => item.deviceId === currentCameraId.value)) {
    currentCameraId.value = cameraList.value[0]?.deviceId;
    await previewTRTCCloud.setCurrentCameraDevice(currentCameraId.value);
  }
});

onMounted(async () => {
  await getCameraList();
  if (props.mediaSource?.sourceId) {
    currentCameraId.value = props.mediaSource.sourceId;
    await previewTRTCCloud.setCurrentCameraDevice(props.mediaSource.sourceId);
  } else {
    currentCameraId.value = cameraList.value[0]?.deviceId;
    await previewTRTCCloud.setCurrentCameraDevice(cameraList.value[0]?.deviceId);
  }
});

watch(
  () => props.mediaSource,
  async (mediaSource: any) => {
    if (mediaSource) {
      if (currentCameraId.value !== mediaSource.sourceId) {
        currentCameraId.value = mediaSource.sourceId;
        await previewTRTCCloud.setCurrentCameraDevice(mediaSource.sourceId);
      }
      if (mediaSource.camera?.resolution) {
        currentResolution.value = mediaSource.camera.resolution;
      }
      isMirror.value = mediaSource.mirrorType === TRTCVideoMirrorType.TRTCVideoMirrorType_Enable;
    }
  },
  { deep: true, immediate: true }
);

const handleCameraChange = async (newVal: string) => {
  currentCameraId.value = newVal;
  await previewTRTCCloud.setCurrentCameraDevice(newVal);
};

const handleConfirm = () => {
  if (!props.mediaSource) {
    emits('addCameraMaterial', {
      sourceId: currentCameraId.value,
      sourceType: TRTCMediaSourceType.kCamera,
      name: cameraList.value.find(item => item.deviceId === currentCameraId.value)?.deviceName,
      camera: {
        cameraId: currentCameraId.value,
        resolution: currentResolution.value,
      },
      rect: { left: 0, top: 0, right: 640, bottom: 360 },
      mirrorType: isMirror.value
        ? TRTCVideoMirrorType.TRTCVideoMirrorType_Enable
        : TRTCVideoMirrorType.TRTCVideoMirrorType_Disable,
    });
  } else {
    const hasCameraNameChanged = props.mediaSource.name !== cameraList.value.find(item => item.deviceId === props.mediaSource.sourceId)?.deviceName;
    const updateCameraInfo = {
      ...props.mediaSource,
      sourceId: currentCameraId.value,
      camera: {
        cameraId: currentCameraId.value,
        resolution: currentResolution.value,
      },
    };
    if (!hasCameraNameChanged) {
      Object.assign(updateCameraInfo, {
        name: cameraList.value.find(item => item.deviceId === currentCameraId.value)?.deviceName,
      });
    }
    emits('updateCameraMaterial', props.mediaSource, updateCameraInfo);
  }
};

const handleClose = () => {
  emits('close');
};
</script>

<style lang="scss" scoped>
:deep(.camera-setting-dialog) {
  .tui-dialog-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    padding: 10px 0;
    min-height: 0;
  }

  .tui-dialog-header,
  .tui-dialog-footer {
    flex-shrink: 0;
  }
}

.basic-setting {
  width: 100%;
  max-width: 560px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-top: 16px;
  .item-setting {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
    .title {
      font-size: 14px;
      color: var(--text-color-secondary);
      margin-bottom: 12px;
    }
  }

  .camera-select {
    width: 300px;
    .select-container .select-dropdown-container {
      max-height: 180px;
    }
  }

  .resolution-select {
    width: 200px;
    .select-container .select-dropdown-container {
      max-height: 180px;
    }
  }

  .mirror-container {
    width: 42px;
    height: 42px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--text-color-secondary);
    border: 1px solid var(--stroke-color-primary);
    border-radius: 8px;
  }
}
</style>
