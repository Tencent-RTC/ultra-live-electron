<template>
  <div class="tui-live-kit-confirm dark-theme" ref="confirmViewRef">
    <div class="tui-confirm-header">
      <div class="tui-confirm-title">{{ title }}</div>
      <div class="tui-confirm-close">
        <TUILiveButton class="tui-confirm-header-button" @click="onCancel">
          <CloseIcon />
        </TUILiveButton>
      </div>
    </div>
    <div class="tui-confirm-content">
      {{ content }}
    </div>
    <div class="tui-confirm-footer">
      <TUILiveButton
        v-for="(action, index) in actions"
        :key="index"
        class="tui-confirm-window-button"
        :class="`tui-live-button-${action.type}`"
        @click="handleAction(action.value)"
      >
        {{ action.text }}
      </TUILiveButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import type { Ref } from 'vue';
import TUILiveButton from './common/base/Button.vue';
import CloseIcon from './common/icons/CloseIcon.vue';
import logger from './utils/logger';
import { changeTheme } from './utils/utils';
import { TUIButtonAction } from './types';

const logPrefix = '[ConfirmView]';

const confirmViewRef: Ref<HTMLElement | null> = ref(null);

const title: Ref<string> = ref('');
const content: Ref<string> = ref('');
const actions: Ref<Array<TUIButtonAction>> = ref([]);

function clear() {
  title.value = '';
  content.value = '';
  actions.value = [];
}

function onCancel() {
  logger.log('onCancel');
  window.ipcRenderer.send('stop-living-result', {
    value: 'cancel',
  });
  clear();
}

function handleAction(value: string) {
  logger.log('handleAction', value);
  window.ipcRenderer.send('stop-living-result', {
    value: value,
  });
  clear();
}

window.ipcRenderer.on('stop-living', (event: any, args: {
  title: string;
  content: string;
  actions: Array<TUIButtonAction>;
}) => {
  title.value = args.title || '';
  content.value = args.content || '';
  actions.value = args.actions || [];
});

function onMessage(event: Record<string, any>) {
  logger.log(`${logPrefix}message from main window:`, event.data, event);
  const { key, data } = event.data;
  switch (key) {
  case 'change-theme':
    if (confirmViewRef.value) {
      changeTheme(confirmViewRef.value, data);
    }
    break;
  default:
    logger.warn(`${logPrefix}message unknown:`, key, data);
    break;
  }
}

// eslint-disable-next-line no-undef
let messageEventTimerId: string | number | NodeJS.Timeout | undefined;
function initMainWindowMessageListener() {
  logger.log(`${logPrefix}initMainWindowMessageListener`);
  if (window.mainWindowPortInConfirm) {
    window.mainWindowPortInConfirm.addEventListener('message', onMessage);
    window.mainWindowPortInConfirm.start();
    window.mainWindowPortInConfirm.postMessage({
      key: 'notice-from-confirm',
      data: 'confirm window port started',
    });
  } else {
    logger.warn(`${logPrefix}initMainWindowMessageListener port not ready, will retry in 1s`);
    messageEventTimerId = setTimeout(()=>{
      messageEventTimerId = 0;
      initMainWindowMessageListener();
    }, 1000);
  }
}

onMounted(() => {
  logger.log('ConfirmView mounted');
  initMainWindowMessageListener();
});

onUnmounted(() => {
  logger.log('ConfirmView unmounted');
  if (messageEventTimerId) {
    clearTimeout(messageEventTimerId);
  }
  if (window.mainWindowPortInConfirm) {
    window.mainWindowPortInConfirm.removeEventListener('message', onMessage);
  }
});
</script>

<style lang="scss" scoped>
@import './assets/global.scss';

.tui-live-kit-confirm {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 0.5rem 1rem;
  color: $font-sub-window-color;
  background-color: var(--bg-color-dialog);

  .tui-confirm-header {
    display: flex;
    justify-content: space-between;
    height: 2.5rem;
    line-height: 2.5rem;
    font-size: 1rem;
    font-weight: bold;

    .tui-confirm-header-button {
      padding: 0;
      background: none;
      border: none;
    }
  }

  .tui-confirm-content {
    padding: 0 0.5rem;
    font-size: 0.8rem;
  }

  .tui-confirm-footer {
    height: 2.5rem;
    line-height: 2.5rem;
    text-align: right;
    font-size: 1rem;

    .tui-confirm-window-button {
      width: auto;
      min-width: 5rem;
      margin-right: 1rem;
      padding: 0.3125rem 0.75rem;

      &:hover {
        background: none;
      }

      &.tui-live-button-normal {
        background: none;
      }

      &.tui-live-button-dangerous {
        color: $color-error;
        border-color: $color-error;
      }

      &.tui-live-button-more-dangerous {
        background-color: $color-error;
        color: $color-white;
        border-color: $color-error;
      }
    }
  }
}
</style>
