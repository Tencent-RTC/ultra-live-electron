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
import { useDeviceState } from 'tuikit-atomicx-vue3-electron';
import type { MediaSource } from 'tuikit-atomicx-vue3-electron';
import {
  TRTCVideoMirrorType,
  TRTCMediaSourceType,
} from '@tencentcloud/tuiroom-engine-electron';
import { TUIDialog, TUISelect, TUIOption, useUIKit } from '@tencentcloud/uikit-base-component-vue3';
import { useDialogClasses } from '../../hooks/useDialogClasses';


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
const currentResolution = ref('');
const isMirror: Ref<boolean> = ref(
  props.mediaSource ? props.mediaSource.mirrorType === TRTCVideoMirrorType.TRTCVideoMirrorType_Enable : false
);

const DEFAULT_RESOLUTION_OPTIONS: Array<{ label: string; value: string }> = [
  { label: '1920x1080', value: '1920x1080' },
  { label: '1280x720', value: '1280x720' },
  { label: '960x540', value: '960x540' },
  { label: '640x360', value: '640x360' },
];

/**
 * Resolution list derived reactively from the currently selected camera.
 * Re-evaluates automatically when `cameraList` is refreshed (e.g. when ChildView
 * fires a stale-while-revalidate refresh on Camera panel open), so virtual cameras
 * with runtime-changing SupportedResolution stay in sync.
 */
const videoResolutionList = computed<Array<{ label: string; value: string }>>(() => {
  const currentCamera = cameraList.value.find(item => item.deviceId === currentCameraId.value);
  const supportedResolutions = (currentCamera as any)?.deviceProperties?.SupportedResolution;
  if (Array.isArray(supportedResolutions) && supportedResolutions.length > 0) {
    return supportedResolutions.map((resolution: { width: number; height: number }) => ({
      label: `${resolution.width}x${resolution.height}`,
      value: `${resolution.width}x${resolution.height}`,
    }));
  }
  return [...DEFAULT_RESOLUTION_OPTIONS];
});

// Reset currentResolution when the previously selected value disappears from
// the new list (e.g. virtual camera dropped a resolution).
watch(videoResolutionList, (newList) => {
  if (newList.length === 0) return;
  if (!newList.some(item => item.value === currentResolution.value)) {
    currentResolution.value = newList[0].value;
  }
}, { flush: 'post' });

watch(() => cameraList.value, async () => {
  if (!cameraList.value.find(item => item.deviceId === currentCameraId.value)) {
    currentCameraId.value = cameraList.value[0]?.deviceId;
  }
});

onMounted(async () => {
  if (cameraList.value.length === 0) {
    await getCameraList();
  }
  if (props.mediaSource?.sourceId) {
    currentCameraId.value = props.mediaSource.sourceId;
    if (props.mediaSource?.width !== undefined && props.mediaSource.height !== undefined) {
      currentResolution.value = `${props.mediaSource.width}x${props.mediaSource.height}`;
    }
  } else {
    currentCameraId.value = cameraList.value[0]?.deviceId;
    currentResolution.value = videoResolutionList.value[0]?.value || '';
  }
});

watch(
  () => props.mediaSource,
  async (mediaSource: MediaSource | null) => {
    if (mediaSource) {
      if (currentCameraId.value !== mediaSource.sourceId) {
        currentCameraId.value = mediaSource.sourceId;
      }
      if (mediaSource.width !== undefined && mediaSource.height !== undefined) {
        currentResolution.value = `${mediaSource.width}x${mediaSource.height}`;
      }
      isMirror.value = mediaSource.mirrorType === TRTCVideoMirrorType.TRTCVideoMirrorType_Enable;
    }
  },
  { deep: true }
);

const handleCameraChange = async (newVal: string) => {
  currentCameraId.value = newVal;
  currentResolution.value = videoResolutionList.value[0]?.value || '';
};

const handleConfirm = () => {
  const [width, height] = currentResolution.value.split('x').map(Number);
  if (!width || !height || isNaN(width) || isNaN(height)) {
    console.warn('Invalid resolution value:', currentResolution.value);
    return;
  }
  if (!props.mediaSource) {
    emits('addCameraMaterial', {
      sourceId: currentCameraId.value,
      sourceType: TRTCMediaSourceType.kCamera,
      name: cameraList.value.find(item => item.deviceId === currentCameraId.value)?.deviceName,
      width: width,
      height: height,
      rect: { left: 0, top: 0, right: width, bottom: height },
      mirrorType: isMirror.value
        ? TRTCVideoMirrorType.TRTCVideoMirrorType_Enable
        : TRTCVideoMirrorType.TRTCVideoMirrorType_Disable,
    });
  } else {
    const hasCameraNameChanged = props.mediaSource.name !== cameraList.value.find(item => item.deviceId === props.mediaSource?.sourceId)?.deviceName;
    const updateCameraInfo = {
      ...props.mediaSource,
      sourceId: currentCameraId.value,
      width,
      height,
      mirrorType: isMirror.value
        ? TRTCVideoMirrorType.TRTCVideoMirrorType_Enable
        : TRTCVideoMirrorType.TRTCVideoMirrorType_Disable,
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
  align-items: flex-start;
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
