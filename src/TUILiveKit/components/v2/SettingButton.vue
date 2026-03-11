<template>
  <div
    class="custom-icon-container"
    @click="handleSetting"
  >
    <IconSetting class="custom-icon" />
    <span class="custom-text setting-text">{{ t('Setting') }}</span>
  </div>
  <TUIDialog
    :custom-classes="['setting-dialog']"
    :title="t('Setting')"
    :visible="settingPanelVisible"
    width="560px"
    height="500px"
    @close="settingPanelVisible = false"
    @confirm="settingPanelVisible = false"
    @cancel="settingPanelVisible = false"
  >
    <div class="setting-panel">
      <div class="section">
        <div class="section-title">
          {{ t('Video profile') }}
        </div>
        <div class="row">
          <span class="label">{{ t('Resolution') }}</span>
          <TUISelect
            v-model="publishVideoQuality"
            placeholder="placeholder"
            class="select"
            :teleported="false"
            :popper-append-to-body="false"
            :disabled="isCreatedLive"
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
      <div class="divider" />
      <div class="section section-audio">
        <div class="section-title">
          {{ t('Audio settings') }}
        </div>
        <AudioSettingPanel class="audio-panel" />
      </div>
    </div>
    <template #footer>
      <div />
    </template>
  </TUIDialog>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { TUIVideoQuality } from '@tencentcloud/tuiroom-engine-electron';
import {
  useUIKit,
  TUIDialog,
  TUISelect,
  TUIOption,
  IconSetting,
  TUIToast,
} from '@tencentcloud/uikit-base-component-vue3';
import { AudioSettingPanel, useVideoMixerState, useLiveListState, useDeviceState } from 'tuikit-atomicx-vue3-electron';
import {
  ipcBridge,
  IPCMessageType,
  toPlainIpcPayload,
  ChildPanelType,
} from '../../ipc';
import { getSpeakerTestUrl } from '../../utils/audio';
import type { ApplyLiveSettingPayload, WindowType } from '../../ipc';

const props = defineProps({
  isShowingInChildWindow: {
    type: Boolean,
    default: false,
  },
});

const { t } = useUIKit();

const { publishVideoQuality } = useVideoMixerState();
const { currentLive } = useLiveListState();
const {
  microphoneList,
  currentMicrophone,
  speakerList,
  currentSpeaker,
  captureVolume,
  outputVolume,
  currentMicVolume,
  testingMicVolume,
  isMicrophoneTesting,
  isSpeakerTesting,
  getMicrophoneList,
  getSpeakerList,
  setCurrentMicrophone,
  setCurrentSpeaker,
  setCaptureVolume,
  setOutputVolume,
  startMicrophoneTest,
  stopMicrophoneTest,
  startSpeakerTest,
  stopSpeakerTest,
} = useDeviceState();

const isCreatedLive = computed(() => !!currentLive.value?.liveId);

const videoQualityList = computed(() => [
  { label: t('High Definition'), value: TUIVideoQuality.kVideoQuality_720p },
  {
    label: t('Super Definition'),
    value: TUIVideoQuality.kVideoQuality_1080p,
  },
]);

const settingPanelVisible = ref(false);
const isSettingChildWindowOpen = ref(false);

const microphoneListSignature = computed(() =>
  microphoneList.value.map(item => `${item.deviceId}:${item.deviceName}`).join('|'),
);

const speakerListSignature = computed(() =>
  speakerList.value.map(item => `${item.deviceId}:${item.deviceName}`).join('|'),
);

const getSettingPanelData = () => toPlainIpcPayload({
  publishVideoQuality: publishVideoQuality.value,
  isCreatedLive: isCreatedLive.value,
  microphoneList: microphoneList.value,
  currentMicrophoneId: currentMicrophone.value?.deviceId || '',
  speakerList: speakerList.value,
  currentSpeakerId: currentSpeaker.value?.deviceId || '',
  captureVolume: captureVolume.value,
  outputVolume: outputVolume.value,
  currentMicVolume: currentMicVolume.value,
  testingMicVolume: testingMicVolume.value,
  isMicrophoneTesting: isMicrophoneTesting.value,
  isSpeakerTesting: isSpeakerTesting.value,
});

const syncSettingPanelDataToChild = () => {
  if (!props.isShowingInChildWindow || !isSettingChildWindowOpen.value) {
    return;
  }
  ipcBridge.sendToChild(IPCMessageType.UPDATE_CHILD_DATA, {
    panelType: ChildPanelType.Setting,
    data: getSettingPanelData(),
  });
};

const prepareDeviceData = async () => {
  try {
    await Promise.all([getMicrophoneList(), getSpeakerList()]);
  } catch (error) {
    console.warn('[SettingButton] prepareDeviceData failed:', error);
  }
};

const onApplyLiveSetting = async (payload: ApplyLiveSettingPayload, from?: WindowType) => {
  if (!props.isShowingInChildWindow || from !== 'child' || !payload?.action) {
    return;
  }
  try {
    switch (payload.action) {
    case 'setPublishVideoQuality':
      if (!isCreatedLive.value && typeof payload.value === 'number') {
        publishVideoQuality.value = payload.value as TUIVideoQuality;
      }
      break;
    case 'setCurrentMicrophone':
      if (typeof payload.value === 'string' && payload.value) {
        await setCurrentMicrophone({ deviceId: payload.value });
      }
      break;
    case 'setCurrentSpeaker':
      if (typeof payload.value === 'string' && payload.value) {
        await setCurrentSpeaker({ deviceId: payload.value });
      }
      break;
    case 'setCaptureVolume':
      if (typeof payload.value === 'number') {
        await setCaptureVolume(Math.max(0, Math.min(100, payload.value)));
      }
      break;
    case 'setOutputVolume':
      if (typeof payload.value === 'number') {
        await setOutputVolume(Math.max(0, Math.min(100, payload.value)));
      }
      break;
    case 'startMicrophoneTest':
      if (!isMicrophoneTesting.value) {
        await startMicrophoneTest({ interval: 200 });
      }
      break;
    case 'stopMicrophoneTest':
      if (isMicrophoneTesting.value) {
        await stopMicrophoneTest();
      }
      break;
    case 'startSpeakerTest':
      if (!isSpeakerTesting.value) {
        await startSpeakerTest({ filePath: getSpeakerTestUrl() });
      }
      break;
    case 'stopSpeakerTest':
      if (isSpeakerTesting.value) {
        await stopSpeakerTest();
      }
      break;
    default:
      break;
    }
  } catch (error) {
    console.warn('[SettingButton] apply live setting failed:', payload, error);
    if (payload.action === 'startSpeakerTest') {
      TUIToast.error({ message: t('Speaker test failed to start, please check device connection') });
    }
  }
};

const handleSetting = async () => {
  if (props.isShowingInChildWindow) {
    isSettingChildWindowOpen.value = true;
    await prepareDeviceData();
    ipcBridge.sendToChild(IPCMessageType.SHOW_CHILD_PANEL, {
      panelType: ChildPanelType.Setting,
      initialData: getSettingPanelData(),
    });
    return;
  }
  settingPanelVisible.value = true;
};

onMounted(() => {
  ipcBridge.on(IPCMessageType.APPLY_LIVE_SETTING, onApplyLiveSetting);
});

onBeforeUnmount(() => {
  ipcBridge.off(IPCMessageType.APPLY_LIVE_SETTING, onApplyLiveSetting);
});

watch(
  () => [
    publishVideoQuality.value,
    isCreatedLive.value,
    microphoneListSignature.value,
    currentMicrophone.value?.deviceId || '',
    speakerListSignature.value,
    currentSpeaker.value?.deviceId || '',
    captureVolume.value,
    outputVolume.value,
    currentMicVolume.value,
    testingMicVolume.value,
    isMicrophoneTesting.value,
    isSpeakerTesting.value,
  ],
  () => {
    syncSettingPanelDataToChild();
  },
);
</script>

<style lang="scss" scoped>
@import '../../assets/mac.scss';

.custom-icon-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-width: 56px;
  width: auto;
  height: 56px;
  cursor: pointer;
  color: $text-color1;
  border-radius: 12px;
  position: relative;

  .unread-count {
    position: absolute;
    top: 0;
    right: 0;
    background-color: var(--text-color-error);
    border-radius: 50%;
    width: 16px;
    height: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
  }

  .custom-icon {
    @include icon-size-24;
    background: transparent;
  }
  .custom-text {
    @include text-size-12;
  }

  &:hover {
    box-shadow: 0 0 10px 0 var(--bg-color-mask);
    .custom-icon {
      color: $icon-hover-color;
    }
    .custom-text {
      color: $icon-hover-color;
    }
  }
}

.setting-icon {
  mask-image: url('../../../icons/setting-icon.svg');
}

:deep(.setting-dialog) {
  width: 560px;
  margin: 0;
  padding: 20px;
  display: flex;
  flex-direction: column;

  .tui-dialog-header {
    min-height: 24px;
    padding: 0 0 12px;
  }

  .tui-dialog-title {
    display: none;
  }

  .tui-dialog-close-icon {
    top: 20px;
    right: 20px;
  }

  .tui-dialog-body {
    flex: 1;
    min-height: 0;
    padding: 0;
    overflow-y: auto;
    margin-top: -24px;
  }

  .tui-dialog-footer {
    padding: 0;
  }
}

.setting-panel {
  display: flex;
  flex-direction: column;
  width: 100%;
  background: var(--bg-color-dialog);

  .section {
    margin-bottom: 20px;

    &:last-child {
      margin-bottom: 0;
    }

    .section-title {
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 16px;
      color: var(--text-color-primary);
    }

    .row {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: 8px;

      .label {
        width: auto;
        flex-shrink: 0;
        line-height: 20px;
        color: var(--text-color-primary);
      }
      .select {
        width: 100%;
        font-size: 14px;
      }
    }

    .preview-container {
      margin-top: 8px;

      .video-preview {
        position: relative;
        width: 100%;
        height: 0;
        padding-top: calc(100% * 9 / 16);
        overflow: hidden;
        border-radius: 8px;
        background: #222;
      }
    }
  }

  :deep(.audio-setting-tab.audio-panel .title) {
    color: var(--text-color-primary);
  }
}

.divider {
  height: 1px;
  background: var(--uikit-color-gray-4);
  margin-bottom: 20px;
}
</style>
