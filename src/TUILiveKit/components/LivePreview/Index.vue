<template>
  <div class="tui-live-preview">
    <div class="tui-title tui-preview-title">
      {{ roomName }}
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
  </div>
</template>

<script setup lang="ts">
import { ref, Ref, defineEmits, onMounted, onBeforeMount, onBeforeUnmount, onUnmounted, computed, watch} from 'vue';
import { storeToRefs } from 'pinia';
import { TUIMediaSourceType, TUIMediaSource, TUIScreenCaptureSourceInfo } from '@tencentcloud/tuiroom-engine-electron/plugins/media-mixing-plugin';
import { Rect, TRTCVideoResolution, TRTCVideoResolutionMode } from '@tencentcloud/tuiroom-engine-electron';
import Movable from "../../common/base/Movable";
import Resizable from "../../common/base/Resizable";
import useMedisMixingPlugin from "../../utils/useMediaMixingPlugin";
import { useBasicStore } from "../../store/basic";
import { useMediaSourcesStore, TUIMediaSourceViewModel } from '../../store/mediaSources';
import { resolutionMap } from '../../utils/trtcCloud';

const basicStore = useBasicStore();
const mediaSourcesStore = useMediaSourcesStore();

const { roomName } = storeToRefs(basicStore);
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

const emits = defineEmits(["changeRect", "select"]);

const mediaMixingPlugin = useMedisMixingPlugin();

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
// To do: props.inputSourceList 也应该监听
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
      const source: TUIMediaSource = mediaList.value[i].mediaSourceInfo;
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
console.log("[LivePreview]selectedMediaSource:", selectedMediaSource.value);

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
console.log("[LivePreview]selectedPreviewRect:", selectedPreviewRect.value);

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
console.log("[LivePreview]overlayPosition:", overlayPosition.value);

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
    emits("changeRect", newRectInMix);
    if (selectedMediaSource.value) {
      selectedMediaSource.value.mediaSourceInfo.rect = newRectInMix;
      mediaSourcesStore.updateMediaSource(selectedMediaSource.value);
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
  emits("changeRect", newRectInMix);
  if (selectedMediaSource.value) {
    selectedMediaSource.value.mediaSourceInfo.rect = newRectInMix;
    mediaSourcesStore.updateMediaSource(selectedMediaSource.value);
  }
};

const createNativeWindow = () => {
  if (!isNativeWindowCreated.value) {
    if (!!window.nativeWindowHandle && nativeWindowsRef.value) {
      // 创建 native 窗口
      const clientRect = nativeWindowsRef.value.getBoundingClientRect();
      mediaMixingPlugin.setDisplayParams(window.nativeWindowHandle, {
        left: clientRect.left * window.devicePixelRatio,
        right: clientRect.right * window.devicePixelRatio,
        top: clientRect.top * window.devicePixelRatio,
        bottom: clientRect.bottom * window.devicePixelRatio,
      });
      isNativeWindowCreated.value = true;

      startLiving();
    } else {
      setTimeout(()=>{
        createNativeWindow();
      }, 1000);
    }
  }
}

const startLiving = async () => {
  const { mixingVideoEncodeParam, backgroundColor } = mediaSourcesStore
  await mediaMixingPlugin.startPublish();
  await mediaMixingPlugin.updatePublishParams({
    inputSourceList: mediaList.value.map(item => item.mediaSourceInfo),
    videoEncoderParams: mixingVideoEncodeParam,
    canvasColor: backgroundColor,
  });
};

const onPreviewAreaResize = (entries: ResizeObserverEntry[]) => {
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
      mediaMixingPlugin.setDisplayParams(window.nativeWindowHandle, {
        left: clientRect.left * window.devicePixelRatio,
        right: clientRect.right * window.devicePixelRatio,
        top: clientRect.top * window.devicePixelRatio,
        bottom: clientRect.bottom * window.devicePixelRatio,
      });
    }
  }
};

const resizeObserver = new ResizeObserver(onPreviewAreaResize);

const onContainerClick = (event: MouseEvent) => {
  console.log(
    "[LivePreview]onContainerClick event:",
    event,
    event.target,
    event.currentTarget
  );
  const target = event.target;
  if (target && target === nativeWindowsRef.value && moveAndResizeContainerRef.value) {
    // calc click point coordinates in mix video image
    console.log("[LivePreview]onContainerClick mix video image clicked");
    const containerBounds =
      moveAndResizeContainerRef.value.getBoundingClientRect();
    const xInPreviewImage =
      event.clientX - containerBounds.x - previewLeft.value;
    const yInPreviewImage =
      event.clientY - containerBounds.y - previewTop.value;
    const xInImage = xInPreviewImage / previewScale.value;
    const yInImage = yInPreviewImage / previewScale.value;
    console.log(
      "[LivePreview]onContainerClick click point coordinates in mix video:",
      xInPreviewImage,
      yInPreviewImage,
      xInImage,
      yInImage
    );

    let newSelected = {
      sourceType: TUIMediaSourceType.kCamera,
      sourceId: "",
      zOrder: -1,
    };
    mediaList.value.forEach((item: TUIMediaSourceViewModel) => {
      const source = item.mediaSourceInfo;
      if (
        source.rect &&
        xInImage >= source.rect.left &&
        xInImage <= source.rect.right &&
        yInImage >= source.rect.top &&
        yInImage <= source.rect.bottom
      ) {
        // 尚未找到，或者正在遍历的媒体源 zOrder 大于等已经找到的，则选择当前正在遍历的媒体源
        if (!newSelected.sourceId || (source.zOrder && newSelected.zOrder <= source.zOrder)) {
          newSelected.sourceId = source.sourceId;
          newSelected.sourceType = source.sourceType;
          newSelected.zOrder = source.zOrder || 0;
        }
      }
    });

    console.log(
      "[LivePreview]onContainerClick find clicked media source:",
      newSelected
    );
    mediaSourcesStore.setSelectedMediaKey(newSelected);
  } else {
    if (
      target &&
      (target === overlayRef.value ||
        overlayRef.value?.contains(target as Node))
    ) {
      // continue to move or resize current selected media source
      console.log("[LivePreview]onContainerClick overlayRef clicked");
    } else {
      // un-select current media source
      console.log("[LivePreview]onContainerClick click outside of mixing video image");
      mediaSourcesStore.setSelectedMediaKey({
        sourceId: '',
        sourceType: null,
      });
    }
  }
};

onBeforeMount(() => {
  console.log('onBeforeMount')
});

// 初始化基础数据
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
    // listen container click event
    moveAndResizeContainerRef.value.addEventListener(
      "mousedown",
      onContainerClick,
      false
    );

    movableInstance = new Movable(
      overlayRef.value,
      moveAndResizeContainerRef.value
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
        keepRatio: true, // 按比例缩放，不支持任意修改宽高
        stopPropagation: true, // 如果不支持 stopPropagation，和 Movable 一起使用时，也会出发 Movable 的点击事件
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

// 创建 native 窗口
onMounted(() => {
  console.log("[LivePreview]onMounted create display window");
  if (moveAndResizeContainerRef.value && nativeWindowsRef.value) {
    setTimeout(() => {
      createNativeWindow(); // 调用 native 窗口创建
    }, 100);

    resizeObserver.observe(moveAndResizeContainerRef.value)
  } else {
    console.error("no HTML element to preview live stream");
  }
});

// 创建 Movable 和 Resizable
onMounted(() => {
  console.log("[LivePreview]onMounted init movable and resizable instance");
});

onBeforeUnmount(()=> {
  console.log('onBeforeUnmount')
  if (nativeWindowsRef.value && resizeObserver) {
    resizeObserver.unobserve(nativeWindowsRef.value);
  }

  if (moveAndResizeContainerRef.value) {
    // un-listen container click event
    moveAndResizeContainerRef.value.removeEventListener(
      "mousedown",
      onContainerClick,
      false
    );
  }

  mediaMixingPlugin.stopPublish();
});

onUnmounted(()=> {
  console.log('onUnmounted')
  if (resizeObserver) {
    resizeObserver.disconnect();
  }
});
</script>

<style scoped lang="scss">
@import "../../common/base/resizable.css";
@import "../../assets/variable.scss";

.tui-live-preview {
  height: 100%;

  .tui-preview-title {
    padding: 0 1rem;
    border-bottom: none;
  }

  .tui-live-designer {
    height: calc(100% - 2.5rem);
    position: relative;
  }

  .tui-video-player {
    width: 100%;
    height: 100%;
  }

  .media-overlay-in-design {
    position: absolute;
    left: 0;
    top: 0;
    min-width: 1px;
    min-height: 1px;
    background-color: transparent;
    border: 0.125rem solid transparent;
    cursor: move;
  }
}
</style>
<style lang="scss">
@import "../../assets/variable.scss";
.tui-live-preview  {
  .resize-anchor {
    border-color: transparent;
  }
}
</style>