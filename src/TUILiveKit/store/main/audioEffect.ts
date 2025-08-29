import { defineStore } from 'pinia';
import { TRTCAudioMusicParam, TRTCVoiceChangerType, TRTCVoiceReverbType } from 'trtc-electron-sdk';
import { safelyParse } from '../../utils/utils';
import useAudioEffectManager from '../../utils/useAudioEffectManager';
import { AudioEffectState, AudioEffect, defaultAudioEffect, isAudioEffectData } from '../types';
import { messageChannels } from '../../communication';

const audioEffectManager = useAudioEffectManager();

export const useAudioEffectStore = defineStore('audioEffect', {
  state: (): AudioEffectState => ({
    audioEffect: isAudioEffectData(safelyParse(localStorage.getItem('musicData') as string)) ? safelyParse(localStorage.getItem('musicData') as string): defaultAudioEffect,
    playingMusicId:-1,
  }),
  actions: {
    updateAudioEffectData(data: AudioEffect) {
      this.audioEffect = data;
      localStorage.setItem('musicData', JSON.stringify(data));
    },
    updatePlayingMusicId(id:number){
      this.playingMusicId = id;
    },
    getMusicIndex(id: number): number {
      for (const i in this.audioEffect.musicDataList) {
        if (this.audioEffect.musicDataList[i].id === id) {
          return +i;
        }
      }
      return -1;
    },
    getMusicDataLength(): number {
      return this.audioEffect.musicDataList?.length;
    },
    getMusicPath(id: number): string {
      for(let i=0;i<this.audioEffect.musicDataList?.length;i++){
        if(this.audioEffect.musicDataList[i].id === id){
          return this.audioEffect.musicDataList[i].path
        }
      }
      return '';
    },
    initVoiceEffect() {
      audioEffectManager.setVoiceReverbType(this.audioEffect.voiceReverb.activeId);
      audioEffectManager.setVoiceChangerType(this.audioEffect.voiceChanger.activeId);
    },
    async startPlayMusic(id?: number) {
      if (id !== undefined && id !== null) {
        this.playingMusicId = id;
      }
      if (this.playingMusicId !== -1) {
        const playingMusicIndex = this.getMusicIndex(this.playingMusicId);
        const path = this.audioEffect.musicDataList[playingMusicIndex].path;
        const startTimeMS = await audioEffectManager.getMusicCurrentPosInMS(this.playingMusicId);
        const playParams: TRTCAudioMusicParam = {
          id: this.playingMusicId,
          path,
          publish: true,
          loopCount: 0,
          isShortFile: false,
          startTimeMS: startTimeMS === -1 ? 0 : startTimeMS,
          endTimeMS: 0,
        };
        audioEffectManager.startPlayMusic(playParams);
      }
    },
    stopPlayMusic(id: number) {
      audioEffectManager.stopPlayMusic(id);
      if (id === this.playingMusicId) {
        this.playingMusicId = -1;
      }
    },
    pausePlayMusic(id: number) {
      audioEffectManager.pausePlayMusic(id);
    },
    resumePlayMusic(id: number) {
      audioEffectManager.resumePlayMusic(id);
    },
    setAllMusicVolume(volume: number) {
      audioEffectManager.setAllMusicVolume(volume);
    },
    setMusicPublishVolume(options: {id?: number; volume: number;}) {
      if (options.id !== undefined && options.id !== null) {
        audioEffectManager.setMusicPublishVolume(options.id, options.volume)
      }
    },
    seekMusicToPosInTime(options: {id?: number; startTimeMS: number;}) {
      if (options.id !== undefined && options.id !== null) {
        audioEffectManager.seekMusicToPosInTime(options.id, options.startTimeMS)
      }
    },
    setVoiceReverbType(type: TRTCVoiceReverbType) {
      audioEffectManager.setVoiceReverbType(type);
    },
    setVoiceChangerType(type: TRTCVoiceChangerType) {
      audioEffectManager.setVoiceChangerType(type);
    },
    reset() {
      if (this.playingMusicId !== -1) {
        this.stopPlayMusic(this.playingMusicId);
        if (messageChannels.messagePortToChild) {
          messageChannels.messagePortToChild.postMessage({key: 'update-playing-music-id', data: this.playingMusicId});
        }
      }
    }
  }
});
