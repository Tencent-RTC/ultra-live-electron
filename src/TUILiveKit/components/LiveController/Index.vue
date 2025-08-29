<template>
  <div class="tui-live-controller">
    <div class="tui-streaming-toolbar">
      <div class="tui-streaming-toolbar-left" >
        <audio-control></audio-control>
        <speaker-control></speaker-control>
      </div>
      <div class="tui-streaming-toolbar-middle">
        <tui-badge
          :hidden="applyToAnchorListNumber === 0 || mixingVideoEncodeParam.resMode === TRTCVideoResolutionMode.TRTCVideoResolutionModeLandscape"
          :value="applyToAnchorListNumber"
          :max="8"
          type="danger">
          <tui-button class="tui-toolbar-button"  @click="handleConnection" :disabled="mixingVideoEncodeParam.resMode === TRTCVideoResolutionMode.TRTCVideoResolutionModeLandscape">
            <svg-icon :icon=VoiceChatIcon :size="1.5"></svg-icon>
          </tui-button>
        </tui-badge>
        <tui-button class="tui-toolbar-button" v-for="(item, index) in streamingTooBarList" :key="index" @click="item.fun()">
          <svg-icon :icon=item.icon :size="1.5"></svg-icon>
        </tui-button>
        <tui-button class="tui-toolbar-button" @click="toggleVideoResolutionMode" :disabled="isLiving">
          <svg-icon :icon="mixingVideoEncodeParam.resMode === TRTCVideoResolutionMode.TRTCVideoResolutionModeLandscape ? HorizontalScreenIcon : VerticalScreenIcon" :size="1.5" />
        </tui-button>
      </div>
      <div class="tui-streaming-toolbar-right">
        <tui-button @click="handleChangeLivingStatus" :class="['tui-btn-live-switch', isLiving ? 'is-living' :'']" :disabled="isLiveSwitchDisabled || !userId">
          <svg-icon :icon="liveStatusIcon" class="live-status"></svg-icon>
          <span :class="[isLiving ? 'text-living': ' text-living-start']">
            {{liveStatus}}
          </span>
        </tui-button>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, Ref, computed, defineEmits, nextTick, shallowRef, watch, onUnmounted } from 'vue';
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
import TuiButton from '../../common/base/Button.vue';
import { useI18n } from '../../locales';
import { useBasicStore } from '../../store/main/basic';
import { useMediaSourcesStore } from '../../store/main/mediaSources';
import { useRoomStore } from '../../store/main/room';
import { useAudioEffectStore } from '../../store/main/audioEffect';
import { messageChannels } from '../../communication';
import TuiBadge from '../../common/base/Badge.vue';
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

const { applyToAnchorList, anchorList } = storeToRefs(roomStore);

const applyToAnchorListNumber = computed(()=> applyToAnchorList.value.length );
const streamingTooBarList = shallowRef([
  // {
  //   icon: BeautyIcon,
  //   text: t('Beauty'),
  //   fun: handleBeauty
  // },
  // {
  //   icon: PKIcon,
  //   text: t('PK'),
  //   fun: handlePK
  // },
  {
    icon: SetIcon,
    text: t('Setting'),
    fun: handleSetting
  }
]);

const liveStatus = computed (()=>
  isLiving.value ? t('End Live'): t('Go Live')
);

const liveStatusIcon = computed (()=>
  isLiving.value ? EndLivingIcon: StartLivingIcon
);

const isLiveSwitchDisabled: Ref<boolean> = ref(false);

function onStopLivingResult(event:any, result: Record<string, any>) {
  logger.log(`${logPrefix}stop-living-result:`, result);
  if (result.confirm) {
    stopLiving();
  } else {
    isLiveSwitchDisabled.value = false;
  }
}
window.ipcRenderer.on('stop-living-result', onStopLivingResult);

function handleConnection() {
  messageChannels.messagePortToChild?.postMessage({
    key: 'set-apply-and-anchor-list',
    data: JSON.stringify({
      applyList: applyToAnchorList.value,
      anchorList: anchorList.value
    })
  });
  window.ipcRenderer.send('open-child', {
    'command': 'connection',
    data: {
      layoutMode: roomStore.streamLayout.layoutMode,
      isAutoAdjusting: roomStore.streamLayout.isAutoAdjusting,
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
  window.ipcRenderer.send('stop-living', {
    title: t('End the live streaming?'),
    content: anchorList.value.length > 0 ? t('Live guest active.') : '',
  });
}

function stopLiving() {
  emits('onStopLiving');
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
    margin: 0 1rem;
    border: none;
    background: none;
  }
}
</style>
