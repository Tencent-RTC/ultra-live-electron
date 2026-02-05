import { TRTCVideoResolution } from 'trtc-electron-sdk';
import { TUIVideoQuality } from '@tencentcloud/tuiroom-engine-electron';


export function convertTRTCVideoResolutionToTUIVideoQuality(trtcVideoResolution: TRTCVideoResolution): TUIVideoQuality {
  switch (trtcVideoResolution) {
  case TRTCVideoResolution.TRTCVideoResolution_1920_1080:
    return TUIVideoQuality.kVideoQuality_1080p;
  case TRTCVideoResolution.TRTCVideoResolution_1280_720:
    return TUIVideoQuality.kVideoQuality_720p;
  case TRTCVideoResolution.TRTCVideoResolution_960_540:
    return TUIVideoQuality.kVideoQuality_540p;
  case TRTCVideoResolution.TRTCVideoResolution_640_360:
    return TUIVideoQuality.kVideoQuality_360p;
  default:
    console.warn('unsupported TUIVideoQuality, will use 1080p', trtcVideoResolution);
    return TUIVideoQuality.kVideoQuality_1080p;
  }
}
