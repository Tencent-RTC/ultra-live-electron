import { watch } from 'vue';
import { useUIKit } from '@tencentcloud/uikit-base-component-vue3';
import { ipcBridge, IPCMessageType, MainProcessAction } from '../TUILiveKit/ipc';

let hasInitialized = false;

/**
 * Counter to track pending remote-triggered language changes.
 * Incremented before calling setLanguage from a remote source,
 * decremented in the watcher to skip broadcast for those changes.
 * Using a counter instead of a boolean flag avoids race conditions
 * when multiple remote changes arrive in quick succession.
 */
let remoteChangeCounter = 0;

function applyRemoteLanguage(nextLanguage: string, setLanguage: (lang: string) => void, currentLanguage: string) {
  if (!nextLanguage || nextLanguage === currentLanguage) {
    return;
  }
  remoteChangeCounter++;
  setLanguage(nextLanguage);
}

export function initLanguageSync() {
  if (hasInitialized) {
    return;
  }
  hasInitialized = true;

  const { language, setLanguage } = useUIKit();

  ipcBridge.on<{ language?: string }>(IPCMessageType.CHANGE_LANGUAGE, (payload) => {
    if (!payload?.language) {
      return;
    }
    applyRemoteLanguage(payload.language, setLanguage, language.value);
  });

  watch(language, (nextLanguage) => {
    if (remoteChangeCounter > 0) {
      remoteChangeCounter--;
      return;
    }
    ipcBridge.broadcast(IPCMessageType.CHANGE_LANGUAGE, { language: nextLanguage });
    ipcBridge.sendToElectronMain(MainProcessAction.SET_LANGUAGE, nextLanguage);
  });

  if (window.ipcRenderer?.invoke) {
    window.ipcRenderer.invoke('get-language')
      .then((mainLanguage: string) => {
        applyRemoteLanguage(mainLanguage, setLanguage, language.value);
      })
      .catch(() => {
        // Ignore failures; fall back to locale from navigator/URL.
      });
  }
}
