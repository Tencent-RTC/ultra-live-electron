import { onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';

const ROUTE_NAME_LIVE_KIT_MAC_V2 = 'tui-livekit-mac-v2';
const ROUTE_NAME_LIVE_KIT_MAIN_V2 = 'tui-live-kit-main-v2';

export function useAppRequestQuit() {
  const router = useRouter();

  const handleAppRequestQuit = () => {
    const currentRouteName = String(router.currentRoute.value.name || '');
    if (currentRouteName === ROUTE_NAME_LIVE_KIT_MAC_V2 || currentRouteName === ROUTE_NAME_LIVE_KIT_MAIN_V2) {
      return;
    }
    window.ipcRenderer?.send('app-quit-confirmed');
  };

  onMounted(() => {
    if (window.ipcRenderer) {
      window.ipcRenderer.on('app-request-quit', handleAppRequestQuit);
    }
  });

  onBeforeUnmount(() => {
    if (window.ipcRenderer) {
      window.ipcRenderer.off('app-request-quit', handleAppRequestQuit);
    }
  });
}
