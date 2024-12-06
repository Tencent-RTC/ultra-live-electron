import { defineStore } from 'pinia';
import { TRTCAudioMusicParam } from 'trtc-electron-sdk';
import { TUIMusicPlayMode } from '../types';
import { safelyParse } from '../utils/utils';
import useAudioEffectManager from '../utils/useAudioEffectManager';

const audioEffectManager = useAudioEffectManager();

type VoiceEffectState = {
  selectId : number;
  activeId : number;
}

type AudioEffect = {
  musicDataList:Array<TRTCAudioMusicParam>;
  musicIdSeed: number;
  musicVolume: number;
  currentPlayMode: TUIMusicPlayMode;
  voiceReverb: VoiceEffectState;
  voiceChanger: VoiceEffectState;
}

type AudioEffectState = {
  audioEffect: AudioEffect;
  playingMusicId:number;

}

const defaultAudioEffect: AudioEffect = {
  musicDataList:[{
    id: 0,
    path:
        'https://web.sdk.qcloud.com/trtc/electron/download/resources/media/bgm/PositiveHappyAdvertising.mp3',
    loopCount: 0,
    publish: true,
    isShortFile: false,
    startTimeMS: 0,
    endTimeMS: 0
  }],
  musicIdSeed:0,
  musicVolume:0,
  currentPlayMode: TUIMusicPlayMode.SequentialPlay,
  voiceReverb:{selectId:0,activeId:0},
  voiceChanger:{selectId:0,activeId:0}
}

const isAudioEffectData = (audioEffect: AudioEffect):boolean => {
  return (audioEffect&&
    typeof audioEffect === 'object'&&
    audioEffect.musicDataList&&
    typeof audioEffect.musicIdSeed === 'number' &&
    typeof audioEffect.currentPlayMode === 'string'&&
    typeof audioEffect.musicVolume === 'number'&&
    typeof audioEffect.voiceChanger === 'object'&&
    typeof audioEffect.voiceReverb === 'object'
  )
}
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
        loopCount: 2,
        publish: true,
        isShortFile: false,
        startTimeMS: 0,
        endTimeMS: 0
      };
      this.audioEffect.musicDataList.push(data);
      this.updateMusicData(this.getMusicDataOrigin());
    },
    deleteMusic(id: number) {
      for (const i in this.audioEffect.musicDataList) {
        const item = this.audioEffect.musicDataList[i];
        if (item.id === id) {
          this.audioEffect.musicDataList.splice(+i, 1);
          this.updateMusicData(this.getMusicDataOrigin());
          return;
        }
      }
    },
    updateMusicData(data: AudioEffect) {
      this.audioEffect = data;
      localStorage.setItem('musicData', JSON.stringify(data));
      window.mainWindowPort?.postMessage({
        key:"updateMusicData",
        data,
      });

    },
    updatePlayingMusicId(id:number){
      this.playingMusicId = id;
    },
    updateAudioEffectOrChangeVoiceInfo(prop:"voiceReverb" | "voiceChanger",Info: VoiceEffectState){
      this.audioEffect[prop] = Info;
      this.updateMusicData(this.getMusicDataOrigin());
    },
    setMusicVolume(volume: number) {
      this.audioEffect.musicVolume = volume;
      this.updateMusicData(this.getMusicDataOrigin());
    },
    setPlayingMusicId(id: number) {
      this.playingMusicId = id;
      this.updatePlayingMusicId(id);
    },
    setCurrentPlayMode(playModeKey: TUIMusicPlayMode) {
      this.audioEffect.currentPlayMode = TUIMusicPlayMode[playModeKey];
      this.updateMusicData(this.getMusicDataOrigin());
    },
    getMusicPath(id: number): string {
      for(let i=0;i<this.audioEffect.musicDataList?.length;i++){
        if(this.audioEffect.musicDataList[i].id === id){
          return this.audioEffect.musicDataList[i].path
        }
      }
      return '';
    },
    getMusicIndex(id: number): number {
      for (const i in this.audioEffect.musicDataList) {
        if (this.audioEffect.musicDataList[i].id === id) {
          return +i;
        }
      }
      return -1;
    },
    getMusicDataOrigin(){
      return safelyParse(JSON.stringify(this.audioEffect));
    }
    ,
    getMusicDataLength(): number {
      return this.audioEffect.musicDataList?.length;
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
    generateNewId():number {
      if (this.audioEffect.musicIdSeed + 1 >= (Math.pow(2, 31) - 1)) {
        this.audioEffect.musicIdSeed = 0;
      } else {
        ++this.audioEffect.musicIdSeed;
      }
      return this.audioEffect.musicIdSeed;
    },
    initVoiceEffect(){
      audioEffectManager.setVoiceReverbType(this.audioEffect.voiceReverb.activeId);
      audioEffectManager.setVoiceChangerType(this.audioEffect.voiceChanger.activeId);
    }
  }
});
