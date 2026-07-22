<template>
  <div
    :class="['custom-icon-container', { disabled: props.disabled }]"
    @click="handleCopyLiveID"
  >
    <IconCopy class="custom-icon" />
  </div>
</template>

<script lang="ts" setup>
import { IconCopy, useUIKit } from '@tencentcloud/uikit-base-component-vue3';
import { showMessage, MessageToastType } from '../base-component/MessageToast';
import { copyToClipboard } from '../utils/utils';

const props = defineProps<{
  liveId?: string;
  disabled?: boolean;
}>();
const { t } = useUIKit();

const handleCopyLiveID = async () => {
  if (props.disabled) {
    return;
  }
  if (!props.liveId) {
    showMessage({
      type: MessageToastType.Error,
      message: t('Copy failed'),
    });
    return;
  }

  try {
    await copyToClipboard(props.liveId);
    showMessage({
      type: MessageToastType.Success,
      message: t('Copy successful'),
    });
  } catch (error) {
    console.warn('[LiveURLCopy] copyToClipboard failed:', error);
    showMessage({
      type: MessageToastType.Error,
      message: t('Copy failed'),
    });
  }
};
</script>

<style lang="scss" scoped>
@import '../assets/mac.scss';

.custom-icon-container {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  cursor: pointer;
  color: $text-color1;
  border-radius: 50%;
  position: relative;

  &.disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .custom-icon {
    @include icon-size-base(16px);
    background: transparent;
  }

  &:not(.disabled):hover {
    box-shadow: 0 0 10px 0 var(--bg-color-mask);
    .custom-icon {
      color: $icon-hover-color;
    }
  }
}
</style>
