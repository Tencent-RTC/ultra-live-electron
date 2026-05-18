<template>
  <LiveScenePanel
    @on-add-camera="handleAddCamera"
    @on-add-screen-share="handleAddScreenShare"
    @on-add-local-video="handleAddLocalVideo"
    @on-add-online-video="handleAddOnlineVideo"
    @on-update-material="handleUpdateMaterial"
    @on-rename-material="handleRenameMaterial"
  />
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue';
import { useUIKit, TUIToast, TOAST_TYPE } from '@tencentcloud/uikit-base-component-vue3';
import { TRTCMediaSourceType } from '@tencentcloud/tuiroom-engine-electron';
import { useVideoMixerState, MediaSource } from 'tuikit-atomicx-vue3-electron';
import LiveScenePanel from '../LiveScenePanel/index.vue';
import { ipcBridge, IPCMessageType, toPlainIpcPayload, ChildPanelType } from '../../ipc';
import type { ShowChildPanelPayload } from '../../ipc';
import logger from '../../utils/logger';

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

// Default canvas rect for video-file / online-video media sources.
// Mirrors the DEFAULT_VIDEO_RECT defined in the shared VideoMixerState module.
// Kept inline because the shared package does not currently re-export this
// constant from its public entry, and we want to avoid touching the shared layer.
const DEFAULT_VIDEO_RECT = { left: 0, top: 0, right: 640, bottom: 360 };

/**
 * Build a SDK-shaped MediaSource from a child-window IPC payload.
 *
 * Returns `Record<string, any>` (rather than a strict `Partial<MediaSource>`) because
 * camera dialogs include SDK-private fields like `colorSpace`/`colorRange` that are
 * not part of the public MediaSource type but are still required by the underlying
 * SDK call. Returns `null` when the payload shape is unrecognized so the caller can
 * short-circuit instead of forging a MediaSource with `String(undefined)` as sourceId.
 */
function childPayloadToMediaSource(data: Record<string, any>): Record<string, any> | null {
  if (data.sourceType === TRTCMediaSourceType.kCamera) {
    return {
      sourceId: String(data.sourceId),
      sourceType: data.sourceType,
      name: data.name || t('Camera'),
      width: data.width,
      height: data.height,
      rect: data.rect,
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
    };
  }
  // Local video file: payload comes from LocalVideoDialog as { filePath, fileName, playoutVolume, mediaKind: 'localVideo' }.
  // Build the SDK-shaped MediaSource here so the state layer addMediaSource() receives a proper structure.
  if (data.mediaKind === 'localVideo') {
    return {
      sourceId: String(data.filePath),
      sourceType: TRTCMediaSourceType.kVideoFile,
      name: data.fileName || t('Video'),
      rect: { ...DEFAULT_VIDEO_RECT },
      zOrder: 1,
      localVideo: { playoutVolume: data.playoutVolume },
    };
  }
  // Online video: payload comes from OnlineVideoDialog as { url, playoutVolume, networkCacheSizeKB, mediaKind: 'onlineVideo' }.
  if (data.mediaKind === 'onlineVideo') {
    return {
      sourceId: String(data.url),
      sourceType: TRTCMediaSourceType.kOnlineVideo,
      name: data.url,
      rect: { ...DEFAULT_VIDEO_RECT },
      zOrder: 1,
      onlineVideo: { playoutVolume: data.playoutVolume, networkCacheSizeKB: data.networkCacheSizeKB },
    };
  }
  // Unknown payload shape: log & return null so callers can short-circuit instead of
  // forging a MediaSource with `String(undefined) === "undefined"` as sourceId.
  if (data.id == null) {
    logger.warn('childPayloadToMediaSource: unknown payload shape, missing id', data);
    return null;
  }
  return { sourceId: String(data.id), sourceType: data.type, name: data.name || '' };
}

/**
 * Convert reactive MediaSource (Proxy) to plain object for IPC.
 * Electron IPC cannot clone Proxy or non-serializable objects.
 * Use JSON round-trip to strip all Proxy and nested reactive refs.
 */
function mediaSourceToPlainPayload(material: MediaSource): Record<string, unknown> {
  const plain: Record<string, unknown> = {
    sourceId: material.sourceId,
    sourceType: material.sourceType,
    name: material.name,
    mirrorType: material.mirrorType,
    rect: material.rect,
    zOrder: material.zOrder,
  };
  if (material.width !== undefined) plain.width = material.width;
  if (material.height !== undefined) plain.height = material.height;
  if (material.localVideo) plain.localVideo = material.localVideo;
  if (material.onlineVideo) plain.onlineVideo = material.onlineVideo;
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

const handleAddLocalVideo = () => {
  logger.info('add local video');
  showChildPanel(ChildPanelType.VideoFile);
};

const handleAddOnlineVideo = () => {
  logger.info('add online video');
  showChildPanel(ChildPanelType.OnlineVideo);
};

const handleUpdateMaterial = (material: MediaSource) => {
  logger.info('update material:', material);

  // Defensive: guard against null/undefined or malformed material before any field access.
  if (!material || material.sourceType == null) {
    logger.warn('handleUpdateMaterial: invalid material', material);
    return;
  }

  // `Partial<Record<...>>` ensures the key is constrained to legal TRTCMediaSourceType values
  // and the lookup result is correctly typed as `ChildPanelType | undefined`.
  const sourceTypeToPanelType: Partial<Record<TRTCMediaSourceType, ChildPanelType>> = {
    [TRTCMediaSourceType.kCamera]: ChildPanelType.Camera,
    [TRTCMediaSourceType.kScreen]: ChildPanelType.Screen,
    [TRTCMediaSourceType.kVideoFile]: ChildPanelType.VideoFile,
    [TRTCMediaSourceType.kOnlineVideo]: ChildPanelType.OnlineVideo,
  };
  const panelType = sourceTypeToPanelType[material.sourceType];
  if (!panelType) {
    logger.warn('Invalid material.sourceType, expected Camera/Screen/VideoFile/OnlineVideo', material.sourceType);
    return;
  }

  const plainPayload = mediaSourceToPlainPayload(material);
  showChildPanel(panelType, plainPayload);
};

const handleRenameMaterial = (material: MediaSource) => {
  logger.info('rename material:', material);
  showChildPanel(ChildPanelType.Rename, mediaSourceToPlainPayload(material));
};

async function onAddMediaSource(payload: Record<string, any>) {
  logger.info('LiveScenePanel received ADD_MEDIA_SOURCE', payload);
  try {
    const source = childPayloadToMediaSource(payload);
    if (!source) {
      logger.warn('onAddMediaSource: childPayloadToMediaSource returned null, skip', payload);
      TUIToast({
        type: TOAST_TYPE.ERROR,
        message: t('Failed to add media source'),
        duration: ERROR_TOAST_DURATION,
      });
      return;
    }
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
      } else if (source.sourceType === TRTCMediaSourceType.kVideoFile) {
        message = t('Failed to add local video');
      } else if (source.sourceType === TRTCMediaSourceType.kOnlineVideo) {
        message = t('Failed to add online video');
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

/**
 * Convert a child-window update payload into a Partial<MediaSource> config that
 * the state layer's updateMediaSource() expects.
 *
 * For camera/screen the dialog already produces SDK-shaped fields (sourceId/width/height/...),
 * so we just strip predata/mediaKind. For local-video/online-video the dialog produces
 * raw form fields (filePath/fileName/playoutVolume/url/networkCacheSizeKB), which need
 * to be mapped onto MediaSource's sourceId/name/localVideo/onlineVideo fields. SourceId/name
 * are only updated when the file path / URL actually changed, mirroring the Mac shared-layer
 * behavior in LiveScenePanel/index.vue::updateLocalVideoMaterial / updateOnlineVideoMaterial.
 */
function buildUpdateConfig(payload: Record<string, any>, existing: MediaSource): Record<string, any> {
  // Strip `predata` (server-only metadata) and `mediaKind` (discriminator tag) from
  // the payload before forwarding the remainder as the SDK config. `predata` is
  // intentionally destructured but unused in this scope; the eslint-disable-next-line
  // is preferred over a `_` prefix because the project ESLint config does not
  // recognize `_`-prefixed names as unused-vars exemptions.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { predata, mediaKind, ...rest } = payload;

  if (mediaKind === 'localVideo') {
    const config: Record<string, any> = {
      localVideo: { playoutVolume: payload.playoutVolume },
    };
    const newPath = payload.filePath;
    if (newPath && newPath !== existing.sourceId) {
      config.sourceId = String(newPath);
      config.name = payload.fileName || existing.name;
    }
    return config;
  }

  if (mediaKind === 'onlineVideo') {
    const config: Record<string, any> = {
      onlineVideo: {
        playoutVolume: payload.playoutVolume,
        networkCacheSizeKB: payload.networkCacheSizeKB,
      },
    };
    const newUrl = payload.url;
    if (newUrl && newUrl !== existing.sourceId) {
      config.sourceId = String(newUrl);
      config.name = String(newUrl);
    }
    return config;
  }

  // Default: camera / screen / rename — pass through dialog fields directly.
  // Stays `Record<string, any>` because camera payload may include SDK-private fields
  // (colorSpace/colorRange) not part of the public MediaSource type.
  return rest;
}

async function onUpdateMediaSource(payload: Record<string, any>) {
  logger.info('LiveScenePanel received UPDATE_MEDIA_SOURCE', payload);
  try {
    const existing = videoMixerState.mediaSourceList.value.find(
      (item: MediaSource) => item.sourceId === String(payload.predata?.sourceId ?? payload.predata?.mediaSourceInfo?.sourceId ?? payload.sourceId ?? payload.id)
    );
    if (existing) {
      const config = buildUpdateConfig(payload, existing);
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
