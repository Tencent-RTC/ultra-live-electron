import { TRTCAudioMusicParam } from 'trtc-electron-sdk';
import { TUIMusicPlayMode } from '../types';


export type VoiceEffectState = {
  selectId : number;
  activeId : number;
}

export type AudioEffect = {
  musicDataList:Array<TRTCAudioMusicParam>;
  musicIdSeed: number;
  musicVolume: number;
  currentPlayMode: TUIMusicPlayMode;
  voiceReverb: VoiceEffectState;
  voiceChanger: VoiceEffectState;
}

export type AudioEffectState = {
  audioEffect: AudioEffect;
  playingMusicId:number;
}

export const defaultAudioEffect: AudioEffect = {
  musicDataList:[],
  musicIdSeed:0,
  musicVolume:0,
  currentPlayMode: TUIMusicPlayMode.SequentialPlay,
  voiceReverb:{selectId:0,activeId:0},
  voiceChanger:{selectId:0,activeId:0}
};

export const isAudioEffectData = (audioEffect: AudioEffect):boolean => {
  return (audioEffect&&
    typeof audioEffect === 'object'&&
    audioEffect.musicDataList&&
    typeof audioEffect.musicIdSeed === 'number' &&
    typeof audioEffect.currentPlayMode === 'string'&&
    typeof audioEffect.musicVolume === 'number'&&
    typeof audioEffect.voiceChanger === 'object'&&
    typeof audioEffect.voiceReverb === 'object'
  )
};
