<template>
    <span class="speaker-container" :class="{ 'disabled': speakerList.length === 0 }">
      <svg-icon :icon="speakerIcon" @click="toggleMuteSpeaker"></svg-icon>
      <TUISlider class="drag-container" :value="speakerRate" @update:value="onUpdateSpeakerValue" />
    </span>
  </template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { storeToRefs } from 'pinia';
import SvgIcon from './base/SvgIcon.vue';
import SpeakerOffIcon from './icons/SpeakerOffIcon.vue';
import SpeakerOnIcon from './icons/SpeakerOnIcon.vue';
import TUISlider from './base/Slider.vue';
import useDeviceManager from '../utils/useDeviceManager';
import { useDeviceStore } from '../store/main/device';

const deviceManager = useDeviceManager();
const deviceStore = useDeviceStore();
const { speakerList } = storeToRefs(deviceStore);

const speakerRate = ref(1);
let speakerRateBeforeMute = 1;
deviceManager.setAudioPlayoutVolume(100);

const isMuted = ref(false);
const speakerIcon = computed(() => !isMuted.value ? SpeakerOnIcon : SpeakerOffIcon);

const onUpdateSpeakerValue = (volume: number) => {
  const value = Math.round(volume);
  speakerRate.value = value / 100;
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

watch(() => speakerList.value.length, () => {
  if (speakerList.value.length === 0) {
    onUpdateSpeakerValue(0);
  } else {
    onUpdateSpeakerValue(100);
  }
}, { immediate: true });
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

      &.disabled {
        opacity: 0.5;
        cursor: not-allowed;
        pointer-events: none;
      }
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
