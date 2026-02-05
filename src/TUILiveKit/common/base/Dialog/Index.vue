<template>
  <Teleport to="body">
    <Transition name="dialog-fade" appear>
      <div
        v-if="visible"
        class="tui-dialog-mask"
        :style="{ zIndex }"
        @mousedown="handleMaskMouseDown"
        @mouseup="handleMaskMouseUp"
      >
        <div
          class="tui-dialog"
          :class="customClass"
          :style="dialogStyle"
          @mousedown.stop
          @mouseup.stop
        >
          <div v-if="title || closable" class="tui-dialog-header">
            <h3 v-if="title" class="tui-dialog-title">{{ title }}</h3>
            <button
              v-if="closable"
              class="tui-dialog-close-btn"
              @click="handleClose"
              :title="'Close'"
            >
              <CloseIcon :size="20" />
            </button>
          </div>

          <div class="tui-dialog-body">
            <slot>
              <div v-if="content" v-html="content"></div>
            </slot>
          </div>

          <div v-if="showFooter" class="tui-dialog-footer">
            <slot name="footer">
              <TUILiveButton
                type="primary"
                class="tui-dialog-btn tui-dialog-btn-confirm"
                :disabled="confirmLoading"
                @click="handleConfirm"
              >
                {{ confirmText }}
              </TUILiveButton>
              <TUILiveButton
                class="tui-dialog-btn tui-dialog-btn-cancel"
                @click="handleCancel"
              >
                {{ cancelText }}
              </TUILiveButton>
            </slot>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch, defineProps, defineEmits } from 'vue';
import CloseIcon from '../../icons/CloseIcon.vue';
import TUILiveButton from '../Button.vue';

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  title: {
    type: String,
    default: '',
  },
  width: {
    type: [String, Number],
    default: '28rem',
  },
  height: {
    type: [String, Number],
    default: 'auto',
  },
  maxWidth: {
    type: [String, Number],
    default: '90vw',
  },
  maxHeight: {
    type: [String, Number],
    default: '80vh',
  },
  closable: {
    type: Boolean,
    default: true,
  },
  maskClosable: {
    type: Boolean,
    default: true,
  },
  showFooter: {
    type: Boolean,
    default: true,
  },
  confirmText: {
    type: String,
    default: 'Confirm',
  },
  cancelText: {
    type: String,
    default: 'Cancel',
  },
  confirmLoading: {
    type: Boolean,
    default: false,
  },
  destroyOnClose: {
    type: Boolean,
    default: false,
  },
  zIndex: {
    type: Number,
    default: 1000,
  },
  customClass: {
    type: String,
    default: '',
  },
});

const emit = defineEmits(['update:visible', 'confirm', 'cancel', 'close']);

const content = ref('');

const dialogStyle = computed(() => {
  const style: Record<string, string> = {};

  if (typeof props.width === 'number') {
    style.width = `${props.width}px`;
  } else {
    style.width = props.width;
  }

  if (typeof props.height === 'number') {
    style.height = `${props.height}px`;
  } else if (props.height !== 'auto') {
    style.height = props.height;
  }

  if (typeof props.maxWidth === 'number') {
    style.maxWidth = `${props.maxWidth}px`;
  } else {
    style.maxWidth = props.maxWidth;
  }

  if (typeof props.maxHeight === 'number') {
    style.maxHeight = `${props.maxHeight}px`;
  } else {
    style.maxHeight = props.maxHeight;
  }

  return style;
});

let maskMouseDownInside = false;

const handleMaskMouseDown = (event: MouseEvent) => {
  if (!props.maskClosable) return;
  maskMouseDownInside = (event.target as HTMLElement).classList.contains('tui-dialog-mask');
};

const handleMaskMouseUp = (event: MouseEvent) => {
  if (!props.maskClosable) return;
  const maskMouseUpInside = (event.target as HTMLElement).classList.contains('tui-dialog-mask');
  if (maskMouseDownInside && maskMouseUpInside) {
    handleClose();
  }
  maskMouseDownInside = false;
};

const handleClose = () => {
  emit('update:visible', false);
  emit('close');
};

const handleConfirm = () => {
  emit('confirm');
  handleClose();
};

const handleCancel = () => {
  emit('cancel');
  if (!props.confirmLoading) {
    handleClose();
  }
};

watch(
  () => props.visible,
  (newVisible) => {
    if (newVisible) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  },
  { immediate: true }
);
</script>

<style lang="scss" scoped>
@import "../../../assets/global.scss";

.tui-dialog-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--bg-color-dialog-secondary-mask);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
}

.tui-dialog {
  background-color: var(--bg-color-dialog-secondary, #303030);
  border-radius: 0.5rem;
  display: flex;
  flex-direction: column;
  box-shadow: 0 1rem 3rem rgba(0, 0, 0, 0.5);
  overflow: hidden;
  border: 1px solid var(--stroke-color-primary);
  position: relative;
}

.tui-dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  // border-bottom: 1px solid var(--stroke-color-primary);
  // background: var(--bg-color-operate);
  flex-shrink: 0;

  .tui-dialog-title {
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-color-primary);
    margin: 0;
  }

  .tui-dialog-close-btn {
    position: relative;
    width: 1.75rem;
    height: 1.75rem;
    border: none;
    background: transparent;
    cursor: pointer;
    border-radius: 0.25rem;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-color-primary);
    padding: 0;
    flex-shrink: 0;
    overflow: hidden;

    &:hover {
      background-color: var(--bg-color-bubble-reciprocal);
    }
  }
}

.tui-dialog-body {
  flex: 1;
  padding: 1.5rem;
  overflow-y: auto;
  color: var(--text-color-primary);

  &::-webkit-scrollbar {
    width: 0.375rem;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background-color: var(--stroke-color-primary);
    border-radius: 0.1875rem;

    &:hover {
      background-color: var(--stroke-color-secondary);
    }
  }
}

.tui-dialog-footer {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  padding: 0.75rem 1.5rem;
  // border-top: 1px solid var(--stroke-color-primary);
  // background: var(--bg-color-operate);
  flex-shrink: 0;

  // .tui-dialog-btn {
  //   padding: 0.5rem 1rem;
  //   border-radius: 0.5rem;
  //   border: none;
  //   cursor: pointer;
  //   font-size: 0.875rem;
  //   font-weight: 500;
  //   transition: all 0.2s;
  //   min-width: 4rem;

  //   &.tui-dialog-btn-cancel {
  //     background-color: var(--bg-color-bubble-reciprocal);
  //     color: var(--text-color-primary);
  //     border: 1px solid var(--stroke-color-primary);

  //     &:hover {
  //       background-color: var(--bg-color-operate);
  //       border-color: var(--stroke-color-secondary);
  //     }
  //   }

  //   &.tui-dialog-btn-confirm {
  //     background-color: var(--button-color-primary-default);
  //     color: white;

  //     &:hover:not(:disabled) {
  //       background-color: var(--button-color-primary-hover);
  //     }

  //     &:disabled {
  //       opacity: 0.5;
  //       cursor: not-allowed;
  //     }
  //   }
  // }
}

.dialog-fade-enter-active,
.dialog-fade-leave-active {
  transition: opacity 0.2s ease;
}

.dialog-fade-enter-from,
.dialog-fade-leave-to {
  opacity: 0;
}

.dialog-fade-enter-active .tui-dialog,
.dialog-fade-leave-active .tui-dialog {
  transition: transform 0.3s ease;
}

.dialog-fade-enter-from .tui-dialog,
.dialog-fade-leave-to .tui-dialog {
  transform: translateY(-1.25rem);
}
</style>
