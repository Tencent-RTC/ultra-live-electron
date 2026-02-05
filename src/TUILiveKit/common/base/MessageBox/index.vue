<template>
  <transition name="tui-message-box-fade" :disabled="teleportDisable">
    <div
      v-show="visible"
      ref="messageRef"
      :style="overlayContentStyle"
      :class="['overlay']"
      class="message-box-overlay"
      @click="handleOverlayClick"
    >
      <div class="tui-message-box">
        <div v-if="title && title !== ''" class="tui-message-box-header">
          <div class="tui-message-box-title">{{ title }}</div>
          <div class="close">
            <svg-icon :size="16" :icon="CloseIcon" @click="handleCancel"></svg-icon>
          </div>
        </div>
        <div class="tui-message-box-body">
          <div>{{ message }}</div>
        </div>
        <div class="tui-message-box-footer">
          <TUILiveButton v-if="cancelButtonText" class="tui-message-cancel-button" @click="handleCancel">{{ cancelButtonText }}</TUILiveButton>
          <TUILiveButton class="tui-message-confirm-button" type="primary" @click="handleConfirm">{{ confirmButtonText }}</TUILiveButton>
        </div>
      </div>
    </div>
  </transition>
</template>

<script lang="ts" setup>
import { ref, watch, onMounted, computed, defineEmits, withDefaults, defineProps} from 'vue';
import SvgIcon from '../SvgIcon.vue';
import TUILiveButton from '../Button.vue';
import CloseIcon from '../../icons/CloseIcon.vue';
import useZIndex from '../../../utils/useZIndex';

const visible = ref(false);
const overlayContentStyle = ref({});
const { nextZIndex } = useZIndex();
const messageRef = ref();
const teleportDisable = computed(() => !props.appendToBody);
let timer: number | undefined = undefined;

type BeforeCloseFn = () => void;

interface Props {
  title?: string;
  message: string;
  callback?: BeforeCloseFn | null;
  confirmButtonText: string;
  cancelButtonText?: string;
  cancelCallback?: BeforeCloseFn | null;
  // eslint-disable-next-line @typescript-eslint/ban-types
  remove: Function;
  appendToBody?: boolean;
  timeout?: number;
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  message: '',
  callback: null,
  confirmButtonText: '',
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  remove: () => {},
  appendToBody: false,
  timeout: 0,
});

watch(visible, (val) => {
  if (val) {
    overlayContentStyle.value = { zIndex: nextZIndex() };
  }
});

watch(
  () => props.timeout,
  (newVal) => {
    if (newVal && newVal > 0) {
      timer = setTimeout(() => {
        doClose();
      }, newVal) as unknown as number;
    }
  },
  { immediate: true },
);

const emit = defineEmits(['close']);

function handleConfirm() {
  props.callback && props.callback();
  doClose();
}

function handleCancel() {
  props.cancelCallback && props.cancelCallback();
  doClose();
}

function doClose() {
  visible.value = false;
  props.remove();
  if (timer) {
    clearTimeout(timer);
    timer = undefined;
  }
  emit('close');
}

function handleOverlayClick(event: any) {
  if (event.target !== event.currentTarget) {
    return;
  }

  if (props.cancelButtonText) {
    handleCancel();
  } else {
    handleConfirm();
  }
}

function onOpen() {
  visible.value = true;
}
onMounted(async () => {
  onOpen();
});
</script>

<style lang="scss" scoped>
@import "../../../assets/variable.scss";

.message-box-overlay {
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 100%;
  right: 0;

  &.overlay {
    background-color: $color-message-box-mask;
  }
}

.tui-message-box {
  width: 18rem;
  background-color: $color-mexxage-box-background;
  position: absolute;
  top: 3rem;
  right: 1rem;
  display: flex;
  flex-direction: column;
  border-radius: 1rem;
  .tui-message-box-header {
    height: 2rem;
    position: relative;
    display: flex;
    padding: 0 1.5rem;
    color: $color-message-box-header;
    align-items: center;
    box-shadow:0rem 0.4375rem 0.625rem -0.3125rem $color-message-box-shadow;
    .tui-dialog-header-title {
      font-size:1rem;
      font-style:normal;
      font-weight:600;
      line-height:1.5rem;
      color: $font-message-box-title-color;
    }
    .close {
      width:2rem;
      height:2rem;
      position:absolute;
      top:50%;
      transform:translateY(-50%);
      right:1.25rem;
      display:flex;
      justify-content:center;
      align-items:center;
      color:$color-message-box-close;
      cursor:pointer;
    }
  }
}

.tui-message-box-body {
  flex: 1;
  padding: 0.5rem 0.5rem;
  font-size: 0.875rem;
  font-style: normal;
  font-weight: 400;
  line-height: 1.375rem;
  color: #4F586B;
}

.tui-message-box-footer {
  padding: 0.5rem 1rem;
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;

  .tui-message-confirm-button,
  .tui-message-cancel-button {
    width: auto;
    min-width: 5rem;
  }
}
</style>
