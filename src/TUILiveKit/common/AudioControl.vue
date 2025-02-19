<template>
  <span class="audio-container">
    <svg-icon :icon="micIcon" @click="toggleMuteMic"></svg-icon>
    <!-- <svg-icon class="icon-container" :icon=ArrowSetUpIcon></svg-icon> -->
    <tui-slider class="drag-container" :value="voiceRate" @update:value="onUpdateVoiceValue" />
  </span>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import SvgIcon from './base/SvgIcon.vue';
import MicOffIcon from './icons/MicOffIcon.vue';
import ArrowSetUpIcon from './icons/ArrowSetUpIcon.vue';
import MicOnIcon from './icons/MicOnIcon.vue';
import TuiSlider from './base/Slider.vue';
import useDeviceManager from '../utils/useDeviceManager';

const deviceManager = useDeviceManager();

const voiceRate = ref(1);
let voiceRateBeforeMute = 1;
deviceManager.setAudioCaptureVolume(100);

const isMuted = ref(false);
const micIcon = computed(()=> !isMuted.value ? MicOnIcon : MicOffIcon);


const onUpdateVoiceValue = (volume: number) => {
  const value = Math.round(volume);
  voiceRate.value = value/100;
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
</script>

<style lang="scss" scoped>
@import "../assets/variable.scss";

 .audio-container{
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
  }

  .icon-container {
    padding-left: 0.25rem;
  }

  .drag-container{
    position: absolute;
    width: 4.5rem;
    left: 2.5rem;
  }
</style>
