<template>
    <TUIDialog
      :visible="true"
      :title="t('Rename')"
      :confirmText="t('Save as new name')"
      :cancelText="t('Cancel')"
      @confirm="handleConfirm"
      @close="handleClose"
      @cancel="handleClose"
      :customClasses="dialogCustomClasses"
    >
      <TUIInput :spellcheck="false" v-model="materialName" />
    </TUIDialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { TUIDialog, TUIInput, useUIKit } from '@tencentcloud/uikit-base-component-vue3';
import type { MediaSource } from 'tuikit-atomicx-vue3-electron';
import { useDialogClasses } from '../../../hooks/useDialogClasses';

const { t } = useUIKit();

const props = defineProps<{
  material: MediaSource | null;
  customClasses?: string;
}>();

const emits = defineEmits<{
  close: [];
  rename: [newName: string];
}>();

const dialogCustomClasses = useDialogClasses('material-rename-dialog', () => props.customClasses);

const materialName = ref(props.material?.name ?? '');

const handleConfirm = () => {
  emits('rename', materialName.value);
};

const handleClose = () => {
  emits('close');
};

watch(() => props.material, (newMaterial: MediaSource | null) => {
  materialName.value = newMaterial?.name ?? '';
});
</script>

<style scoped lang="scss">
:deep(.tui-dialog-fade-enter-active),
:deep(.tui-dialog-fade-leave-active) {
  transition: none !important;
}

:deep(.tui-dialog-mask) {
  background-color: var(--bg-color-dialog, #1f2024);
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}

:deep(.material-rename-dialog) {
  max-width: 100%;
  border-radius: 10px;
  left: 0;
  right: 0;
  .tui-input {
    width: 100%;
  }
}
</style>
