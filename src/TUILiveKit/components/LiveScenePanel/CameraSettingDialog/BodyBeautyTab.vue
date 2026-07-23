<template>
  <!--
    Body beauty / 美体 (瘦身/长腿/瘦肩 …). Per-item strength sliders gated by a
    group switch. Independent tab component sharing only the atoms.
  -->
  <div class="body-beauty-tab" :class="{ 'is-disabled': !enabled }">
    <div class="tab-header">
      <GroupSwitch :model-value="enabled" @update:model-value="onToggle" />
      <span class="enable-text" @click="onToggle(!enabled)">
        {{ enabled ? t('Disable') : t('Enable') }}{{ groupLabel }}
      </span>
    </div>
    <div class="row-list">
      <IntensityRow
        v-for="item in items"
        :key="String(item.effKey)"
        :detail="item"
        :value="getValueFor(item)"
        @change="(v) => onChange(item, v)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useUIKit } from '@tencentcloud/uikit-base-component-vue3';
import IntensityRow from './IntensityRow.vue';
import GroupSwitch from './GroupSwitch.vue';

/* eslint-disable @typescript-eslint/no-explicit-any */

const GROUP_KEY = 'bodyBeauty';

const { t } = useUIKit();

const props = defineProps<{
  groupLabel: string;
  items: Array<Record<string, any>>;
  enabled: boolean;
}>();

const emit = defineEmits<{
  (e: 'intensity-change', detail: Record<string, any>, value: number): void;
  (e: 'toggle-enabled', groupKey: string, enabled: boolean): void;
}>();

const getValueFor = (item: Record<string, any>): number => {
  const min = typeof item.minValue === 'number' ? item.minValue : 0;
  const v = item.effValue;
  return typeof v === 'number' ? v : min;
};

const onChange = (item: Record<string, any>, v: number) => {
  if (!props.enabled) return;
  emit('intensity-change', item, v);
};

const onToggle = (next: boolean) => {
  emit('toggle-enabled', GROUP_KEY, next);
};
</script>

<style lang="scss" scoped>
.body-beauty-tab {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.tab-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--stroke-color-module);
  flex-shrink: 0;
}

.enable-text {
  color: var(--text-color-secondary);
  font-size: 13px;
  cursor: pointer;
  user-select: none;

  &:hover {
    color: var(--text-color-primary);
  }
}

.row-list {
  flex: 1 1 auto;
  overflow-y: auto;
  padding: 8px 0;
}

.is-disabled .row-list {
  opacity: 0.45;
  pointer-events: none;
}
</style>
