<template>
  <div class="basic-setting">
    <div class="item-setting">
      <span class="title">{{ t('Camera') }}</span>
      <TUISelect class="camera-select" :model-value="modelValueCamera" :disabled="cameraSelectDisabled" @change="onCameraChange">
        <TUIOption
          v-for="item in cameraList"
          :key="item.deviceId"
          :value="item.deviceId"
          :label="item.deviceName"
          :disabled="isCameraOptionDisabled(item.deviceId)"
        />
      </TUISelect>
    </div>
    <div class="item-setting">
      <span class="title">{{ t('Resolution') }}</span>
      <TUISelect class="resolution-select" :model-value="modelValueResolution" @change="onResolutionChange">
        <TUIOption v-for="item in resolutionList" :key="item.value" :value="item.value" :label="item.label" />
      </TUISelect>
    </div>
  </div>
</template>

<script setup lang="ts">
import { TUISelect, TUIOption, useUIKit } from '@tencentcloud/uikit-base-component-vue3';

const { t } = useUIKit();

defineProps<{
  cameraList: Array<{ deviceId: string; deviceName: string; [k: string]: unknown }>;
  modelValueCamera: string;
  modelValueResolution: string;
  resolutionList: Array<{ value: string; label: string }>;
  isCameraOptionDisabled: (deviceId: string) => boolean;
  /** Disable the whole camera dropdown while a camera add/switch is in flight. */
  cameraSelectDisabled?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:camera', value: string): void;
  (e: 'update:resolution', value: string): void;
}>();

const onCameraChange = (val: string) => emit('update:camera', val);
const onResolutionChange = (val: string) => emit('update:resolution', val);
</script>

<style lang="scss" scoped>
.basic-setting {
  width: 100%;
  max-width: 640px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  margin-top: 16px;
  padding-left: 16px;
}

.item-setting {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;

  & + .item-setting {
    margin-top: 16px;
  }

  .title {
    flex-shrink: 0;
    font-size: 14px;
    color: var(--text-color-secondary);
    margin-right: 16px;
  }
}

.camera-select,
.resolution-select {
  width: 400px;
}
</style>
