<template>
  <div class="tui-live-controller">
    <div class="tui-streaming-toolbar">
      <div class="tui-streaming-toolbar-left" >
        <audio-control></audio-control>
        <speaker-control></speaker-control>
      </div>
      <div class="tui-streaming-toolbar-middle">
        <TUIBadge
          :hidden="applyToAnchorListNumber === 0 || isCoGuestDisabled"
          :value="applyToAnchorListNumber"
          :max="8"
          type="danger">
          <TUILiveButton class="tui-toolbar-button"  @click="handleConnection" :disabled="isCoGuestDisabled">
            <svg-icon :icon=VoiceChatIcon :size="1.5"></svg-icon>
          </TUILiveButton>
        </TUIBadge>
        <TUILiveButton class="tui-toolbar-button" @click="handleSetting">
          <svg-icon :icon=SetIcon :size="1.5"></svg-icon>
        </TUILiveButton>
        <TUILiveButton class="tui-toolbar-button" @click="toggleVideoResolutionMode" :disabled="isLiving">
          <svg-icon :icon="mixingVideoEncodeParam.resMode === TRTCVideoResolutionMode.TRTCVideoResolutionModeLandscape ? HorizontalScreenIcon : VerticalScreenIcon" :size="1.5" />
        </TUILiveButton>
      </div>
      <div class="tui-streaming-toolbar-right">
        <TUILiveButton @click="handleChangeLivingStatus" :class="['tui-btn-live-switch', isLiving ? 'is-living' :'']" :disabled="isLiveSwitchDisabled || !userId">
          <svg-icon :icon="liveStatusIcon" class="live-status"></svg-icon>
          <span :class="[isLiving ? 'text-living': ' text-living-start']">
            {{liveStatus}}
          </span>
        </TUILiveButton>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, Ref, computed, defineEmits, nextTick, watch, onUnmounted } from 'vue';
import { storeToRefs } from 'pinia';
import { TRTCVideoResolutionMode } from 'trtc-electron-sdk';
import AudioControl from '../../common/AudioControl.vue';
import SpeakerControl from '../../common/SpeakerControl.vue';
import VoiceChatIcon from '../../common/icons/VoiceChatIcon.vue';
import SetIcon from '../../common/icons/SetIcon.vue';
import StartLivingIcon from '../../common/icons/StartLivingIcon.vue';
import EndLivingIcon from '../../common/icons/EndLivingIcon.vue';
import VerticalScreenIcon from '../../common/icons/VerticalScreenIcon.vue';
import HorizontalScreenIcon from '../../common/icons/HorizontalScreenIcon.vue';
import SvgIcon from '../../common/base/SvgIcon.vue';
import TUILiveButton from '../../common/base/Button.vue';
import TUIBadge from '../../common/base/Badge.vue';
import { useI18n } from '../../locales';
import { useBasicStore } from '../../store/main/basic';
import { useMediaSourcesStore } from '../../store/main/mediaSources';
import { useRoomStore } from '../../store/main/room';
import { useAudioEffectStore } from '../../store/main/audioEffect';
import { messageChannels } from '../../communication';
import { TUIButtonAction, TUIButtonActionType, TUIConnectionMode } from '../../types';
import logger from '../../utils/logger';

const { t } = useI18n();

const logPrefix = '[LiveController]';

const emits = defineEmits(['onStartLiving', 'onStopLiving']);

const basicStore = useBasicStore();
const mediaSourcesStore = useMediaSourcesStore();
const audioEffectStore = useAudioEffectStore();
const { mixingVideoEncodeParam } = storeToRefs(mediaSourcesStore);
const roomStore = useRoomStore();
const { isLiving, userId } = storeToRefs(basicStore);

const { applyToAnchorList, anchorList, connectionMode, connectedHostList, battleId } = storeToRefs(roomStore);

const applyToAnchorListNumber = computed(()=> applyToAnchorList.value.length);
const liveStatus = computed (()=> isLiving.value ? t('End Live'): t('Go Live'));
const liveStatusIcon = computed (()=> isLiving.value ? EndLivingIcon: StartLivingIcon);

const isLiveSwitchDisabled: Ref<boolean> = ref(false);

const isCoGuestDisabled = computed(() => {
  return !isLiving.value
  || mixingVideoEncodeParam.value.resMode === TRTCVideoResolutionMode.TRTCVideoResolutionModeLandscape
  || connectionMode.value === TUIConnectionMode.CoHost;
});

function onStopLivingResult(event:any, result: {
  value: string;
}) {
  logger.log(`${logPrefix}stop-living-result:`, result);
  if (result.value === 'end-live') {
    emits('onStopLiving');
  } else if (result.value === 'end-battle') {
    roomStore.stopAnchorBattle();
    isLiveSwitchDisabled.value = false;
  } else if (result.value === 'exit-connection') {
    roomStore.stopAnchorConnection();
    isLiveSwitchDisabled.value = false;
  } else {
    // cancel
    isLiveSwitchDisabled.value = false;
  }
}
window.ipcRenderer.on('stop-living-result', onStopLivingResult);

function handleConnection() {
  messageChannels.messagePortToChild?.postMessage({
    key: 'set-apply-and-seated-list',
    data: JSON.stringify({
      applyList: applyToAnchorList.value,
      anchorList: anchorList.value
    })
  });
  window.ipcRenderer.send('open-child', {
    'command': 'co-guest-connection',
    data: {
      layoutTemplate: roomStore.currentLive.seatLayoutTemplateId,
    }
  });
}

function handleSetting() {
  window.ipcRenderer.send('open-child', {
    'command': 'setting'
  })
}

function toggleVideoResolutionMode() {
  if (mixingVideoEncodeParam.value.resMode === TRTCVideoResolutionMode.TRTCVideoResolutionModeLandscape) {
    roomStore.setLocalVideoResMode(TRTCVideoResolutionMode.TRTCVideoResolutionModePortrait);
  } else {
    roomStore.setLocalVideoResMode(TRTCVideoResolutionMode.TRTCVideoResolutionModeLandscape);
  }
}

async function preStopLiving() {
  let title = '';
  let content = '';
  let actions: Array<TUIButtonAction> = [
    { text: t('Cancel'), value: 'cancel', type: TUIButtonActionType.Normal },
    { text: t('End Live'), value: 'end-live', type: TUIButtonActionType.Dangerous },
  ];
  if (anchorList.value.length >= 2) { // ignore self
    title = t('You are currently live streaming. Are you sure you want to end it?');
    content = t('Live guest active.');
  } else if (battleId.value) {
    title = t('End Live');
    content = t('Currently in PK state, do you need to "End PK" or "End Live".');
    actions.push({ text: t('End Battle'), value: 'end-battle', type: TUIButtonActionType.MoreDangerous });
  } else if (connectedHostList.value.length > 0) {
    title = t('End Live');
    content = t('Currently connected, do you need to "Exit Connection" or "End Live".');
    actions.push({ text: t('Exit Connection'), value: 'exit-connection', type: TUIButtonActionType.MoreDangerous });
  } else {
    title = t('You are currently live streaming. Are you sure you want to end it?');
    content = '';
  }

  window.ipcRenderer.send('stop-living', {
    title,
    content,
    actions
  });
}

async function handleChangeLivingStatus() {
  if (isLiveSwitchDisabled.value) {
    return;
  }
  isLiveSwitchDisabled.value = true;
  await nextTick();
  if (!isLiving.value) {
    audioEffectStore.initVoiceEffect();
    emits('onStartLiving');
  } else {
    preStopLiving();
  }
}

watch(
  () => isLiving.value,
  (newValue, oldValue) => {
    logger.log(`${logPrefix}watch isLiving:`, newValue, oldValue);
    if (newValue !== oldValue) {
      if (isLiveSwitchDisabled.value) {
        isLiveSwitchDisabled.value = false;
      }
    }
  }
);

onUnmounted(() => {
  window.ipcRenderer.off('stop-living-result', onStopLivingResult);
});
</script>
<style scoped lang="scss">
@import "../../assets/variable.scss";
.tui-live-controller {
  height: 4rem;
  padding: 0 0.5rem;
  background-color: var(--bg-color-operate);

  .tui-streaming-toolbar {
    height: 4rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
      &-left{
        display: flex;
      }
      &-middle{
        flex: 1 1 auto;
        display: flex;
        align-items: center;
        height: 2.5rem;
        padding-right: 0;
      }
      &-right{
        display: inline-flex;
        align-items: center;
      }
  }

  .tui-btn-live-switch {
    width: 6rem;
    height: 2.5rem;
    font-size: 0.75rem;
    line-height: 2.5rem;
    display: flex;
    border-radius: 3rem;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--button-color-primary-default);
    background-color: var(--bg-color-transparency);
    color: var(--button-color-primary-default);
    cursor: pointer;
    margin-left: 0.375rem;

    .live-status{
      color: var(--button-color-primary-default);
    }

    span{
      color: var(--button-color-primary-default);
    }

    .text-living{
      color: var(--text-color-error);
    }

    &.is-living{
      border: 1px solid var(--text-color-error);
      background-color: var(--bg-color-transparency);
    }


    &:disabled {
      cursor: not-allowed;
      opacity: 0.3;
    }
  }

  .text{
    font-size: $font-live-controller-text-size;
    font-style: $font-live-controller-text-style;
    font-weight: $font-live-controller-text-weight;
    line-height: 1.25rem;
    background: $color-live-controller-text-background;
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    &-living{
      padding: 0.125rem;
      color: var(--bg-color-transparency);
      &-start{
        padding: 0.125rem;
      }
    }
  }
  .tui-toolbar-button{
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 2rem;
    margin: 0 0.5rem;
    padding: 0;
    border: none;
    background: none;
  }
}
</style>
