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
  [TRTCMediaMixingErrorCode.CameraIsOccupied.toString()]: t('Camera is occupied'),
  [TRTCMediaMixingErrorCode.CameraDisconnected.toString()]: t('Camera is disconnected'),
  [TRTCMediaMixingErrorCode.UnsupportedOnlineVideoProtocol.toString()]: t('Unsupported online video protocol'),
  [TRTCMediaMixingErrorCode.UnsupportedLocalVideoFileFormat.toString()]: t('Unsupported local video file format'),
  [TRTCMediaMixingErrorCode.OnlineVideoConnectFailed.toString()]: t('Online video connect failed'),
  [TRTCMediaMixingErrorCode.OnlineVideoConnectionLost.toString()]: t('Online video connection lost'),
  [TRTCMediaMixingErrorCode.NoAvailableHevcDecoder.toString()]: t('No available hevc decoder'),
  [TRTCMediaMixingErrorCode.VideoFileNotExist.toString()]: t('Video file not exist'),
};

export function onMediaMixingError(error: TUIMediaMixingError) {
  const { code, message } = error;

  if (code !== undefined && code !== null && TRTCMediaMixingErrorMessage[code.toString()]) {
    const errorMessage = TRTCMediaMixingErrorMessage[code.toString()];
    TUIMessageBox({
      title: t('Note'),
      message: errorMessage,
      confirmButtonText: t('Sure'),
    });
  } else {
    TUIMessageBox({
      title: t('Note'),
      message: message,
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
