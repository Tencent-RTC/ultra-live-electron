<template>
  <div class="tui-video-file">
    <div class="tui-video-title tui-window-header">
      <span>{{ t('Add Video File') }}</span>
      <button class="tui-live-icon" @click="handleCloseSetting">
        <svg-icon class="tui-secondary-icon" :icon="CloseIcon"></svg-icon>
      </button>
    </div>
    <div class="tui-video-file-container">
      <div class="tui-video-file-input">
        <div>
          <span> {{ t('Select Video File') }} </span>
        </div>
        <div class="tui-video-file-browse">
          <div class="tui-input-container">
            <input type="text" class="tui-video-file-path" v-model="videoFilePath" />
          </div>
          <input type="file" class="tui-file-input" @change="handleSelectFile" ref="fileInputRef"
            accept=".mp4,.mkv,.mov">
          <button class="tui-button-cancel" @click="selectVideoFile">{{ t('Browse') }}</button>
        </div>
      </div>
      <div class="tui-video-setting">
        <span>{{ t('Video Setting') }}</span>
        <div class="tui-setting-item">
          <span class="setting-item-title"> {{ t('Volume') }}</span>
          <div class="tui-slider-local-video">
            <TUISlider :value="volumeRate" @update:value="handleVolumeChange" />
          </div>
          <span>{{ videoVolume }}</span>
        </div>
      </div>
    </div>
    <div class="tui-video-footer">
      <button v-if="mode === TUIMediaSourceEditMode.Add" class="tui-button-confirm" @click="handleAddVideo">{{ t('Add Video File') }}</button>
      <button v-else class="tui-button-confirm" @click="handleAddVideo">{{ t('Edit Video File') }}</button>
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
import TUISlider from '../../../common/base/Slider.vue';
import SvgIcon from '../../../common/base/SvgIcon.vue';
import TUIMessageBox from '../../../common/base/MessageBox';
import logger from '../../../utils/logger';

type TUIMediaSourceEditProps = {
  data?: Record<string, any>;
}

const logPrefix = '[LiveVideoFile]';

const currentSourceStore = useCurrentSourceStore();
const props = defineProps<TUIMediaSourceEditProps>();
const mode = computed(() => props.data?.mediaSourceInfo ? TUIMediaSourceEditMode.Edit : TUIMediaSourceEditMode.Add);
const { t } = useI18n();

const fileInputRef = ref<HTMLInputElement | null>(null);
const videoFilePath = ref('');
const volumeRate = ref(1);
const videoVolume = ref(100);

watch(props, async (val) => {
  if (val.data?.mediaSourceInfo) {
    const { mediaSourceInfo } = val.data as TUIMediaSourceViewModel;
    if (mediaSourceInfo.sourceType === TRTCMediaSourceType.kVideoFile) {
      videoFilePath.value = mediaSourceInfo.sourceId;
      videoVolume.value = val.data.volume;
      volumeRate.value = val.data.volume / 100;
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

function handleCloseSetting() {
  currentSourceStore.setCurrentViewName('');
  videoFilePath.value = '';
  volumeRate.value = 1;
  videoVolume.value = 100;
  window.ipcRenderer.send('close-child');
}

function handleSelectFile(event: any) {
  if (!event.target.files[0]) {
    return;
  }
  const filePath = event.target.files[0].path;
  if (filePath) {
    videoFilePath.value = filePath;
    logger.log(`${logPrefix}handleSelectFile, filePath: ${filePath}`);
  } else {
    logger.error(`${logPrefix}handleSelectFile, filePath not found`);
  }
}

function selectVideoFile() {
  if (fileInputRef.value) {
    fileInputRef.value.click();
  }
}

function handleAddVideo() {
  logger.debug(`${logPrefix}handleAddVideoPath, videoFilePath: ${videoFilePath.value}`);
  if (!videoFilePath.value || videoFilePath.value.length === 0) {
    TUIMessageBox({
      title: t('Note'),
      message: t('Please select a video file'),
      confirmButtonText: t('Sure'),
    });
    return;
  }
  if(!isVideoFileSupport(videoFilePath.value)) {
    TUIMessageBox({
      title: t('Note'),
      message: t('Video file format not supported'),
      confirmButtonText: t('Sure'),
    });
    return;
  }
  const videoSource = {
    type: TRTCMediaSourceType.kVideoFile,
    id: videoFilePath.value,
    name: videoFilePath.value,
    volume: videoVolume.value,
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

function isVideoFileSupport(filePath: string) {
  return filePath.endsWith('.mp4') || filePath.endsWith('.mkv') || filePath.endsWith('.mov');
}
</script>

<style lang="scss" scoped>
@import "../../../assets/global.scss";

.tui-video-file {
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

.tui-video-file-container {
  width: 100%;
  height: 100%;
}

.tui-video-file-input {
  display: flex;
  flex-direction: column;
  margin: 1.5rem;
  gap: 0.5rem;

  span {
    font-size: 14px;
    font-weight: 600;
  }

  .tui-video-file-browse {
    display: flex;
    width: 100%;
    flex: 1;
    align-items: center;
    height: 2rem;
    gap: 0.5rem;

    .tui-input-container {
      display: flex;
      width: 28rem;
      align-items: center;
      height: 2rem;
      padding: 0 0.5rem;
      border: 1px solid var(--text-color-tertiary);
      background-color: $color-picker-input-container-background;
      border-radius: 0.375rem;
    }

    .tui-video-file-path {
      width: 100%;
      color: var(--text-color-primary);
      padding: 0;
      cursor: pointer;
      background: $color-picker-input-background;
      border: none;
      outline: none;
    }

    .tui-file-input {
      display: none;
    }
  }
}

.tui-video-setting {
  display: flex;
  flex-direction: column;
  margin: 1.5rem;
  gap: 0.5rem;
  font-weight: 600;
}

.tui-setting-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  height: 2rem;

  .setting-item-title {
    width: 7.5rem;
  }

  span {
    width: 4rem;
    text-align: left;
    font-weight: 400;
  }

  .tui-slider-local-video {
    display: flex;
    flex: 1;
    width: 60%;
  }
}

.tui-video-volume {
  display: flex;
  align-items: center;
  height: 2rem;
  gap: 0.5rem;

  span {}
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
