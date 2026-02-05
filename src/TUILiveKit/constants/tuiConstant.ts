import { TRTCVideoResolution, TRTCVideoColorSpace, TRTCVideoColorRange } from 'trtc-electron-sdk';
import { useI18n } from '../locales';

const { t } = useI18n();

type TUIVideoResolutionType = Record<string | number, {
  width: number;
  height: number;
}>;

export const defaultCameraCaptureWidth = 640;
export const defaultCameraCaptureHeight = 360;

const initResolutionMap = (): TUIVideoResolutionType => {
  const map: TUIVideoResolutionType = {};
  for (const key in TRTCVideoResolution) {
    const isValueProperty = parseInt(key, 10) >= 0;
    if (!isValueProperty) {
      const value = TRTCVideoResolution[key];
      const tmp = key.split('_');
      map[value] = {
        width: parseInt(tmp[1]),
        height: parseInt(tmp[2]),
      }
    }
  }
  return map;
}

export const resolutionMap: TUIVideoResolutionType = initResolutionMap();

export const colorSpaceOptions = [
  {
    label: t('Auto'),
    value: TRTCVideoColorSpace.TRTCVideoColorSpace_Auto,
  },
  {
    label: t('Color Space - BT709'),
    value: TRTCVideoColorSpace.TRTCVideoColorSpace_BT709,
  },
  {
    label: t('Color Space - BT601'),
    value: TRTCVideoColorSpace.TRTCVideoColorSpace_BT601,
  }
];

export const colorRangeOptions = [
  {
    label: t('Auto'),
    value: TRTCVideoColorRange.TRTCVideoColorRange_Auto,
  },
  {
    label: t('Color Range - Full'),
    value: TRTCVideoColorRange.TRTCVideoColorRange_Full,
  },
  {
    label: t('Color Range - Limited'),
    value: TRTCVideoColorRange.TRTCVideoColorRange_Limited,
  }
];

export const MEDIA_SOURCE_STORAGE_KEY = 'TRTC_LIVE_MEDIA_SOURCES';
export const INVITATION_TIMEOUT = 10; // seconds
export const DEFAULT_USER_AVATAR_URL =  'https://web.sdk.qcloud.com/component/TUIKit/assets/avatar_16.png';
export const MAX_SDK_APP_ID = 4294967295;

export enum TUIMediaSourceEditMode {
  Add = 'Add',
  Edit = 'Edit'
}
