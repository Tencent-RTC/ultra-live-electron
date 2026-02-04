<!--
  * Name: DeviceSelect
  * @param deviceType String required
  * @param size String 'large'|'medium'|'small'
  * Usage:
  * Use <device-select></device-select> in template
-->
<template>
  <Select
    v-model="content"
    placeholder="placeholder"
    class="select"
    :disabled="disabled"
    :teleported="false"
    :popper-append-to-body="false"
    @change="handleChange"
  >
    <Option
      v-for="item in deviceList"
      :key="item.deviceId"
      :label="item.deviceName"
      :value="item.deviceId"
    />
  </Select>
</template>

<script setup lang="ts">
import { ref, Ref, defineProps, computed } from 'vue';
import { TUIDeviceInfo } from '@tencentcloud/tuiroom-engine-electron';
import Select from './base/Select.vue';
import Option from './base/Option.vue';
import { useCurrentSourceStore } from '../store/child/currentSource';
import { storeToRefs } from 'pinia';
import logger from '../utils/logger';

interface Props {
  deviceType: string,
  onChange?: (id: string) => void,
  disabled?: boolean
}
// eslint-disable-next-line vue/no-setup-props-destructure
const { deviceType, onChange, disabled = false } = defineProps<Props>();
const currentSourceStore = useCurrentSourceStore();

const {
  cameraList,
  microphoneList,
  speakerList,
  currentCameraId,
  currentMicrophoneId,
  currentSpeakerId,
} = storeToRefs(currentSourceStore);

const deviceList: Ref<TUIDeviceInfo[]> = ref(getDeviceList() as TUIDeviceInfo[]);
const currentDeviceId = ref(getInitDeviceId());
const content = computed(() => {
  return disabled ? '' : currentDeviceId.value;
});

function getInitDeviceId() {
  if (deviceType === 'camera') {
    return currentCameraId;
  }
  if (deviceType === 'microphone') {
    return currentMicrophoneId;
  }
  if (deviceType === 'speaker') {
    return currentSpeakerId;
  }
  return '';
}

function getDeviceList() {
  if (deviceType === 'camera') {
    return cameraList;
  }
  if (deviceType === 'microphone') {
    return microphoneList;
  }
  if (deviceType === 'speaker') {
    return speakerList;
  }
  return [];
}
async function handleChange(deviceId: string) {
  logger.log('[DeviceSelect]handleChange:', deviceId);
  onChange && onChange(deviceId);
  switch (deviceType) {
  case 'camera':
    currentSourceStore.setCurrentCameraId(deviceId);
    break;
  case 'microphone':
    currentSourceStore.setCurrentMicrophoneId(deviceId);
    break;
  case 'speaker':
    currentSourceStore.setCurrentSpeakerId(deviceId);
    break;
  default:
    break;
  }
}
</script>

<style lang="scss" scoped>
@import "../assets/variable.scss";

.select {
  width: 100%;
  font-size: $font-device-select-size;
  background-color: var(--bg-color-input);
  border-radius: 0.5rem;
}
</style>
