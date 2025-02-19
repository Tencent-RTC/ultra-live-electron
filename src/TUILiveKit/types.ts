import { TRTCMediaSource } from 'trtc-electron-sdk';
import {
  TUIRole,
} from '@tencentcloud/tuiroom-engine-electron';
import { TRTCXmagicEffectProperty } from './utils/beauty';


export type TUIBeautyConfig = {
  isEnabled: boolean;
  beautyProperties: TRTCXmagicEffectProperty[];
}

enum TUIScreenType {
  Window = 0,
  Screen = 1
}

export type TUIMediaSourceViewModel = {
  sourceName: string;
  aliasName: string;
  left: number;
  top: number;
  muted: boolean;
  resolution?: {
    width: number;
    height: number;
  };
  mediaSourceInfo: TRTCMediaSource;
  beautyConfig?: TUIBeautyConfig;
  screenType?: TUIScreenType;
}

export type TUILiveUserInfo = {
  userId: string,
  userName?: string,
  avatarUrl?: string,
  userRole?: TUIRole,
  // Is it on the seat
  onSeat?: boolean,
  onSeatTimestamp?: number,
  // Whether the user is applying for seat
  isUserApplyingToAnchor?: boolean,
  // The requestId of the user requesting to be on the seat
  applyToAnchorRequestId?: string,
  // The time at which a user applies to be on the seat
  applyToAnchorTimestamp?: number,
}

export enum TUIMusicPlayMode {
  SingleLoopPlay = 'SingleLoopPlay',
  SequentialPlay = 'SequentialPlay'
}