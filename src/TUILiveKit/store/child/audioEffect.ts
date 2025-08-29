import { defineStore } from 'pinia';
import { TRTCAudioMusicParam } from 'trtc-electron-sdk';
import { TUIMusicPlayMode } from '../../types';
import { safelyParse } from '../../utils/utils';
import { AudioEffectState, AudioEffect, VoiceEffectState, defaultAudioEffect, isAudioEffectData } from '../types';

export const useAudioEffectStore = defineStore('audioEffect', {
  state: (): AudioEffectState => ({
    audioEffect: isAudioEffectData(safelyParse(localStorage.getItem('musicData') as string)) ? safelyParse(localStorage.getItem('musicData') as string): defaultAudioEffect,
    playingMusicId:-1,
  }),
  getters: {
    musicName(state) {
      return (id: number) => {
        for (const item of state.audioEffect.musicDataList) {
          if (item.id === id) {
            let postfix: string|undefined = '';
            if (item.path.includes('/')) {
              postfix = (item.path.split('/')).pop();
            }
            else {
              postfix = (item.path.split('\\')).pop();
            }
            return postfix ?.split('.')[0];
          }
        }
      };
    }
  },
  actions: {
    addMusic(musicFile: File&{path: string}) {
      const data: TRTCAudioMusicParam = {
        id: this.generateNewId(),
        path: musicFile.path,
        loopCount: 0,
        publish: true,
        isShortFile: false,
        startTimeMS: 0,
        endTimeMS: 0
      };
      this.audioEffect.musicDataList.push(data);
      this.updateAudioEffectData(this.getAudioEffectOriginData());
    },
    deleteMusic(id: number) {
      for (const i in this.audioEffect.musicDataList) {
        const item = this.audioEffect.musicDataList[i];
        if (item.id === id) {
          this.audioEffect.musicDataList.splice(+i, 1);
          this.updateAudioEffectData(this.getAudioEffectOriginData());
          return;
        }
      }
    },
    setMusicVolume(volume: number) {
      this.audioEffect.musicVolume = volume;
      this.updateAudioEffectData(this.getAudioEffectOriginData());
    },
    updatePlayingMusicId(id:number){
      this.playingMusicId = id;
    },
    isRepetition(musicFile: File&{path: string}): boolean {
      for(let i=0;i < this.audioEffect.musicDataList?.length;i++){
        if(!this.audioEffect.musicDataList[i])return false;
        if(this.audioEffect.musicDataList[i].path === musicFile.path){
          return true;
        }
      }
      return false;
    },
    getMusicIndex(id: number): number {
      for (const i in this.audioEffect.musicDataList) {
        if (this.audioEffect.musicDataList[i].id === id) {
          return +i;
        }
      }
      return -1;
    },
    setCurrentPlayMode(playModeKey: TUIMusicPlayMode) {
      this.audioEffect.currentPlayMode = TUIMusicPlayMode[playModeKey];
      this.updateAudioEffectData(this.getAudioEffectOriginData());
    },
    updateAudioEffectData(data: AudioEffect) {
      this.audioEffect = data;
      localStorage.setItem('musicData', JSON.stringify(data));
      window.mainWindowPortInChild?.postMessage({
        key:'updateAudioEffectData',
        data,
      });
    },
    getAudioEffectOriginData(){
      return safelyParse(JSON.stringify(this.audioEffect));
    },
    generateNewId():number {
      if (this.audioEffect.musicIdSeed + 1 >= (Math.pow(2, 31) - 1)) {
        this.audioEffect.musicIdSeed = 0;
      } else {
        ++this.audioEffect.musicIdSeed;
      }
      return this.audioEffect.musicIdSeed;
    },
    updateAudioEffectOrChangeVoiceInfo(prop:'voiceReverb' | 'voiceChanger',Info: VoiceEffectState){
      this.audioEffect[prop] = Info;
      this.updateAudioEffectData(this.getAudioEffectOriginData());
    },
  }
});
