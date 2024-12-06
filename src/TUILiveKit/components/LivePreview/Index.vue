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
      <div
        v-show="selectedMediaSource"
        class="media-overlay-in-design"
        ref="overlayRef"
        :style="{ ...overlayPosition }"
      ></div>
    </div>
    <SelectMediaSource
      :moveAndResizeContainerRef="moveAndResizeContainerRef"
      :selectedMediaSource="selectedMediaSource"
      :previewLeft="previewLeft"
      :previewTop="previewTop"
      :previewScale="previewScale"
      @on-mouse-move-select="onMouseMoveSelect"
      />
  </div>
</template>

<script setup lang="ts">
import { ref, Ref, defineEmits, onMounted, onBeforeUnmount, onUnmounted, computed, watch} from 'vue';
import { storeToRefs } from 'pinia';
import { Rect, TRTCVideoResolutionMode, TRTCMediaSource } from 'trtc-electron-sdk';
import { Movable, Resizable } from 'movable-resizable-js';
import SelectMediaSource from './SelectMediaSource.vue';
import useMediaMixingManager from "../../utils/useMediaMixingManager";
import { useBasicStore } from "../../store/main/basic";
import { useRoomStore } from "../../store/main/room";
import { useMediaSourcesStore, TUIMediaSourceViewModel } from '../../store/main/mediaSources';
import trtcCloud from '../../utils/trtcCloud';
import { resolutionMap } from '../../constants/tuiConstant';
import useContextMenu from './useContextMenu';
import { useI18n } from "../../locales/index";

const { t } = useI18n();
const basicStore = useBasicStore();
const roomStore = useRoomStore();
const mediaSourcesStore = useMediaSourcesStore();

const { roomName, roomId } = storeToRefs(basicStore);
const { remoteUserList, historyRemoteUserCount } = storeToRefs(roomStore);
const { mixingVideoEncodeParam, mediaList, selectedMediaKey } = storeToRefs(mediaSourcesStore);

const mixingVideoWidth = ref(0);
const mixingVideoHeight = ref(0);
watch(
  () => [mixingVideoEncodeParam.value.resMode, mixingVideoEncodeParam.value.videoResolution],
  ([newResMode, newResolution], oldVal?) => {
    console.log("[LivePreview]watch mixingVideoEncodeParam:", newResMode, newResolution, oldVal);
    const { width, height } = resolutionMap[newResolution];
    if (newResMode === TRTCVideoResolutionMode.TRTCVideoResolutionModeLandscape) {
      mixingVideoWidth.value = width;
      mixingVideoHeight.value = height;
    } else {
      mixingVideoWidth.value = height;
      mixingVideoHeight.value = width;
    }
    console.log("[LivePreview]watch mixingVideoSize:", mixingVideoWidth.value, mixingVideoHeight.value);
  }, 
  {
    immediate: true,
  }
);
console.log("[LivePreview]mixingVideoSize:", mixingVideoWidth.value, mixingVideoHeight.value);

const emits = defineEmits(["changer-rect", "select", "edit-media-source"]);

const mediaMixingManager = useMediaMixingManager();

const nativeWindowsRef:Ref<HTMLDivElement | null> = ref(null);
const isNativeWindowCreated: Ref<boolean> = ref(false);

const moveAndResizeContainerRef: Ref<HTMLDivElement | null> = ref(null);
const overlayRef: Ref<HTMLDivElement | null> = ref(null);

const containerWidth: Ref<number> = ref(0);
const containerHeight: Ref<number> = ref(0);

const previewScale: Ref<number> = computed(() => {
  const widthScale = containerWidth.value / mixingVideoWidth.value;
  const heightScale = containerHeight.value / mixingVideoHeight.value;
  const result = heightScale < widthScale ? heightScale : widthScale;
  console.log("[LivePreview]previewScale computed:", result);
  return result;
});
console.log("[LivePreview]previewScale:", previewScale.value);

const previewWidth: Ref<number> = computed(() => {
  const result = mixingVideoWidth.value * previewScale.value;
  console.log("[LivePreview]previewWidth computed:", result);
  return result;
});
console.log("[LivePreview]previewWidth:", previewWidth.value);

const previewHeight: Ref<number> = computed(() => {
  const result = mixingVideoHeight.value * previewScale.value;
  console.log("[LivePreview]previewHeight computed:", result);
  return result;
});
console.log("[LivePreview]previewHeight:", previewHeight.value);

const previewLeft: Ref<number> = computed(() => {
  const result = (containerWidth.value - previewWidth.value) / 2;
  console.log("[LivePreview]previewLeft computed:", result);
  return result;
});
console.log("[LivePreview]previewLeft:", previewLeft.value);

const previewTop: Ref<number> = computed(() => {
  const result = (containerHeight.value - previewHeight.value) / 2;
  console.log("[LivePreview]previewTop computed:", result);
  return result;
});
console.log("[LivePreview]previewTop:", previewTop.value);

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

const onMouseMoveSelect = (options: Record<string, any>) => {
  console.log("[LivePreview]onMouseMoveSelect:", options);
  if (overlayRef.value) {
    overlayRef.value.dispatchEvent(new MouseEvent("mousedown", {
      screenX: options.screenX,
      screenY: options.screenY,
      button: options.button,
    }));
  }
}

const { contextCommand } = useContextMenu(moveAndResizeContainerRef, selectedMediaSource);
watch(contextCommand, (newVal) => {
  console.log(`[LivePreview]watch contextCommand:`, newVal);
  if (newVal && newVal === 'edit') {
    emits("edit-media-source", selectedMediaSource.value);
  } else {
    // Do nothing. other commands have been handled in useContextMenu.
  }
});

const selectedPreviewRect: Ref<Rect | null> = computed(() => {
  let result: Rect | null = null;
  if (selectedMediaSource.value?.mediaSourceInfo.rect) {
    result = {
      left: selectedMediaSource.value.mediaSourceInfo.rect.left * previewScale.value,
      top: selectedMediaSource.value.mediaSourceInfo.rect.top * previewScale.value,
      right: selectedMediaSource.value.mediaSourceInfo.rect.right * previewScale.value,
      bottom: selectedMediaSource.value.mediaSourceInfo.rect.bottom * previewScale.value,
    };
  }
  console.log("[LivePreview]selectedPreviewRect computed:", result);
  return result;
});

interface Position {
  left: string;
  top: string;
  width: string;
  height: string;
}
// calc initial position of the overlay `div` element
const overlayPosition: Ref<Position> = computed(() => {
  let result;
  if (selectedPreviewRect.value) {
    result = {
      left: `${selectedPreviewRect.value.left + previewLeft.value}px`,
      top: `${selectedPreviewRect.value.top + previewTop.value}px`,
      width: `${
        selectedPreviewRect.value.right - selectedPreviewRect.value.left
      }px`,
      height: `${
        selectedPreviewRect.value.bottom - selectedPreviewRect.value.top
      }px`,
    };
  } else {
    result = {
      left: `${previewLeft.value}px`,
      top: `${previewTop.value}px`,
      width: `${0}px`,
      height: `${0}px`,
    };
  }
  console.log("[LivePreview]overlayPosition computed:", result);
  return result;
});

let movableInstance: Movable | null;
let resizableInstance: Resizable | null;

const onMove = (left: number, top: number) => {
  console.log("[LivePreview]onMove:", left, top);
  if (overlayRef.value) {
    // 1 calc new preview rect
    const newPreviewRect = {
      left: left - previewLeft.value,
      top: top - previewTop.value,
      right: left - previewLeft.value + parseFloat(overlayPosition.value.width),
      bottom: top - previewTop.value + parseFloat(overlayPosition.value.height),
    };
    // 2 calc new mix rect
    const newRectInMix = {
      left: Math.round(newPreviewRect.left / previewScale.value),
      top: Math.round(newPreviewRect.top / previewScale.value),
      right: Math.round(newPreviewRect.right / previewScale.value),
      bottom: Math.round(newPreviewRect.bottom / previewScale.value),
    };
    // 3 emit new mix rect
    emits("changer-rect", newRectInMix);
    if (selectedMediaSource.value) {
      selectedMediaSource.value.mediaSourceInfo.rect = newRectInMix;
      mediaSourcesStore.updateMediaSourceRect(selectedMediaSource.value);
    }
  }
};

const onResize = (left: number, top: number, width: number, height: number) => {
  console.log("[LivePreview]onResize:", left, top, width, height);
  // 1 calc new preview rect
  const newPreviewRect = {
    left: left - previewLeft.value,
    top: top - previewTop.value,
    right: left - previewLeft.value + width,
    bottom: top - previewTop.value + height,
  };
  // 2 calc new mix rect
  const newRectInMix = {
    left: Math.round(newPreviewRect.left / previewScale.value),
    top: Math.round(newPreviewRect.top / previewScale.value),
    right: Math.round(newPreviewRect.right / previewScale.value),
    bottom: Math.round(newPreviewRect.bottom / previewScale.value),
  };
  // 3 emit new mix rect
  emits("changer-rect", newRectInMix);
  if (selectedMediaSource.value) {
    selectedMediaSource.value.mediaSourceInfo.rect = newRectInMix;
    mediaSourcesStore.updateMediaSourceRect(selectedMediaSource.value);
  }
};

const createNativeWindow = (clientRect: DOMRect) => {
  console.log(`createNativeWindow:`, clientRect);
  mediaMixingManager.setDisplayParams(window.nativeWindowHandle, {
    left: clientRect.left * window.devicePixelRatio,
    right: clientRect.right * window.devicePixelRatio,
    top: clientRect.top * window.devicePixelRatio,
    bottom: clientRect.bottom * window.devicePixelRatio,
  });

  const bodyRect = document.body.getBoundingClientRect();
  trtcCloud?.log(`-----createNativeWindow
      body area left:${bodyRect.left} right:${bodyRect.right} top:${bodyRect.top} bottom: ${bodyRect.bottom}
      view area left:${clientRect.left} right:${clientRect.right} top:${clientRect.top} bottom: ${clientRect.bottom}
      devicePixelRatio: ${window.devicePixelRatio}`);
};

const createNativeWindowAndPreview = () => {
  if (!isNativeWindowCreated.value) {
    if (!!window.nativeWindowHandle && nativeWindowsRef.value) {
      const clientRect = nativeWindowsRef.value.getBoundingClientRect();
      createNativeWindow(clientRect);
      isNativeWindowCreated.value = true;
      startLocalMediaMixing();
    } else {
      setTimeout(()=>{
        createNativeWindowAndPreview();
      }, 100);
    }
  }
}

const startLocalMediaMixing = async () => {
  const { mixingVideoEncodeParam, backgroundColor } = mediaSourcesStore;
  await mediaMixingManager.startPublish();
  await mediaMixingManager.updatePublishParams({
    videoEncoderParams: mixingVideoEncodeParam,
    canvasColor: backgroundColor,
  });
};

const onPreviewAreaResize = (entries: ResizeObserverEntry[]) => {
  console.debug(`[LivePreview]onPreviewAreaResize:`, entries);
  for(const entry of entries) {
    if (moveAndResizeContainerRef.value) {
      containerWidth.value = moveAndResizeContainerRef.value.offsetWidth;
      containerHeight.value = moveAndResizeContainerRef.value.offsetHeight;
      console.log(
        "[LivePreview]onPreviewAreaResize containerWidth-containerHeight:",
        containerWidth.value,
        containerHeight.value
      );
    }

    if (isNativeWindowCreated.value) {
      const clientRect = entry.target.getBoundingClientRect();
      createNativeWindow(clientRect);
    }
  }
};

const resizeObserver = new ResizeObserver(onPreviewAreaResize);

const onVisibilityChange = () => {
  console.log(`onVisibilityChange document.hidden:${document.hidden}`);
  if (document.hidden) {
    mediaMixingManager.setDisplayParams(new Uint8Array(8) ,{ left: 0, right: 0, top: 0, bottom: 0 });
  } else {
    if (!!window.nativeWindowHandle && nativeWindowsRef.value) {
      const clientRect = nativeWindowsRef.value.getBoundingClientRect();
      createNativeWindow(clientRect);
    } else {
      console.error(`onVisibilityChange error, no native window handle or DOM container.`);
    }
  }
};

// Enable Movable and Resizable
onMounted(() => {
  console.log("[LivePreview]onMounted init basic data");
  if (moveAndResizeContainerRef.value && overlayRef.value) {
    containerWidth.value = moveAndResizeContainerRef.value.offsetWidth;
    containerHeight.value = moveAndResizeContainerRef.value.offsetHeight;
    console.log(
      "[LivePreview]onMounted containerWidth-containerHeight:",
      containerWidth.value,
      containerHeight.value
    );

    movableInstance = new Movable(
      overlayRef.value,
      moveAndResizeContainerRef.value,
      {
        canExceedContainer: true,
      }
    );
    if (movableInstance) {
      movableInstance.on("move", onMove);
    } else {
      console.error("[LivePreview]onMounted error: crated movable failed");
    }

    resizableInstance = new Resizable(
      overlayRef.value,
      moveAndResizeContainerRef.value,
      {
        keepRatio: true,
        stopPropagation: true, // If used with `Movable` together, `stopPropagation` must be `true` to disable moving event when resizing.
        canExceedContainer: true,
      }
    );
    if (resizableInstance) {
      resizableInstance.on("resize", onResize);
    } else {
      console.error("[LivePreview]onMounted error: crated resizable failed");
    }
  } else {
    console.error("[LivePreview]onMounted error: env not supported");
  }
});

// Create native window to display video
onMounted(() => {
  console.log("[LivePreview]onMounted create display window");
  if (moveAndResizeContainerRef.value && nativeWindowsRef.value) {
    setTimeout(() => {
      createNativeWindowAndPreview();
    }, 100);

    resizeObserver.observe(moveAndResizeContainerRef.value)
  } else {
    console.error("no HTML element to preview live stream");
  }
});

// Obaserve document visiblity change event
onMounted(() => {
  document.addEventListener('visibilitychange', onVisibilityChange);
});

onBeforeUnmount(()=> {
  console.log('onBeforeUnmount')
  if (nativeWindowsRef.value && resizeObserver) {
    resizeObserver.unobserve(nativeWindowsRef.value);
  }
  mediaMixingManager.stopPublish();
  document.removeEventListener('visibilitychange', onVisibilityChange);
});

onUnmounted(()=> {
  console.log('onUnmounted')
  if (resizeObserver) {
    resizeObserver.disconnect();
  }
  mediaMixingManager.setDisplayParams(new Uint8Array(8) ,{ left: 0, right: 0, top: 0, bottom: 0 });
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

  .media-overlay-in-design {
    position: absolute;
    top: 0;
    left: 0;
    min-width: 1px;
    min-height: 1px;
    background-color: $color-live-preview-media-overlay-background;
    border: 0.125rem solid $color-live-preview-media-overlay-border;
  }
}
</style>
<style lang="scss">
@import "movable-resizable-js/resizable.css";
@import "../../assets/variable.scss";

.tui-live-preview  {
  .resizable-resize-anchor {
    background-color: transparent;
    border: 1px solid transparent;
    border-color: $color-live-preview-resize-anchor-border;
  }
}
</style>
