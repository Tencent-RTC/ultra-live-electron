<template>
  <!--
    Studio makeup / 风格整妆. Single-pick grid plus a strength slider for the
    picked preset. Now serves ONLY this category (light makeup / filter have
    their own tabs), so it can evolve independently. Shares the PickGrid /
    IntensityRow atoms.
  -->
  <div class="advanced-makeup-tab">
    <PickGrid :items="items" @pick="onPick" />
    <div v-if="pickedItem && hasIntensity(pickedItem)" class="picked-intensity">
      <IntensityRow
        :detail="pickedItem"
        :value="pickedValue"
        @change="onIntensityChange"
      />
    </div>
    <div class="effect-tip">{{ t('Note') }}: {{ t('Applying will clear motion and virtual background effects') }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useUIKit } from '@tencentcloud/uikit-base-component-vue3';
import PickGrid from './PickGrid.vue';
import IntensityRow from './IntensityRow.vue';

/* eslint-disable @typescript-eslint/no-explicit-any */

const { t } = useUIKit();

const props = defineProps<{
  /** details[] from effectConstant.advancedMakeup. */
  items: Array<Record<string, any>>;
}>();

const emit = defineEmits<{
  (e: 'pick', detail: Record<string, any> | null): void;
  (e: 'intensity-change', detail: Record<string, any>, value: number): void;
}>();

const pickedItem = computed<Record<string, any> | null>(() => props.items.find((it) => it.isSelected) ?? null);

const pickedValue = computed<number>(() => {
  const item = pickedItem.value;
  if (!item) return 0;
  const min = typeof item.minValue === 'number' ? item.minValue : 0;
  const v = item.effValue;
  return typeof v === 'number' ? v : min;
});

function hasIntensity(item: Record<string, any>): boolean {
  return typeof item.minValue === 'number' && typeof item.maxValue === 'number';
}

const onPick = (detail: Record<string, any> | null) => emit('pick', detail);

const onIntensityChange = (v: number) => {
  if (!pickedItem.value) return;
  emit('intensity-change', pickedItem.value, v);
};
</script>

<style lang="scss" scoped>
.advanced-makeup-tab {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.picked-intensity {
  flex-shrink: 0;
  padding: 8px 12px 12px;
}

.effect-tip {
  flex-shrink: 0;
  padding: 8px 12px;
  color: var(--text-color-secondary);
  font-size: 12px;
  line-height: 1.4;
}



</style>
