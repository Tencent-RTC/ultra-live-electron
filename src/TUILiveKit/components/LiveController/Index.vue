<template>
  <div class="tui-live-controller">
    <!-- <div class="tui-layout-toolbar">
      <div class="tui-layout-toolbar-left">
          <div v-for="(item, index) in screenStyleList" :key="index" class="tui-layout-toolbar-left-container">
            <span @click="handleChangeScreenStyle(item)" :class="[currentScreenStyle === item ? 'tui-layout-toolbar-left-isChoose': 'tui-layout-toolbar-left-isNormal']">
              <svg-icon :icon="item.icon"></svg-icon>
              <span class="tui-layout-toolbar-left-text">{{item.text}}</span>
            </span>
          </div>
      </div>
      <div class="tui-layout-toolbar-right">
        <span class="tui-layout-toolbar-right-custom">
          <svg-icon :icon="AddIcon"></svg-icon>
          <span class="tui-layout-toolbar-right-text">{{t('Customizable')}}</span>
        </span>
        <span class="tui-layout-toolbar-right-icon" v-for="(item, index) in dispositionList" :key="index" >
          <svg-icon :icon="item.icon"></svg-icon>
        </span>
      </div>
    </div> -->
    <div class="tui-streaming-toolbar">
      <div class="tui-streaming-toolbar-left" >
        <span class="left-container">
          <svg-icon :icon=AudioIcon ></svg-icon>
          <!-- <svg-icon class="icon-container" :icon=ArrowSetUpIcon></svg-icon> -->
          <draggable-point class="drag-container" :rate="voiceRate"  @update-drag-value="onUpdateVoiceValue"></draggable-point>
        </span>
        <span class="left-container">
          <svg-icon :icon=VoiceIcon></svg-icon>
          <!-- <svg-icon class="icon-container" :icon=ArrowSetUpIcon></svg-icon> -->
          <draggable-point class="drag-container" :rate="speakerRate" @update-drag-value="onUpdateSpeakerValue"></draggable-point>
        </span>
      </div>
      <div class="tui-streaming-toolbar-middle">
        <div class="middle-container" v-for="(item, index) in streamingTooBarList" :key="index" @click="item.fun()">
          <svg-icon class="icon-container" :icon=item.icon :size="1.5"></svg-icon>
          <span class="text">{{item.text}}</span>
        </div>
      </div>
      <div :class="[isLiving ? 'tui-streaming-toolbar-right-living' : 'tui-streaming-toolbar-right']" @click="handleChangeLivingStatus">
        <svg-icon :icon="liveStatusIcon" ></svg-icon>
        <span :class="[isLiving ? 'text-living': ' text-living-start']">
          {{liveStatus}}
        </span>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, onMounted, ref, defineEmits } from 'vue';
import { storeToRefs } from 'pinia';
import { TRTCVideoResolutionMode } from 'trtc-electron-sdk';
import { TUIDeviceType } from '@tencentcloud/tuiroom-engine-electron/plugins/device-manager-plugin';
import AudioIcon from '../../common/icons/AudioIcon.vue';
import VoiceIcon from '../../common/icons/VoiceIcon.vue';
import BeautyIcon from '../../common/icons/BeautyIcon.vue';
import VoiceChatIcon from '../../common/icons/VoiceChatIcon.vue';
import PKIcon from '../../common/icons/PKIcon.vue';
import SetIcon from '../../common/icons/SetIcon.vue';
import ArrowSetUpIcon from '../../common/icons/ArrowSetUpIcon.vue';
import StartLivingIcon from '../../common/icons/StartLivingIcon.vue';
import EndLivingIcon from '../../common/icons/EndLivingIcon.vue';
import VerticalScreenIcon from '../../common/icons/VerticalScreenIcon.vue';
import HorizontalScreenIcon from '../../common/icons/HorizontalScreenIcon.vue';
import NineSquareGridIcon from '../../common/icons/NineSquareGridIcon.vue';
import BottomBarIcon from '../../common/icons/BottomBarIcon.vue';
import SpeakerLayoutIcon from '../../common/icons/SpeakerLayoutIcon.vue';
import SidebarLayoutIcon from '../../common/icons/SidebarLayoutIcon.vue';
import ThreeColumnIcon from '../../common/icons/SidebarLayoutIcon.vue';
import AddIcon from '../../common/icons/AddIcon.vue'
import SvgIcon from '../../common/base/SvgIcon.vue';
import DraggablePoint from '../../common/base/DraggablePoint.vue';
import { useI18n } from '../../locales';
import { useBasicStore } from '../../store/basic';
import { useMediaSourcesStore } from '../../store/mediaSources';
import { useRoomStore } from '../../store/room';
import useDeviceManagerPlugin from '../../utils/useDeviceManagerPlugin';
import { messageChannels } from '../../communication';

interface screenStyle {
  icon: object,
  text: string,
  value: TRTCVideoResolutionMode,
}
interface disposition {
  icon: object,
  value: string, // 预留字段，用于接口传参
}
const { t } = useI18n();

const logger = console;
const logPrefix = '[LiveController]';

const emits = defineEmits(["onStartLiving", "onStopLiving"]);

const basicStore = useBasicStore();
const mediaSourcesStore = useMediaSourcesStore();
const roomStore = useRoomStore();
const { roomId, isLiving } = storeToRefs(basicStore);
const deviceManagerPlugin = useDeviceManagerPlugin();

const speakerRate = ref(0);
const voiceRate = ref(0);
const { applyToAnchorList } = storeToRefs(roomStore);
const streamingTooBarList = ref([
  // {
  //   icon: BeautyIcon,
  //   text: t('Beauty'),
  //   fun: handleBeauty   
  // },
  {
    icon: VoiceChatIcon,
    text: t('Voice chat'),
    fun: handleVoiceChat    
  },
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

const screenStyleList = ref([
  {
    icon: VerticalScreenIcon,
    text: t('Vertical screen'),
    value: TRTCVideoResolutionMode.TRTCVideoResolutionModeLandscape,
  },
  {
    icon: HorizontalScreenIcon,
    text: t('Horizontal screen'),
    value: TRTCVideoResolutionMode.TRTCVideoResolutionModePortrait,
  }
])

const dispositionList = ref([
  {
    icon: NineSquareGridIcon,
    value: '',
  },
  {
    icon: BottomBarIcon,
    value: '',
  },
  {
    icon: SpeakerLayoutIcon,
    value: '',
  },
  {
    icon: SidebarLayoutIcon,
    value: '',
  },
  {
    icon: ThreeColumnIcon,
    value: '',
  }
])
const currentScreenStyle = ref(screenStyleList.value[0]);
const liveStatus = computed (()=> 
  isLiving.value ? t('Ending live'): t('Starting live')
)

const liveStatusIcon = computed (()=> 
  isLiving.value ? EndLivingIcon: StartLivingIcon
)

onMounted(async () => {
  try {
    const speakerVolume = await deviceManagerPlugin.getCurrentDeviceVolume(TUIDeviceType.DeviceTypeSpeaker);
    speakerRate.value = speakerVolume/100;
    const micVolume = await deviceManagerPlugin.getCurrentDeviceVolume(TUIDeviceType.DeviceTypeMic);
    voiceRate.value = micVolume/100;
    logger.log(`${logPrefix}onMounted: voiceRate:${voiceRate.value} speakerRate:${speakerRate.value}`);
    await deviceManagerPlugin.getCurrentDevice(TUIDeviceType.DeviceTypeCamera);
    await deviceManagerPlugin.getCurrentDevice(TUIDeviceType.DeviceTypeMic);
    await deviceManagerPlugin.getCurrentDevice(TUIDeviceType.DeviceTypeSpeaker);
  } catch (error) {
    console.error('Get current device volume failed:', error);
  }
});

function handleBeauty() {
  console.log('Beauty');
}

function handleVoiceChat() {
  roomStore.setIsShowVoiceChat(true);
  messageChannels.childWindowPort?.postMessage({
    key: "voice-chat",
    data: JSON.stringify(applyToAnchorList.value)
  });
  window.ipcRenderer.send('open-child', {
    'command': 'voice-chat'
  })
}

function handlePK() {
  console.log('PK');
}

function handleSetting() {
  window.ipcRenderer.send('open-child', {
    'command': 'setting'
  })
}

const onUpdateSpeakerValue = (volume: number) => {
  const value = Math.round(volume);
  speakerRate.value = value/100;
  deviceManagerPlugin.setCurrentDeviceVolume(TUIDeviceType.DeviceTypeSpeaker, value);
}

const onUpdateVoiceValue = (volume: number) => {
  const value = Math.round(volume);
  voiceRate.value = value/100;
  deviceManagerPlugin.setCurrentDeviceVolume(TUIDeviceType.DeviceTypeMic, value);
}

const handleChangeLivingStatus = () => {
  if (!isLiving.value) {
    emits("onStartLiving");
  } else {
    emits("onStopLiving");
  }
}

const handleChangeScreenStyle = (item: screenStyle) => {
  mediaSourcesStore.updateResolutionMode(item.value);
}
</script>
<style scoped lang="scss">
@import "../../assets/variable.scss";
.tui-live-controller {
  padding: 0 1rem;
  .tui-layout-toolbar {
    height: 6rem;
    border-bottom: 1px solid $color-split-line;
    display: flex;
    justify-content: space-between;
    align-items: center;
    &-left{
      display: flex;
      &-container{
        display: flex;
        align-items: center;
      }
      &-isChoose{
        display: flex;
        align-items: center;
        justify-content: center;
        width: 4rem;
        height: 2.5rem;
        border-radius: 0.375rem;
        fill: var(--G4, #6B758A);
        opacity: 0.5;
        background: rgba(107, 117, 138, 1);
      }
      &-isNormal{
        display: flex;
        align-items: center;
        justify-content: center;
        width: 4rem;
        height: 2.5rem;
        border-radius: 0.375rem;
        opacity: 0.5;
        background: rgba(56, 63, 77, 1);
      }
      &-text{
        color: var(--G7, #D5E0F2);
        font-family: PingFang SC;
        font-size: 0.75rem;
        font-style: normal;
        font-weight: 400;
        line-height: 1.25rem;
      }
    }
    &-right{
      display: flex;
      align-items: center;
      &-custom{
        display: flex;
        align-items: center;
        justify-content: center;
        width: 4rem;
        height: 2.5rem;
        background-color: rgba(56, 63, 77, 0.50);
        border-radius: 0.375rem;
        margin-right: 0.75rem;
        cursor: pointer;
      }
      &-icon{
        margin-right: 0.75rem;
        cursor: pointer;
        width: 4rem;
        height: 2.5rem;
      }
      &-text{
        color: var(--G7, #D5E0F2);
        font-family: PingFang SC;
        font-size: 0.75rem;
        font-style: normal;
        font-weight: 400;
        line-height: 1.25rem;
      }
    }
  }

  .tui-streaming-toolbar {
    height: 6rem;
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
        width:6.75rem;
        height:2.5rem;
        display: flex;
        border-radius: 24px;
        align-items: center;
        justify-content: center;
        background: rgba(28, 102, 229, 1);
        cursor: pointer;
        &-living{
          width:6.75rem;
          height:2.5rem;
          display: flex;
          border-radius: 24px;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(237, 65, 77, 1);
          cursor: pointer;
        }
      }
  }
  .left-container{
    width: 8rem;
    height: 2.5rem;
    display: block;
    background: #383F4D;
    border-radius: 0.25rem;
    display: flex;
    padding-left: 0.375rem;
    margin-right: 0.375rem;
    display: flex;
    align-items: center;
  }
  .text{
    font-family: PingFang SC;
    font-size: 0.75rem;
    font-style: normal;
    font-weight: 400;
    line-height: 1.25rem;
    background: var(--G2, linear-gradient(180deg, #A4BBDB 0%, rgba(164, 187, 219, 0.80) 100%));
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
      &-living{
        padding: 0.125rem;
        color: rgba(237, 65, 77, 1);
        &-start{
          padding: 0.125rem;
        }
      }
  }
  .middle-container{
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 5rem;
  }
  .drag-container{
    width: 5.875rem;
    margin-left: 0.25rem;
  }
  .icon-container{
    cursor: pointer;
  }
}
</style>