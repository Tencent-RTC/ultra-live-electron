<template>
  <div class="tui-live-preview">
    <div class="tui-title tui-preview-title">
      <div class="tui-title-left">
        <span>{{ roomName }}</span>
        <span class="tui-title-room-id">{{ roomId }}</span>
      </div>
      <div class="tui-title-right">
        <span class="tui-statis-item tui-online-count">{{ remoteUserList.length }}{{ t("viewer") }}</span>
        <span class="tui-statis-item tui-history-count">{{ historyRemoteUserCount }}{{ t("history viewer") }}</span>
      </div>
    </div>
    <div class="tui-live-designer" ref="moveAndResizeContainerRef">
      <div class="tui-video-player" ref="nativeWindowsRef">

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, Ref, watch, defineEmits, onMounted, onBeforeUnmount, onUnmounted } from 'vue';
import { storeToRefs } from 'pinia';
import { Rect, TRTCMediaSource, TRTCMediaMixingEvent } from 'trtc-electron-sdk';
import { TUIMediaSourceViewModel } from '../../types';
import useMediaMixingManager from "../../utils/useMediaMixingManager";
import { useBasicStore } from "../../store/main/basic";
import { useRoomStore } from "../../store/main/room";
import { useMediaSourcesStore } from '../../store/main/mediaSources';
import useContextMenu from './useContextMenu';
import { useI18n } from "../../locales/index";

const emits = defineEmits(['edit-media-source']);

const { t } = useI18n();
const basicStore = useBasicStore();
const roomStore = useRoomStore();
const mediaSourcesStore = useMediaSourcesStore();

const { roomName, roomId } = storeToRefs(basicStore);
const { remoteUserList, historyRemoteUserCount } = storeToRefs(roomStore);
const { mediaList, selectedMediaKey } = storeToRefs(mediaSourcesStore);

const mediaMixingManager = useMediaMixingManager();

const nativeWindowsRef:Ref<HTMLDivElement | null> = ref(null);
const isNativeWindowCreated: Ref<boolean> = ref(false);

const moveAndResizeContainerRef: Ref<HTMLDivElement | null> = ref(null);

const selectedMediaSource: Ref<TUIMediaSourceViewModel | null> = ref(null);
watch(
  () => selectedMediaKey,
  (newSelected, oldSelected) => {
    console.log(
      "[LivePreview]watch selected media key:",
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
        console.log("[LivePreview]selectedMediaSource watched:", source);
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

const startMediaMixingPreview = async () => {
  if (!isNativeWindowCreated.value) {
    if (!!window.nativeWindowHandle && nativeWindowsRef.value) {
      mediaMixingManager.setDisplayParams(window.nativeWindowHandle, nativeWindowsRef.value);
      isNativeWindowCreated.value = true;
      const { mixingVideoEncodeParam, backgroundColor } = mediaSourcesStore;
      await mediaMixingManager.startPublish();
      await mediaMixingManager.updatePublishParams({
        videoEncoderParams: mixingVideoEncodeParam,
        canvasColor: backgroundColor,
      });
    } else {
      setTimeout(()=>{
        startMediaMixingPreview();
      }, 100);
    }
  }
}

const onSelect = (mediaSource: TRTCMediaSource) => {
  console.log(`onSelect`, mediaSource);
  if (mediaSource) {
    mediaSourcesStore.setSelectedMediaKey({
      sourceId: mediaSource.sourceId,
      sourceType: mediaSource.sourceType
    });
  } else {
    mediaSourcesStore.setSelectedMediaKey({
      sourceId: '',
      sourceType: null
    });
  }
};

const onMoveAndResize = (mediaSource: TRTCMediaSource, rect: Rect) => {
  console.log(`onMoveAndResize`, mediaSource, rect);
  if (selectedMediaSource.value && selectedMediaKey.value.sourceId === mediaSource.sourceId && selectedMediaKey.value.sourceType === mediaSource.sourceType) {
    selectedMediaSource.value.mediaSourceInfo.rect = rect;
    mediaSourcesStore.updateMediaSourceRect(selectedMediaSource.value);
  } else {
    console.error('onMoveAndResize error', selectedMediaKey.value, selectedMediaSource.value);
  }
};

const { contextCommand } = useContextMenu();
watch(contextCommand, (newVal) => {
  console.log(`[LivePreview]watch contextCommand:`, newVal);
  if (newVal && newVal === 'edit') {
    emits('edit-media-source', selectedMediaSource.value);
  } else {
    // Do nothing. other commands have been handled in useContextMenu.
  }
});

onMounted(() => {
  console.log("[LivePreview]onMounted create display window");
  if (moveAndResizeContainerRef.value && nativeWindowsRef.value) {
    setTimeout(() => {
      startMediaMixingPreview();
    }, 100);
  } else {
    console.error("no HTML element to preview live stream");
  }

  mediaMixingManager.on(TRTCMediaMixingEvent.onSourceSelected, onSelect);
  mediaMixingManager.on(TRTCMediaMixingEvent.onSourceMoved, onMoveAndResize);
  mediaMixingManager.on(TRTCMediaMixingEvent.onSourceResized, onMoveAndResize);
});

onBeforeUnmount(()=> {
  console.log('onBeforeUnmount')
  mediaMixingManager.stopPublish();

  mediaMixingManager.off(TRTCMediaMixingEvent.onSourceSelected, onSelect);
  mediaMixingManager.off(TRTCMediaMixingEvent.onSourceMoved, onMoveAndResize);
  mediaMixingManager.off(TRTCMediaMixingEvent.onSourceResized, onMoveAndResize);
});

onUnmounted(()=> {
  console.log('onUnmounted')
  mediaMixingManager.setDisplayParams(0, null);
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
