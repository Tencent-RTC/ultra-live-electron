<template>
  <div
    class="material-item"
    :class="{ active: isMaterialActive, 'show-dropdown': isMenuVisible }"
    @click="handleSelectMaterial"
  >
    <component class="material-icon" :is="getMaterialIcon(material.sourceType)" />
    <div class="material-info">
      <span class="material-name">{{ material.name }}</span>
    </div>
    <div class="material-controls">
      <!-- Mirror control only for camera type -->
      <div
        class="control-button mirror-control"
        @click.stop="toggleMirror"
      >
        <svg-icon
          :icon="
            material.mirrorType === TRTCVideoMirrorType.TRTCVideoMirrorType_Enable ? CameraMirror : CameraUnMirror
          "
        />
      </div>
      <div
        class="control-button more-control"
        v-click-outside="handleClickOutsideMenu"
        @click.stop="handleToggleMenu"
      >
        <MoreIcon />
        <div
          class="dropdown-menu"
          v-if="isMenuVisible"
          @click.stop
        >
          <div
            class="dropdown-item"
            :class="{ disabled: control.disabled }"
            v-for="control in getMaterialControls(material.sourceType)"
            :key="control.key"
            @click="handleControlClick(control, material)"
          >
            <span class="dropdown-label">{{ control.label }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount } from 'vue';
import { TRTCMediaSourceType, TRTCVideoMirrorType } from '@tencentcloud/tuiroom-engine-electron';
import { IconEdit, IconSetting, IconDelIcon, useUIKit } from '@tencentcloud/uikit-base-component-vue3';
import { useVideoMixerState, MediaSource } from 'tuikit-atomicx-vue3-electron';
import SvgIcon from '../../../base-component/SvgIcon.vue';
import CameraMirror from './icons/CameraMirror.vue';
import CameraUnMirror from './icons/CameraUnmirror.vue';
import ImageIcon from './icons/ImageIcon.vue';
import ScreenIcon from './icons/ScreenIcon.vue';
import MoreIcon from './icons/MoreIcon.vue';
import CameraIcon from './icons/CameraIcon.vue';
import vClickOutside from '../../../utils/vClickOutside';

const { t } = useUIKit();

const props = defineProps<{
  material: MediaSource;
  isMenuVisible?: boolean;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  isMoving?: boolean;
}>();

const emits = defineEmits<{
  select: [material: MediaSource];
  toggleMenu: [material: MediaSource];
  closeMenu: [];
  moveUp: [material: MediaSource];
  moveDown: [material: MediaSource];
  cameraSetting: [material: MediaSource];
  rename: [material: MediaSource];
}>();

type SceneMenuSyncDetail = {
  type: 'open-add-menu' | 'open-material-menu';
  sourceType?: TRTCMediaSourceType;
  sourceId?: string | number;
};

const SCENE_MENU_SYNC_EVENT = 'live-scene-panel:menu-sync';

const { updateMediaSource, removeMediaSource, activeMediaSource } = useVideoMixerState();

const getMaterialKey = (source: Partial<MediaSource> | null | undefined) => `${source?.sourceType ?? ''}::${source?.sourceId ?? ''}`;
const isMaterialActive = computed(() => getMaterialKey(activeMediaSource.value) === getMaterialKey(props.material));
const materialKey = computed(() => getMaterialKey(props.material));

function toggleMirror() {
  const currentMirror = props.material?.mirrorType;
  const newMirror =
    currentMirror === TRTCVideoMirrorType.TRTCVideoMirrorType_Enable
      ? TRTCVideoMirrorType.TRTCVideoMirrorType_Disable
      : TRTCVideoMirrorType.TRTCVideoMirrorType_Enable;
  updateMediaSource(props.material, {
    mirrorType: newMirror,
  });
}

const handleSelectMaterial = () => {
  emits('select', props.material);
};

const handleToggleMenu = () => {
  if (!props.isMenuVisible) {
    window.dispatchEvent(
      new CustomEvent<SceneMenuSyncDetail>(SCENE_MENU_SYNC_EVENT, {
        detail: {
          type: 'open-material-menu',
          sourceType: props.material.sourceType,
          sourceId: props.material.sourceId,
        },
      }),
    );
  }
  emits('toggleMenu', props.material);
};

const handleClickOutsideMenu = () => {
  if (!props.isMenuVisible) {
    return;
  }
  emits('closeMenu');
};

const getMaterialIcon = (mediaSourceType: TRTCMediaSourceType) => {
  const iconMap = {
    [TRTCMediaSourceType.kCamera]: CameraIcon,
    [TRTCMediaSourceType.kImage]: ImageIcon,
    [TRTCMediaSourceType.kScreen]: ScreenIcon,
  };
  return iconMap[mediaSourceType];
};

const renameMaterial = (material: MediaSource) => {
  emits('rename', material);
};

const moveMaterialUp = (material: MediaSource) => {
  emits('moveUp', material);
};

const moveMaterialDown = (material: MediaSource) => {
  emits('moveDown', material);
};

type MaterialControlItem = {
  key: string;
  label: string;
  icon: unknown;
  onClick: (material: MediaSource) => void | Promise<void>;
  dangerous?: boolean;
  disabled?: boolean;
};

const getMaterialControls = (mediaSourceType: TRTCMediaSourceType) => {
  const orderControls: MaterialControlItem[] = [
    {
      key: 'move-up',
      label: t('Move up'),
      icon: IconSetting,
      onClick: moveMaterialUp,
      disabled: !props.canMoveUp,
    },
    {
      key: 'move-down',
      label: t('Move down'),
      icon: IconSetting,
      onClick: moveMaterialDown,
      disabled: !props.canMoveDown,
    },
  ];

  const commonControls: MaterialControlItem[] = [
    {
      key: 'rename',
      label: t('Rename'),
      icon: IconEdit,
      onClick: renameMaterial,
    },
    {
      key: 'delete',
      label: t('Delete'),
      icon: IconDelIcon,
      onClick: handleDeleteMaterial,
      dangerous: true,
    },
  ];

  const cameraControls = [
    {
      key: 'setting',
      label: t('Settings'),
      icon: IconSetting,
      onClick: handleCameraSetting,
    },
    ...orderControls,
    ...commonControls,
  ];

  const screenShareControls = [...orderControls, ...commonControls];

  const controlsMap = {
    [TRTCMediaSourceType.kCamera]: cameraControls,
    [TRTCMediaSourceType.kScreen]: screenShareControls,
  };

  return controlsMap[mediaSourceType] || [...orderControls, ...commonControls];
};

const handleDeleteMaterial = async (material: MediaSource) => {
  try {
    await removeMediaSource(material);
  } catch (error) {
    console.error('[LiveScenePanel] removeMediaSource failed:', error, material);
  }
};

const handleCameraSetting = (material: MediaSource) => {
  emits('cameraSetting', material);
};

const handleControlClick = async (control: MaterialControlItem, material: MediaSource) => {
  if (props.isMoving || control.disabled) {
    return;
  }
  try {
    await control.onClick(material);
  } finally {
    emits('closeMenu');
  }
};

const handleSceneMenuSync = (event: Event) => {
  if (!props.isMenuVisible) {
    return;
  }
  const detail = (event as CustomEvent<SceneMenuSyncDetail>).detail;
  if (!detail) {
    return;
  }
  if (detail.type === 'open-add-menu') {
    emits('closeMenu');
    return;
  }
  if (detail.type === 'open-material-menu') {
    const targetKey = `${detail.sourceType ?? ''}::${detail.sourceId ?? ''}`;
    if (targetKey !== materialKey.value) {
      emits('closeMenu');
    }
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
.material-item {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  margin-bottom: 6px;
  cursor: pointer;
  padding: 4px 8px;
  isolation: isolate;
  z-index: 1;
  &.show-dropdown {
    z-index: 3000;
  }

  &.active {
    background: rgba(92, 122, 255, 0.2);
    border: 1px solid rgba(92, 122, 255, 0.65);
    border-radius: 8px;
  }

  .material-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    color: #d5e0f2;
    transition: all 0.2s ease;
    margin-right: 10px;
  }

  .material-info {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    margin-right: 10px;
    height: 20px;

    .material-name {
      font-size: 14px;
      font-weight: 500;
      color: #d5e0f2;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      line-height: 20px;
    }
  }

  .material-controls {
    display: flex;
    align-items: center;
  }

  .control-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 6px;
    color: #d5e0f2;
    cursor: pointer;
    transition: all 0.2s ease;
    &:not(:last-child) {
      margin-right: 8px;
    }
    &:hover {
      background: rgba(255, 255, 255, 0.2);
    }
  }

  .dropdown-menu {
    position: absolute;
    top: 100%;
    right: 0;
    margin-top: 8px;
    padding: 4px;
    min-width: 100px;
    background: #2d323e;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
    z-index: 3001;
    isolation: isolate;
    overflow: hidden;
    animation: fadeInScale 0.15s ease-out;

    &::before {
      content: '';
      position: absolute;
      top: -6px;
      right: 12px;
      width: 0;
      height: 0;
      border-left: 6px solid transparent;
      border-right: 6px solid transparent;
      border-bottom: 6px solid #2d323e;
    }
  }

  .dropdown-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    color: #d5e0f2;
    cursor: pointer;
    transition: all 0.2s ease;
    border-radius: 4px;
    &:hover {
      background: rgba(209, 217, 236, 0.1);
    }

    &.disabled {
      opacity: 0.5;
      cursor: not-allowed;
      &:hover {
        background: transparent;
      }
    }
  }

  .dropdown-icon {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  }

  .dropdown-label {
    font-size: 13px;
    font-weight: 400;
    line-height: 1.4;
  }
}

@keyframes fadeInScale {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(-8px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
</style>
