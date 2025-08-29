import { TRTCMediaMixingErrorCode, TRTCMediaSource } from 'trtc-electron-sdk';
import TUIMessageBox from '../common/base/MessageBox';
import { useI18n } from '../locales/index';
import { TUIMediaMixingError } from '../types';

const { t } = useI18n();

const TRTCMediaMixingErrorMessage: { [key: string]: string; } = {
  [TRTCMediaMixingErrorCode.Success.toString()]: t('Success'),
  [TRTCMediaMixingErrorCode.Error.toString()]: t('Media operation failed'),
  [TRTCMediaMixingErrorCode.InvalidParams.toString()]: t('Invalid params'),
  [TRTCMediaMixingErrorCode.NotFoundSource.toString()]: t('Media source not found'),
  [TRTCMediaMixingErrorCode.ImageSourceLoadFailed.toString()]: t('Image source load failed'),
  [TRTCMediaMixingErrorCode.CameraNotAuthorized.toString()]: t('Camera not authorized'),
  [TRTCMediaMixingErrorCode.CameraIsOccupied.toString()]: t('Camera is occupited'),
  [TRTCMediaMixingErrorCode.CameraDisconnected.toString()]: t('Camera is disconnected'),
};

export function onMediaMixingError(error: TUIMediaMixingError) {
  const { code, message } = error;

  if (TRTCMediaMixingErrorMessage[code.toString()]) {
    const errorMessage = TRTCMediaMixingErrorMessage[code.toString()];
    TUIMessageBox({
      title: t('Note'),
      message: errorMessage,
      confirmButtonText: t('Sure'),
    });
  } else {
    TUIMessageBox({
      title: t('Note'),
      message: `Unknown TRTCMediaMixingManager error: ${code} ${message}`,
      confirmButtonText: t('Sure'),
    });
  }
}

export function onError(code: number, message: string, mediaSource?: TRTCMediaSource) {
  onMediaMixingError({
    code,
    message,
    mediaSource
  });
}

export default onMediaMixingError;
