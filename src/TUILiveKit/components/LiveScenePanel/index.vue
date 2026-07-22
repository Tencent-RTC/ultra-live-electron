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
import { onMounted, onBeforeUnmount, watch, computed, nextTick } from 'vue';
import { useUIKit } from '@tencentcloud/uikit-base-component-vue3';
import { showMessage, MessageToastType } from '../../base-component/MessageToast';
import { TRTCMediaSourceType } from '@tencentcloud/tuiroom-engine-electron';
import { TRTCMediaMixingEvent } from 'trtc-electron-sdk';
import { useVideoMixerState, MediaSource } from 'tuikit-atomicx-vue3-electron';
import LiveScenePanel from './LiveScenePanel.vue';
import { ipcBridge, IPCMessageType, toPlainIpcPayload, ChildPanelType } from '../../ipc';
import type { ShowChildPanelPayload, BeautyUpdatePayload } from '../../ipc';
import logger from '../../utils/logger';
import trtcCloud from '../../utils/trtcCloud';
import useVideoEffectManager from '../../utils/useVideoEffectManager';
import { prewarmEffectConstant, buildEffectConstantForCamera, hasEffectiveBeautyProperties } from '../../utils/beauty';
import {
  getBeautyProperties,
  setBeautyProperties,
  migrateBeautyProperties,
  deleteBeautyProperties,
  getSelectedTemplateKey,
  setSelectedTemplateKey,
  getBeautyPropertyCameraIds,
} from '../../utils/beautyPropertiesStore';

/**
 * Helper: open child window with specific panel via unified SHOW_CHILD_PANEL message.
 * Replaces the old open-child + setTimeout + sendToChild pattern.
 *
 * `extra` carries panel-specific auxiliary context that is NOT part of the
 * edited media source itself (e.g. usedCameraIds for the camera dialog so it
 * can disable already-used cameras in its dropdown).
 */
function showChildPanel(
  panelType: ChildPanelType,
  initialData?: Record<string, unknown>,
  windowSize?: { width: number; height: number },
  extra?: Record<string, unknown>,
) {
  const payload: ShowChildPanelPayload = {
    panelType,
    initialData: initialData ?? {},
  };
  if (windowSize) {
    payload.windowSize = windowSize;
  }
  if (extra) {
    payload.extra = extra;
  }
  ipcBridge.sendToChild(IPCMessageType.SHOW_CHILD_PANEL, payload);
}

const videoMixerState = useVideoMixerState();
const { t } = useUIKit();

const ERROR_TOAST_DURATION = 5000;

/**
 * Camera ids whose ADD is currently in flight. The state-layer addMediaSource()
 * optimistically pushes the source into the reactive list *before* opening the
 * device, then rolls it back (filters it out) if the device fails to open. That
 * transient push+rollback makes the id "flicker" in and out of cameraIdList,
 * which the removal watcher below would otherwise misread as a genuine removal
 * and wrongly tell the child window to self-close its camera panel.
 *
 * We mark an id as in-flight *before* awaiting the add and clear it on the next
 * tick after the call settles. The rollback's reactive flush (and thus the
 * watcher firing) happens synchronously inside the state layer's catch, before
 * our own catch/finally runs — so the mark must be set eagerly (pre-await) and
 * cleared late (nextTick) to still be present when the watcher fires.
 */
const inFlightAddCameraIds = new Set<string>();

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

/**
 * Collect sourceIds of camera-type media sources currently added to the mixer.
 * Used to populate `extra.usedCameraIds` for CameraSettingDialog so already-added
 * cameras can be visually disabled in its dropdown. The optional `excludeSourceId`
 * lets the editing flow keep the camera being edited selectable as itself.
 */
function getUsedCameraIds(excludeSourceId?: string): string[] {
  return videoMixerState.mediaSourceList.value
    .filter((m: MediaSource) => m.sourceType === TRTCMediaSourceType.kCamera)
    .map((m: MediaSource) => String(m.sourceId))
    .filter((id: string) => id !== excludeSourceId);
}

// Per-camera beauty effect properties are kept in a shared module-level
// singleton (`beautyPropertiesStore`) rather than component state, so the
// camera-removal path in MaterialItem.vue can clean up the same map. See that
// module's docblock for the full rationale.

const videoEffectManager = useVideoEffectManager();

// Local mixing server (liteav_media_server.exe) manager. Shares the same TRTC
// singleton as the atomicx VideoMixerState, so listening here observes the
// exact same server-lost event the SDK emits after finishing its built-in
// recovery. Used only to re-apply beauty on crash (see onMediaMixingServerLost).
const mediaMixingManager = trtcCloud.getMediaMixingManager();

/**
 * Build a SHOW_CHILD_PANEL `extra` payload for the camera dialog.
 * Always includes `usedCameraIds` and `effectConstant`; the latter is built
 * from the cached camera's history properties (edit mode) or fresh defaults
 * (add mode).
 */
function buildCameraExtra(material?: MediaSource | null): Record<string, unknown> {
  const editingId = material ? String(material.sourceId) : undefined;
  const history = editingId ? getBeautyProperties(editingId) : undefined;
  // Restore the beautyTemplate highlight by persisted identity (edit mode only),
  // so back-fill does not rely on reverse-matching effValues that drift once the
  // user tweaks a template-owned intensity slider.
  const templateKey = editingId ? getSelectedTemplateKey(editingId) : undefined;
  return {
    usedCameraIds: getUsedCameraIds(editingId),
    effectConstant: buildEffectConstantForCamera(history, templateKey),
  };
}

const handleAddCamera = () => {
  logger.info('add camera');
  showChildPanel(ChildPanelType.Camera, undefined, undefined, buildCameraExtra());
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
  const extra = material.sourceType === TRTCMediaSourceType.kCamera
    ? buildCameraExtra(material)
    : undefined;
  showChildPanel(panelType, plainPayload, undefined, extra);
};

const handleRenameMaterial = (material: MediaSource) => {
  logger.info('rename material:', material);
  showChildPanel(ChildPanelType.Rename, mediaSourceToPlainPayload(material));
};

/**
 * Add a MediaSource to the mixer, surfacing a source-type-specific error Toast
 * on failure. Extracted so both the ADD path and the UPDATE-fallback path (when
 * the update target no longer exists) share identical failure feedback.
 */
async function addMediaSourceWithToast(source: Record<string, any>) {
  const isCamera = source.sourceType === TRTCMediaSourceType.kCamera;
  const cameraId = isCamera ? String(source.sourceId) : '';
  // Mark the camera as in-flight BEFORE awaiting, so the removal watcher can
  // tell a failed-add rollback apart from a genuine removal (see comment on
  // `inFlightAddCameraIds`).
  if (isCamera && cameraId) {
    inFlightAddCameraIds.add(cameraId);
  }
  let addFailed = false;
  try {
    await videoMixerState.addMediaSource(source as MediaSource);
  } catch (err) {
    addFailed = true;
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
    if (isCamera && cameraId) {
      // Camera-add failures are surfaced ONLY inside the child window: the add
      // is always triggered from the child camera panel that overlays the main
      // window, so a main-window toast would be hidden behind it and just add a
      // duplicate. Delegate the toast to the child instead. The panel stays open
      // so a working camera can still be selected.
      ipcBridge.sendToChild(IPCMessageType.CAMERA_ADD_FAILED, { cameraId, message });
    } else {
      showMessage({
        type: MessageToastType.Error,
        message: message,
        duration: ERROR_TOAST_DURATION,
      });
    }
  } finally {
    // Clear the in-flight mark on the next tick so it is still set while the
    // rollback-driven watcher flush runs, then released for future adds.
    if (isCamera && cameraId) {
      nextTick(() => inFlightAddCameraIds.delete(cameraId));
      // Tell the child the add finished (success or failure) so it can release
      // the camera-dropdown lock that blocks further picks until this settles.
      ipcBridge.sendToChild(IPCMessageType.CAMERA_OP_DONE, { cameraId, ok: !addFailed });
    }
  }
}

async function onAddMediaSource(payload: Record<string, any>) {
  logger.info('LiveScenePanel received ADD_MEDIA_SOURCE', payload);
  try {
    const source = childPayloadToMediaSource(payload);
    if (!source) {
      logger.warn('onAddMediaSource: childPayloadToMediaSource returned null, skip', payload);
      showMessage({
        type: MessageToastType.Error,
        message: t('Failed to add media source'),
        duration: ERROR_TOAST_DURATION,
      });
      return;
    }
    await addMediaSourceWithToast(source);
  } catch (err) {
    logger.error('addMediaSource failed', err);
    showMessage({
      type: MessageToastType.Error,
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
      const oldSourceId = String(existing.sourceId);
      const config = buildUpdateConfig(payload, existing);
      const isCameraSwitch =
        existing.sourceType === TRTCMediaSourceType.kCamera
        && !!config.sourceId
        && String(config.sourceId) !== oldSourceId;
      // Mark the NEW camera id as in-flight for the whole switch operation. The
      // state layer's updateMediaSource() optimistically swaps the list slot to
      // the new id, then on failure rolls it back to the old id — making the new
      // id flicker into and out of cameraIdList. Since the child dialog has
      // already advanced its editing-camera id to this new device, that flicker
      // would otherwise fire a CAMERA_REMOVED matching it and wrongly self-close
      // the panel, stranding the user. Mirrors the ADD-failure suppression.
      const newCameraId = isCameraSwitch ? String(config.sourceId) : '';
      if (newCameraId) {
        inFlightAddCameraIds.add(newCameraId);
      }
      // Hoisted so the finally below can report success/failure to the child.
      let updateOk = true;
      try {
        try {
          await videoMixerState.updateMediaSource(existing, config);
        } catch (err) {
          updateOk = false;
          logger.error('updateMediaSource failed', err);
        }
        if (isCameraSwitch && updateOk) {
          // Camera deviceId switch succeeded: migrate beauty properties from old to
          // new cameraId. The dialog continues to live in child window after the
          // swap, and the user expects beauty to follow them — without this
          // migration the new camera would render bare while the old (no longer in
          // scene) would still own the cached properties.
          await migrateBeautyOnCameraSwitch(oldSourceId, String(config.sourceId));
        } else if (isCameraSwitch && !updateOk) {
          // Camera deviceId switch FAILED (the newly-selected device could not be
          // added). updateMediaSource() internally rolled the scene back to the old
          // camera, but the dialog now points at the broken device the user picked.
          // Keep the scene consistent with the "selected device == scene camera;
          // broken device == no source" model: drop the old camera source (and its
          // beauty) instead of silently keeping a camera the dialog no longer
          // reflects, and surface an error toast mirroring the ADD-failure UX.
          await removeCameraAfterFailedSwitch(existing, oldSourceId);
          // Toast the reason inside the child window too (the main-window toast in
          // removeCameraAfterFailedSwitch is likely hidden behind the overlay
          // dialog). The panel stays open so the user can pick another working
          // camera.
          ipcBridge.sendToChild(IPCMessageType.CAMERA_ADD_FAILED, {
            cameraId: newCameraId,
            message: t('Failed to add camera'),
          });
        }
      } finally {
        // Clear on the next tick so the mark is still set while the rollback- and
        // removal-driven watcher flushes run, then released for future switches.
        if (newCameraId) {
          nextTick(() => inFlightAddCameraIds.delete(newCameraId));
          // Release the child camera-dropdown lock for this switch (success or
          // fail). The fallback-to-ADD branch below releases it via
          // addMediaSourceWithToast's own CAMERA_OP_DONE instead.
          ipcBridge.sendToChild(IPCMessageType.CAMERA_OP_DONE, { cameraId: newCameraId, ok: updateOk });
        }
      }
    } else {
      // Fallback: the update target no longer exists in the scene. This happens
      // when the initially-selected camera failed to add (addMediaSource threw),
      // yet the child window optimistically marked it as committed and therefore
      // emits UPDATE (not ADD) when the user switches to a working camera. Without
      // this recovery the working camera would never be added and beauty could not
      // apply. We only recover camera sources here; other source types keep the
      // original no-op to avoid changing their semantics.
      const source = childPayloadToMediaSource(payload);
      if (source && source.sourceType === TRTCMediaSourceType.kCamera) {
        logger.warn('onUpdateMediaSource: update target not found, falling back to ADD', payload);
        // Rebuild rect from the new resolution so the recovered source is not
        // cropped by the previous (failed) camera's stale rect carried over in
        // the update payload.
        if (source.width && source.height) {
          source.rect = { left: 0, top: 0, right: source.width, bottom: source.height };
        }
        await addMediaSourceWithToast(source);
      } else {
        logger.warn('onUpdateMediaSource: update target not found and payload is not a camera, skip', payload);
      }
    }
  } catch (err) {
    logger.error('updateMediaSource failed', err);
  }
}

/**
 * Move cached beauty properties from one cameraId to another and reapply
 * via videoEffectManager. Stops the old plugin only if the old camera is no
 * longer present in mediaSourceList — preserves multi-camera scenarios where
 * the dialog only changed the *current* camera and the old one is still in
 * use elsewhere (currently impossible since the dropdown disables already-
 * used cameras, but the guard keeps the cleanup safe under future changes).
 */
async function migrateBeautyOnCameraSwitch(oldId: string, newId: string) {
  const props = migrateBeautyProperties(oldId, newId);
  if (hasEffectiveBeautyProperties(props)) {
    try {
      await videoEffectManager.startEffect(newId, { beautyProperties: props as any });
    } catch (err) {
      logger.error('migrateBeauty: startEffect on new camera failed', err);
    }
  }
  const stillInUse = videoMixerState.mediaSourceList.value.some(
    (m: MediaSource) => m.sourceType === TRTCMediaSourceType.kCamera && String(m.sourceId) === oldId,
  );
  if (!stillInUse) {
    try {
      videoEffectManager.stopEffect(oldId);
    } catch (err) {
      // stopEffect logs internally when no plugin exists; this catch is for
      // any unexpected throw to avoid breaking the migration flow.
      logger.warn('migrateBeauty: stopEffect on old camera failed', err);
    }
  }
}

/**
 * Clean up after a failed camera device switch. updateMediaSource() has already
 * rolled the SDK/list back to the old camera; here we remove that old camera
 * entirely (and stop its beauty plugin) so the scene matches the dialog's newly
 * selected — but unavailable — device. An error toast mirrors the ADD-failure UX.
 */
async function removeCameraAfterFailedSwitch(camera: MediaSource, cameraId: string) {
  // Flush a clean frame through the still-capturing (rolled-back) camera before
  // removing its source, so liteav's per-device cached last frame is clean and a
  // later re-add of the same deviceId does not flash the previous beauty effect.
  // Must run BEFORE removeMediaSource; see stopEffectWithCleanFlush for details.
  try {
    await videoEffectManager.stopEffectWithCleanFlush(cameraId);
  } catch (err) {
    logger.warn('stopEffect after failed camera switch failed', err);
  }
  try {
    await videoMixerState.removeMediaSource(camera);
  } catch (err) {
    logger.error('removeMediaSource after failed camera switch failed', err);
  }
  // Drop the cached beauty properties too, mirroring the manual-delete path in
  // MaterialItem.vue. stopEffect only tears down the native plugin; without this
  // the old camera's properties linger in beautyPropertiesMap and would be
  // resurrected (auto-enabling the matching group switches) when the same
  // deviceId is later re-added to the scene.
  deleteBeautyProperties(cameraId);
  // The failure toast is surfaced inside the child window by the caller
  // (onUpdateMediaSource sends CAMERA_ADD_FAILED). We intentionally do NOT show a
  // main-window toast here: the switch is driven from the child camera panel that
  // overlays the main window, so a main-window toast would be hidden behind it
  // and merely duplicate the child one.
}

/**
 * Apply a child-window-emitted beauty change to videoEffectManager.
 *
 * `properties` (full snapshot) is always cached for migration. For applying to
 * native we prefer the INCREMENTAL `delta` when the plugin already exists, so
 * `setParameter` only carries the effects that changed this tick (far less
 * native logging). On first apply (no plugin yet) or a forced full apply (no
 * `delta`, e.g. camera switch) we run startEffect with the full set. An empty
 * full snapshot still means "clear everything".
 */
async function onBeautyUpdate(payload: BeautyUpdatePayload) {
  logger.info('LiveScenePanel received BEAUTY_UPDATE', payload);
  if (!payload?.cameraId) return;
  const cameraId = String(payload.cameraId);
  const properties = Array.isArray(payload.properties) ? payload.properties : [];
  const delta = Array.isArray(payload.delta) ? payload.delta : undefined;
  const hasEffective = hasEffectiveBeautyProperties(properties);
  // Normalize the cache: a snapshot that carries no effective beauty (only the
  // point-makeup { effValue: 0, resPath: '' } clears getProperties() emits) is
  // stored as an empty array. This keeps beautyPropertiesMap free of pure-clear
  // noise so migration / crash-recovery / edit-mode reopen see clean data and a
  // "no beauty" camera never gets a plugin resurrected from cached clears.
  setBeautyProperties(cameraId, hasEffective ? properties : []);
  // Persist the picked beautyTemplate identity alongside the properties so a
  // later edit-mode reopen restores the highlight by identity (null clears it).
  setSelectedTemplateKey(cameraId, payload.selectedTemplateKey);
  // No effective beauty + no existing plugin means "no beauty to apply". The
  // cache above is already correct, so skip creating a redundant effect-less
  // plugin. Checking effective beauty (not array length) is required: the
  // camera-switch full re-emit (delta === undefined) carries clear entries that
  // make the array non-empty, which would otherwise defeat this guard and spin
  // up an effect-less plugin on the newly switched camera.
  if (!hasEffective && !videoEffectManager.hasPlugin(cameraId)) {
    return;
  }
  try {
    if (delta !== undefined && videoEffectManager.hasPlugin(cameraId)) {
      // Incremental update on an already-created plugin: push only the delta.
      videoEffectManager.updateEffect(cameraId, { beautyProperties: delta as any });
    } else {
      // First apply (creates the plugin) or forced full apply: push full set.
      await videoEffectManager.startEffect(cameraId, { beautyProperties: properties as any });
    }
  } catch (err) {
    logger.error('onBeautyUpdate: apply failed', err);
  }
}

/**
 * Re-apply beauty after the local mixing server (liteav_media_server.exe)
 * crashed and the SDK finished its built-in recovery.
 *
 * The SDK's internal recoverMediaMixingServer() restarts the server, rebinds
 * preview, re-publishes and re-adds every media source — but it does NOT
 * restore the xmagic video-effect plugins, which live outside the mixing
 * server's pluginParams and are managed here per camera. After a crash the
 * native plugin instances are dead and the global video-process pipeline
 * (setPluginParams I420, set inside videoEffectManager.init) is gone, so both
 * must be rebuilt:
 *   1. resetForRelogin() drops the now-dead plugin objects and flips `inited`
 *      back to false, forcing the next startEffect to re-run init() (which
 *      re-sends the global pipeline switch).
 *   2. startEffect() per camera re-creates the plugin and pushes the cached
 *      beautySetting. The native side caches beautySetting received before its
 *      xmagic instance finishes creating, so this is safe even if the recovered
 *      camera source is still starting up.
 *
 * We only re-apply to cameras that both had beauty cached AND are still present
 * in the (SDK-recovered) media source list.
 */
async function onMediaMixingServerLost() {
  logger.warn('LiveScenePanel received onMediaMixingServerLost, re-applying beauty');
  videoEffectManager.resetForRelogin();
  const presentCameraIds = new Set(cameraIdList.value);
  for (const cameraId of getBeautyPropertyCameraIds()) {
    if (!presentCameraIds.has(cameraId)) {
      continue;
    }
    const properties = getBeautyProperties(cameraId);
    if (hasEffectiveBeautyProperties(properties)) {
      try {
        await videoEffectManager.startEffect(cameraId, { beautyProperties: properties as any });
      } catch (err) {
        logger.error('onMediaMixingServerLost: re-apply beauty failed', cameraId, err);
      }
    }
  }
}

onMounted(() => {
  ipcBridge.on(IPCMessageType.ADD_MEDIA_SOURCE, onAddMediaSource);
  ipcBridge.on(IPCMessageType.UPDATE_MEDIA_SOURCE, onUpdateMediaSource);
  ipcBridge.on(IPCMessageType.BEAUTY_UPDATE, onBeautyUpdate);
  // Re-apply beauty after a mixing-server crash. The SDK recovers sources but
  // not the xmagic effect plugins; this listener rebuilds them.
  mediaMixingManager?.on(TRTCMediaMixingEvent.onMediaMixingServerLost, onMediaMixingServerLost);
  // Prewarm xmagic so the very first time the user opens the camera dialog,
  // SHOW_CHILD_PANEL.extra.effectConstant is already populated. Best-effort:
  // failures here only mean the first dialog open will compute on demand.
  prewarmEffectConstant().catch((e) => logger.warn('prewarmEffectConstant failed', e));
});

onBeforeUnmount(() => {
  ipcBridge.off(IPCMessageType.ADD_MEDIA_SOURCE, onAddMediaSource);
  ipcBridge.off(IPCMessageType.UPDATE_MEDIA_SOURCE, onUpdateMediaSource);
  ipcBridge.off(IPCMessageType.BEAUTY_UPDATE, onBeautyUpdate);
  mediaMixingManager?.off(TRTCMediaMixingEvent.onMediaMixingServerLost, onMediaMixingServerLost);
});

/**
 * Central camera-removal cleanup. Watches the media source list for cameras that
 * disappeared and stops their beauty plugin + drops cached properties. This is
 * the safety net that covers ALL removal paths — notably the shared kit-layer
 * MixerControl's delete button (which cannot access demo-layer
 * useVideoEffectManager) — alongside the per-item pre-removal flush in
 * MaterialItem.vue. stopEffect on an already-stopped plugin is a no-op, so the
 * two paths never conflict.
 */
const cameraIdList = computed(() =>
  videoMixerState.mediaSourceList.value
    .filter((m: MediaSource) => m.sourceType === TRTCMediaSourceType.kCamera)
    .map((m: MediaSource) => String(m.sourceId)),
);
watch(cameraIdList, (currentIds, prevIds) => {
  const currentSet = new Set(currentIds);
  for (const id of prevIds ?? []) {
    if (!currentSet.has(id)) {
      try {
        videoEffectManager.stopEffect(id);
      } catch (err) {
        logger.warn('camera-removal cleanup: stopEffect failed', err);
      }
      deleteBeautyProperties(id);
      // Skip the self-close notification when this id is merely an in-flight add
      // that the state layer optimistically pushed then rolled back on failure.
      // Such a transient flicker is NOT a real removal — closing the panel here
      // would strand the user with a failed camera and no way to pick another.
      if (inFlightAddCameraIds.has(id)) {
        continue;
      }
      // Notify the child window so it can self-close the camera panel when it is
      // currently editing this exact camera. The child validates against its own
      // live editing-camera id, so an unrelated removal (e.g. the stale id
      // dropped during an in-dialog device switch) is ignored there. This covers
      // every removal path since they all shrink the media source list.
      ipcBridge.sendToChild(IPCMessageType.CAMERA_REMOVED, { cameraId: id });
    }
  }
});
</script>

<style lang="scss" scoped>
</style>
