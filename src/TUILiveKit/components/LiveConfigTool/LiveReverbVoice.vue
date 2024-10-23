<template>
  <div class="tui-reverb-voice-window">
    <div class="tui-reverb-voice-title tui-window-header">
      <span>{{ t("Reverb Voice") }}</span>
      <button @click="handleCloseSetting">
        <svg-icon :icon="CloseIcon" class="tui-secondary-icon"></svg-icon>
      </button>
    </div>
    <div class="tui-reverb-voice-container">
    <div class="tui-reverb-voice-item" v-for="item in reverbVoiceList" :key="item.id">
      <div class="tui-reverb-voice-icon">
        <svg-icon @click="onSelectAudioEffect(item.id)" :class="item.id === musicData.audioEffectInfo.selectId ? 'tui-active-item' : 'tui-normal-item'" :icon="item.icon" ></svg-icon>
      </div>
      <div class="tui-reverb-voice-text">{{t(`${item.text}`)}}</div>
    </div>
    </div>
    <div class="tui-reverb-voice-footer">
    <div class="tui-button-confirm" @click="onConfirmSelect">{{t("Confirm")}}</div>
    <div class="tui-button-cancel" @click="handleCloseSetting">{{ t("Cancel") }}</div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { onUnmounted } from "vue";
import { storeToRefs } from "pinia"
import SvgIcon from "../../common/base/SvgIcon.vue";
import CloseIcon from "../../common/icons/CloseIcon.vue";
import NoEffectIcon from "../../common/icons/ReverbVoiceIcons/NoEffectIcon.vue";
import KTVIcon from "../../common/icons/ReverbVoiceIcons/KTVIcon.vue";
import MetallicAudioIcon from "../../common/icons/ReverbVoiceIcons/MetallicAudioIcon.vue";
import DeepAudioIcon from "../../common/icons/ReverbVoiceIcons/DeepAudioIcon.vue";
import ResonantIcon from "../../common/icons/ReverbVoiceIcons/ResonantIcon.vue";
import CellIcon from "../../common/icons/ReverbVoiceIcons/CellIcon.vue";
import AuditoriumIcon from "../../common/icons/ReverbVoiceIcons/AuditoriumIcon.vue";
import MagneticIcon from "../../common/icons/ReverbVoiceIcons/MagneticIcon.vue";
import VacantIcon from "../../common/icons/ReverbVoiceIcons/VacantIcon.vue";
import RecordingRoomIcon from "../../common/icons/ReverbVoiceIcons/RecordingRoomIcon.vue";
import MelodiousIcon from "../../common/icons/ReverbVoiceIcons/MelodiousIcon.vue";
import { TUIVoiceReverbType } from "../../utils/useAudioEffectManager";
import { useMusicDataStore } from "../../store/musicData";
import { useI18n } from "../../locales";

const musicDataStore = useMusicDataStore();
const {musicData} = storeToRefs(musicDataStore);
const {updateAudioEffectOrChangeVoiceInfo} = musicDataStore;
const { t } = useI18n();
const reverbVoiceList = [
  { 
    id:TUIVoiceReverbType.kVoiceReverbType_0,
    icon: NoEffectIcon,
    text: "No Effect",
  },
  {
    id:TUIVoiceReverbType.kVoiceReverbType_1,
    icon: KTVIcon,
    text: "KTV",
  },
  {
    id:TUIVoiceReverbType.kVoiceReverbType_2,
    icon: CellIcon,
    text: "Cell",
  },
  {
    id:TUIVoiceReverbType.kVoiceReverbType_3,
    icon: AuditoriumIcon,
    text: "Auditorium",
  },
  {
    id:TUIVoiceReverbType.kVoiceReverbType_4,
    icon: DeepAudioIcon,
    text: "Deep Audio",
  },
  {
    id:TUIVoiceReverbType.kVoiceReverbType_5,
    icon: ResonantIcon,
    text: "Resonant",
  },
  {
    id:TUIVoiceReverbType.kVoiceReverbType_6,
    icon: MetallicAudioIcon,
    text: "Metallic Audio",
  },
  {
    id:TUIVoiceReverbType.kVoiceReverbType_7,
    icon: MagneticIcon,
    text: "Magnetic",
  },
  {
    id:TUIVoiceReverbType.kVoiceReverbType_8,
    icon: VacantIcon,
    text: "Vacant",
  },
  {
    id:TUIVoiceReverbType.kVoiceReverbType_9,
    icon: RecordingRoomIcon,
    text: "Recording Room 1",
  },
  {
    id:TUIVoiceReverbType.kVoiceReverbType_10,
    icon: MelodiousIcon,
    text: "Melodious",
  },
  {
    id:TUIVoiceReverbType.kVoiceReverbType_11,
    icon: RecordingRoomIcon,
    text: "Recording Room 2",
  }
];

onUnmounted(() => {
  musicData.value.audioEffectInfo.selectId = musicData.value.audioEffectInfo.activeId;
  updateAudioEffectOrChangeVoiceInfo("audioEffectInfo",musicData.value.audioEffectInfo);
  window.mainWindowPort?.postMessage({
    key:"setVoiceReverbType",
    data:musicData.value.audioEffectInfo.selectId,
  });
})

function onSelectAudioEffect(id:number){
  if(typeof id !== 'number')return;
  musicData.value.audioEffectInfo.selectId = id;
  window.mainWindowPort?.postMessage({
    key:"setVoiceReverbType",
    data:id,
  });
}

function onConfirmSelect(){
  musicData.value.audioEffectInfo.activeId = musicData.value.audioEffectInfo.selectId;
  window.mainWindowPort?.postMessage({
    key:"setVoiceReverbType",
    data:musicData.value.audioEffectInfo.activeId,
  });
  handleCloseSetting();
}

function handleCloseSetting(){
  musicData.value.audioEffectInfo.selectId = musicData.value.audioEffectInfo.activeId;
  updateAudioEffectOrChangeVoiceInfo("audioEffectInfo",musicData.value.audioEffectInfo);
  window.mainWindowPort?.postMessage({
    key:"setVoiceReverbType",
    data:musicData.value.audioEffectInfo.selectId,
  });
  window.ipcRenderer.send("close-child");
}
</script>
<style scoped lang="scss">
@import "../../assets/variable.scss";
.tui-reverb-voice-window {
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;

  .tui-reverb-voice-title {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.5rem;

    .close-icon {
      cursor: pointer;
    }
  }

  .tui-reverb-voice-container{
    width: 100%;
    height:85%;
    padding:1.5rem;
    background-color: var(--bg-color-dialog);
    display:flex;
    align-items: center;
    justify-content: center;
    flex-wrap:wrap;

    .tui-reverb-voice-item{
      width: 6rem;
      height:6rem;
      margin:0 1rem;
      display:flex;
      flex-direction:column;
      align-items:center;
      justify-content: center;
      position:relative;

      .tui-reverb-voice-icon{
        display: flex;
        align-items: center;
        justify-content:center;
      }

      .tui-reverb-voice-text{
        width:200%;
        text-align: center;
        color: var(--text-color-primary);
      }
    }

    .tui-normal-item{
      color: $font-reverb-voice-normal-item-color;
    }

    .tui-active-item{
      color: $font-reverb-voice-active-item-color;
    }

    .tui-active-item::before{
      content:url("../../assets/ActiveEffect.svg");
      display:inline-block;
      width: 6.25rem;
      height:6.25rem;
      position:absolute;
    }
  }

  .tui-reverb-voice-footer{
    display: flex;
    justify-content: end;
    align-items: center;
    width: 100%;
    height: 10%;
    padding-right: 2rem;
    background-color: var(--bg-color-dialog);
    border-top:1px solid var(--stroke-color-primary);
  }
}
</style>
