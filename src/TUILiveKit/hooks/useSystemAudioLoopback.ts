import trtcCloud from '../utils/trtcCloud';
import { useUIKit } from '@tencentcloud/uikit-base-component-vue3';
import { showMessage, MessageToastType } from '../base-component/MessageToast';

export function useSystemAudioLoopback(tag: string) {
  const { t } = useUIKit();

  const notifySystemAudioEnableFailed = () => {
    showMessage({
      type: MessageToastType.Error,
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
