<template>
  <!--
    Point makeup / 单点美妆. Split into independent parts (lipstick / blush /
    eyebrow …). Each part shows a color-card grid; the user picks ONE option per
    part and many parts can be active at once (parts are independent — several
    parts may be selected and take effect simultaneously). Every part's grid is
    prefixed with a "无效果" clear tile: picking it deselects the part, clearing
    that part's effect and collapsing its strength slider. Picking a color card
    reveals a strength slider so the shade can be dialed in — mirroring the
    mobile SDK, where a point-makeup effect starts at strength 0 and only takes
    visible effect once the user sets a strength via the slider.

    Interaction maps to the store's pointMakeup APIs:
      - pick(partKey, option | null)  -> pickMakeupOption
      - intensity-change(option, val) -> setMakeupIntensity
    `partKey` is the part node's stable `labelKey`. Independent tab; the tile
    grid itself is the shared PickGrid atom.
  -->
  <div class="point-makeup-tab">
    <!-- Scrollable region: the effect-tip below is kept out of it so it stays
         pinned to the panel bottom instead of scrolling with the parts. -->
    <div class="scroll-area">
      <template v-for="(part, idx) in parts" :key="part.labelKey || idx">
        <div v-if="part && Array.isArray(part.options) && part.options.length > 0" class="makeup-part">
          <div class="makeup-part-title">{{ resolveLabel(part) }}</div>
          <PickGrid :items="optionsWithClear(part)" @pick="(opt) => onPick(part, opt)" />
          <!--
            Show the strength slider for ANY selected color card. The strength
            entry must not depend on the option carrying explicit minValue/maxValue
            (the plugin doesn't always surface them on point-makeup cards); when
            absent, IntensityRow falls back to a 0–100 range. Selecting the
            prepended "无效果" clear tile deselects the part, so `pickedOption` is
            null and this whole row collapses (hiding the IntensityRow).
          -->
          <div v-if="pickedOption(part)" class="picked-intensity">
            <IntensityRow
              :detail="pickedOption(part)"
              :value="pickedValue(part)"
              @change="(v) => onIntensityChange(pickedOption(part), v)"
            />
          </div>
        </div>
      </template>
    </div>
    <div class="effect-tip">{{ t('Note') }}: {{ t('Applying will clear light makeup effects') }}</div>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue';
import PickGrid from './PickGrid.vue';
import IntensityRow from './IntensityRow.vue';
import { useUIKit } from '@tencentcloud/uikit-base-component-vue3';
import { useEffectLabel } from './useEffectLabel';

/* eslint-disable @typescript-eslint/no-explicit-any */

const { t } = useUIKit();
const resolveLabel = useEffectLabel();

/**
 * Parts whose "无效果" tile the user has explicitly picked. Mirrors the
 * filter / motion tabs, where the built-in "无效果" option only highlights AFTER
 * it is clicked — never by default. A part starts absent here (so its clear
 * tile is NOT selected on first render); it is added when the user clicks the
 * clear tile and removed once a real color card is picked again. Combined with
 * `!pickedOption(part)` this makes the clear tile highlight exactly while the
 * part sits in the user-cleared state.
 */
const clearedParts = reactive(new Set<string>());

defineProps<{
  /** effectConstant.makeup.details — parts, each { labelKey, label, options }. */
  parts: Array<Record<string, any>>;
}>();

const emit = defineEmits<{
  /** Pick / clear a color-card option under one part. */
  (e: 'pick', partKey: string, option: Record<string, any> | null): void;
  /** Change the strength of an already-selected option. */
  (e: 'intensity-change', option: Record<string, any>, value: number): void;
}>();

function partKeyOf(part: Record<string, any>): string {
  return String(part?.labelKey ?? '');
}

function pickedOption(part: Record<string, any>): Record<string, any> | null {
  const opts = part?.options;
  if (!Array.isArray(opts)) return null;
  return opts.find((o: Record<string, any>) => o.isSelected) ?? null;
}

/**
 * Prepend a synthetic "无效果" clear tile to a part's color cards. It reuses the
 * shared `none.png` icon so it looks identical to the "no effect" tile in the
 * filter / motion tabs. Carrying no resPath / extraValue, it is detected as the
 * "no effect" placeholder by PickGrid (matched by its label first), whose click
 * handler then emits `null` — routed to the store's
 * `pickMakeupOption(partKey, null)` to deselect the part (clearing its effect
 * and collapsing the strength slider). Like the filter / motion tabs, the tile
 * is NOT selected by default; it only highlights once the user has explicitly
 * picked it (tracked in `clearedParts`) while the part has no real selection.
 */
function optionsWithClear(part: Record<string, any>): Array<Record<string, any>> {
  const opts = Array.isArray(part?.options) ? part.options : [];
  const clearTile: Record<string, any> = {
    label: t('No Effect'),
    icon: './assets/beauty_panel/panel_icon/beauty/none.png',
    isSelected: clearedParts.has(partKeyOf(part)) && !pickedOption(part),
  };
  return [clearTile, ...opts];
}

function pickedValue(part: Record<string, any>): number {
  const opt = pickedOption(part);
  if (!opt) return 0;
  const min = typeof opt.minValue === 'number' ? opt.minValue : 0;
  const v = opt.effValue;
  return typeof v === 'number' ? v : min;
}

// PickGrid already resolves "none / re-click" to a null payload, so we just
// forward whatever it emits keyed by this part. Track the user-cleared state so
// the "无效果" tile highlights only after an explicit clear (like filter/motion):
// picking null marks the part cleared; picking a real card unmarks it.
const onPick = (part: Record<string, any>, option: Record<string, any> | null) => {
  const key = partKeyOf(part);
  if (option) {
    clearedParts.delete(key);
  } else {
    clearedParts.add(key);
  }
  emit('pick', key, option);
};

const onIntensityChange = (option: Record<string, any> | null, v: number) => {
  if (!option) return;
  emit('intensity-change', option, v);
};
</script>

<style lang="scss" scoped>
.point-makeup-tab {
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

.makeup-part {
  flex-shrink: 0;
  margin-top: 8px;
}

.makeup-part-title {
  color: var(--text-color-secondary);
  font-size: 13px;
  font-weight: 500;
  padding: 8px 12px;
}

.picked-intensity {
  flex-shrink: 0;
  padding: 8px 12px 12px;
}

</style>
