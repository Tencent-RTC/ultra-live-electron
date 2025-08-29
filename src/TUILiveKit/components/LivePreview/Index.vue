<template>
  <div class="tui-live-preview">
    <div class="tui-title tui-preview-title">
      <div class="tui-title-left">
        <span>{{ roomName }}</span>
        <span class="tui-title-room-id">{{ roomId }}</span>
      </div>
      <div class="tui-title-right">
        <span class="tui-statis-item tui-online-count">{{ remoteUserList.length }}{{ t("viewer") }}</span>
      </div>
    </div>
    <div class="tui-live-designer" ref="moveAndResizeContainerRef">
      <div class="tui-video-player" ref="nativeWindowsRef">

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, Ref, watch, defineEmits, onBeforeMount, onMounted, onBeforeUnmount, onUnmounted } from 'vue';
import { storeToRefs } from 'pinia';
import { Rect, TRTCMediaSource, TRTCMediaMixingEvent, TRTCMediaMixingServiceEvent, TRTCRoleType, TRTCParams, TRTCAppScene } from 'trtc-electron-sdk';
import trtcCloud from '../../utils/trtcCloud';
import useRoomEngine from '../../utils/useRoomEngine';
import { TUIMediaSourceViewModel } from '../../types';
import useMediaMixingManager, { mediaMixingService } from '../../utils/useMediaMixingManager';
import TUIMessageBox from '../../common/base/MessageBox';
import { useBasicStore } from '../../store/main/basic';
import { useRoomStore } from '../../store/main/room';
import { useMediaSourcesStore } from '../../store/main/mediaSources';
import useContextMenu from './useContextMenu';
import { useI18n } from '../../locales/index';
import streamLayoutService from '../../service/StreamLayoutService';
import { useAudioEffectStore } from '@/TUILiveKit/store/main/audioEffect';
import logger from '../../utils/logger';

const logPrefix = '[LivePreview]';

const emits = defineEmits(['edit-media-source']);

const { t } = useI18n();
const basicStore = useBasicStore();
const roomStore = useRoomStore();
const mediaSourcesStore = useMediaSourcesStore();
const audioEffectStore = useAudioEffectStore();

const { roomName, roomId } = storeToRefs(basicStore);
const { remoteUserList } = storeToRefs(roomStore);
const { mediaList, selectedMediaKey } = storeToRefs(mediaSourcesStore);

const mediaMixingManager = useMediaMixingManager();
const roomEngine = useRoomEngine();

const isServerStarted: Ref<boolean> = ref(false);

const nativeWindowsRef:Ref<HTMLDivElement | null> = ref(null);
const isNativeWindowCreated: Ref<boolean> = ref(false);

const moveAndResizeContainerRef: Ref<HTMLDivElement | null> = ref(null);

const selectedMediaSource: Ref<TUIMediaSourceViewModel | null> = ref(null);
watch(
  () => selectedMediaKey,
  (newSelected, oldSelected) => {
    logger.log(
      `${logPrefix}watch selected media key:`,
      newSelected,
      oldSelected
    );
    let selectedSource: TUIMediaSourceViewModel | null = null;
    for (let i = 0; i < mediaList.value.length; i++) {
      const source: TRTCMediaSource = mediaList.value[i].mediaSourceInfo;
      if (
        source.sourceType === newSelected.value.sourceType &&
        source.sourceId === newSelected.value.sourceId
      ) {
        selectedSource = mediaList.value[i];
        logger.log(`${logPrefix}selectedMediaSource watched:`, source);
        break;
      }
    }
    selectedMediaSource.value = selectedSource; // if null, do un-select
  },
  {
    immediate: true,
    deep: true,
  }
);

const MAX_START_PREVIEW_COUNT= 50;
let startPreviewRetryCount = 0;
// eslint-disable-next-line no-undef
let startPreviewRetryTimer: NodeJS.Timeout | null;

const startMediaMixingPreview = async () => {
  logger.log(`${logPrefix}startMediaMixingPreview`, window.nativeWindowHandle, nativeWindowsRef.value, isServerStarted.value);
  if (startPreviewRetryTimer) {
    startPreviewRetryTimer = null;
  }

  startPreviewRetryCount++;
  if (startPreviewRetryCount > MAX_START_PREVIEW_COUNT) {
    TUIMessageBox({
      title: t('Note'),
      message: t('Start video preview failed.'),
      confirmButtonText: t('Sure'),
    });
    startPreviewRetryCount = 0;
    return;
  }

  if (!isNativeWindowCreated.value) {
    if (!!window.nativeWindowHandle && nativeWindowsRef.value && isServerStarted.value) {
      mediaMixingManager.bindPreviewArea(window.nativeWindowHandle, nativeWindowsRef.value);
      isNativeWindowCreated.value = true;
      const { mixingVideoEncodeParam, backgroundColor, selectedBorderColor } = mediaSourcesStore;
      await mediaMixingManager.startPublish();
      await mediaMixingManager.updatePublishParams({
        videoEncoderParams: mixingVideoEncodeParam,
        canvasColor: backgroundColor,
        selectedBorderColor
      });
      streamLayoutService.setContainer(nativeWindowsRef.value);
    } else {
      startPreviewRetryTimer = setTimeout(()=>{
        startMediaMixingPreview();
      }, 100);
    }
  } else {
    logger.error(`${logPrefix}startMediaMixingPreview: no native window ID`);
  }
}

const onSelect = (mediaSource: TRTCMediaSource) => {
  logger.log(`${logPrefix}onSelect`, mediaSource);
  if (mediaSource) {
    mediaSourcesStore.setSelectedMediaKey({
      sourceId: mediaSource.sourceId,
      sourceType: mediaSource.sourceType
    }, true);
  } else {
    mediaSourcesStore.setSelectedMediaKey({
      sourceId: '',
      sourceType: null
    });
  }
};

const onMoveAndResize = (mediaSource: TRTCMediaSource, rect: Rect) => {
  logger.log(`${logPrefix}onMoveAndResize`, mediaSource, rect);
  if (selectedMediaSource.value && selectedMediaKey.value.sourceId === mediaSource.sourceId && selectedMediaKey.value.sourceType === mediaSource.sourceType) {
    selectedMediaSource.value.mediaSourceInfo.rect = rect;
    mediaSourcesStore.updateMediaSourceRect(selectedMediaSource.value, true);
  } else {
    logger.error(`${logPrefix}onMoveAndResize error`, selectedMediaKey.value, selectedMediaSource.value);
  }
};

const onMediaMixingServerLost = async () => {
  logger.log(`${logPrefix}onMediaMixingServerLost`);
  isServerStarted.value = false;
  if (isNativeWindowCreated.value && nativeWindowsRef.value) {
    try {
      await mediaMixingService?.startMediaMixingServer();
      isServerStarted.value = true;
      mediaMixingManager.bindPreviewArea(window.nativeWindowHandle, nativeWindowsRef.value);
      const { mixingVideoEncodeParam, backgroundColor, selectedBorderColor } = mediaSourcesStore;
      await mediaMixingManager.startPublish();
      await mediaMixingManager.updatePublishParams({
        videoEncoderParams: mixingVideoEncodeParam,
        canvasColor: backgroundColor,
        selectedBorderColor
      });
      streamLayoutService.refreshLayout();
      mediaSourcesStore.recoverMediaSource();
      if (basicStore.roomId && basicStore.isLiving) {
        const trtcParams = new TRTCParams();
        trtcParams.sdkAppId = basicStore.sdkAppId;
        trtcParams.userId = basicStore.userId;
        trtcParams.userSig = basicStore.userSig;
        trtcParams.strRoomId = basicStore.roomId;
        trtcParams.role = TRTCRoleType.TRTCRoleAnchor;
        trtcCloud.enterRoom(trtcParams, TRTCAppScene.TRTCAppSceneLIVE);
      }
      if (basicStore.isOpenMic) {
        roomEngine.instance?.unmuteLocalAudio();
        roomEngine.instance?.openLocalMicrophone();
      }
      audioEffectStore.initVoiceEffect();
      audioEffectStore.startPlayMusic();
      logger.log(`${logPrefix}onMediaMixingServerLost recovery from crash success`);
    } catch (err) {
      logger.error(`${logPrefix}onMediaMixingServerLost recovery from crash failed:`, err);
    }
  } else {
    logger.warn(`${logPrefix}onMediaMixingServerLost cannot recovery from crash failed. No parent window.`);
  }
};

const onBeforeUnload = async () => {
  logger.warn(`${logPrefix}onBeforeUnload`);
  try {
    mediaMixingManager.bindPreviewArea(0, null);
    await mediaMixingService?.stopMediaMixingServer();
    isServerStarted.value = false;
  } catch (error) {
    logger.error(`${logPrefix}onBeforeUnload stop media server failed:`, error);
  }
};

const { contextCommand } = useContextMenu();
watch(contextCommand, (newVal) => {
  console.log('[LivePreview]watch contextCommand:', newVal);
  if (newVal && newVal === 'edit') {
    emits('edit-media-source', selectedMediaSource.value);
  } else {
    // Do nothing. other commands have been handled in useContextMenu.
  }
});

onBeforeMount(async () => {
  logger.log(`${logPrefix}onBeforeMount`);
  await mediaMixingService?.startMediaMixingServer();
  isServerStarted.value = true;
  logger.log(`${logPrefix}onBeforeMount finished`);
});

onMounted(() => {
  logger.log(`${logPrefix}onMounted create display window`);
  if (moveAndResizeContainerRef.value && nativeWindowsRef.value) {
    setTimeout(() => {
      startMediaMixingPreview();
    }, 100);
  } else {
    logger.error(`${logPrefix}no HTML element to preview live stream`);
  }

  mediaMixingManager.on(TRTCMediaMixingEvent.onSourceSelected, onSelect);
  mediaMixingManager.on(TRTCMediaMixingEvent.onSourceMoved, onMoveAndResize);
  mediaMixingManager.on(TRTCMediaMixingEvent.onSourceResized, onMoveAndResize);
  mediaMixingService?.on(TRTCMediaMixingServiceEvent.onMediaMixingServerLost, onMediaMixingServerLost);
  window.addEventListener('beforeunload', onBeforeUnload);
});

onBeforeUnmount(()=> {
  logger.log(`${logPrefix}onBeforeUnmount`);
  mediaMixingManager.stopPublish();

  mediaMixingManager.off(TRTCMediaMixingEvent.onSourceSelected, onSelect);
  mediaMixingManager.off(TRTCMediaMixingEvent.onSourceMoved, onMoveAndResize);
  mediaMixingManager.off(TRTCMediaMixingEvent.onSourceResized, onMoveAndResize);
  mediaMixingService?.off(TRTCMediaMixingServiceEvent.onMediaMixingServerLost, onMediaMixingServerLost);

  if (startPreviewRetryTimer) {
    clearTimeout(startPreviewRetryTimer);
    startPreviewRetryTimer = null;
  }
});

onUnmounted(async ()=> {
  logger.log(`${logPrefix}onUnmounted`);
  await onBeforeUnload();
  window.removeEventListener('beforeunload', onBeforeUnload);
});
</script>

<style scoped lang="scss">
@import "../../assets/variable.scss";

.tui-live-preview {
  height: 100%;

  .tui-preview-title {
    display: flex;
    justify-content: space-between;

    .tui-title-left {
      display: flex;
      align-items: center;

      .tui-title-room-id {
        margin-left: 0.5rem;
      }
    }

    .tui-statis-item {
      padding: 0 0.5rem;
      border-right: 1px solid $color-divider-line;

      &:first-child {
        padding-left: 0;
      }

      &:last-child {
        padding-right: 0;
        border-right: none;
      }
    }
  }

  .tui-live-designer {
    position: relative;
    height: calc(100% - 2.5rem);
    overflow: hidden;
  }

  .tui-video-player {
    width: 100%;
    height: 100%;
  }
}
</style>
