<template>
  <div class="tui-live-kit-confirm dark-theme" ref="confirmViewRef">
    <TUIDialog
      v-model:visible="dialogVisible"
      :title="dialogTitle"
      @close="handleDialogClose"
    >
      <template v-if="isKnownScene">
        {{ dialogContent }}
      </template>
      <template v-else>
        <div class="unknown-scene-content">
          {{ unknownSceneContent }}
        </div>
      </template>
      <template #footer>
        <div v-if="isKnownScene" class="action-buttons">
          <TUIButton
            v-for="(action, index) in actions"
            :key="`${action.value}-${index}`"
            :color="getButtonColor(action.type)"
            @click="handleAction(action.value)"
          >
            {{ action.text }}
          </TUIButton>
        </div>
        <div v-else class="action-buttons">
          <TUIButton color="gray" @click="handleDialogClose">
            {{ t('Cancel') }}
          </TUIButton>
        </div>
      </template>
    </TUIDialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import type { Ref } from 'vue';
import { TUIButton, TUIDialog, useUIKit } from '@tencentcloud/uikit-base-component-vue3';
import logger from './utils/logger';
import { TUIButtonAction, TUIButtonActionType } from './types';
import {
  ipcBridge,
  IPCMessageType,
  ConfirmDialogScene,
  ConfirmDialogActionPayload,
  ShowConfirmDialogPayload,
  CloseConfirmDialogPayload,
} from './ipc';

const logPrefix = '[ConfirmView2]';
const CONFIRM_DIALOG_SCENE = {
  EndLive: 'end-live',
  AppQuit: 'app-quit',
  ForceLogout: 'force-logout',
  Unknown: 'unknown',
} as const;
type DialogSceneState = ConfirmDialogScene | typeof CONFIRM_DIALOG_SCENE.Unknown;
const KNOWN_DIALOG_SCENES = new Set<ConfirmDialogScene>([
  CONFIRM_DIALOG_SCENE.EndLive,
  CONFIRM_DIALOG_SCENE.AppQuit,
  CONFIRM_DIALOG_SCENE.ForceLogout,
]);

const confirmViewRef: Ref<HTMLElement | null> = ref(null);
const dialogVisible = ref(false);
const dialogScene = ref<DialogSceneState>(CONFIRM_DIALOG_SCENE.Unknown);
const dialogId = ref<string>('');
const dialogTitle = ref('');
const dialogContent = ref('');
const actions: Ref<Array<TUIButtonAction>> = ref([]);
const { t } = useUIKit();
const isKnownScene = computed(() => KNOWN_DIALOG_SCENES.has(dialogScene.value as ConfirmDialogScene));
const unknownSceneContent = computed(
  () => dialogContent.value || 'Unsupported confirm dialog scene.'
);

function normalizeDialogScene(scene?: string): DialogSceneState {
  if (scene && KNOWN_DIALOG_SCENES.has(scene as ConfirmDialogScene)) {
    return scene as DialogSceneState;
  }
  logger.warn(`${logPrefix} unknown scene`, scene);
  return CONFIRM_DIALOG_SCENE.Unknown;
}

function resetDialog() {
  dialogVisible.value = false;
  dialogScene.value = CONFIRM_DIALOG_SCENE.Unknown;
  dialogId.value = '';
  dialogTitle.value = '';
  dialogContent.value = '';
  actions.value = [];
}

function getButtonColor(actionType: string) {
  if (actionType === TUIButtonActionType.Normal) {
    return 'gray';
  }
  return 'red';
}

function sendDialogAction(action: string, extraPayload?: Partial<ConfirmDialogActionPayload>) {
  logger.log(`${logPrefix} CONFIRM_DIALOG_ACTION`, action);

  // Ignore repeated close events emitted after dialog has already been reset.
  if (!dialogId.value) {
    resetDialog();
    return;
  }

  const payload: ConfirmDialogActionPayload = {
    scene: dialogScene.value || undefined,
    dialogId: dialogId.value || undefined,
    action,
    ...extraPayload,
  };

  ipcBridge.sendToMain(IPCMessageType.CONFIRM_DIALOG_ACTION, payload);
  resetDialog();
}

function onShowConfirmDialog(payload: ShowConfirmDialogPayload) {
  logger.log(`${logPrefix} SHOW_CONFIRM_DIALOG`, payload);
  dialogScene.value = normalizeDialogScene(payload?.scene);
  dialogId.value = payload?.dialogId || '';
  dialogTitle.value = payload?.title || '';
  dialogContent.value = payload?.content || '';
  actions.value = (payload?.actions || []) as Array<TUIButtonAction>;
  dialogVisible.value = true;
}

function onCloseConfirmDialog(payload?: CloseConfirmDialogPayload) {
  logger.log(`${logPrefix} CLOSE_CONFIRM_DIALOG`, payload);

  // If payload provides dialog id, only close the matching dialog.
  if (payload?.dialogId && dialogId.value && payload.dialogId !== dialogId.value) {
    return;
  }
  if (payload?.scene && dialogScene.value && payload.scene !== dialogScene.value) {
    return;
  }

  resetDialog();
}

function handleAction(actionValue: string) {
  sendDialogAction(actionValue);
}

function handleDialogClose() {
  sendDialogAction('close');
}

onMounted(async () => {
  logger.log(`${logPrefix} mounted`);
  await ipcBridge.init();

  ipcBridge.on(IPCMessageType.SHOW_CONFIRM_DIALOG, onShowConfirmDialog);
  ipcBridge.on(IPCMessageType.CLOSE_CONFIRM_DIALOG, onCloseConfirmDialog);

  // Notify main process that confirm window is ready to receive quit requests
  // This is part of the quit race condition fix - main process may have pending
  // quit requests waiting for this signal
  window.ipcRenderer?.send('confirm-window-ready');
  logger.log(`${logPrefix} sent confirm-window-ready to main process`);
});

onUnmounted(() => {
  logger.log(`${logPrefix} unmounted`);
  ipcBridge.off(IPCMessageType.SHOW_CONFIRM_DIALOG, onShowConfirmDialog);
  ipcBridge.off(IPCMessageType.CLOSE_CONFIRM_DIALOG, onCloseConfirmDialog);
});
</script>

<style lang="scss" scoped>
@import './assets/global.scss';

.tui-live-kit-confirm {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: $font-sub-window-color;
  background-color: var(--bg-color-dialog);
}

:deep(.tui-dialog-mask),
:deep(.overlay-container) {
  inset: 0;
  width: 100%;
  height: 100%;
  padding: 0 !important;
  margin: 0 !important;
}

:deep(.tui-dialog-container) {
  width: 100% !important;
  height: 100% !important;
  max-width: none !important;
  max-height: none !important;
  border-radius: 0 !important;
  margin: 0 !important;
}

.action-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.unknown-scene-content {
  word-break: break-word;
}
</style>
