<template>
<div class="setting-panel-dialog-root">
  <div class="setting-panel">
    <div class="setting-panel-header">
      <div class="panel-actions">
        <button
          class="panel-close-btn"
          type="button"
          :title="t('Close')"
          :aria-label="t('Close')"
          @click="handleClose"
        >
          <IconClose :size="16" />
        </button>
      </div>
    </div>
    <div class="setting-panel-body">
      <div class="section">
        <div class="section-title">
          {{ t('Video profile') }}
        </div>
        <div class="row">
          <span class="label">{{ t('Resolution') }}</span>
          <TUISelect
            v-model="localPublishVideoQuality"
            placeholder="placeholder"
            class="select"
            :teleported="false"
            :popper-append-to-body="false"
            :disabled="isCreatedLive"
            @change="handlePublishVideoQualityChange"
          >
            <TUIOption
              v-for="(item, index) in videoQualityList"
              :key="index"
              :label="item.label"
              :value="item.value"
            />
          </TUISelect>
        </div>
      </div>
      <div class="divider"/>
      <div class="section">
        <div class="section-title">
          {{ t('Audio settings') }}
        </div>
        <div class="audio-item">
          <div class="audio-label">{{ t('Microphone') }}</div>
          <div class="audio-control with-button">
            <TUISelect
              v-model="localMicrophoneId"
              class="select"
              :placeholder="t('Select microphone')"
              :teleported="false"
              :popper-append-to-body="false"
              @change="handleMicrophoneChange"
            >
              <TUIOption
                v-for="item in microphoneList"
                :key="item.deviceId"
                :label="item.deviceName"
                :value="item.deviceId"
              />
            </TUISelect>
            <TUIButton class="test-btn" @click="handleMicTest">
              {{ isMicrophoneTesting ? t('Stop') : t('Test') }}
            </TUIButton>
          </div>
        </div>
        <div class="audio-item">
          <div class="audio-label">{{ t('Input level') }}</div>
          <div class="audio-control">
            <div class="mic-bar-container">
              <div
                v-for="(_, index) in volumeBars"
                :key="index"
                :class="[
                    'mic-bar',
                    `${isMicrophoneTesting && volumeNum > index ? 'active' : ''}`,
                  ]"
              />
            </div>
          </div>
        </div>
        <div class="audio-item">
          <div class="audio-label">{{ t('Input volume') }}</div>
          <div class="audio-control">
            <TUISlider
              v-model="localCaptureVolume"
              class="slider"
              :min="0"
              :max="100"
            />
            <span class="volume-value">{{ localCaptureVolume }}</span>
          </div>
        </div>
        <div class="audio-item">
          <div class="audio-label">{{ t('Speaker') }}</div>
          <div class="audio-control with-button">
            <TUISelect
              v-model="localSpeakerId"
              class="select"
              :placeholder="t('Select speaker')"
              :teleported="false"
              :popper-append-to-body="false"
              @change="handleSpeakerChange"
            >
              <TUIOption
                v-for="item in speakerList"
                :key="item.deviceId"
                :label="item.deviceName"
                :value="item.deviceId"
              />
            </TUISelect>
            <TUIButton class="test-btn" @click="handleSpeakerTest">
              {{ isSpeakerTesting ? t('Stop') : t('Test') }}
            </TUIButton>
          </div>
        </div>
        <div class="audio-item">
          <div class="audio-label">{{ t('Output volume') }}</div>
          <div class="audio-control">
            <TUISlider
              v-model="localOutputVolume"
              class="slider"
              :min="0"
              :max="100"
            />
            <span class="volume-value">{{ localOutputVolume }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
</template>

<script setup lang="ts">
import { computed, defineEmits, defineProps, onUnmounted, ref, watch } from 'vue';
import { TUIVideoQuality } from '@tencentcloud/tuiroom-engine-electron';
import {
  useUIKit,
  TUIButton,
  TUIOption,
  TUISelect,
  TUISlider,
  IconClose,
} from '@tencentcloud/uikit-base-component-vue3';
import { ipcBridge, IPCMessageType } from '../../../ipc';
import type { ApplyLiveSettingPayload } from '../../../ipc';

type DeviceItem = {
  deviceId: string;
  deviceName: string;
};

type SettingPanelData = {
  publishVideoQuality?: number;
  isCreatedLive?: boolean;
  microphoneList?: DeviceItem[];
  currentMicrophoneId?: string;
  speakerList?: DeviceItem[];
  currentSpeakerId?: string;
  captureVolume?: number;
  outputVolume?: number;
  currentMicVolume?: number;
  testingMicVolume?: number;
  isMicrophoneTesting?: boolean;
  isSpeakerTesting?: boolean;
};

const props = defineProps<{
  data?: Record<string, unknown>;
}>();

const emits = defineEmits<{
  close: [];
}>();

const { t } = useUIKit();

const localPublishVideoQuality = ref<number>(TUIVideoQuality.kVideoQuality_1080p);
const localMicrophoneId = ref('');
const localSpeakerId = ref('');
const localCaptureVolume = ref(100);
const localOutputVolume = ref(100);
const isSyncingFromMain = ref(false);

const panelData = computed<SettingPanelData>(() => (props.data || {}) as SettingPanelData);
const isCreatedLive = computed(() => !!panelData.value.isCreatedLive);
const isMicrophoneTesting = computed(() => !!panelData.value.isMicrophoneTesting);
const isSpeakerTesting = computed(() => !!panelData.value.isSpeakerTesting);
const currentMicVolume = computed(() => panelData.value.currentMicVolume || 0);
const testingMicVolume = computed(() => panelData.value.testingMicVolume || 0);
const microphoneList = computed<DeviceItem[]>(() => panelData.value.microphoneList || []);
const speakerList = computed<DeviceItem[]>(() => panelData.value.speakerList || []);

const videoQualityList = computed(() => [
  { label: t('High Definition'), value: TUIVideoQuality.kVideoQuality_720p },
  { label: t('Super Definition'), value: TUIVideoQuality.kVideoQuality_1080p },
]);

const volumeTotalNum = 28;
const volumeBars = Array.from({ length: volumeTotalNum });
const volumeNum = computed(() => {
  const volume = isMicrophoneTesting.value ? testingMicVolume.value : currentMicVolume.value;
  return (volume * volumeTotalNum) / 100;
});

const emitAction = (action: ApplyLiveSettingPayload['action'], value?: number | string) => {
  const payload: ApplyLiveSettingPayload = { action, value };
  ipcBridge.sendToMain(IPCMessageType.APPLY_LIVE_SETTING, payload);
};

watch(
  panelData,
  (data) => {
    isSyncingFromMain.value = true;
    if (typeof data.publishVideoQuality === 'number') {
      localPublishVideoQuality.value = data.publishVideoQuality;
    }
    if (localMicrophoneId.value !== data.currentMicrophoneId) {
      localMicrophoneId.value = data.currentMicrophoneId || '';
    }
    if (localSpeakerId.value !== data.currentSpeakerId) {
      localSpeakerId.value = data.currentSpeakerId || '';
    }
    if (localCaptureVolume.value !== data.captureVolume) {
      localCaptureVolume.value = typeof data.captureVolume === 'number' ? data.captureVolume : 100;
    }
    if (localOutputVolume.value !== data.outputVolume) {
      localOutputVolume.value = typeof data.outputVolume === 'number' ? data.outputVolume : 100;
    }
    isSyncingFromMain.value = false;
  },
  { immediate: true, deep: true },
);

watch(localCaptureVolume, (value, oldValue) => {
  if (!isSyncingFromMain.value && value !== oldValue) {
    emitAction('setCaptureVolume', value);
  }
}, { flush: 'sync' });

watch(localOutputVolume, (value, oldValue) => {
  if (!isSyncingFromMain.value && value !== oldValue) {
    emitAction('setOutputVolume', value);
  }
}, { flush: 'sync' });

const handlePublishVideoQualityChange = (value: number) => {
  emitAction('setPublishVideoQuality', value);
};

const handleMicrophoneChange = (deviceId: string) => {
  emitAction('setCurrentMicrophone', deviceId);
};

const handleSpeakerChange = (deviceId: string) => {
  emitAction('setCurrentSpeaker', deviceId);
};

const handleMicTest = () => {
  emitAction(isMicrophoneTesting.value ? 'stopMicrophoneTest' : 'startMicrophoneTest');
};

const handleSpeakerTest = () => {
  emitAction(isSpeakerTesting.value ? 'stopSpeakerTest' : 'startSpeakerTest');
};

const handleClose = () => {
  emits('close');
};

onUnmounted(() => {
  if (isMicrophoneTesting.value) {
    emitAction('stopMicrophoneTest');
  }
  if (isSpeakerTesting.value) {
    emitAction('stopSpeakerTest');
  }
});
</script>

<style lang="scss" scoped>
.setting-panel-dialog-root {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.setting-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  background: var(--bg-color-dialog);
  min-height: 0;
}

.setting-panel-header {
  position: sticky;
  top: 0;
  z-index: 2;
  display: flex;
  justify-content: flex-end;
  padding: 24px 24px 0;
  background: var(--bg-color-dialog);
}

.setting-panel-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  -ms-overflow-style: none;
  scrollbar-width: none;
  padding: 0 24px 24px;

  &::-webkit-scrollbar {
    width: 0;
    height: 0;
    display: none;
  }

  .section {
    margin-bottom: 20px;
    &:last-child {
      margin-bottom: 0;
    }
  }

  .section-title {
    font-size: 18px;
    font-weight: bold;
    margin-bottom: 16px;
  }
}

.panel-actions {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.panel-close-btn {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--text-color-primary);
  border-radius: 4px;
  cursor: pointer;
  padding: 0;
  transition: background-color .2s;

  &:hover {
    background-color: var(--bg-color-bubble-reciprocal);
  }
}

.setting-panel .row {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  margin-bottom: 12px;
  gap: 8px;

  .label {
    width: auto;
    flex-shrink: 0;
    line-height: 20px;
    color: var(--text-color-primary);
  }

  .select {
    width: 100%;
  }
}

.audio-item {
  margin-bottom: 14px;
}

.audio-label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  line-height: 20px;
  color: var(--text-color-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.audio-control {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 32px;
}

.audio-control .select,
.audio-control .slider {
  flex: 1;
  min-width: 0;
}

.volume-value {
  width: 30px;
  text-align: right;
  flex-shrink: 0;
}

.test-btn {
  flex-shrink: 0;
  white-space: nowrap;
}

.mic-bar-container {
  width: 100%;
  display: flex;
  justify-content: space-between;
  gap: 2px;
  min-height: 8px;
  padding: 7px 0;

  .mic-bar {
    width: 3px;
    height: 6px;
    background-color: var(--text-color-secondary);

    &.active {
      background-color: var(--text-color-link);
    }
  }
}

.divider {
  height: 1px;
  background: var(--uikit-color-gray-4);
  margin-bottom: 20px;
}
</style>
