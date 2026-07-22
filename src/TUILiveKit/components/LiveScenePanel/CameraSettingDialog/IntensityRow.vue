<template>
  <div class="intensity-row">
    <img v-if="detail.icon" :src="detail.icon" class="row-icon" alt="" @error="onIconError" />
    <div v-else class="row-icon row-icon-placeholder" />
    <span class="row-label" :title="resolveLabel(detail)">{{ resolveLabel(detail) }}</span>
    <TUISlider
      class="row-slider"
      :model-value="value"
      :min="min"
      :max="max"
      :step="1"
      @update:model-value="onSliderChange"
    />
    <span class="row-value">{{ value }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { TUISlider } from '@tencentcloud/uikit-base-component-vue3';
import { useEffectLabel } from './useEffectLabel';

/* eslint-disable @typescript-eslint/no-explicit-any */

const resolveLabel = useEffectLabel();

const props = defineProps<{
  detail: Record<string, any>;
  /** Live slider value; may be the user-tweaked one or the detail default. */
  value: number;
}>();

const emit = defineEmits<{
  (e: 'change', value: number): void;
}>();

const min = computed<number>(() => (typeof props.detail?.minValue === 'number' ? props.detail.minValue : 0));
const max = computed<number>(() => (typeof props.detail?.maxValue === 'number' ? props.detail.maxValue : 100));

const onSliderChange = (v: number) => {
  // TUISlider may emit numeric or stringly-typed value depending on impl;
  // coerce explicitly so downstream comparisons are stable.
  const num = Number(v);
  if (Number.isNaN(num)) return;
  emit('change', num);
};

const onIconError = (event: Event) => {
  // If the icon resource isn't accessible (rare; mostly when xmagic resources
  // haven't been deployed), hide the broken image rather than show a 1x1
  // pixel artifact. We can't fall back to the placeholder div in-place
  // without a v-if branch, so just zero out the src.
  const target = event.target as HTMLImageElement | null;
  if (target) target.style.visibility = 'hidden';
};
</script>

<style lang="scss" scoped>
.intensity-row {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 40px;
  padding: 4px 8px;
  border-radius: 6px;

  &:hover {
    background-color: var(--bg-color-bubble-reciprocal);
  }
}

.row-icon {
  flex: 0 0 24px;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  background-color: var(--bg-color-entrycard);
}

.row-icon-placeholder {
  background: linear-gradient(135deg, #555 0%, #333 100%);
}

.row-label {
  flex: 0 0 110px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-color-primary);
  font-size: 13px;
}

.row-slider {
  flex: 1 1 auto;
  min-width: 100px;
}

.row-value {
  flex: 0 0 36px;
  text-align: right;
  color: var(--text-color-secondary);
  font-variant-numeric: tabular-nums;
  font-size: 13px;
}
</style>
