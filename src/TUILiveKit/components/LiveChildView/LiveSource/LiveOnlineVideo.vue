<template>
  <div class="tui-online-video">
    <div class="tui-video-title tui-window-header">
      <span>{{ t('Add Online Video') }}</span>
      <button class="tui-icon" @click="handleCloseSetting">
        <svg-icon class="tui-secondary-icon" :icon="CloseIcon"></svg-icon>
      </button>
    </div>
    <div class="tui-video-input">
      <div class="tui-online-online-video">
        <div>
          <span> {{ t('Online Video URL') }} </span>
        </div>
        <div class="tui-input-container">
          <input type="text" v-model="onlineVideoUrl" />
        </div>
      </div>
      <div class="tui-video-setting">
        <span>{{ t('Video Setting') }}</span>
        <div class="tui-setting-item">
          <span class="setting-item-title"> {{ t('Volume') }}</span>
          <div class="tui-slider">
            <TuiSlider :value="volumeRate" @update:value="handleVolumeChange" />
          </div>
          <span>{{ videoVolume }}</span>
        </div>
        <div class="tui-setting-item">
          <span class="setting-item-title">{{ t('Network Cache') }}</span>
          <div class="tui-slider">
            <TuiSlider :value="networkCacheRate" @update:value="handleNetworkCacheChange" />
          </div>
          <span>{{ networkCacheSize }} KB</span>
        </div>
      </div>
    </div>
    <div class="tui-video-footer">
      <button v-if="mode === TUIMediaSourceEditMode.Add" class="tui-button-confirm" @click="handleAddVideo">{{ t('Add Online Video') }}</button>
      <button v-else class="tui-button-confirm" @click="handleAddVideo">{{ t('Edit Online Video') }}</button>
      <button class="tui-button-cancel" @click="handleCloseSetting">{{ t('Cancel') }}</button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, defineProps, computed, watch } from 'vue';
import { TRTCMediaSourceType } from 'trtc-electron-sdk';
import { useI18n } from '../../../locales';
import { TUIMediaSourceEditMode } from '../../../constants/tuiConstant';
import { TUIMediaSourceViewModel } from '../../../types';
import { useCurrentSourceStore } from '../../../store/child/currentSource';
import CloseIcon from '../../../common/icons/CloseIcon.vue';
import TuiSlider from '../../../common/base/Slider.vue';
import SvgIcon from '../../../common/base/SvgIcon.vue';
import TUIMessageBox from '../../../common/base/MessageBox';
import logger from '../../../utils/logger';

type TUIMediaSourceEditProps = {
  data?: Record<string, any>;
}

const logPrefix = '[LiveOnlineVideo]';

const currentSourceStore = useCurrentSourceStore();
const props = defineProps<TUIMediaSourceEditProps>();
const mode = computed(() => props.data?.mediaSourceInfo ? TUIMediaSourceEditMode.Edit : TUIMediaSourceEditMode.Add);
const { t } = useI18n();

const onlineVideoUrl = ref('');
const volumeRate = ref(1);
const videoVolume = ref(100);
const networkCacheRate = ref(0.1);
const networkCacheSize = ref(1024);
const maxNetworkCacheSize = 10240;

watch(props, async (val) => {
  if (val.data?.mediaSourceInfo) {
    const { mediaSourceInfo } = val.data as TUIMediaSourceViewModel;
    if (mediaSourceInfo.sourceType === TRTCMediaSourceType.kOnlineVideo) {
      onlineVideoUrl.value = mediaSourceInfo.sourceId;
      videoVolume.value = val.data.volume;
      volumeRate.value = val.data.volume / 100;
      networkCacheSize.value = val.data.networkCacheSize;
      networkCacheRate.value = val.data.networkCacheSize / maxNetworkCacheSize;
    } else {
      logger.warn(`${logPrefix}watch props.data error. Invalid data:`, val);
    }
  }
}, {
  immediate: true
});

function handleVolumeChange(value: number) {
  videoVolume.value = value;
  volumeRate.value = value / 100;
}

function handleNetworkCacheChange(value: number) {
  networkCacheSize.value = Math.floor(value / 100 * maxNetworkCacheSize);
  networkCacheRate.value = value / 100;
}

function handleCloseSetting() {
  currentSourceStore.setCurrentViewName('');
  onlineVideoUrl.value = '';
  volumeRate.value = 1;
  videoVolume.value = 100;
  networkCacheRate.value = 0.1;
  networkCacheSize.value = 1024;
  window.ipcRenderer.send('close-child');
}

function handleAddVideo() {
  logger.debug(`${logPrefix}handleAddOnlineVideo, onlineVideoUrl: ${onlineVideoUrl.value}`);
  if (!onlineVideoUrl.value || onlineVideoUrl.value.length === 0) {
    TUIMessageBox({
      title: t('Note'),
      message: t('No Online Video'),
      confirmButtonText: t('Sure'),
    });
    return;
  }
  if(!isVideoFileSupport(onlineVideoUrl.value)){
    TUIMessageBox({
      title: t('Note'),
      message: t('Unsupported online video protocol'),
      confirmButtonText: t('Sure'),
    });
    return;
  }
  const videoSource = {
    type: TRTCMediaSourceType.kOnlineVideo,
    id: onlineVideoUrl.value,
    name: onlineVideoUrl.value,
    width: 640,
    height: 360,
    volume: videoVolume.value,
    networkCacheSize: networkCacheSize.value,
    predata: null
  };

  if (mode.value === TUIMediaSourceEditMode.Edit) {
    videoSource.predata = JSON.parse(JSON.stringify(props.data));
  }

  window.mainWindowPortInChild?.postMessage({
    key: mode.value === TUIMediaSourceEditMode.Edit ? 'updateMediaSource' : 'addMediaSource',
    data: videoSource
  });

  handleCloseSetting();
}

function isVideoFileSupport(url: string) {
  return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('rtmp://');
}
</script>

<style lang="scss" scoped>
@import "../../../assets/global.scss";

.tui-online-video {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 100%;
  overflow-y: auto;
  color: var(--text-color-primary);
  background-color: var(--bg-color-dialog);
  font-size: 14px;
  font-weight: 400;
}

.tui-video-title {
  font-weight: 500;
  color: var(--text-color-primary);
  padding: 0 1.5rem 0 1.375rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.tui-video-input {
  width: 100%;
  height: 100%;
}

.tui-online-online-video {
  display: flex;
  flex-direction: column;
  margin: 1.5rem;
  gap: 0.5rem;

  span {
    font-size: 14px;
    font-weight: 600;
  }

  .tui-input-container {
    display: flex;
    align-items: center;
    height: 2rem;
    padding: 0 0.5rem;
    border: 1px solid var(--text-color-tertiary);
    background-color: $color-picker-input-container-background;
    border-radius: 0.375rem;
  }

  input {
    width: 100%;
    color: var(--text-color-primary);
    padding: 0;
    cursor: pointer;
    background: $color-picker-input-background;
    border: none;
    outline: none;
  }
}

.tui-video-setting {
  display: flex;
  flex-direction: column;
  margin: 1.5rem;
  gap: 0.5rem;

  span {
    font-weight: 600;
  }
}

.tui-setting-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  height: 2rem;

  .setting-item-title {
    width: 7.5rem;
  }

  span {
    width: 4.5rem;
    text-align: left;
    font-weight: 400;
  }

  .tui-slider {
    display: flex;
    flex: 1;
  }
}

.tui-video-volume {
  display: flex;
  align-items: center;
  height: 2rem;
  gap: 0.5rem;
}

.tui-network-cache {
  display: flex;
  align-items: center;
  height: 2rem;
  gap: 0.5rem;
}

.tui-video-footer {
  height: 4rem;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0 1.5rem;
  background-color: var(--bg-color-dialog);
}
</style>
