<template>
  <span class="audio-container" :class="{ 'disabled': microphoneList.length === 0 }">
    <svg-icon :icon="micIcon" @click="toggleMuteMic"></svg-icon>
    <TUISlider class="drag-container" :value="voiceRate" @update:value="onUpdateVoiceValue" />
  </span>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { storeToRefs } from 'pinia';
import SvgIcon from './base/SvgIcon.vue';
import MicOffIcon from './icons/MicOffIcon.vue';
import MicOnIcon from './icons/MicOnIcon.vue';
import TUISlider from './base/Slider.vue';
import useDeviceManager from '../utils/useDeviceManager';
import { useDeviceStore } from '../store/main/device';

const deviceManager = useDeviceManager();
const deviceStore = useDeviceStore();
const { microphoneList } = storeToRefs(deviceStore);

const voiceRate = ref(1);
let voiceRateBeforeMute = 1;
deviceManager.setAudioCaptureVolume(100);

const isMuted = ref(false);
const micIcon = computed(() => !isMuted.value ? MicOnIcon : MicOffIcon);

const onUpdateVoiceValue = (volume: number) => {
  const value = Math.round(volume);
  voiceRate.value = value / 100;
  deviceManager.setAudioCaptureVolume(value);

  if (voiceRate.value === 0) {
    isMuted.value = true;
    deviceManager.muteLocalAudio(true);
  } else if (isMuted.value) {
    isMuted.value = false;
    deviceManager.muteLocalAudio(false);
  }
};

const toggleMuteMic = () => {
  isMuted.value = !isMuted.value;
  deviceManager.muteLocalAudio(isMuted.value);
  if (isMuted.value) {
    voiceRateBeforeMute = voiceRate.value;
    voiceRate.value = 0;
  } else {
    voiceRate.value = voiceRateBeforeMute;
  }
};

watch(() => microphoneList.value.length, () => {
  if (microphoneList.value.length === 0) {
    onUpdateVoiceValue(0);
  } else {
    onUpdateVoiceValue(100);
  }
}, { immediate: true });
</script>

<style lang="scss" scoped>
@import "../assets/variable.scss";

.audio-container {
  position: relative;
  width: 8rem;
  height: 2.5rem;
  display: block;
  background: var(--tab-color-unselected);
  border-radius: 0.25rem;
  display: flex;
  padding-left: 0.5rem;
  margin-right: 0.375rem;
  display: flex;
  align-items: center;
  color: $color-icon-default;

  &.disabled {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
  }
}

.icon-container {
  padding-left: 0.25rem;
}

.drag-container {
  position: absolute;
  width: 4.5rem;
  left: 2.5rem;
}
</style>
