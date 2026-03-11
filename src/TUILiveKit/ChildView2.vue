<template>
  <div class="tui-live-kit-child-v2 dark-theme">
    <CameraSettingDialog
      v-if="currentPanel === ChildPanelType.Camera"
      custom-classes="dialog-in-child-window"
      :media-source="cameraMediaSource"
      @add-camera-material="handleAddCameraMaterial"
      @update-camera-material="handleUpdateCameraMaterial"
      @close="handleClose"
    />
    <ScreenShareSettingDialog
      v-else-if="currentPanel === ChildPanelType.Screen"
      custom-classes="dialog-in-child-window"
      :media-source="screenMediaSource"
      @add-screen-material="handleAddScreenMaterial"
      @update-screen-material="handleUpdateScreenMaterial"
      @close="handleClose"
    />
    <MaterialRenameDialog
      v-else-if="currentPanel === ChildPanelType.Rename && renameMediaSource"
      custom-classes="dialog-in-child-window"
      :material="renameMediaSource"
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
    <div v-else class="child-view-placeholder"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue';
import CameraSettingDialog from './components/v2/LiveScenePanel/CameraSettingDialog.vue';
import ScreenShareSettingDialog from './components/v2/LiveScenePanel/ScreenShareSettingDialog.vue';
import MaterialRenameDialog from './components/v2/LiveScenePanel/MaterialRenameDialog.vue';
import CoGuestPanelDialog from './components/v2/CoGuestPanel';
import LayoutConfigPanelDialog from './components/v2/LayoutConfigPanel/LayoutConfigPanelDialog.vue';
import SettingPanelDialog from './components/v2/SettingPanel/index.vue';
import UserProfileDialog from './components/v2/LiveHeader/UserProfileDialog.vue';
import { UserProfileInfo } from './components/v2/LiveUserProfile/index.vue';
import LiveTitleSettingDialog from './components/v2/LiveHeader/LiveTitleSettingDialog.vue';
import { ipcBridge, IPCMessageType, toPlainIpcPayload, ChildPanelType } from './ipc';
import type {
  ShowChildPanelPayload,
  UpdateChildDataPayload,
  LiveTitleSettingInitialData,
} from './ipc';
import logger from './utils/logger';

const logPrefix = '[ChildView2]';

/** Current panel: only driven by window-message (ipcBridge), not by main process 'show' */
const currentPanel = ref<ChildPanelType>(ChildPanelType.None);
const dataInEdit = ref<Record<string, any> | undefined>(undefined);

/** For camera panel: MediaSource | null (null = add, non-null = edit). A.2 will refine mapping. */
const cameraMediaSource = computed(() => {
  const data = dataInEdit.value;
  if (!data || typeof data !== 'object') return null;
  if ('sourceId' in data || 'sourceType' in data) return data as any;
  return null;
});

const screenMediaSource = computed(() => {
  const data = dataInEdit.value;
  if (!data || typeof data !== 'object') return null;
  if ('sourceId' in data || 'sourceType' in data) return data as any;
  return null;
});

const renameMediaSource = computed(() => {
  const data = dataInEdit.value;
  if (!data || typeof data !== 'object') return null;
  if ('sourceId' in data || 'sourceType' in data) return data as any;
  return null;
});

const liveTitleSettingData = computed<LiveTitleSettingInitialData | undefined>(() => {
  const data = dataInEdit.value;
  if (!data || typeof data !== 'object') return undefined;
  if (!('dialogId' in data) || !data.dialogId) return undefined;
  return data as LiveTitleSettingInitialData;
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

function handleUpdateScreenMaterial(_oldMediaSource: Record<string, unknown>, updateInfo: Record<string, unknown>) {
  logger.log(`${logPrefix} updateScreenMaterial`, _oldMediaSource, updateInfo);
  const merged = { ...updateInfo, predata: _oldMediaSource };
  ipcBridge.sendToMain(IPCMessageType.UPDATE_MEDIA_SOURCE, toPlainIpcPayload(merged));
  window.ipcRenderer.send('close-child');
}

function handleRenameMaterialConfirm(newName: string) {
  const mediaSource = renameMediaSource.value as Record<string, any> | null;
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

onMounted(() => {
  // ============== Unified panel control via SHOW_CHILD_PANEL ==============
  ipcBridge.on(IPCMessageType.SHOW_CHILD_PANEL, (payload: ShowChildPanelPayload) => {
    logger.log(`${logPrefix} received SHOW_CHILD_PANEL, panelType=${payload.panelType}`, payload.initialData);
    currentPanel.value = payload.panelType;
    dataInEdit.value = payload.initialData ?? undefined;
  });

  // ============== Data updates via UPDATE_CHILD_DATA ==============
  ipcBridge.on(IPCMessageType.UPDATE_CHILD_DATA, (payload: UpdateChildDataPayload) => {
    logger.log(`${logPrefix} received UPDATE_CHILD_DATA, panelType=${payload.panelType}, currentPanel=${currentPanel.value}`, payload.data);
    if (payload.panelType === currentPanel.value) {
      dataInEdit.value = payload.data;
    }
    // else: ignore, current panel doesn't match
  });
});
</script>

<style lang="scss" scoped>
.tui-live-kit-child-v2 {
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
