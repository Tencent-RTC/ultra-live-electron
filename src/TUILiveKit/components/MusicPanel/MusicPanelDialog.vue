<template>
  <TUIDialog
    :visible="true"
    width="100%"
    :customClasses="dialogCustomClasses"
    @close="handleClose"
    @cancel="handleClose"
    @confirm="handleClose"
  >
    <div class="music-panel-wrapper">
      <MusicPanel
        :controlled="true"
        :snapshot="props.data"
        @close="handleClose"
        @action="handleAction"
      />
    </div>
    <template #footer>
      <div />
    </template>
  </TUIDialog>
</template>

<script setup lang="ts">
import { TUIDialog } from '@tencentcloud/uikit-base-component-vue3';
import type { MusicActionPayload, MusicPanelSnapshot } from '../../ipc';
import MusicPanel from './index.vue';
import { useDialogClasses } from '../../hooks/useDialogClasses';

/**
 * Child-window container for MusicPanel.
 *
 * Purpose: wrap MusicPanel in a TUIDialog that fills the child BrowserWindow,
 * and relay controlled-mode state/actions between the main window (via IPC in
 * ChildView.vue) and the inner MusicPanel component.
 *
 * Mirrors the pattern used by CoGuestPanelDialog.vue.
 */
const props = defineProps<{
  customClasses?: string;
  data: MusicPanelSnapshot;
}>();

const emits = defineEmits<{
  close: [];
  action: [action: MusicActionPayload];
}>();

const dialogCustomClasses = useDialogClasses('music-panel-dialog', () => props.customClasses);

function handleClose() {
  emits('close');
}

function handleAction(action: MusicActionPayload) {
  emits('action', action);
}
</script>

<style lang="scss" scoped>
// Dialog-in-child-window override: hide default TUIDialog header/footer so
// MusicPanel can render its own custom header (matches main-window TUIDialog
// behavior configured in MusicButton.vue for Mac).
:deep(.music-panel-dialog) {
  width: 100% !important;
  height: 100% !important;
  max-height: 100% !important;
  min-height: 0 !important;
  border-radius: 0;
  padding: 0 !important;
  display: flex;
  flex-direction: column;

  > .tui-dialog-header {
    display: none;
  }

  > .tui-dialog-body {
    flex: 1 1 auto;
    padding: 0 !important;
    min-height: 0;
    height: 100%;
    display: flex;
    overflow: hidden;
  }

  > .tui-dialog-footer {
    display: none;
  }
}

.music-panel-wrapper {
  flex: 1;
  display: flex;
  min-height: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
</style>
