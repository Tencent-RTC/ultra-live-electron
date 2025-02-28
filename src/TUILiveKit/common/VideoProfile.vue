<template>
  <Select
    :model-value="currentCameraResolutionValue"
    @update:model-value="handleCameraResolutionChange"
    placeholder="placeholder"
    class="select custom-element-class"
    :teleported="false"
    :popper-append-to-body="false"
  >
    <Option
      v-for="item in videoProfileList"
      :key="`${item.width}_${item.height}`"
      :label="`${item.width} X ${item.height}`"
      :value="`${item.width}_${item.height}`"
    />
  </Select>
</template>

<script setup lang="ts">
import { ref, Ref, watch, computed } from 'vue';
import { storeToRefs } from 'pinia';
import { TUIDeviceInfo } from '@tencentcloud/tuiroom-engine-electron';
import Select from './base/Select.vue';
import Option from './base/Option.vue';
import { useCurrentSourceStore } from '../store/child/currentSource';

const logger = console;
const logPrefix = '[VideoProfile]';

const currentSourceStore = useCurrentSourceStore();
const { cameraList, currentCameraId, currentCameraResolution } = storeToRefs(currentSourceStore);
const currentCameraResolutionValue = computed(() => `${currentCameraResolution.value.width}_${currentCameraResolution.value.height}`);
logger.log(`${logPrefix}`, cameraList.value, currentCameraId.value, currentCameraResolution.value);

const videoProfileList: Ref<{width: number; height: number;}[]> = ref([]);

const handleCameraResolutionChange = (value: string) => {
  logger.debug(`${logPrefix}handleCameraResolutionChange: ${value}`)
  const [width, height] = value.split('_');
  currentSourceStore.setCurrentCameraResolution({ width: Number(width), height: Number(height) });
  window.mainWindowPort?.postMessage({
    key: "setCameraTestResolution",
    data: { width: Number(width),  height:Number(height) }
  });
};

watch(currentCameraId, (newValue, oldValue) => {
  logger.debug(`${logPrefix}watch currentCameraId:`, newValue, oldValue, currentCameraId.value);
  const currentCamera = cameraList.value.find((item: TUIDeviceInfo) => item.deviceId === currentCameraId.value);
  if (currentCamera) {
    videoProfileList.value = currentCamera.deviceProperties?.SupportedResolution || [];
  } else {
    videoProfileList.value = [];
  }
  logger.log(`${logPrefix}watch currentCameraId videoProfileList:`, videoProfileList.value, currentCameraResolution.value);
}, { immediate: true });

watch(currentCameraResolution, (newValue, oldValue) => {
  logger.debug(`${logPrefix}watch currentCameraResolution:`, currentCameraResolution.value, newValue, oldValue);
});
</script>

<style lang="scss" scoped>
@import "../assets/variable.scss";

.select {
  width: 100%;
  font-size: $font-video-profile-size;
  background-color: var(--bg-color-input);
  border-radius: 0.5rem;
}
</style>
