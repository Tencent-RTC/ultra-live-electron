<template>
  <div class="tui-live-kit-child dark-theme">
    <CameraSettingDialog
      v-if="currentPanel === ChildPanelType.Camera"
      custom-classes="dialog-in-child-window"
      :media-source="editingMediaSource"
      @add-camera-material="handleAddCameraMaterial"
      @update-camera-material="handleUpdateCameraMaterial"
      @close="handleClose"
    />
    <ScreenShareSettingDialog
      v-else-if="currentPanel === ChildPanelType.Screen"
      custom-classes="dialog-in-child-window"
      :media-source="editingMediaSource"
      @add-screen-material="handleAddScreenMaterial"
      @update-screen-material="handleUpdateScreenMaterial"
      @close="handleClose"
    />
    <LocalVideoDialog
      v-else-if="currentPanel === ChildPanelType.VideoFile"
      :key="`video-file-${panelOpenSeq}`"
      custom-classes="dialog-in-child-window"
      :media-source="editingMediaSource"
      @add-local-video-material="handleAddLocalVideoMaterial"
      @update-local-video-material="handleUpdateLocalVideoMaterial"
      @close="handleClose"
    />
    <OnlineVideoDialog
      v-else-if="currentPanel === ChildPanelType.OnlineVideo"
      :key="`online-video-${panelOpenSeq}`"
      custom-classes="dialog-in-child-window"
      :media-source="editingMediaSource"
      @add-online-video-material="handleAddOnlineVideoMaterial"
      @update-online-video-material="handleUpdateOnlineVideoMaterial"
      @close="handleClose"
    />
    <MaterialRenameDialog
      v-else-if="currentPanel === ChildPanelType.Rename && editingMediaSource"
      custom-classes="dialog-in-child-window"
      :material="editingMediaSource"
      @rename="handleRenameMaterialConfirm"
      @close="handleClose"
    />
    <CoGuestPanelDialog
      v-else-if="currentPanel === ChildPanelType.CoGuestConnection"
      custom-classes="dialog-in-child-window"
      :data="dataInEdit as any"
      @close="handleClose"
    />
    <LayoutConfigPanelDialog
      v-else-if="currentPanel === ChildPanelType.LayoutConfig"
      custom-classes="dialog-in-child-window"
      :layoutSwitchVisible="dataInEdit?.layoutSwitchVisible ?? false"
      :currentLayoutTemplate="dataInEdit?.currentLayoutTemplate ?? null"
      @close="handleClose"
    />
    <SettingPanelDialog
      v-else-if="currentPanel === ChildPanelType.Setting"
      :data="dataInEdit"
      @close="handleClose"
    />
    <UserProfileDialog
      v-else-if="currentPanel === ChildPanelType.UserProfile"
      custom-classes="dialog-in-child-window"
      :visible="true"
      :user-info="dataInEdit as UserProfileInfo"
      @close="handleClose"
    />
    <LiveTitleSettingDialog
      v-else-if="currentPanel === ChildPanelType.LiveTitleSetting"
      :data="liveTitleSettingData"
      @close="handleClose"
    />
    <MusicPanelDialog
      v-else-if="currentPanel === ChildPanelType.Music"
      custom-classes="dialog-in-child-window"
      :data="musicPanelData"
      @action="handleMusicAction"
      @close="handleClose"
    />
    <div v-else class="child-view-placeholder"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue';
import { TUIToast, TOAST_TYPE, useUIKit } from '@tencentcloud/uikit-base-component-vue3';
import CameraSettingDialog from './components/LiveScenePanel/CameraSettingDialog.vue';
import ScreenShareSettingDialog from './components/LiveScenePanel/ScreenShareSettingDialog.vue';
import LocalVideoDialog from './components/LiveScenePanel/LocalVideoDialog.vue';
import OnlineVideoDialog from './components/LiveScenePanel/OnlineVideoDialog.vue';
import MaterialRenameDialog from './components/LiveScenePanel/MaterialRenameDialog.vue';
import CoGuestPanelDialog from './components/CoGuestPanel';
import LayoutConfigPanelDialog from './components/LayoutConfigPanel/LayoutConfigPanelDialog.vue';
import SettingPanelDialog from './components/SettingPanel/index.vue';
import UserProfileDialog from './components/LiveHeader/UserProfileDialog.vue';
import { UserProfileInfo } from './components/LiveUserProfile/index.vue';
import LiveTitleSettingDialog from './components/LiveHeader/LiveTitleSettingDialog.vue';
import MusicPanelDialog from './components/MusicPanel/MusicPanelDialog.vue';
import { ipcBridge, IPCMessageType, toPlainIpcPayload, ChildPanelType } from './ipc';
import type {
  ShowChildPanelPayload,
  UpdateChildDataPayload,
  LiveTitleSettingInitialData,
  AddLocalVideoPayload,
  UpdateLocalVideoPayload,
  AddOnlineVideoPayload,
  UpdateOnlineVideoPayload,
  MusicPanelSnapshot,
  MusicActionPayload,
  MusicEventPayload,
} from './ipc';
import { useDeviceState, MusicPlayStatus } from 'tuikit-atomicx-vue3-electron';
import type { MediaSource } from 'tuikit-atomicx-vue3-electron';
import { getPlayErrorMessage } from './components/MusicPanel/helpers';
import logger from './utils/logger';

const logPrefix = '[ChildView]';

const { getCameraList } = useDeviceState();

/** Current panel: only driven by window-message (ipcBridge), not by main process 'show' */
const currentPanel = ref<ChildPanelType>(ChildPanelType.None);
const dataInEdit = ref<Record<string, any> | undefined>(undefined);

/**
 * Monotonic counter incremented on every SHOW_CHILD_PANEL event.
 *
 * The child window is `hide()`-d rather than destroyed between opens (see the
 * main process `close-child` handler), so this script context survives across
 * multiple open/close cycles. When the same panelType is shown twice in a row,
 * `currentPanel` does not change, so Vue's v-if keeps the existing dialog
 * instance mounted and its internal refs (filePath / videoUrl / ...) retain
 * stale values from the previous session.
 *
 * Binding `:key="panelOpenSeq"` on state-carrying dialogs (VideoFile / OnlineVideo)
 * forces Vue to unmount the old instance and mount a fresh one on each open,
 * guaranteeing a clean form state. Dialogs that read all state from props
 * (Camera / Screen / Rename / LayoutConfig / ...) don't need the key since they
 * would already rebuild when the bound prop reference changes — but these two
 * video dialogs capture props.mediaSource only at setup and never re-sync.
 *
 * Explicitly NOT applied to MusicPanelDialog: its controlled-mode snapshot flows
 * through UPDATE_CHILD_DATA and is designed to persist across reopens (so the
 * user sees the same playback position / list after closing and reopening the
 * panel mid-session).
 */
const panelOpenSeq = ref(0);

/**
 * Unified MediaSource resolved from `dataInEdit`.
 * Returns the raw payload when it looks like a MediaSource (carries `sourceId` or
 * `sourceType`), otherwise null. A null value tells dialog components to render
 * in "add" mode, while a non-null value switches them to "edit" mode.
 *
 * All MediaSource-shaped panels (Camera / Screen / Rename / VideoFile / OnlineVideo)
 * share this single computed instead of duplicating the resolver per panel.
 *
 * The cast to `MediaSource` is intentional: the IPC payload only carries a partial
 * shape (e.g. add-mode panels rely on dialogs to fill remaining fields), but each
 * dialog is designed to tolerate this and the downstream state layer reconstructs
 * the full SDK MediaSource via `childPayloadToMediaSource()`.
 */
const editingMediaSource = computed<MediaSource | null>(() => {
  const data = dataInEdit.value;
  if (!data || typeof data !== 'object') return null;
  if ('sourceId' in data || 'sourceType' in data) return data as unknown as MediaSource;
  return null;
});

const liveTitleSettingData = computed<LiveTitleSettingInitialData | undefined>(() => {
  const data = dataInEdit.value;
  if (!data || typeof data !== 'object') return undefined;
  if (!('dialogId' in data) || !data.dialogId) return undefined;
  return data as LiveTitleSettingInitialData;
});

/**
 * Read-only MusicPanelSnapshot for MusicPanelDialog.
 *
 * dataInEdit carries the snapshot pushed from the main window via both
 * SHOW_CHILD_PANEL initialData (first frame) and UPDATE_CHILD_DATA (incremental).
 * We provide a safe default so the panel can render even before the first message
 * arrives (which happens during the brief window between v-if flip and IPC delivery).
 */
const musicPanelData = computed<MusicPanelSnapshot>(() => {
  const data = dataInEdit.value;
  if (data && typeof data === 'object' && 'musicList' in data) {
    return data as MusicPanelSnapshot;
  }
  return {
    musicList: [],
    playURL: null,
    playStatus: MusicPlayStatus.Idle,
    playProgress: 0,
    totalDuration: 0,
    musicVolume: 60,
    musicPitch: 0,
  };
});

function handleAddCameraMaterial(payload: Record<string, unknown>) {
  logger.log(`${logPrefix} addCameraMaterial`, payload);
  ipcBridge.sendToMain(IPCMessageType.ADD_MEDIA_SOURCE, toPlainIpcPayload(payload));
  window.ipcRenderer.send('close-child');
}

function handleUpdateCameraMaterial(oldMediaSource: Record<string, unknown>, updateCameraInfo: Record<string, unknown>) {
  logger.log(`${logPrefix} updateCameraMaterial`, oldMediaSource, updateCameraInfo);
  const merged = { ...updateCameraInfo, predata: oldMediaSource };
  ipcBridge.sendToMain(IPCMessageType.UPDATE_MEDIA_SOURCE, toPlainIpcPayload(merged));
  window.ipcRenderer.send('close-child');
}

function handleAddScreenMaterial(payload: Record<string, unknown>) {
  logger.log(`${logPrefix} addScreenMaterial`, payload);
  ipcBridge.sendToMain(IPCMessageType.ADD_MEDIA_SOURCE, toPlainIpcPayload(payload));
  window.ipcRenderer.send('close-child');
}

function handleUpdateScreenMaterial(oldMediaSource: Record<string, unknown>, updateInfo: Record<string, unknown>) {
  logger.log(`${logPrefix} updateScreenMaterial`, oldMediaSource, updateInfo);
  const merged = { ...updateInfo, predata: oldMediaSource };
  ipcBridge.sendToMain(IPCMessageType.UPDATE_MEDIA_SOURCE, toPlainIpcPayload(merged));
  window.ipcRenderer.send('close-child');
}

function handleAddLocalVideoMaterial(payload: Omit<AddLocalVideoPayload, 'mediaKind'>) {
  logger.log(`${logPrefix} addLocalVideoMaterial`, payload);
  // Tag the message kind so the main window can dispatch to the correct MediaSource builder.
  const tagged: AddLocalVideoPayload = { ...payload, mediaKind: 'localVideo' };
  ipcBridge.sendToMain(IPCMessageType.ADD_MEDIA_SOURCE, toPlainIpcPayload(tagged));
  window.ipcRenderer.send('close-child');
}

function handleUpdateLocalVideoMaterial(oldMediaSource: MediaSource, updateInfo: Omit<AddLocalVideoPayload, 'mediaKind'>) {
  logger.log(`${logPrefix} updateLocalVideoMaterial`, oldMediaSource, updateInfo);
  const merged: UpdateLocalVideoPayload = {
    ...updateInfo,
    mediaKind: 'localVideo',
    predata: oldMediaSource as unknown as Record<string, unknown>,
  };
  ipcBridge.sendToMain(IPCMessageType.UPDATE_MEDIA_SOURCE, toPlainIpcPayload(merged));
  window.ipcRenderer.send('close-child');
}

function handleAddOnlineVideoMaterial(payload: Omit<AddOnlineVideoPayload, 'mediaKind'>) {
  logger.log(`${logPrefix} addOnlineVideoMaterial`, payload);
  const tagged: AddOnlineVideoPayload = { ...payload, mediaKind: 'onlineVideo' };
  ipcBridge.sendToMain(IPCMessageType.ADD_MEDIA_SOURCE, toPlainIpcPayload(tagged));
  window.ipcRenderer.send('close-child');
}

function handleUpdateOnlineVideoMaterial(oldMediaSource: MediaSource, updateInfo: Omit<AddOnlineVideoPayload, 'mediaKind'>) {
  logger.log(`${logPrefix} updateOnlineVideoMaterial`, oldMediaSource, updateInfo);
  const merged: UpdateOnlineVideoPayload = {
    ...updateInfo,
    mediaKind: 'onlineVideo',
    predata: oldMediaSource as unknown as Record<string, unknown>,
  };
  ipcBridge.sendToMain(IPCMessageType.UPDATE_MEDIA_SOURCE, toPlainIpcPayload(merged));
  window.ipcRenderer.send('close-child');
}

function handleRenameMaterialConfirm(newName: string) {
  const mediaSource = editingMediaSource.value;
  logger.log(`${logPrefix} renameMaterialConfirm`, newName, mediaSource);
  if (!mediaSource) {
    window.ipcRenderer.send('close-child');
    return;
  }
  const trimmed = (newName || '').trim();
  if (!trimmed || trimmed === mediaSource.name) {
    window.ipcRenderer.send('close-child');
    return;
  }

  const payload = {
    predata: mediaSource,
    name: trimmed,
  };
  ipcBridge.sendToMain(IPCMessageType.UPDATE_MEDIA_SOURCE, toPlainIpcPayload(payload));
  window.ipcRenderer.send('close-child');
}

async function handleClose() {
  const current = currentPanel.value;
  currentPanel.value = ChildPanelType.None;
  dataInEdit.value = undefined;
  await nextTick();
  ipcBridge.sendToElectronMain(IPCMessageType.HIDE_CHILD_PANEL, {
    panelType: current,
  });
}

/**
 * Forward a MusicPanelDialog user intent back to the main window.
 *
 * Unlike media-source add/update handlers which also call `close-child` after
 * sending, we deliberately keep the child window open so the user can keep
 * interacting (e.g. pause then adjust volume then resume); the window is only
 * closed by an explicit close click or by the main window sending HIDE_CHILD_PANEL.
 */
function handleMusicAction(action: MusicActionPayload) {
  logger.log(`${logPrefix} musicAction`, action);
  ipcBridge.sendToMain(IPCMessageType.MUSIC_ACTION, toPlainIpcPayload(action));
}

const { t } = useUIKit();

/** Show a localized toast triggered by MUSIC_EVENT from the main window. */
function onMusicEvent(event: MusicEventPayload) {
  logger.log(`${logPrefix} musicEvent`, event);
  if (event.event === 'onPlayError') {
    TUIToast({
      type: TOAST_TYPE.ERROR,
      message: getPlayErrorMessage(event.code, t),
    });
  }
}

onMounted(() => {
  getCameraList().catch((e) => logger.log(`${logPrefix} pre-fetch camera list failed`, e));

  // ============== Unified panel control via SHOW_CHILD_PANEL ==============
  ipcBridge.on(IPCMessageType.SHOW_CHILD_PANEL, (payload: ShowChildPanelPayload) => {
    logger.log(`${logPrefix} received SHOW_CHILD_PANEL, panelType=${payload.panelType}`, payload.initialData);
    currentPanel.value = payload.panelType;
    dataInEdit.value = payload.initialData ?? undefined;
    // Bump the open sequence so dialogs bound with `:key="panelOpenSeq"` remount
    // with a clean internal state even when panelType is identical to the previous
    // open (e.g. user closes and reopens the "Add Local Video" dialog).
    panelOpenSeq.value += 1;

    // Defer the camera list refresh to the next tick so it does not block the
    // first paint of the dialog. The SDK getDevicesList call is a sync-blocking
    // native binding under the hood; calling it inline freezes the renderer
    // for hundreds of ms, manifesting as a black flash on every reopen.
    if (payload.panelType === ChildPanelType.Camera) {
      setTimeout(() => {
        getCameraList().catch((e) => logger.log(`${logPrefix} on-show camera list refresh failed`, e));
      }, 0);
    }
  });

  // ============== Data updates via UPDATE_CHILD_DATA ==============
  ipcBridge.on(IPCMessageType.UPDATE_CHILD_DATA, (payload: UpdateChildDataPayload) => {
    logger.log(`${logPrefix} received UPDATE_CHILD_DATA, panelType=${payload.panelType}, currentPanel=${currentPanel.value}`, payload.data);
    if (payload.panelType === currentPanel.value) {
      dataInEdit.value = payload.data;
    }
    // else: ignore, current panel doesn't match
  });

  // ============== Music event passthrough from main window ==============
  ipcBridge.on(IPCMessageType.MUSIC_EVENT, onMusicEvent);
});
</script>

<style lang="scss" scoped>
.tui-live-kit-child {
  position: relative;
  height: 100%;
  background-color: var(--bg-color-dialog, #1f2024);
  color: var(--text-color-primary, #fff);
  font-size: 0.875rem;
  overflow: hidden;
  overflow-y: auto;
  -ms-overflow-style: none;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    width: 0;
    height: 0;
    display: none;
  }
}

.child-view-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 1rem;
  text-align: center;
}

:deep(.dialog-in-child-window) {
  width: 100% !important;
  max-width: none;
  height: 100% !important;
  max-height: none;
  margin: 0;
  padding: 20px;
  display: flex;
  flex-direction: column;
  border-radius: 0;
}
</style>
