<template>
  <div v-if="displayMode === 'panel'" class="live-scene-placeholder">
    <div class="live-scene-placeholder-content">
      <span class="placeholder-tips">{{ t('We support you to add rich sources') }}</span>
      <div class="add-material-list">
        <div
          v-for="item in defaultMaterialList"
          :key="item.title"
          class="add-material-item"
          @click="handleAddMaterial(item.type)"
        >
          <svg-icon :icon="item.icon" class="icon-container" />
          <span>{{ item.title }}</span>
        </div>
      </div>
    </div>
  </div>
  <div
    v-if="displayMode === 'button'"
    class="live-scene-button"
    v-click-outside="handleClickOutsideDropdown"
  >
    <div class="add-material-button" @click.stop="handleToggleDropdown">
      <svg-icon :icon="AddIcon" class="icon-container" />
      <span>{{ t('Add') }}</span>
    </div>
    <transition name="dropdown">
      <div v-show="isDropdownVisible" class="add-material-list">
        <div
          v-for="item in defaultMaterialList"
          :key="item.title"
          class="add-material-item"
          @click="handleAddMaterial(item.type)"
        >
          <svg-icon :icon="item.icon" class="icon-container" />
          <span>{{ item.title }}</span>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { TRTCMediaSourceType } from '@tencentcloud/tuiroom-engine-electron';
import { useUIKit } from '@tencentcloud/uikit-base-component-vue3';
import SvgIcon from '../../../base-component/SvgIcon.vue';
import AddIcon from './icons/AddIcon.vue';
import CameraIcon from './icons/CameraIcon.vue';
import ImageIcon from './icons/ImageIcon.vue';
import ScreenIcon from './icons/ScreenIcon.vue';
import vClickOutside from '../../../utils/vClickOutside';

const { t } = useUIKit();

const props = defineProps<{
  displayMode: 'panel' | 'button';
}>();
const emits = defineEmits(['addMaterial']);

type SceneMenuSyncDetail = {
  type: 'open-add-menu' | 'open-material-menu';
};

const SCENE_MENU_SYNC_EVENT = 'live-scene-panel:menu-sync';

const defaultMaterialList = computed(() => [
  { icon: CameraIcon, title: t('Add Camera'), type: TRTCMediaSourceType.kCamera },
  { icon: ScreenIcon, title: t('Add Screen Share'), type: TRTCMediaSourceType.kScreen },
  { icon: ImageIcon, title: t('Add Image'), type: TRTCMediaSourceType.kImage },
]);

const isDropdownVisible = ref(false);

const handleAddMaterial = (type: TRTCMediaSourceType) => {
  emits('addMaterial', type);
  if (props.displayMode === 'button') {
    isDropdownVisible.value = false;
  }
};

const handleToggleDropdown = () => {
  const shouldOpen = !isDropdownVisible.value;
  if (shouldOpen) {
    window.dispatchEvent(
      new CustomEvent<SceneMenuSyncDetail>(SCENE_MENU_SYNC_EVENT, {
        detail: { type: 'open-add-menu' },
      }),
    );
  }
  isDropdownVisible.value = shouldOpen;
};

const handleClickOutsideDropdown = () => {
  isDropdownVisible.value = false;
};

const handleSceneMenuSync = (event: Event) => {
  const detail = (event as CustomEvent<SceneMenuSyncDetail>).detail;
  if (detail?.type === 'open-material-menu') {
    isDropdownVisible.value = false;
  }
};

onMounted(() => {
  window.addEventListener(SCENE_MENU_SYNC_EVENT, handleSceneMenuSync);
});

onBeforeUnmount(() => {
  window.removeEventListener(SCENE_MENU_SYNC_EVENT, handleSceneMenuSync);
});

</script>

<style scoped lang="scss">
.live-scene-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  height: 100%;

  .live-scene-placeholder-content {
    width: 100%;
  }

  .placeholder-tips {
    display: block;
    width: 100%;
    color: rgba(255, 255, 255, 0.55);
    font-size: 14px;
    line-height: 22px;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .add-material-list {
    margin-top: 50px;
    width: 100%;
    .add-material-item {
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 40px;
      border-radius: 20px;
      background-color: #383f4d;
      color: var(--text-color-primary);
      font-size: 12px;
      font-weight: 400;
      margin-top: 24px;
      cursor: pointer;
      gap: 4px;
      &:hover {
        background-color: #4f586b;
      }
    }
  }
}

.live-scene-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  position: relative;
  z-index: 2000;

  .add-material-button {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 40px;
    border-radius: 20px;
    background-color: #383f4d;
    color: var(--text-color-primary);
    font-size: 12px;
    font-weight: 400;
    cursor: pointer;
    gap: 4px;
    transition: background-color 0.2s ease;

    &:hover {
      background-color: #4f586b;
    }
  }

  .add-material-list {
    width: 100%;
    padding: 9px;
    position: absolute;
    right: 0;
    top: calc(100% + 10px);
    z-index: 2001;
    border-radius: 8px;
    background-color: #2d323e;
    border: 1px solid rgba(255, 255, 255, 0.1);
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
    isolation: isolate;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);

    .add-material-item {
      display: flex;
      justify-content: center;
      align-items: center;
      width: 100%;
      height: 40px;
      color: #d5e0f2;
      font-size: 12px;
      font-weight: 400;
      border-radius: 4px;
      cursor: pointer;
      transition: background-color 0.2s ease;
      gap: 4px;

      &:hover {
        background-color: rgba(209, 217, 236, 0.1);
      }
    }
  }
}

// 下拉动画效果
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.3s ease;
}

.dropdown-enter-from {
  opacity: 0;
  transform: translateY(-10px) scale(0.95);
}

.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(0.95);
}

.dropdown-enter-to,
.dropdown-leave-from {
  opacity: 1;
  transform: translateY(0) scale(1);
}
</style>
