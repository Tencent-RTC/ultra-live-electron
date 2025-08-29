<template>
  <div class="tui-live-kit-confirm dark-theme">
    <div class="tui-confirm-header">
      <div class="tui-confirm-title">{{ title }}</div>
      <div class="tui-confirm-close">
        <tui-button class="tui-confirm-header-button" @click="onCancel">
          <CloseIcon />
        </tui-button>
      </div>
    </div>
    <div class="tui-confirm-content">
      {{ content }}
    </div>
    <div class="tui-confirm-footer">
      <tui-button class="tui-confirm-button tui-confirm-cancel" @click="onCancel">{{ t('Cancel') }}</tui-button>
      <tui-button class="tui-confirm-button" @click="onConfirm">{{ t('Confirm') }}</tui-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { Ref } from 'vue';
import TuiButton from './common/base/Button.vue';
import CloseIcon from './common/icons/CloseIcon.vue';
import { useI18n } from './locales';
import logger from './utils/logger';

const title: Ref<string> = ref('');
const content: Ref<string> = ref('');

const { t } = useI18n();

function clear() {
  title.value = '';
  content.value = '';
}

function onConfirm() {
  logger.log('onConfirm');
  window.ipcRenderer.send('stop-living-result', {
    confirm: true,
  });
  clear();
}

function onCancel() {
  logger.log('onCancel');
  window.ipcRenderer.send('stop-living-result', {
    confirm: false,
  });
  clear();
}

window.ipcRenderer.on('stop-living', (event: any, args: Record<string, string>) => {
  title.value = args.title || '';
  content.value = args.content || '';
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
  background-color: $color-black;

  .tui-confirm-header {
    display: flex;
    justify-content: space-between;
    height: 2.5rem;
    line-height: 2.5rem;
    font-size: 1rem;
    font-weight: bold;

    .tui-confirm-header-button {
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
    text-align: center;
    font-size: 1rem;

    .tui-confirm-button {
      width: 5rem;
      margin: 0 1rem;

      &.tui-confirm-cancel {
        background: none;
      }
    }
  }
}
</style>
