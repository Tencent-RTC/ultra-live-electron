import { ref, Ref, onMounted, onUnmounted, nextTick } from 'vue';
import { TRTCMediaSource, TRTCMediaMixingEvent } from 'trtc-electron-sdk';
import { TUIMediaSourceViewModel } from '../../types';
import useMediaMixingManager from '../../utils/useMediaMixingManager';
import { useMediaSourcesStore } from '../../store/main/mediaSources';

const logger = console;
const logPrefix = '[useContextMenu]';

const mediaMixingManager = useMediaMixingManager();

function useContextMenu() {
  const contextCommand: Ref<string> = ref('');
  const selectedMediaSource: Ref<TUIMediaSourceViewModel|null> = ref(null);
  const mediaSourcesStore = useMediaSourcesStore();

  window.ipcRenderer.on('context-menu-command', async (event: any, command: string) => {
    console.log(`${logPrefix}context-menu-command:`, command);
    if (selectedMediaSource.value) {
      switch (command) {
      case "move-up":
        mediaSourcesStore.changeMediaOrder(selectedMediaSource.value, 1);
        break;
      case "move-down":
        mediaSourcesStore.changeMediaOrder(selectedMediaSource.value, -1);
        break;
      case "move-top":
        mediaSourcesStore.moveMediaTop(selectedMediaSource.value);
        break;
      case "move-bottom":
        mediaSourcesStore.moveMediaBottom(selectedMediaSource.value);
        break;
      case "transform-clockwise-90":
        mediaSourcesStore.rotateMediaSource(selectedMediaSource.value, 90);
        break;
      case "transform-anti-clockwise-90":
        mediaSourcesStore.rotateMediaSource(selectedMediaSource.value, -90);
        break;
      case "transform-mirror-horizontal":
        mediaSourcesStore.toggleHorizontalMirror(selectedMediaSource.value);
        break;
      case "transform-mirror-vertical":
        break;
      case "hide":
        mediaSourcesStore.muteMediaSource(selectedMediaSource.value, true);
        break;
      case "edit":
        contextCommand.value = command;
        break;
      case "remove":
        mediaSourcesStore.removeMediaSource(selectedMediaSource.value);
        break;
      default:
        console.warn(`[LivePreview]context-menu-command: command not supported: ${command}`);
        break;
      }
    }
    await nextTick();
    contextCommand.value = '';
  });

  const onContextMenu = (mediaSource: TRTCMediaSource) => {
    console.log(`${logPrefix}onContextMenu current selected media source:`, mediaSource);
    if (mediaSource) {
      const selected = mediaSourcesStore.mediaList.find(item => item.mediaSourceInfo.sourceId === mediaSource.sourceId
        && item.mediaSourceInfo.sourceType === mediaSource.sourceType
      );
      if (selected) {
        selectedMediaSource.value = selected;
        window.ipcRenderer.send('show-context-menu');
      } else {
        selectedMediaSource.value = null;
      }
    } else {
      selectedMediaSource.value = null;
    }
  };

  const addContextMenu = () => {
    logger.log(`${logPrefix} addContextMenu:`);
    mediaMixingManager.on(TRTCMediaMixingEvent.onRightButtonClicked, onContextMenu);
  };

  const removeContextMenu = () => {
    logger.log(`${logPrefix} removeContextMenu:`);
    mediaMixingManager.off(TRTCMediaMixingEvent.onRightButtonClicked, onContextMenu);
  };

  onMounted(() => {
    logger.log(`${logPrefix} onMounted:`);
    addContextMenu();
  });

  onUnmounted(() => {
    logger.log(`${logPrefix} onUnmounted:`);
    removeContextMenu();
  });

  return {
    contextCommand,
  }
}

export default useContextMenu;
