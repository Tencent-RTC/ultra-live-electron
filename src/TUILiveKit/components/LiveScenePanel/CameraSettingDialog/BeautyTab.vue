<template>
  <!--
    Basic beauty (磨皮/美白/红润 …). Per-item strength sliders gated by a group
    switch in the header. Independent tab component (no cross-category reuse) so
    it can diverge freely; shares only the IntensityRow / GroupSwitch atoms.
  -->
  <div class="beauty-tab" :class="{ 'is-disabled': !enabled }">
    <div class="tab-header">
      <GroupSwitch :model-value="enabled" @update:model-value="onToggle" />
      <span class="enable-text" @click="onToggle(!enabled)">
        {{ enabled ? t('Disable') : t('Enable') }}{{ groupLabel }}
      </span>
    </div>
    <div class="row-list">
      <IntensityRow
        v-for="item in visibleItems"
        :key="String(item.effKey)"
        :detail="item"
        :value="getValueFor(item)"
        @change="(v) => onChange(item, v)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useUIKit } from '@tencentcloud/uikit-base-component-vue3';
import IntensityRow from './IntensityRow.vue';
import GroupSwitch from './GroupSwitch.vue';

/* eslint-disable @typescript-eslint/no-explicit-any */

const GROUP_KEY = 'beauty';

/**
 * Whiten effects that are filtered out of the beauty list.
 *
 * BEAUTY_BLACK_1, BEAUTY_BLACK_2 and BEAUTY_SKIN_HIGHLIGHT are excluded because
 * their native rendering has poor cross-device compatibility and behaves
 * unstably, so they are hidden from the UI. Keyed by the xmagic plugin's stable
 * `labelKey` (not the localized label), so the filter is language-independent.
 */
const EXCLUDED_LABEL_KEYS = ['BEAUTY_BLACK_1', 'BEAUTY_BLACK_2', 'BEAUTY_SKIN_HIGHLIGHT'];

const { t } = useUIKit();

const props = defineProps<{
  /** Display label of the group, from effectConstant.beauty.label. */
  groupLabel: string;
  /** details[] from effectConstant.beauty. */
  items: Array<Record<string, any>>;
  /** Whether the group is enabled; when false all sliders are inert. */
  enabled: boolean;
}>();

const emit = defineEmits<{
  (e: 'intensity-change', detail: Record<string, any>, value: number): void;
  (e: 'toggle-enabled', groupKey: string, enabled: boolean): void;
}>();

/**
 * Beauty items to render, with the poorly-compatible whiten/tan effects
 * (美黑 / 小麦色) removed.
 */
const visibleItems = computed(() =>
  props.items.filter(item => !EXCLUDED_LABEL_KEYS.includes(String(item.labelKey)))
);

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
.beauty-tab {
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
