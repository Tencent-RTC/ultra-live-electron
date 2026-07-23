<template>
  <!--
    Virtual background / 虚拟背景. Pure single-pick using wide (landscape) tiles.
    Selection drives activation; no strength slider, no group switch.
  -->
  <div class="segment-tab">
    <PickGrid :items="items" item-shape="wide" @pick="onPick" />
    <div class="effect-tip">
      {{ t('Note') }}: {{ t('Applying will clear style makeup and motion effects') }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { useUIKit } from '@tencentcloud/uikit-base-component-vue3';
import PickGrid from './PickGrid.vue';

/* eslint-disable @typescript-eslint/no-explicit-any */

const { t } = useUIKit();

defineProps<{
  /** details[] from effectConstant.segment. */
  items: Array<Record<string, any>>;
}>();

const emit = defineEmits<{
  /** Pick a background, or `null` to clear (原图 tile / re-click). */
  (e: 'pick', detail: Record<string, any> | null): void;
}>();

const onPick = (detail: Record<string, any> | null) => emit('pick', detail);
</script>

<style lang="scss" scoped>
.segment-tab {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.effect-tip {
  flex-shrink: 0;
  padding: 8px 12px;
  color: var(--text-color-secondary);
  font-size: 12px;
  line-height: 1.4;
}
</style>
