<template>
  <!--
    Shared icon-grid picker atom. Every pick-class tab (filter / studio makeup /
    light makeup / beauty template / segment / motion sub-group / point-makeup
    part) renders the exact same tile grid; only the surrounding interaction
    (strength sliders, group headers, sub-grouping) differs and lives in the
    per-category tab components. Keeping ONLY the grid shared here lets those
    tabs stay independent while avoiding 7 copies of identical tile markup/CSS.
  -->
  <ul class="pick-grid" :class="{ 'tile-wide': itemShape === 'wide' }">
    <li
      v-for="item in items"
      :key="String(item.effKey) + '|' + (item.resPath || item.extraValue || item.icon || '')"
      class="pick-item"
      :class="{ 'is-active': item.isSelected }"
      :title="resolveLabel(item)"
      @click="onPick(item)"
    >
      <img v-if="item.icon" :src="item.icon" class="pick-icon" alt="" @error="onIconError" />
      <div v-else class="pick-icon pick-icon-placeholder" />
      <div class="pick-label">{{ resolveLabel(item) }}</div>
    </li>
  </ul>
</template>

<script setup lang="ts">
import { useEffectLabel } from './useEffectLabel';

/* eslint-disable @typescript-eslint/no-explicit-any */

const resolveLabel = useEffectLabel();

defineProps<{
  /** Items to render. Either group.details[] or a part's options[]. */
  items: Array<Record<string, any>>;
  /**
   * Tile shape: `wide` for landscape backgrounds (segment), `square` (default)
   * for filters / makeup / motion.
   */
  itemShape?: 'square' | 'wide';
}>();

const emit = defineEmits<{
  /** Clicked an item; `null` means "deselect / pick none". */
  (e: 'pick', detail: Record<string, any> | null): void;
}>();

/**
 * Detect the "no effect / 原图" placeholder. A tile is "none" when it is the
 * library's explicit no-effect label, OR (for beauty templates) carries an
 * EMPTY `effects` array, OR carries NO resource at all. A tile's resource can
 * be surfaced via `resPath` (filters / studio + light makeup presets / segment
 * backgrounds) OR via `extraValue` (point-makeup color cards, which have no
 * `resPath` — their shade image lives on `extraValue`). Only when BOTH are
 * absent is the tile a genuine "no effect" placeholder. The `effects` branch
 * must come before the resource fallback: templates have no top-level resPath
 * either, so without it every template would be mis-classified as "none".
 */
function isNoneItem(item: Record<string, any>): boolean {
  if (!item) return false;
  // Sentinel "无"/"原图" tiles are identified by a labelKey (or key) ending
  // with '_NONE'. They carry real resources (LightCore template / empty lut
  // path / empty effects array) and are routed through the store's own clear
  // logic — they must NOT be classified as generic "no resource" placeholders,
  // otherwise PickGrid emits pick(null) and the tile can never be highlighted.
  // The previous label === 'None' text match was language-dependent (only
  // matched in English mode), causing this to break on Mac for some panels
  // and on ALL platforms for lut / beautyTemplate.
  const labelKey = String(item.labelKey ?? item.key ?? '');
  if (labelKey.endsWith('_NONE')) return false;
  if (item.label === '无效果' || item.label === 'No Effect') return true;
  if (Array.isArray(item.effects)) return item.effects.length === 0;
  return !item.resPath && !item.extraValue;
}

const onPick = (item: Record<string, any>) => {
  // Clicking the "none" tile or an already-selected tile clears the selection.
  if (isNoneItem(item) || item.isSelected) {
    emit('pick', null);
    return;
  }
  emit('pick', item);
};

const onIconError = (event: Event) => {
  const target = event.target as HTMLImageElement | null;
  if (target) target.style.visibility = 'hidden';
};
</script>

<style lang="scss" scoped>
.pick-grid {
  flex: 1 1 auto;
  overflow-y: auto;
  padding: 12px 8px;
  margin: 0;
  list-style: none;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(70px, 1fr));
  align-content: start;
  gap: 12px;

  &.tile-wide {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  }
}

.pick-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  transition: outline-color 0.15s;

  .pick-icon {
    width: 56px;
    height: 56px;
    border-radius: 8px;
    background-color: var(--bg-color-entrycard);
    object-fit: cover;
    outline: 2px solid transparent;
  }

  .tile-wide & .pick-icon {
    width: 100px;
    height: 56px;
  }

  .pick-icon-placeholder {
    background: linear-gradient(135deg, #555 0%, #333 100%);
  }

  .pick-label {
    margin-top: 4px;
    width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-align: center;
    color: var(--text-color-secondary);
    font-size: 12px;
  }

  &:hover .pick-icon {
    outline-color: var(--text-color-secondary);
  }

  &.is-active {
    .pick-icon {
      outline-color: var(--text-color-link);
    }
    .pick-label {
      color: var(--text-color-link);
    }
  }
}
</style>
