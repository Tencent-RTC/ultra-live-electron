<template>
  <div class="tui-add-bgm-window">
    <div class="tui-bgm-window-title tui-window-header">
      <span>{{ t("AddBGM") }}</span>
      <button class="tui-icon" @click="handleCloseSetting">
        <svg-icon :icon="CloseIcon" class="tui-secondary-icon"></svg-icon>
      </button>
    </div>
    <div class="tui-bgm-window-content">
      <div class="tui-audio-control">
        <div class="tui-audio-control-left">
          <svg-icon :icon="bgmVolume ? SpeakerOnIcon : SpeakerOffIcon" @click="onChangeBGMVolume" ></svg-icon>
          <tui-slider :value="bgmVolume" @update:value="onUpdateBgmVolume" class="tui-drag-container"/>
        </div>
        <div class="tui-audio-control-right" @click="onTogglePlayMode">
          <svg-icon :icon="playModeIconList[currentPlayModeIndex]"></svg-icon>
        </div>
      </div>
      <div class="tui-audio-list">
        <div class="tui-audio-list-title">{{t("PlayList")}}</div>
        <div class="tui-audio-list-area">
          <div class="tui-audio-list-scroll-area">
            <div class="tui-audio-item-add" @click="openAddedMusice">
              <div class="tui-audio-item-icon">
                <svg-icon :icon="AddMusicIcon"></svg-icon>
              </div>
              <div class="tui-audio-item-desc">{{t("Add music")}}</div>
            </div>
            <div v-for="item in audioEffect.musicDataList" :key="item.id" class="tui-audio-item-music" :class="{ 'tui-audio-item-active': playingMusicId === item.id }">
              <div class="tui-audio-item-icon">
                <svg-icon class="musicListIcon" :icon="MusicListIcon" @click="onPlayMusic(item.id)" ></svg-icon>
              </div>
              <div class="tui-audio-item-desc">{{ musicName(item.id) }}</div>
              <div class="tui-audio-item-operate">
                <div class="tui-audio-item-play" @click="onPlayMusic(item.id)">
                  <svg-icon class="tui-play-music-icon" :icon="playingMusicId === item.id ? PausePlayIcon : StartPlayIcon"></svg-icon>
                </div>
                <div class="tui-audio-item-delete" @click="onDeleteMusic(item.id)">
                  <svg-icon class="tui-delete-music-icon" :icon="DeleteMusicIcon"></svg-icon>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <input ref="selectMusicEle" type="file" accept=".mp3,.aac,.m4a,.wav" style="display: none"/>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted } from 'vue';
import { storeToRefs } from 'pinia';
import { TRTCDeviceType } from '@tencentcloud/tuiroom-engine-electron';
import { TUIMusicPlayMode } from '../../../types';
import SvgIcon from '../../../common/base/SvgIcon.vue';
import CloseIcon from '../../../common/icons/CloseIcon.vue';
import SpeakerOffIcon from '../../../common/icons/SpeakerOffIcon.vue';
import SpeakerOnIcon from '../../../common/icons/SpeakerOnIcon.vue';
import MusicListIcon from '../../../common/icons/MusicListIcon.vue';
import AddMusicIcon from '../../../common/icons/AddMusicIcon.vue';
import DeleteMusicIcon from '../../../common/icons/DeleteMusicIcon.vue';
import PausePlayIcon from '../../../common/icons/PausePlayIcon.vue';
import StartPlayIcon from '../../../common/icons/StartPlayIcon.vue';
import SequentialPlayIcon from '../../../common/icons/SequentialPlayIcon.vue';
import SingleLoopPlayIcon from '../../../common/icons/SingleLoopPlayIcon.vue';
import TuiSlider from '../../../common/base/Slider.vue';
import { useAudioEffectStore} from '../../../store/child/audioEffect';
import TUIMessageBox from '../../../common/base/MessageBox/index';
import { useI18n } from '../../../locales';

const { t } = useI18n();
const audioEffectStore = useAudioEffectStore();
const { audioEffect, musicName, playingMusicId } = storeToRefs(audioEffectStore);
const bgmVolume = ref(0);
bgmVolume.value = audioEffect.value.musicVolume ? audioEffect.value.musicVolume / 100 : 0;
const selectMusicEle = ref();
const currentPlayModeIndex = ref(1);
let lastbgmVolume = 0;
let pausePlayingMusicId = -1;
const playModeIconList = [SequentialPlayIcon, SingleLoopPlayIcon];
const playModeList = [TUIMusicPlayMode.SequentialPlay, TUIMusicPlayMode.SingleLoopPlay];
enum PostMessageKey {
  startPlayMusic = 'startPlayMusic',
  stopPlayMusic ='stopPlayMusic',
  pausePlayMusic = 'pausePlayMusic',
  resumePlayMusic = 'resumePlayMusic',
  setAllMusicVolume = 'setAllMusicVolume',
  setCurrentDeviceVolume = 'setCurrentDeviceVolume',
  setMusicPublishVolume = 'setMusicPublishVolume',
  setMusicObserver = 'setMusicObserver',
  singleLoopPlay = 'singleLoopPlay',
  sequentialPlay = 'sequentialPlay',
  updatePlayingMusicId = 'updatePlayingMusicId',
  updateAudioEffectData = 'updateAudioEffectData'
}

onMounted(() => {
  selectMusicEle.value?.addEventListener('change', handleAddBgm);
  onTogglePlayMode();
  onUpdateBgmVolume(audioEffect.value.musicVolume);
});

onUnmounted(() => {
  selectMusicEle.value?.removeEventListener('change',handleAddBgm);
})

watch(playingMusicId, (newValue) => {
  postMessage(PostMessageKey.updatePlayingMusicId, newValue);
  switch (playModeList[currentPlayModeIndex.value]) {
  case TUIMusicPlayMode.SingleLoopPlay:
    handleSingleLoopPlay(playingMusicId.value);
    break;
  case TUIMusicPlayMode.SequentialPlay:
    handleSequentialPlay(playingMusicId.value);
    break;
  default:
    break;
  }
});

function handleAddBgm(data:any){
  const musicFile = data.target.files[0];
  const isRepetition = audioEffectStore.isRepetition(musicFile);
  if (isRepetition) {
    TUIMessageBox({
      title: t('Note'),
      message: t('Please do not duplicate!'),
      confirmButtonText: t('Sure'),
    });
  } else {
    audioEffectStore.addMusic(musicFile);
    selectMusicEle.value.value = '';
  }
}

function openAddedMusice(){
  selectMusicEle?.value.click();
}

function onChangeBGMVolume(){
  bgmVolume.value ? (bgmVolume.value = 0) : (bgmVolume.value = lastbgmVolume);
  const volume = bgmVolume.value * 100;
  audioEffectStore.setMusicVolume(volume);
  postMessage(PostMessageKey.setAllMusicVolume, volume);
  postMessage(PostMessageKey.setCurrentDeviceVolume, {
    type: TRTCDeviceType.TRTCDeviceTypeMic,
    volume,
  });
  postMessage(PostMessageKey.setMusicPublishVolume, {
    volume,
    id: playingMusicId.value,
  });
}

function onPlayMusic(id: number){
  if (playingMusicId.value !== -1 && playingMusicId.value === id) {
    postMessage(PostMessageKey.pausePlayMusic, playingMusicId.value);
    pausePlayingMusicId = id;
    audioEffectStore.updatePlayingMusicId(-1);
  } else if (playingMusicId.value !== -1 && playingMusicId.value !== id) {
    postMessage(PostMessageKey.stopPlayMusic, playingMusicId.value);
    audioEffectStore.updatePlayingMusicId(id);
    pausePlayingMusicId = -1;
  } else if (playingMusicId.value === -1) {
    if (pausePlayingMusicId === id) {
      postMessage(PostMessageKey.resumePlayMusic, pausePlayingMusicId);
    } else {
      postMessage(PostMessageKey.stopPlayMusic, pausePlayingMusicId);
    }
    audioEffectStore.updatePlayingMusicId(id);
  }
}

function onDeleteMusic (id: number){
  postMessage(PostMessageKey.stopPlayMusic, id);
  audioEffectStore.deleteMusic(id);
}

function handleCloseSetting(){
  window.ipcRenderer.send('close-child');
}

function handleSingleLoopPlay(id: number){
  postMessage(PostMessageKey.singleLoopPlay,id);
}

function handleSequentialPlay(id: number){
  if (id === -1) return;
  const playingMusicIndex = audioEffectStore.getMusicIndex(id);
  if(playingMusicIndex === -1) return;
  postMessage(PostMessageKey.sequentialPlay, playingMusicIndex);
}

function onTogglePlayMode(){
  currentPlayModeIndex.value = (currentPlayModeIndex.value + 1) % playModeList.length;
  switch (playModeList[currentPlayModeIndex.value]) {
  case TUIMusicPlayMode.SequentialPlay: {
    handleSequentialPlay(playingMusicId.value);
    audioEffectStore.setCurrentPlayMode(TUIMusicPlayMode.SequentialPlay);
    break;
  }
  case TUIMusicPlayMode.SingleLoopPlay: {
    handleSingleLoopPlay(playingMusicId.value);
    audioEffectStore.setCurrentPlayMode(TUIMusicPlayMode.SingleLoopPlay);
    break;
  }
  default:
    break;
  }
}

function onUpdateBgmVolume(volume: number){
  if(volume === undefined)volume=0;
  bgmVolume.value = volume / 100;
  lastbgmVolume = bgmVolume.value;
  audioEffectStore.setMusicVolume(volume);
  postMessage(PostMessageKey.setAllMusicVolume, volume);
  postMessage(PostMessageKey.setCurrentDeviceVolume, {
    type: TRTCDeviceType.TRTCDeviceTypeMic,
    volume,
  });
}

function postMessage(key: string, data: object | number | string | undefined){
  window.mainWindowPortInChild?.postMessage({
    key,
    data,
  });
}

</script>
<style scoped lang="scss">
@import "../../../assets/global.scss";
.tui-add-bgm-window {
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;

  .tui-bgm-window-title {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    padding: 1rem 1.5rem;

    .close-icon {
      cursor: pointer;
    }
  }

  .tui-bgm-window-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    height: 100%;
    background-color: var(--bg-color-dialog);
  }

  .tui-audio-control {
    display: flex;
    align-items: center;
    width: 100%;

    .tui-audio-control-left {
      width: 90%;
      display: flex;
      align-items: center;
      padding: 1rem 0.5rem 1rem 1.5rem;

      .tui-drag-container {
        margin-left: 1rem;
      }
    }

    .tui-audio-control-right {
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }

  .tui-audio-list {
    width: 90%;
    height: 75%;
    border-top:1px solid var(--stroke-color-primary);
    padding-top:1rem;
    color: var(--text-color-primary);

    .tui-audio-list-area {
      height: 100%;
      margin-top: 1rem;
      padding: 1rem;
      border-radius: 1.5rem;
      border: 1px solid var(--stroke-color-primary);

      .tui-audio-list-scroll-area {
        height: 100%;
        overflow-y: auto;

        .tui-audio-item-add,
        .tui-audio-item-music {
          display: flex;
          align-items: center;
          padding: 0.5rem;
          border-radius: 0.5rem;
          .tui-audio-item-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 4rem;
            height: 4rem;
            margin-right: 1.5rem;
            border-radius: 0.5rem;
            background-color: var(--dropdown-color-hover);

            .musicListIcon{
              color: var(--text-color-link);
            }
          }

          .tui-audio-item-desc {
            display: flex;
            justify-content: start;
            align-items: center;
            width: 45%;
            height: 4rem;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            color: var(--text-color-primary);
          }
        }

        .tui-audio-item-add {
          cursor: pointer;
        }

        .tui-audio-item-music {
          display: flex;

          .tui-audio-item-operate {
            display: flex;

            .tui-audio-item-play {
              width: 4rem;
              height: 2.5rem;
              border-radius: 1.5rem;
              border: 1px solid $color-add-bgm-autio-item-play-button-border;
              margin-left: 2rem;
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;

              .tui-play-music-icon{
                color: $color-add-bgm-play-music-icon;
              }
            }

            .tui-audio-item-delete {
              display: flex;
              align-items: center;
              justify-content: center;
              width: 4rem;
              height: 2.5rem;
              border-radius: 1.5rem;
              border: 1px solid $color-add-bgm-autio-item-delete-button-border;
              cursor: pointer;
              margin-left: 0.5rem;

              .tui-delete-music-icon{
                color: $color-add-bgm-autio-item-delete-button-border;
              }
            }
          }
        }

        .tui-audio-item-active {
          background-color: var(--dropdown-color-active);
        }
      }
    }
  }
}
</style>
