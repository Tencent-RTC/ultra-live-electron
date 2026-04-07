import { TRTCMediaMixingErrorCode, TRTCMediaSource } from 'trtc-electron-sdk';
import TUIMessageBox from '../common/base/MessageBox';
import { useUIKit } from '@tencentcloud/uikit-base-component-vue3';
import { TUIMediaMixingError } from '../types';

// Build the error message map lazily to avoid calling useUIKit() at module top level
function getErrorMessage(code: number): string | undefined {
  const { t } = useUIKit();
  const errorMessageMap: { [key: string]: string } = {
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
  return errorMessageMap[code.toString()];
}

export function onMediaMixingError(error: TUIMediaMixingError) {
  const { t } = useUIKit();
  const { code, message } = error;

  const errorMessage = code !== undefined && code !== null ? getErrorMessage(code) : undefined;
  if (errorMessage) {
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
