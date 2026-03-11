<template>
  <LiveScenePanel @on-add-camera="handleAddCamera" @on-add-screen-share="handleAddScreenShare" @on-update-material="handleUpdateMaterial" @on-rename-material="handleRenameMaterial"/>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue';
import { useUIKit, TUIToast, TOAST_TYPE } from '@tencentcloud/uikit-base-component-vue3';
import { TRTCMediaSourceType, TRTCVideoResolution } from '@tencentcloud/tuiroom-engine-electron';
import { useVideoMixerState } from 'tuikit-atomicx-vue3-electron';
import type { MediaSource } from '@tencentcloud/tuiroom-engine-electron';
import LiveScenePanel from '../LiveScenePanel/index.vue';
import { ipcBridge, IPCMessageType, toPlainIpcPayload, ChildPanelType } from '../../../ipc';
import type { ShowChildPanelPayload } from '../../../ipc';
import logger from '../../../utils/logger';

/**
 * Helper: open child window with specific panel via unified SHOW_CHILD_PANEL message.
 * Replaces the old open-child + setTimeout + sendToChild pattern.
 */
function showChildPanel(panelType: ChildPanelType, initialData?: Record<string, unknown>, windowSize?: { width: number; height: number }) {
  const payload: ShowChildPanelPayload = {
    panelType,
    initialData: initialData ?? {},
  };
  if (windowSize) {
    payload.windowSize = windowSize;
  }
  ipcBridge.sendToChild(IPCMessageType.SHOW_CHILD_PANEL, payload);
}

const videoMixerState = useVideoMixerState();
const { t } = useUIKit();

const ERROR_TOAST_DURATION = 5000;

function widthHeightToResolution(width: number, height: number): number {
  const w = width || 640;
  const h = height || 360;
  if (w === 1920 && h === 1080) return TRTCVideoResolution.TRTCVideoResolution_1920_1080;
  if (w === 1280 && h === 720) return TRTCVideoResolution.TRTCVideoResolution_1280_720;
  if (w === 960 && h === 540) return TRTCVideoResolution.TRTCVideoResolution_960_540;
  if (w === 640 && h === 360) return TRTCVideoResolution.TRTCVideoResolution_640_360;
  if (w === 480 && h === 270) return TRTCVideoResolution.TRTCVideoResolution_480_270;
  return TRTCVideoResolution.TRTCVideoResolution_640_360;
}

function childPayloadToMediaSource(data: Record<string, any>): Record<string, any> {
  if (data.sourceType === TRTCMediaSourceType.kCamera && data.camera) {
    return {
      sourceId: data.sourceId,
      sourceType: data.sourceType,
      name: data.name || t('Camera'),
      camera: data.camera,
      mirrorType: data.mirrorType,
      rect: data.rect,
    };
  }
  if (data.type === TRTCMediaSourceType.kCamera) {
    return {
      sourceId: String(data.id),
      sourceType: data.type,
      name: data.name || t('Camera'),
      camera: {
        cameraId: String(data.id),
        resolution: widthHeightToResolution(data.width, data.height),
      },
      mirrorType: data.mirrorType,
      colorSpace: data.colorSpace,
      colorRange: data.colorRange,
    };
  }
  if (data.sourceType === TRTCMediaSourceType.kScreen && data.sourceId) {
    return {
      sourceId: String(data.sourceId),
      sourceType: data.sourceType,
      name: data.name || t('Screen'),
      width: data.width,
      height: data.height,
      screen: { sourceId: String(data.sourceId), type: data.screenType },
    };
  }
  return { sourceId: String(data.id), sourceType: data.type, name: data.name || '' };
}

/**
 * Convert reactive MediaSource (Proxy) to plain object for IPC.
 * Electron IPC cannot clone Proxy or non-serializable objects.
 * Use JSON round-trip to strip all Proxy and nested reactive refs.
 */
function mediaSourceToPlainPayload(material: any): Record<string, unknown> {
  const plain: Record<string, unknown> = {
    sourceId: material.sourceId,
    sourceType: material.sourceType,
    name: material.name,
    mirrorType: material.mirrorType,
    rect: material.rect,
    zOrder: material.zOrder,
  };
  if (material.camera) plain.camera = material.camera;
  if (material.screen) plain.screen = material.screen;
  if (material.width !== undefined) plain.width = material.width;
  if (material.height !== undefined) plain.height = material.height;
  return toPlainIpcPayload(plain) as Record<string, unknown>;
}

const handleAddCamera = () => {
  logger.info('add camera');
  showChildPanel(ChildPanelType.Camera);
};

const handleAddScreenShare = () => {
  logger.info('add screen share');
  showChildPanel(ChildPanelType.Screen);
};

const handleUpdateMaterial = (material: any) => {
  logger.info('update material:', material);

  if (material.sourceType !== TRTCMediaSourceType.kCamera && material.sourceType !== TRTCMediaSourceType.kScreen) {
    console.warn('Invalid material.sourceType, expected Camera or Screen');
    return;
  }

  const isCamera = material.sourceType === TRTCMediaSourceType.kCamera;
  const plainPayload = mediaSourceToPlainPayload(material);
  showChildPanel(isCamera ? ChildPanelType.Camera : ChildPanelType.Screen, plainPayload);
};

const handleRenameMaterial = (material: any) => {
  logger.info('rename material:', material);
  showChildPanel(ChildPanelType.Rename, mediaSourceToPlainPayload(material));
};

async function onAddMediaSource(payload: Record<string, any>) {
  logger.info('LiveScenePanel received ADD_MEDIA_SOURCE', payload);
  try {
    const source = childPayloadToMediaSource(payload);
    try {
      await videoMixerState.addMediaSource(source as MediaSource);
    } catch (err) {
      logger.error('addMediaSource failed', err);
      let message = t('Failed to add media source');
      if (source.sourceType === TRTCMediaSourceType.kCamera) {
        message = t('Failed to add camera');
      } else if (source.sourceType === TRTCMediaSourceType.kScreen) {
        message = t('Failed to add screen share');
      } else if (source.sourceType === TRTCMediaSourceType.kImage) {
        // Defensive branch: image sources are currently added locally, not via IPC.
        message = t('Failed to add image');
      }
      TUIToast({
        type: TOAST_TYPE.ERROR,
        message: message,
        duration: ERROR_TOAST_DURATION,
      });
    }
  } catch (err) {
    logger.error('addMediaSource failed', err);
    TUIToast({
      type: TOAST_TYPE.ERROR,
      message: t('Failed to add media source'),
      duration: ERROR_TOAST_DURATION,
    });
  }
}

async function onUpdateMediaSource(payload: Record<string, any>) {
  logger.info('LiveScenePanel received UPDATE_MEDIA_SOURCE', payload);
  try {
    const existing = videoMixerState.mediaSourceList.value.find(
      (item: any) => item.sourceId === String(payload.predata?.sourceId ?? payload.predata?.mediaSourceInfo?.sourceId ?? payload.sourceId ?? payload.id)
    );
    if (existing) {
      const { predata, ...config } = payload;
      try {
        await videoMixerState.updateMediaSource(existing, config);
      } catch (err) {
        logger.error('updateMediaSource failed', err);
      }
    }
  } catch (err) {
    logger.error('updateMediaSource failed', err);
  }
}

onMounted(() => {
  ipcBridge.on(IPCMessageType.ADD_MEDIA_SOURCE, onAddMediaSource);
  ipcBridge.on(IPCMessageType.UPDATE_MEDIA_SOURCE, onUpdateMediaSource);
});

onBeforeUnmount(() => {
  ipcBridge.off(IPCMessageType.ADD_MEDIA_SOURCE, onAddMediaSource);
  ipcBridge.off(IPCMessageType.UPDATE_MEDIA_SOURCE, onUpdateMediaSource);
});
</script>

<style lang="scss" scoped>
</style>
