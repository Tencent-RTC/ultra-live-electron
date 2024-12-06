<template>
  <span class="audio-container">
    <svg-icon :icon="micIcon" @click="toggleMuteMic"></svg-icon>
    <!-- <svg-icon class="icon-container" :icon=ArrowSetUpIcon></svg-icon> -->
    <tui-slider class="drag-container" :value="voiceRate" @update:value="onUpdateVoiceValue" />
  </span>  
</template>
  
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import SvgIcon from './base/SvgIcon.vue';
import MicOffIcon from './icons/MicOffIcon.vue';
import ArrowSetUpIcon from './icons/ArrowSetUpIcon.vue';
import MicOnIcon from './icons/MicOnIcon.vue';
import TuiSlider from './base/Slider.vue';
import useDeviceManager from '../utils/useDeviceManager';

const deviceManager = useDeviceManager();

const voiceRate = ref(0);
let currentVoiceRate: number;

const micIcon = computed(()=> voiceRate.value ? MicOnIcon : MicOffIcon);

const onUpdateVoiceValue = (volume: number) => {
  const value = Math.round(volume);
  voiceRate.value = value/100;
  deviceManager.setCurrentMicDeviceVolume(value);
}

const toggleMuteMic = () => {
  if (voiceRate.value) {
    currentVoiceRate = voiceRate.value; 
    deviceManager.setCurrentMicDeviceMute(true);
    voiceRate.value = 0;
  } else {
    deviceManager.setCurrentMicDeviceMute(false);
    voiceRate.value = currentVoiceRate;
  }
}

onMounted(async () => {
  try {
    const micVolume = await deviceManager.getCurrentMicDeviceVolume();
    voiceRate.value = micVolume/100;
  } catch (error) {
    console.error('Get current device volume failed:', error);
  }
});
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
