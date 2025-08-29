import { Rect, TRTCMediaSource, TRTCPhoneMirrorParam, TRTCUserStream, TRTCVideoColorRange, TRTCVideoColorSpace, TRTCVideoFillMode } from 'trtc-electron-sdk';
import {
  TUIRole,
  TUISeatRegion,
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
  mirrorParams?: TRTCPhoneMirrorParam;
  colorSpace?: TRTCVideoColorSpace;
  colorRange?: TRTCVideoColorRange;
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

export enum TUIStreamLayoutMode {
  Float = 'Float',
  Grid = 'Grid',
  None = 'None',
}

export type TUIMediaMixingError = {
  code: number;
  message: string;
  mediaSource?: TRTCMediaSource;
}

export type TUIUserSeatStreamRegion = TRTCUserStream & TUISeatRegion & {
  rect: Rect;
  zOrder: number;
  fillMode: TRTCVideoFillMode;
}

export enum TUISeatLayoutTemplate {
  LandscapeDynamic_1v3 = 200,
  PortraitDynamic_Grid9 = 600,
  PortraitDynamic_1v6 = 601,
  PortraitFixed_Grid9 = 800,
  PortraitFixed_1v6 = 801,
  PortraitFixed_6v6 = 802,
}
