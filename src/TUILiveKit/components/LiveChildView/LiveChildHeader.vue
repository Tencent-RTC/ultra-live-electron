<template>
  <div class="tui-window-header tui-child-window-header" >
      <span>{{ props.title }}</span>
      <button class="tui-icon" @click="handleCloseWindow">
        <svg-icon :icon="CloseIcon" class="tui-secondary-icon"></svg-icon>
      </button>
  </div>
</template>

<script setup lang="ts">
import { defineProps } from 'vue';
import SvgIcon from '../../common/base/SvgIcon.vue';
import CloseIcon from '../../common/icons/CloseIcon.vue';
import { useCurrentSourceStore } from '../../store/child/currentSource';

type Props = {
  title: string;
};

const props = defineProps<Props>();

const currentSourceStore = useCurrentSourceStore();

const handleCloseWindow = async () => {
  window.ipcRenderer.send('close-child');
  currentSourceStore.setCurrentViewName('');
};
</script>

<style scoped lang="scss">
@import '../../assets/global.scss';

.tui-child-window-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1.5rem 0 1.375rem;
  color: var(--text-color-primary);
  font-weight: bold;

  .close-icon {
    cursor: pointer;
  }
}

</style>
