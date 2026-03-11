<template>
    <TUIDialog
      :visible="true"
      width="100%"
      :title="t('CoGuest')"
      :customClasses="dialogCustomClasses"
      @close="handleClose"
      @cancel="handleClose"
      @confirm="handleClose"
    >
      <CoGuestPanel class="co-guest-panel" :data="props.data" />
      <template #footer>
        <div />
      </template>
    </TUIDialog>
</template>

<script setup lang="ts">
import { TUIDialog, useUIKit } from '@tencentcloud/uikit-base-component-vue3';
import { LiveUserInfo, SeatUserInfo } from 'tuikit-atomicx-vue3-electron';
import CoGuestPanel from './CoGuestPanel.vue';
import { useDialogClasses } from '../../../hooks/useDialogClasses';

const { t } = useUIKit();

type Props = {
  customClasses?: string;
  data: {
    connected: SeatUserInfo[];
    applicants: LiveUserInfo[];
    loginUserInfo: Record<string, any>;
  }
}
const props = defineProps<Props>();

const emits = defineEmits<{
  close: [];
}>();

const dialogCustomClasses = useDialogClasses('co-guest-panel-dialog', () => props.customClasses);

const handleClose = () => {
  emits('close');
};
</script>

<style lang="scss" scoped>
:deep(.co-guest-panel-dialog) {
  .tui-dialog-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    padding: 10px 0;
  }

  .tui-dialog-header,
  .tui-dialog-footer {
    flex-shrink: 0;
  }
}

.co-guest-panel {
  flex: 1;
  min-height: 0;
}
</style>
