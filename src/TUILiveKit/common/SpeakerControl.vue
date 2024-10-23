<template>
    <span class="speaker-container">
      <svg-icon :icon="speakerIcon" @click="toggleMuteSpeaker"></svg-icon>
      <!-- <svg-icon class="icon-container" :icon=ArrowSetUpIcon></svg-icon> -->
      <tui-slider class="drag-container" :value="speakerRate" @update:value="onUpdateSpeakerValue" />
    </span>  
  </template>
    
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { TUIMediaDeviceType } from '@tencentcloud/tuiroom-engine-electron';
import SvgIcon from './base/SvgIcon.vue';
import SpeakerOffIcon from './icons/SpeakerOffIcon.vue';
import ArrowSetUpIcon from './icons/ArrowSetUpIcon.vue';
import SpeakerOnIcon from './icons/SpeakerOnIcon.vue';
import useRoomEngine from '../utils/useRoomEngine';
import TuiSlider from './base/Slider.vue';
import useDeviceManager from '../utils/useDeviceManager';

const roomEngine = useRoomEngine();
const deviceManager = useDeviceManager();

const speakerRate = ref(0);
let currentSpeakerRate: number;
const speakerIcon = computed(()=> speakerRate.value ? SpeakerOnIcon : SpeakerOffIcon);

const onUpdateSpeakerValue = (volume: number) => {
  const value = Math.round(volume);
  speakerRate.value = value/100;
  deviceManager.setCurrentDeviceVolume(TUIMediaDeviceType.kMediaDeviceTypeAudioOutput, value);
}

const toggleMuteSpeaker = () => {
  if (speakerRate.value) {
    currentSpeakerRate = speakerRate.value; 
    deviceManager.setCurrentDeviceMute(TUIMediaDeviceType.kMediaDeviceTypeAudioOutput, true);
    speakerRate.value = 0;
  } else {
    deviceManager.setCurrentDeviceMute(TUIMediaDeviceType.kMediaDeviceTypeAudioOutput, false);
    speakerRate.value = currentSpeakerRate;
  }
}

onMounted(async () => {
  try {
    const speakerVolume = await deviceManager.getCurrentDeviceVolume(TUIMediaDeviceType.kMediaDeviceTypeAudioOutput);
    speakerRate.value = speakerVolume/100;
  } catch (error) {
    console.error('Get current device volume failed:', error);
  }
});
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
 