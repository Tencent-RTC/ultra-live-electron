<template>
    <span class="speaker-container">
      <svg-icon :icon="speakerIcon" @click="toggleMuteSpeaker"></svg-icon>
      <!-- <svg-icon class="icon-container" :icon=ArrowSetUpIcon></svg-icon> -->
      <tui-slider class="drag-container" :value="speakerRate" @update:value="onUpdateSpeakerValue" />
    </span>
  </template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import SvgIcon from './base/SvgIcon.vue';
import SpeakerOffIcon from './icons/SpeakerOffIcon.vue';
import ArrowSetUpIcon from './icons/ArrowSetUpIcon.vue';
import SpeakerOnIcon from './icons/SpeakerOnIcon.vue';
import TuiSlider from './base/Slider.vue';
import useDeviceManager from '../utils/useDeviceManager';

const deviceManager = useDeviceManager();

const speakerRate = ref(1);
let speakerRateBeforeMute = 1;
deviceManager.setAudioPlayoutVolume(100);

const isMuted = ref(false);
const speakerIcon = computed(()=> !isMuted.value ? SpeakerOnIcon : SpeakerOffIcon);


const onUpdateSpeakerValue = (volume: number) => {
  const value = Math.round(volume);
  speakerRate.value = value/100;
  deviceManager.setAudioPlayoutVolume(value);

  if (speakerRate.value === 0) {
    isMuted.value = true;
  } else if (isMuted.value) {
    isMuted.value = false;
  }
};

const toggleMuteSpeaker = () => {
  isMuted.value = !isMuted.value;
  if (isMuted.value) {
    speakerRateBeforeMute = speakerRate.value;
    speakerRate.value = 0;
    deviceManager.setAudioPlayoutVolume(0);
  } else {
    speakerRate.value = speakerRateBeforeMute;
    deviceManager.setAudioPlayoutVolume(speakerRate.value * 100);
  }
};
</script>

  <style lang="scss" scoped>
  @import "../assets/variable.scss";
   .speaker-container{
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
