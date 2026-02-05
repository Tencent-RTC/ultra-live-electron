import { onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';

const ROUTE_NAME_LIVE_KIT_MAC_V2 = 'tui-livekit-mac-v2';

export function useAppRequestQuit() {
  const router = useRouter();

  const handleAppRequestQuit = () => {
    if (router.currentRoute.value.name !== ROUTE_NAME_LIVE_KIT_MAC_V2) {
      window.ipcRenderer?.send('app-quit-confirmed');
    }
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
