<template>
  <!--
    Light makeup / 轻美妆. Unlike studio makeup, a light-makeup preset is a bundle
    (lut + several beauty.faceFeature* components). It therefore exposes TWO
    sliders for the picked preset:
      - overall strength → scales the whole bundle (maps to the picked item's
        effValue, same native channel as studio makeup).
      - filter strength  → scales ONLY the bundle's lut component (maps to the
        picked item's `lutStrength`, surfaced to native as `makeupLutStrength`).
    This second slider is exactly the per-category difference that justifies
    giving light makeup its own tab instead of reusing AdvancedMakeupTab.
    Shares the PickGrid / IntensityRow atoms.
  -->
  <div class="light-makeup-tab">
    <PickGrid :items="items" @pick="onPick" />
    <div v-if="pickedItem" class="picked-intensity">
      <IntensityRow :detail="overallDetail" :value="overallValue" @change="onOverallChange" />
      <!--
        The filter(lut)-only strength slider is shown ONLY for presets that
        declare `extraInfo.markupLutSupport === true`. Presets without lut
        support (markupLutSupport === false / undefined) never expose this
        slider, so the user cannot tune a component the bundle does not have.
      -->
      <IntensityRow
        v-if="showLutStrength"
        :detail="lutDetail"
        :value="lutValue"
        @change="onLutChange"
      />
    </div>
    <div class="effect-tip">{{ t('Note') }}: {{ t('Applying will clear filter and point makeup effects') }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useUIKit } from '@tencentcloud/uikit-base-component-vue3';
import PickGrid from './PickGrid.vue';
import IntensityRow from './IntensityRow.vue';

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Fallback strength when a freshly-picked preset hasn't been tuned yet. */
const DEFAULT_STRENGTH = 50;

const { t } = useUIKit();

const props = defineProps<{
  /** details[] from effectConstant.lightMakeup. */
  items: Array<Record<string, any>>;
}>();

const emit = defineEmits<{
  (e: 'pick', detail: Record<string, any> | null): void;
  /** Overall bundle strength change (target is the picked preset). */
  (e: 'intensity-change', detail: Record<string, any>, value: number): void;
  /** Filter(lut)-only strength change (target is the picked preset). */
  (e: 'lut-strength-change', detail: Record<string, any>, value: number): void;
}>();

const pickedItem = computed<Record<string, any> | null>(() => {
  // Exclude the "无" sentinel (effKey === 'None'): it ships with a label of
  // 「无」 and a resPath (LightCore template), so it is NOT caught by the grid's
  // generic none-detection and ends up flagged isSelected when picked. Without
  // this guard the two strength sliders would surface even though no real preset
  // is active. The store still routes the sentinel through its clear branch.
  return props.items.find((it) => it.isSelected && String(it.effKey ?? '') !== 'None') ?? null;
});

/**
 * Whether the picked preset exposes a filter(lut) component and therefore the
 * "滤镜强度" slider. Driven by `extraInfo.markupLutSupport` injected in
 * `beauty.ts` and transparently passed through by the plugin. Presets without
 * lut support never show the slider.
 */
const showLutStrength = computed<boolean>(() => {
  return pickedItem.value?.extraInfo?.markupLutSupport === true;
});

// Synthetic, display-only details for the two sliders. Their labels/ranges are
// fixed here; the value mutations always target the REAL picked preset via the
// emitted events, so these objects never need to be the source of truth.
// Carry the picked preset's icon so both rows render its thumbnail on the left
// instead of the generic placeholder square.
const overallDetail = computed(() => ({ label: t('Makeup Strength'), minValue: 0, maxValue: 100, icon: pickedItem.value?.icon }));
const lutDetail = computed(() => ({ label: t('Filter Strength'), minValue: 0, maxValue: 100, icon: pickedItem.value?.icon }));

const overallValue = computed<number>(() => {
  const v = pickedItem.value?.effValue;
  return typeof v === 'number' ? v : DEFAULT_STRENGTH;
});

const lutValue = computed<number>(() => {
  const v = pickedItem.value?.lutStrength;
  return typeof v === 'number' ? v : DEFAULT_STRENGTH;
});

const onPick = (detail: Record<string, any> | null) => emit('pick', detail);

const onOverallChange = (v: number) => {
  if (!pickedItem.value) return;
  emit('intensity-change', pickedItem.value, v);
};

const onLutChange = (v: number) => {
  if (!pickedItem.value) return;
  emit('lut-strength-change', pickedItem.value, v);
};
</script>

<style lang="scss" scoped>
.light-makeup-tab {
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
