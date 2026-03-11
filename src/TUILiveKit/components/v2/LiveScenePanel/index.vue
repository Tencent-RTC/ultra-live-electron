<template>
  <div class="live-scene-panel" :class="{ 'no-material': mediaSourceList.length === 0 }">
    <LiveSceneSelect :displayMode="mediaSourceList.length === 0 ? 'panel' : 'button'" @add-material="selectMaterial" />
    <div class="materials-list">
      <template v-for="material in mediaSourceListWithZOrderSort" :key="getMaterialKey(material)">
        <MaterialItem
          :material="material"
          :is-menu-visible="visibleMenuKey === getMaterialKey(material)"
          :can-move-up="canMoveUp(material)"
          :can-move-down="canMoveDown(material)"
          :is-moving="movingKey === getMaterialKey(material)"
          @select="handleSelectMaterial"
          @toggle-menu="handleToggleMenu"
          @close-menu="handleCloseMenu"
          @move-up="handleMoveMaterialUp"
          @move-down="handleMoveMaterialDown"
          @camera-setting="updateCameraSetting(material)"
          @rename="updateMaterialName(material)"
        />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { TRTCMediaSourceType } from '@tencentcloud/tuiroom-engine-electron';
import { TUIToast, TOAST_TYPE, useUIKit } from '@tencentcloud/uikit-base-component-vue3';
import { useVideoMixerState } from 'tuikit-atomicx-vue3-electron';
import LiveSceneSelect from './LiveSceneSelect.vue';
import MaterialItem from './MaterialItem.vue';
import type { MediaSource } from '../../types';

const { t } = useUIKit();
const {
  addMediaSource,
  mediaSourceList,
  updateMediaSource,
} = useVideoMixerState();

const emits = defineEmits(['on-add-camera', 'on-add-screen-share', 'on-update-material', 'on-rename-material']);

const mediaSourceListWithZOrderSort = computed(() => [...mediaSourceList.value].sort(
  (item1: MediaSource, item2: MediaSource) => (item2.zOrder || 0) - (item1.zOrder || 0),
));

const visibleMenuKey = ref('');
const movingKey = ref('');

const getMaterialKey = (material: MediaSource) => `${material.sourceType}::${material.sourceId}`;

const handleSelectMaterial = async (material: MediaSource) => {
  visibleMenuKey.value = '';
  const targetKey = getMaterialKey(material);
  const unselectTargets = mediaSourceList.value.filter(item => item.isSelected && getMaterialKey(item) !== targetKey);
  for (const item of unselectTargets) {
    await updateMediaSource(item, { isSelected: false });
  }

  const target = mediaSourceList.value.find(item => getMaterialKey(item) === targetKey);
  if (target && !target.isSelected) {
    await updateMediaSource(target, { isSelected: true });
  }
};

const handleToggleMenu = (material: MediaSource) => {
  const key = getMaterialKey(material);
  visibleMenuKey.value = visibleMenuKey.value === key ? '' : key;
};

const handleCloseMenu = () => {
  visibleMenuKey.value = '';
};

const canMoveUp = (material: MediaSource) => {
  const key = getMaterialKey(material);
  const index = mediaSourceListWithZOrderSort.value.findIndex(item => getMaterialKey(item) === key);
  return index > 0;
};

const canMoveDown = (material: MediaSource) => {
  const key = getMaterialKey(material);
  const index = mediaSourceListWithZOrderSort.value.findIndex(item => getMaterialKey(item) === key);
  return index >= 0 && index < mediaSourceListWithZOrderSort.value.length - 1;
};

const getMaterialByKey = (key: string) => mediaSourceList.value.find(item => getMaterialKey(item) === key);

const swapMaterialZOrder = async (material: MediaSource, moveDelta: -1 | 1) => {
  const key = getMaterialKey(material);
  if (movingKey.value) {
    return;
  }
  const currentIndex = mediaSourceListWithZOrderSort.value.findIndex(item => getMaterialKey(item) === key);
  if (currentIndex < 0) {
    return;
  }

  const neighborIndex = currentIndex + moveDelta;
  if (neighborIndex < 0 || neighborIndex >= mediaSourceListWithZOrderSort.value.length) {
    return;
  }

  const current = mediaSourceListWithZOrderSort.value[currentIndex];
  const neighbor = mediaSourceListWithZOrderSort.value[neighborIndex];
  const currentOldZOrder = current.zOrder || 0;
  const neighborOldZOrder = neighbor.zOrder || 0;

  movingKey.value = key;
  visibleMenuKey.value = '';

  try {
    await Promise.all([
      updateMediaSource(current, { zOrder: neighborOldZOrder }),
      updateMediaSource(neighbor, { zOrder: currentOldZOrder }),
    ]);
  } catch (error) {
    console.error('swapMaterialZOrder failed:', error);
    try {
      const currentLatest = getMaterialByKey(getMaterialKey(current));
      const neighborLatest = getMaterialByKey(getMaterialKey(neighbor));
      if (currentLatest && neighborLatest) {
        await Promise.all([
          updateMediaSource(currentLatest, { zOrder: currentOldZOrder }),
          updateMediaSource(neighborLatest, { zOrder: neighborOldZOrder }),
        ]);
      }
    } catch (rollbackError) {
      console.error('swapMaterialZOrder rollback failed:', rollbackError);
    }

    TUIToast({
      type: TOAST_TYPE.ERROR,
      message: t('Failed to adjust layer order'),
    });
  } finally {
    movingKey.value = '';
  }
};

const handleMoveMaterialUp = async (material: MediaSource) => {
  await swapMaterialZOrder(material, -1);
};

const handleMoveMaterialDown = async (material: MediaSource) => {
  await swapMaterialZOrder(material, 1);
};

const updateCameraSetting = (material: MediaSource) => {
  emits('on-update-material', material);
};

const updateMaterialName = (material: MediaSource) => {
  // 暂时仅透传事件，后续按重命名实现计划由上层决定是否走 child 窗口
  emits('on-rename-material', material);
};

const selectMaterial = async (type: TRTCMediaSourceType) => {
  switch (type) {
  case TRTCMediaSourceType.kCamera:
    emits('on-add-camera');
    break;
  case TRTCMediaSourceType.kScreen:
    emits('on-add-screen-share');
    break;
  case TRTCMediaSourceType.kImage:
    addImageMaterial();
    break;
  default:
    break;
  }
};

function addImageMaterial() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.jpg,.jpeg,.png,.bmp';
  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement)?.files?.[0];
    if (!file) {
      return;
    }

    // In Electron, file object has 'path' property with local file path
    const filePath = (file as any).path;
    if (!filePath) {
      console.warn('Failed to get file path');
      return;
    }

    // Create blob URL to load image and get dimensions
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.src = url;
    image.onload = async () => {
      const imageWidth = image.width;
      const imageHeight = image.height;
      const imageSourceInfo = {
        sourceId: filePath,
        sourceType: TRTCMediaSourceType.kImage,
        name: file.name || t('Image'),
        rect: {
          left: 0,
          top: 0,
          right: imageWidth,
          bottom: imageHeight,
        },
        zOrder: 1,
      };
      try {
        await addMediaSource(imageSourceInfo);
      } catch (error: any) {
        console.error('addImageMaterial error:', error);
        TUIToast({
          type: TOAST_TYPE.ERROR,
          message: t('Failed to add image'),
        });
      }

      URL.revokeObjectURL(url);
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      TUIToast({
        type: TOAST_TYPE.ERROR,
        message: t('Failed to load image'),
      });
    };
  };
  input.click();
}

</script>

<style lang="scss" scoped>
.live-scene-panel {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  width: 100%;
  height: 100%;

  &.no-material {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  * {
    box-sizing: border-box;
  }
}

.materials-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 20px;
  width: 100%;
}

.actions-section {
  display: flex;
  gap: 8px;
  border-radius: 6px;
  background: #1a1a1a;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;

  .add-material-btn {
    border: none;
    color: white;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;

    .add-icon {
      font-size: 14px;
      font-weight: bold;
    }
  }

  .clear-btn {
    color: red;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
  }
}
</style>
