<template>
  <!--
    Motion / 动效. Three sub-groups (2D / 3D / Hand) rendered inline with group
    headings so the user sees all at once. Selection is single-pick across the
    whole tab — the effectStore clears any prior pick in the other groups.
    Independent tab; the tile grid itself is the shared PickGrid atom.
  -->
  <div class="motion-tab">
    <!-- Scrollable region: the effect-tip below is kept out of it so it stays
         pinned to the panel bottom instead of scrolling with the groups. -->
    <div class="scroll-area">
      <template v-for="(sg, idx) in subGroups" :key="sg.label || idx">
        <div v-if="sg && Array.isArray(sg.details) && sg.details.length > 0" class="motion-group">
          <div class="motion-group-title">{{ resolveLabel(sg) }}</div>
          <PickGrid :items="sg.details" @pick="onPick" />
        </div>
      </template>
    </div>
    <div class="effect-tip">{{ t('Note') }}: {{ t('Applying will clear style makeup and virtual background effects') }}</div>
  </div>
</template>

<script setup lang="ts">
import { useUIKit } from '@tencentcloud/uikit-base-component-vue3';
import PickGrid from './PickGrid.vue';
import { useEffectLabel } from './useEffectLabel';

/* eslint-disable @typescript-eslint/no-explicit-any */

const { t } = useUIKit();
const resolveLabel = useEffectLabel();

defineProps<{
  /** effectConstant.motion.details — sub-groups { label, details: [...] }. */
  subGroups: Array<{ label?: string; details?: Array<Record<string, any>> }>;
}>();

const emit = defineEmits<{
  (e: 'pick', detail: Record<string, any> | null): void;
}>();

const onPick = (detail: Record<string, any> | null) => emit('pick', detail);
</script>

<style lang="scss" scoped>
.motion-tab {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.scroll-area {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: 4px 0 12px;
}

.effect-tip {
  flex-shrink: 0;
  padding: 8px 12px;
  color: var(--text-color-secondary);
  font-size: 12px;
  line-height: 1.4;
}

.motion-group {
  flex-shrink: 0;
  margin-top: 8px;
}

.motion-group-title {
  color: var(--text-color-secondary);
  font-size: 13px;
  font-weight: 500;
  padding: 8px 12px;
}
</style>
