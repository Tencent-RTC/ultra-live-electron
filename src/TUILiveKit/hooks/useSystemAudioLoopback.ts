import trtcCloud from '../utils/trtcCloud';
import { TUIToast, useUIKit } from '@tencentcloud/uikit-base-component-vue3';

export function useSystemAudioLoopback(tag: string) {
  const { t } = useUIKit();

  const notifySystemAudioEnableFailed = () => {
    TUIToast.error({
      message: t('Failed to enable system audio. Please check permissions or driver support'),
    });
  };

  const startSystemAudioLoopbackSafely = () => {
    try {
      trtcCloud.startSystemAudioLoopback();
      trtcCloud.setSystemAudioLoopbackVolume(100);
      return true;
    } catch (error) {
      console.warn(`[${tag}] startSystemAudioLoopback failed`, error);
      notifySystemAudioEnableFailed();
      return false;
    }
  };

  const stopSystemAudioLoopbackSafely = () => {
    try {
      trtcCloud.stopSystemAudioLoopback();
    } catch (error) {
      console.warn(`[${tag}] stopSystemAudioLoopback failed`, error);
    }
  };

  return {
    startSystemAudioLoopbackSafely,
    stopSystemAudioLoopbackSafely,
  };
}
