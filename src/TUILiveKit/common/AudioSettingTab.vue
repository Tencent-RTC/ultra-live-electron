<template>
  <div class= "audio-setting-tab">
    <div class="item-setting">
      <span class="title">{{ t('Mic') }}</span>
      <div class="flex">
        <device-select
          class="select"
          device-type="microphone"
        ></device-select>
        <span 
          class="test"
          v-if="isDetailMode"
          @click="handleMicrophoneTest"
        >
          {{ isTestingMicrophone ? t('Stop') : t('Test') }}
        </span>
      </div>
    </div>
    <div class="item-setting">
      <span class="title">{{ t('Output') }}</span>
      <div class="mic-bar-container">
        <div
          v-for="(item, index) in new Array(volumeTotalNum).fill('')"
          :key="index"
          :class="['mic-bar', `${showMicVolume && micVolumeNum > index ? 'active' : ''}`]"
        >
        </div>
      </div>
    </div>
    <div v-if="(speakerList.length > 0)" class="item-setting">
      <span class="title">{{ t('Speaker') }}</span>
      <div class="flex">
        <device-select
          class="select"
          device-type="speaker"
        ></device-select>
        <span 
          class="test"
          v-if="isDetailMode"
          @click="handleSpeakerTest"
        >
          {{ isTestingSpeaker ? t('Stop') : t('Test') }}
        </span>
      </div>
    </div>
    <div class="item-setting">
      <span class="title">{{ t('Output') }}</span>
      <div class="mic-bar-container">
        <div
          v-for="(item, index) in new Array(volumeTotalNum).fill('')"
          :key="index"
          :class="['mic-bar', `${showSpeakerVolume && speakerVolumeNum > index ? 'active' : ''}`]"
        >
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { ref, computed, defineProps } from 'vue';
import DeviceSelect from './DeviceSelect.vue';
import { useCurrentSourceStore } from '../store/child/currentSource';
import { SettingMode } from '../constants/render';
import { useI18n } from '../locales';

interface Props {
  mode?: SettingMode,
  audioVolume?: number,
}
const props = defineProps<Props>();
const settingMode = props.mode || SettingMode.Simple;
const isSampleMode = computed(() => settingMode === SettingMode.Simple);
const isDetailMode = computed(() => settingMode === SettingMode.Detail);

const currentSourceStore = useCurrentSourceStore();
const { t } = useI18n();
const { speakerList, micVolume, speakerVolume } = storeToRefs(currentSourceStore);

const volumeTotalNum = computed(() => (isDetailMode.value ? 36 : 28));

const micVolumeNum = computed(() => {
  const volume = props.audioVolume || micVolume.value || 0;
  return volume * volumeTotalNum.value / 100;
});

const speakerVolumeNum = computed(() => {
  const volume = speakerVolume.value || 0;
  return volume * volumeTotalNum.value / 100;
})

const showSpeakerVolume = computed(() => isSampleMode.value || (isDetailMode.value && isTestingSpeaker.value))
const showMicVolume = computed(() => isSampleMode.value || (isDetailMode.value && isTestingMicrophone.value));

const isTestingMicrophone = ref(false);

const isTestingSpeaker = ref(false);
/**
 * Click on the microphone [Test] button
*/
function handleMicrophoneTest() {
  isTestingMicrophone.value = !isTestingMicrophone.value;
  const isStartMicrophoneTest = isTestingMicrophone.value;
  if (isStartMicrophoneTest) {
    window.mainWindowPort?.postMessage({
      key: "startTestMic",
      data: {
        interval: 200,
        playback: true,
      }
    });
  } else {
    window.mainWindowPort?.postMessage({
      key: "stopTestMic",
    });
  }
}

/**
 * Click on the speaker [Test] button
 */
async function handleSpeakerTest() {
  const SPEAKER_TEST_URL = 'https://web.sdk.qcloud.com/trtc/electron/download/resources/media/TestSpeaker.mp3';
  isTestingSpeaker.value = !isTestingSpeaker.value;
  const isStartSpeakerTest = isTestingSpeaker.value;
  if (isStartSpeakerTest) {
    window.mainWindowPort?.postMessage({
      key: "startTestSpeaker",
      data: SPEAKER_TEST_URL
    });
  } else {
    window.mainWindowPort?.postMessage({
      key: "stopTestSpeaker",
    });
  }
}

</script>

<style lang="scss" scoped>
@import "../assets/variable.scss";

.audio-setting-tab {
  border-radius: 0.25rem;
  font-size: 0.75rem;
  width: 100%;
  .item-setting {
    width: 100%;
    &:not(:last-child) {
      margin-bottom: 20px;
    }
  }
  .flex {
    width: 100%;
    display: flex;
    align-items: center;
  }
  .select {
    flex: 1;
  }
  .button {
    margin-left:0.625rem;
    padding:0.3125rem 1.4375rem;
    width:4.625rem;
  }
  .title {
    display: inline-block;
    margin-bottom:0.5rem;
    width:100%;
    color:$font-audio-setting-tab-title-color;
    font-size:$font-audio-setting-tab-title-size;
    font-weight:$font-audio-setting-tab-title-weight;
  line-height:1.375rem;
  }
  .mic-bar-container {
    display: flex;
    justify-content: space-between;
    .mic-bar {
      width:0.1875rem;
      height:0.375rem;
      background-color: $color-audio-setting-tab-mic-bar-background;
      &.active {
        background-color: $color-audio-setting-tab-mic-bar-active-background;
      }
    }
  }
  .audio-level-container {
    width: 100%;
    height:1.25rem;
    display:flex;
    .slider {
      height:1.25rem;
      margin-left:0.625rem;
    }
  }
}
.test{
  padding:0.375rem 1.375rem;
	border-radius:2.25rem;
	margin-left:0.625rem;
	font-size:$font-audio-setting-tab-test-size;
	font-style:normal;
	font-weight:$font-audio-setting-tab-test-weight;
	line-height:1.375rem;
  margin-top: 0.75rem;
  background-color: var(--button-color-primary-default);
}
</style>
