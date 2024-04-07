<template>
  <div class="tui-live-config">
    <div class="tui-title">
      <span @click="handleChangeSource" :class="[isShowSources ? 'is-active' : 'tui-source']">{{ t('Sources')}}</span>
      <!-- <span @click="handleChangeMaterial" :class="[isShowMaterial ? 'is-active is-active-material' : 'tui-material']">{{ t('Material')}}</span> -->
      <span @click="toggleVideoResolutionMode" class="tui-resolution-mode-switch">
        <svg-icon :icon="mixingVideoEncodeParam.resMode === TRTCVideoResolutionMode.TRTCVideoResolutionModeLandscape ? HorizontalScreenIcon : VerticalScreenIcon" />
      </span>
    </div>
    <div v-if="isShowSources && !isHasSources" class="tui-config-list">
      <span class="source-title">
        {{ t('We support you in adding a rich variety of sources')}}
      </span>
      <span v-for="item in mediaSourceMenuList" :key="item.text" class="source" @click="item.fun()">
        <svg-icon :icon="item.icon" class="icon-container"></svg-icon>
        <i class="text">
          {{item.text}}
        </i>
      </span>
    </div>
    <div v-if="isHasSources && !isShowMaterial" class="tui-media-source">
      <div class="add-source" @click="handleOpenAddMedia"> 
        <svg-icon :icon="AddIcon" class="icon-container"></svg-icon>
        <span class="text">{{ t('Add') }}</span>
      </div>
      <div v-if="isShowAddMedia" class="add-media-source">
        <span v-for="item in mediaSourceMenuList" :key="item.text" class="add-media" @click="item.fun()">
          <svg-icon :icon="item.icon" class="icon-container"></svg-icon>
          <i class="text">
            {{item.text}}
          </i>
        </span>
      </div>
      <div 
        v-for="item in mediaList" 
        :key="item.mediaSourceInfo.sourceId"  
        class="item-container" 
        :class="item.mediaSourceInfo.sourceId === selectedMediaKey.sourceId && item.mediaSourceInfo.sourceType === selectedMediaKey.sourceType ? 'selected' : ''"
        ref="sourcesOptions" 
        v-click-outside="handleClickOutside" 
        @click="handleSelectSource(item)">
        <div class="item-title">
          <!-- <svg-icon :icon="CameraIcon" class="icon-container"></svg-icon> -->
          <div class="item-title-name">{{ item.sourceName }}</div>
          <div class="item-title-tool"><svg-icon :icon="MoreIcon" :size="2" class="icon-container" @click.stop.prevent="handleMore(item)"></svg-icon></div>
        </div>
        <!-- <div class="item-bottom">
          <SwitchControl v-model="isMuteMediaSources" @click="handleMuteSource(item)"></SwitchControl>
          <div class="item-icon">
            <svg-icon :icon="SwitchSourcesMirror" class="icon-container"></svg-icon>
            <svg-icon :icon="MoreIcon" :size="1" class="icon-container" @click.stop.prevent="handleMore(item)"></svg-icon>
          </div>
        </div> -->
        <div v-show="visibleMorePopupId === item.mediaSourceInfo.sourceId" class="item-more">
          <!-- <span class="item-more-text">{{t('Rename')}}</span> -->
          <span class="item-more-text" @click.stop="handleRemoveSource(item)">{{t('Remove source')}}</span>
          <span class="item-more-text" @click.stop="handleEditSource(item)">{{t('Edit source')}}</span>
        </div>  
      </div>
    </div>
    <!-- <div v-if="isShowMaterial" class="tui-material">
      <div class="options-container">
        <span class="options-container-title">{{t('Background color')}}</span>
        <color-picker class="options-container-input" :currentColor="backgroundColor"></color-picker>
      </div>
      <div v-for="item in materialOptionsList" :key="item.text" class="options-container">
        <span class="options-container-title">{{item.title}}</span>
        <span class="options-container-option" @click="item.fun()">
          <svg-icon :icon="item.icon"></svg-icon>
          <span class="options-container-text">{{item.text}}</span>
        </span>        
      </div>
      <div class="options-container">
        <span class="options-container-title">{{t('Background music')}}</span>
        <div class="options-container-music">
          <span v-for="item in bgmList" :key="item.text" @click="handleSelectMusic(item)" class="options-container-music-box">
            <svg-icon :icon="item.icon" :class="[musicSelectedItem === item ? 'options-container-selected' : 'options-container-icon']"></svg-icon>
            <span class="options-container-music-text">{{item.text}}</span>
            <svg-icon class="selected-icon" v-show="musicSelectedItem === item" :icon="SelectedIcon"></svg-icon>
          </span>
        </div>
        <span v-if="isHasMusic" class="options-container-draggable">
          <svg-icon :icon="PlayingIcon"></svg-icon>
          <draggable-point class="drag-container" :rate="voiceRate" @update-drag-value="onUpdateVoiceValue"></draggable-point>
          <span>{{currentVoice}}</span>
        </span>
      </div>
    </div> -->
  </div>
</template>
<script setup lang="ts">
import { computed, ref, Ref } from 'vue';
import { storeToRefs } from 'pinia';
import SvgIcon from '../../common/base/SvgIcon.vue';
import CameraIcon from '../../common/icons/CameraIcon.vue';
import AddShareScreenIcon from '../../common/icons/AddShareScreenIcon.vue';
import TextIcon from '../../common/icons/TextIcon.vue';
import MovieIcon from '../../common/icons/MovieIcon.vue';
import AddIcon from '../../common/icons/AddIcon.vue';
import SwitchSourcesMirror from '../../common/icons/SwitchSourcesMirror.vue';
import MoreIcon from '../../common/icons/MoreIcon.vue';
import VerticalScreenIcon from '../../common/icons/VerticalScreenIcon.vue';
import HorizontalScreenIcon from '../../common/icons/HorizontalScreenIcon.vue';
import { useI18n } from '../../locales';
import SwitchControl from '../../common/base/SwitchControl.vue';
import vClickOutside from '../../utils/vClickOutside';
import MusicIcon from '../../common/icons/MusicIcon.vue';
import PlayingIcon from '../../common/icons/PlayingIcon.vue';
import DraggablePoint from '../../common/base/DraggablePoint.vue';
import SelectedIcon from '../../common/icons/SelectedIcon.vue';
import ColorPicker from '../../common/base/ColorPicker.vue';
import { TUIMediaSourceViewModel, useMediaSourcesStore } from '../../store/mediaSources';
import { TUIMediaSourceType } from '@tencentcloud/tuiroom-engine-electron/plugins/media-mixing-plugin';
import { TRTCVideoResolutionMode } from 'trtc-electron-sdk';

type TUIMusicType = {
  icon: any;
  text: string;
  path: string;
}

const mediaSourcesStore = useMediaSourcesStore();
const { backgroundColor, selectedMediaKey, mixingVideoEncodeParam } = storeToRefs(mediaSourcesStore);

const { t } = useI18n();
const { isHasSources, mediaList } = storeToRefs(mediaSourcesStore);
const isShowSources = ref(true);
const isShowMaterial = ref(false);
const isShowAddMedia = ref(false);
const visibleMorePopupId = ref('');
const sourcesOptions = ref(null);
const voiceRate = ref(0.3);
const currentVoice = ref(30) // todo 改为获取到设备播放音量
const isMuteMediaSources = ref(true);
const logger = console;
const mediaSourceMenuList = ref([
  {
    icon: CameraIcon,
    text: t('Add Camera'),
    fun: handleAddCamera
  },
  {
    icon: AddShareScreenIcon,
    text: t('Add shared screen'),
    fun: handleAddShareScreen
  },
  // {
  //   icon: TextIcon,
  //   text: t('Add PDF/PPT'),
  //   fun: handleAddText
  // },
  {
    icon: MovieIcon,
    text: t('Add Image'),
    fun: handleAddMovie
  },
])

const materialOptionsList = ref([
  {
    title: t('Blueprint'),
    icon: AddIcon,
    text: t('Additional'),
    fun: handleAddBlueprint,
  },
  {
    title: t('Writing'),
    icon: AddIcon,
    text: t('Additional'),
    fun: handleAddWriting,
  },
])

const selectedMusicList: Ref<Array<TUIMusicType>> = ref([]);
const isHasMusic = computed(() => selectedMusicList.value.length > 0);
const musicSelectedItem: Ref<TUIMusicType|null> = ref(null);
const bgmList = ref([
  {
    icon: MusicIcon,
    text: t('Cheerful'),
    path: '',
  },
  {
    icon: MusicIcon,
    text: t('Sullen'),
    path: '',
  },
  {
    icon: MusicIcon,
    text: t('Magical world'),
    path: '',
  }
])
const handleOpenAddMedia = () => {
  isShowAddMedia.value = !isShowAddMedia.value;
}

function handleChangeMaterial() {
  isShowSources.value = false;
  isShowMaterial.value = true;
}

function handleChangeSource() {
  isShowSources.value = true;
  isShowMaterial.value = false;
}

const handleMuteSource = (item: any) => {
  mediaSourcesStore.muteMediaSource(item, isMuteMediaSources.value)
}

function handleAddCamera() {
  isShowAddMedia.value = false;
  window.ipcRenderer.send('open-child', {
    'command': 'camera'
  })
}

function handleAddShareScreen() {
  isShowAddMedia.value = false;
  window.ipcRenderer.send('open-child', {
    'command': 'screen'
  })
}

function handleAddText() {
  isShowAddMedia.value = false;
  window.ipcRenderer.send('open-child', {
    'command': 'file'
  })
}

function handleAddMovie() {
  isShowAddMedia.value = false;
  window.ipcRenderer.send('open-child', {
    'command': 'image'
  })
}

const handleMore = (item: TUIMediaSourceViewModel) => {
  visibleMorePopupId.value = item.mediaSourceInfo.sourceId;
  mediaSourcesStore.selectMediaSource(item);
}

const toggleVideoResolutionMode = () => {
  if (mixingVideoEncodeParam.value.resMode === TRTCVideoResolutionMode.TRTCVideoResolutionModeLandscape) {
    mediaSourcesStore.updateResolutionMode(TRTCVideoResolutionMode.TRTCVideoResolutionModePortrait);
  } else {
    mediaSourcesStore.updateResolutionMode(TRTCVideoResolutionMode.TRTCVideoResolutionModeLandscape);
  }
}

const handleSelectSource = (item: TUIMediaSourceViewModel) => {
  logger.log('[selectMediaSource]:', item);
  mediaSourcesStore.selectMediaSource(item);
}

const handleRemoveSource = (item: TUIMediaSourceViewModel) => {
  logger.log('[removeMediaSource]:', item);
  mediaSourcesStore.removeMediaSource(item);
}

const handleEditSource = (item: TUIMediaSourceViewModel) => {
  logger.log('[handleEditSource]', item);
  let command = '';
  switch(item.mediaSourceInfo.sourceType) {
  case TUIMediaSourceType.kCamera:
    command = 'camera';
    break;
  case TUIMediaSourceType.kScreen:
    command = 'screen';
    break;
  case TUIMediaSourceType.kImage:
    command = 'image';
    break;
  default:
    logger.error('handleEditSource: sourceType not supported', item.mediaSourceInfo.sourceType);
  }
  if (!command) {
    return;
  }
  window.ipcRenderer.send('open-child', {
    command,
    data: JSON.parse(JSON.stringify(item)),
  });
}

const handleClickOutside = () => {
  // selectedItem.value = null;
  visibleMorePopupId.value = '';
}

function handleAddBlueprint(){
  logger.log('[addBlueprint]');
}

function handleAddWriting() {
  logger.log('[addWriting]');
}

const handleSelectMusic = (item: TUIMusicType) => {
  if (selectedMusicList.value.length === 0 || !selectedMusicList.value.includes(item)) {
    selectedMusicList.value.push(item);
    musicSelectedItem.value = item;
    return
  }
  if (selectedMusicList.value.includes(item)) {
    const indexSelectedMusic = selectedMusicList.value.indexOf(item);
    selectedMusicList.value.splice(indexSelectedMusic, 1);
    musicSelectedItem.value = null;
  } 
};

const onUpdateVoiceValue = (event: number) => {
  currentVoice.value = Math.floor(event);
}
</script>

<style scoped lang="scss">
@import "../../assets/variable.scss";

.tui-title{
  padding-left: 1rem;
}
.tui-resolution-mode-switch {
  float: right;
  cursor: pointer;
  &:hover {
    color: $color-anchor-hover;
  }
}
.tui-config-list{
  display: flex;
  flex-direction: column;
  align-items: center;
}
.source-title{
  color: rgba(143, 154, 178, 1);
  font-family: PingFang SC;
  font-size: 0.875rem;
  font-style: normal;
  font-weight: 400;
  line-height: 1.375rem;
  padding-top: 6.25rem;
}
.tui-source{
  color:#8F9AB2;
  cursor: pointer;
}
.tui-material{
  color:#8F9AB2;
  padding-left: 1rem;
  cursor: pointer;
}
.is-active {
  color: rgba(71, 145, 255, 1);
  font-family: PingFang SC;
  font-size: 1rem;
  padding: 0.375rem 0;
  border-bottom: 2px solid #4791FF;
    &-material {
      margin-left: 1rem;
    }
}
.icon-container{
  padding-right: 0.25rem;
  cursor: pointer;
}
.source{
  display: flex;
  align-items: center;
  justify-content: center;
  width: 12.5rem;
  height: 2.5rem;
  border-radius: 6.25rem;
  background: #383F4D;
  margin: 1.5rem 0;
  cursor: pointer;
}
.tui-media-source{
  display: flex;
  flex-direction: column;
  align-items: center;
}
.add-source{
  display: flex;
  align-items: center;
  justify-content: center;
  width: 14.75rem;
	height: 2rem;
  border-radius: 6.25rem;
  background: #383F4D;
  margin: 1.5rem 0;
  cursor: pointer;
}
.add-media-source{
  position: absolute;
  top: 10rem;
  fill: rgba(45, 50, 62, 0.80);
  stroke-width: 1px;
  stroke: rgba(255, 255, 255, 0.10);
  filter: drop-shadow(0px 0px 26px rgba(12, 19, 40, 0.50));
  backdrop-filter: blur(10px);
  width: 100%;
	height: 12.25rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 1;
}
.add-media{
  display: flex;
  align-items: center;
  justify-content: center;
  width: 12.5rem;
  height: 2.5rem;
  border-radius: 6.25rem;
  cursor: pointer;
}
.text{
  color: #D5E0F2;
  font-family: PingFang SC;
  font-size: 0.75rem;
  font-style: normal;
  font-weight: 400;
  line-height: 1.375rem;
}
.item-container{
  width: 100%;
  position: relative;
  border-radius: 0.25rem;
  margin-bottom: 0.5rem;

  &:hover {
    background: rgba(45, 50, 62, 0.80);
  }

  &.selected {
    background-color: rgba(45, 50, 62, 0.60);
  }
}
.item-title{
  display: flex;
  justify-content: space-between;
  line-height: 3rem;
  &-name{
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden;
    width: 16rem;
    padding-left: 0.5rem;
  }
  &-tool{
    width: 2rem;
  }
}
.item-bottom{
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 0.375rem;
}
.item-more{
  position: absolute;
  width: 5.25rem;
	height: 4rem;
  display: flex;
  flex-direction: column;
  left: 12.25rem;
	top: 2.125rem;
  background: rgba(12, 19, 40, 0.50);
  justify-content: center;
  border: 1px solid rgba(45, 50, 62, 0.80);
  border-radius: 0.3125rem;
  z-index: 1;
  &-text{
    color: #D5E0F2;
    font-family: PingFang SC;
    font-size: 0.75rem;
    font-style: normal;
    font-weight: 400;
    line-height: 1.375rem;
    width: 100%;
    height:1.75rem;
    border-radius: 0.3125rem;
    padding-left: 0.75rem;
    cursor: pointer;
  }
  &-text:hover {
    background: rgba(45, 50, 62, 0.80);
  }
}
.item-icon{
  display: flex;
  align-items: center;
}
.drag-container{
  width: 12rem;
  margin-left: 0.25rem;
}
.tui-material{
  padding-left: 1rem;
}
.options-container{
  display: flex;
  flex-direction: column;
  padding-top: 0.625rem;
  &-title{
    color: var(--G5, #8F9AB2);
    font-family: PingFang SC;
    font-size: 0.875rem;
    font-style: normal;
    font-weight: 400;
    line-height: 1.375rem;
  }
  &-option{
    width:4rem;
    height:2.5rem;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: rgba(56, 63, 77, 0.50);
    border-radius: 0.3125rem;
    margin-top: 0.375rem;
  }
  &-input{
    margin-top: 0.375rem;
  }
  &-text{
    color: var(--G7, #D5E0F2);
    font-family: PingFang SC;
    font-size: 0.75rem;
    font-style: normal;
    font-weight: 400;
    padding-left: 0.125rem;
  }
  &-music{
    display: flex;
    margin-top: 0.375rem;
    &-box{
      display: flex;
      flex-direction: column;
      padding-right: 0.75rem;
      position: relative;
    }
    &-text{
      text-align: center;
      font-family: PingFang SC;
      font-size: 0.75rem;
      font-style: normal;
      font-weight: 400;
      line-height: 1.25rem; /* 166.667% */
      color: var(--G5, #8F9AB2);
    }
  }
  &-icon{
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 0.375rem;
    background: rgba(28, 102, 229, 0.20);
  }
  &-selected{
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 0.375rem;
    border: 1px solid #1C66E5;
    background: rgba(28, 102, 229, 0.20);
  }
  &-draggable{
    display: flex;
    align-items: center;
  }
}
.selected-icon{
  width: 0.6875rem;
  height: 0.6875rem;
  flex-shrink: 0;
  border-radius: 0px 0.375rem 0px 0.1875rem ;
  border: 1px solid rgba(28, 102, 229, 0.20);
  background: #1C66E5;
  position: absolute;
  left: 1.75rem;
}
</style>