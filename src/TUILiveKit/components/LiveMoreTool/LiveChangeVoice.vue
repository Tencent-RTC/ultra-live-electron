<template>
  <div class="tui-change-voice-window">
    <div class="tui-change-voice-title tui-window-header">
      <span>{{ t("Change Voice") }}</span>
      <button class="tui-icon" @click="handleCloseSetting">
        <svg-icon :icon="CloseIcon" class="tui-secondary-icon"></svg-icon>
      </button>
    </div>
    <div class="tui-change-voice-container">
    <div class="tui-change-voice-item" v-for="item in changeVoiceList" :key="item.id">
      <div class="tui-change-voice-icon">
        <svg-icon @click="onSelectChangeVoice(item.id)" :class="item.id === audioEffect.voiceChanger.selectId ? 'active-item' : 'normal-item'" :icon="item.icon" ></svg-icon>
      </div>
      <div class="tui-change-voice-text">{{t(`${item.text}`)}}</div>
    </div>
    </div>
    <div class="tui-change-voice-footer">
    <div class="tui-button-confirm" @click="onConfirmSelect">{{t("Confirm")}}</div>
    <div class="tui-button-cancel" @click="handleCloseSetting">{{ t("Cancel") }}</div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { onUnmounted } from 'vue';
import { storeToRefs } from 'pinia';
import { TRTCVoiceChangerType } from 'trtc-electron-sdk';
import SvgIcon from '../../common/base/SvgIcon.vue';
import CloseIcon from '../../common/icons/CloseIcon.vue';
import OriginVoiceIcon from '../../common/icons/ChangeVoiceIcons/OriginVoiceIcon.vue';
import NaughtyKidIcon from '../../common/icons/ChangeVoiceIcons/NaughtyKidIcon.vue';
import LolitaIcon from '../../common/icons/ChangeVoiceIcons/LolitaIcon.vue';
import UncleIcon from '../../common/icons/ChangeVoiceIcons/UncleIcon.vue';
import HeavyMetalIcon from '../../common/icons/ChangeVoiceIcons/HeavyMetalIcon.vue';
import InfluenzaIcon from '../../common/icons/ChangeVoiceIcons/InfluenzaIcon.vue';
import ForeignLanguagesIcon from '../../common/icons/ChangeVoiceIcons/ForeignLanguagesIcon.vue';
import TrappedBeastIcon from '../../common/icons/ChangeVoiceIcons/TrappedBeastIcon.vue';
import PlumpIcon from '../../common/icons/ChangeVoiceIcons/PlumpIcon.vue';
import HeavyCurrentIcon from '../../common/icons/ChangeVoiceIcons/HeavyCurrentIcon.vue';
import HeavyMachineryIcon from '../../common/icons/ChangeVoiceIcons/HeavyMachineryIcon.vue';
import IntangibleIcon from '../../common/icons/ChangeVoiceIcons/IntangibleIcon.vue';
import { useAudioEffectStore } from '../../store/child/audioEffect';
import { useI18n } from '../../locales';

const audioEffectStore = useAudioEffectStore();
const { audioEffect } = storeToRefs(audioEffectStore);
const { updateAudioEffectOrChangeVoiceInfo } = audioEffectStore;
const { t } = useI18n();
const changeVoiceList = [
  {
    id: TRTCVoiceChangerType.TRTCLiveVoiceChangerType_0,
    icon: OriginVoiceIcon,
    text: 'Original Audio',
  },
  {
    id: TRTCVoiceChangerType.TRTCLiveVoiceChangerType_1,
    icon: NaughtyKidIcon,
    text: 'Naughty Kid',
  },
  {
    id: TRTCVoiceChangerType.TRTCLiveVoiceChangerType_2,
    icon: LolitaIcon,
    text: 'Lolita',
  },
  {
    id: TRTCVoiceChangerType.TRTCLiveVoiceChangerType_3,
    icon: UncleIcon,
    text: 'Uncle',
  },
  {
    id: TRTCVoiceChangerType.TRTCLiveVoiceChangerType_4,
    icon: HeavyMetalIcon,
    text: 'Heavy Metal',
  },
  {
    id: TRTCVoiceChangerType.TRTCLiveVoiceChangerType_5,
    icon: InfluenzaIcon,
    text: 'Influenza',
  },
  {
    id: TRTCVoiceChangerType.TRTCLiveVoiceChangerType_6,
    icon: ForeignLanguagesIcon,
    text: 'Foreign Language',
  },
  {
    id: TRTCVoiceChangerType.TRTCLiveVoiceChangerType_7,
    icon: TrappedBeastIcon,
    text: 'Trapped Beast',
  },
  {
    id: TRTCVoiceChangerType.TRTCLiveVoiceChangerType_8,
    icon: PlumpIcon,
    text: 'Plump',
  },
  {
    id: TRTCVoiceChangerType.TRTCLiveVoiceChangerType_9,
    icon: HeavyCurrentIcon,
    text: 'Heavy Current',
  },
  {
    id: TRTCVoiceChangerType.TRTCLiveVoiceChangerType_10,
    icon: HeavyMachineryIcon,
    text: 'Heavy Machinery',
  },
  {
    id: TRTCVoiceChangerType.TRTCLiveVoiceChangerType_11,
    icon: IntangibleIcon,
    text: 'Intangible',
  }
];

onUnmounted(() => {
  audioEffect.value.voiceChanger.selectId = audioEffect.value.voiceChanger.activeId;
  updateAudioEffectOrChangeVoiceInfo('voiceChanger',audioEffect.value.voiceChanger);
  window.mainWindowPortInChild?.postMessage({
    key:'setVoiceChangerType',
    data:audioEffect.value.voiceChanger.selectId,
  });
})

function onSelectChangeVoice(id:number){
  if(typeof id !== 'number')return;
  audioEffect.value.voiceChanger.selectId = id;
  window.mainWindowPortInChild?.postMessage({
    key:'setVoiceChangerType',
    data:id,
  });
}

function onConfirmSelect(){
  audioEffect.value.voiceChanger.activeId = audioEffect.value.voiceChanger.selectId;
  handleCloseSetting();
}

function handleCloseSetting(){
  audioEffect.value.voiceChanger.selectId = audioEffect.value.voiceChanger.activeId;
  updateAudioEffectOrChangeVoiceInfo('voiceChanger', audioEffect.value.voiceChanger);
  window.mainWindowPortInChild?.postMessage({
    key:'setVoiceChangerType',
    data:audioEffect.value.voiceChanger.selectId,
  });
  window.ipcRenderer.send('close-child');
}
</script>
<style scoped lang="scss">
@import "../../assets/global.scss";
.tui-change-voice-window {
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;

  .tui-change-voice-title {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.5rem;

    .close-icon {
      cursor: pointer;
    }
  }

  .tui-change-voice-container{
    width: 100%;
    height:85%;
    padding:1.5rem;
    background-color: var(--bg-color-dialog);
    display:flex;
    align-items: center;
    justify-content: center;
    flex-wrap:wrap;

    .tui-change-voice-item{
      width: 6rem;
      height:6rem;
      margin:0 1rem;
      display:flex;
      flex-direction:column;
      align-items:center;
      justify-content: center;
      position:relative;

      .tui-change-voice-icon{
        display: flex;
        align-items: center;
        justify-content:center;
      }

      .tui-change-voice-text{
        width:200%;
        text-align: center;
        color: var(--text-color-primary);
      }
    }

    .normal-item{
      color: $font-change-voice-normal-item-color;
    }

    .active-item{
      color: $font-change-voice-active-item-color;
    }

    .active-item::before{
      content:url("../../assets/ActiveEffect.svg");
      display:inline-block;
      width: 6.25rem;
      height:6.25rem;
      position:absolute;
    }
  }

  .tui-change-voice-footer{
    display: flex;
    justify-content: flex-end;
    align-items: center;
    width: 100%;
    height: 10%;
    padding-right: 2rem;
    background-color: var(--bg-color-dialog);
    border-top:1px solid var(--stroke-color-primary);
  }
}
</style>
