import { onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';

const ROUTE_NAME_LIVE_KIT_MAC = 'tui-livekit-mac';
const ROUTE_NAME_LIVE_KIT_MAIN = 'tui-live-kit-main';

export function useAppRequestQuit() {
  const router = useRouter();

  const handleAppRequestQuit = () => {
    const currentRouteName = String(router.currentRoute.value.name || '');
    if (currentRouteName === ROUTE_NAME_LIVE_KIT_MAC || currentRouteName === ROUTE_NAME_LIVE_KIT_MAIN) {
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
