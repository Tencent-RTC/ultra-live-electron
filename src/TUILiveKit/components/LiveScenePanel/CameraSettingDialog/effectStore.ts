/**
 * Reactive store for the camera dialog's beauty effect state.
 *
 * Design (rewritten for beautyLevel-driven dynamic categories):
 * The plugin's `getEffectConstant()` now returns a variable set of top-level
 * groups depending on the active beautyLevel. Each group falls into one of a
 * few interaction "kinds" (see GROUP_KIND). The store therefore indexes its
 * state by the top-level groupKey (string) rather than by the numeric effect
 * category — this is required because several groups can share one category
 * (e.g. `advancedMakeup` and `lightMakeup` are both Makeup=5), which a
 * category-keyed map could not disambiguate.
 *
 * State indexes:
 *   - intensities: Record<effKey, number>
 *     Slider values for pure intensity groups (beauty / imageQuality /
 *     advancedBeauty / bodyBeauty). Multiple effKeys can be non-zero so effects
 *     stack and preview in real time.
 *   - picks: Record<groupKey, PickedItem>
 *     Single selection per group for pick-class groups (lut / advancedMakeup /
 *     lightMakeup / motion / segment / beautyTemplate). The picked detail's own
 *     `effValue` carries its intensity (mutated in place), so groups that share
 *     an effKey across items — like lut — don't clobber each other.
 *   - makeupParts: Record<partKey, EffectDetail>
 *     Point-makeup ("makeup" group): each part (lipstick / blush / ...) picks
 *     one color-card option whose own `effValue` is its strength. Many parts
 *     can be active simultaneously.
 *
 * `getProperties()` walks all three indexes and produces the FULL set of
 * plugin properties the main window should apply. Empty list means "no effect".
 *
 * All mutators route through `commitChange()` which RAF-throttles emissions.
 */
import { ref, type Ref } from 'vue';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - the xmagic plugin ships JS without .d.ts
import { TRTCXmagicEffectCategory, TRTCXmagicFactory } from '../../../utils/beauty';

/* eslint-disable @typescript-eslint/no-explicit-any */

/** A single entry in `effectConstant[group].details[]` (or an option). */
export type EffectDetail = Record<string, any>;

/** Raw plugin parameter dictated by buildEffectProperty. */
export type EffectProperty = Record<string, any>;

/** Interaction form of a top-level group, derived from its groupKey. */
export type GroupKind =
  | 'intensity'      // per-item sliders (beauty / imageQuality / advancedBeauty / bodyBeauty)
  | 'pickIntensity'  // icon grid pick + picked-item strength slider (lut / advancedMakeup / lightMakeup)
  | 'pointMakeup'    // parts list, each part picks a color card + strength (makeup)
  | 'motion'         // 2D/3D/hand sub-groups, single cross-group pick (motion)
  | 'pick'           // pure single pick (segment)
  | 'template';      // preset pick that expands to multiple effects (beautyTemplate)

const GROUP_KIND: Record<string, GroupKind> = {
  beauty: 'intensity',
  imageQuality: 'intensity',
  advancedBeauty: 'intensity',
  bodyBeauty: 'intensity',
  lut: 'pickIntensity',
  advancedMakeup: 'pickIntensity',
  lightMakeup: 'pickIntensity',
  makeup: 'pointMakeup',
  motion: 'motion',
  segment: 'pick',
  beautyTemplate: 'template',
};

/** Resolve a group's interaction kind; unknown keys default to intensity. */
export function getGroupKind(groupKey: string): GroupKind {
  return GROUP_KIND[groupKey] ?? 'intensity';
}

/**
 * Cross-group mutual exclusion, mirroring the mobile SDK (TEParamManager).
 * Picking (a non-"None" item in) the key group clears every listed group. Two
 * independent trios share native pipelines and must reset each other:
 *   (1) lightMakeup is the "multiple point-makeup + filter" bundle, so it fights
 *       point makeup (makeup) / filter (lut) on the shared makeup / LUT channels:
 *       setting lightMakeup clears makeup + lut; setting makeup or lut clears
 *       lightMakeup.
 *   (2) advancedMakeup (studio makeup) / motion / segment (virtual background)
 *       are mutually exclusive — the last one set wins and clears the other two.
 * The two trios are independent (they never reset across each other).
 */
const MUTEX_RESET: Record<string, string[]> = {
  lightMakeup: ['makeup', 'lut'],
  lut: ['lightMakeup'],
  makeup: ['lightMakeup'],
  advancedMakeup: ['motion', 'segment'],
  motion: ['advancedMakeup', 'segment'],
  segment: ['advancedMakeup', 'motion'],
};

/**
 * Default applied strength when an item in a pick + intensity group is first
 * selected. Built-in items ship with effValue 0 (= invisible), so picking would
 * otherwise show nothing. Filter (lut), light makeup (lightMakeup) and studio
 * makeup (advancedMakeup) all seed at 60 on selection so the effect shows at a
 * sensible default immediately; the strength slider then lets the user tune it.
 */
const DEFAULT_PICK_STRENGTH: Record<string, number> = {
  lut: 60,
  lightMakeup: 50,
  advancedMakeup: 60,
};

/**
 * Default filter(lut) strength carried by a light-makeup preset until the user
 * tunes the dedicated "滤镜强度" slider. Surfaced to native as
 * `makeupLutStrength`, which scales ONLY the bundle's lut component (the rest
 * of the bundle uses the overall effValue strength).
 */
const DEFAULT_LIGHT_MAKEUP_LUT_STRENGTH = 50;

export interface PickedItem {
  effKey: string;
  detail: EffectDetail;
}

export interface EffectStoreOptions {
  effectConstant: Record<string, any> | null;
  /**
   * Emitted on every (throttled) change. `delta` is the INCREMENTAL set to push
   * to the native plugin this tick (changed/added props + 0-clears for props
   * that disappeared since the previous emit); `full` is the complete deduped
   * snapshot (for the main-window per-camera cache + camera-switch migration).
   * Sending only `delta` to `setParameter` keeps the native log to the effects
   * that actually changed, instead of re-dumping the whole set each tick.
   */
  onChange: (delta: EffectProperty[], full: EffectProperty[]) => void;
}

export interface EffectStore {
  readonly effectConstant: Ref<Record<string, any> | null>;
  /** Intensity-class slider change (and pickIntensity picked-item strength). */
  setIntensity(detail: EffectDetail, value: number): void;
  /** Pick / unpick for pickIntensity / motion / pick / template groups. */
  pickItem(groupKey: string, detail: EffectDetail | null): void;
  getPicked(groupKey: string): PickedItem | undefined;
  /** Point-makeup: select / clear a color-card option under a part. */
  pickMakeupOption(partKey: string, option: EffectDetail | null): void;
  getMakeupOption(partKey: string): EffectDetail | undefined;
  /** Point-makeup: change the strength of an already-selected option. */
  setMakeupIntensity(option: EffectDetail, value: number): void;
  /**
   * Light-makeup: change the filter(lut)-only strength of the picked preset.
   * Stored on the picked detail as `lutStrength` and surfaced to native as
   * `makeupLutStrength` (scales only the bundle's lut component).
   */
  setMakeupLutStrength(detail: EffectDetail, value: number): void;
  /** Reset one group / everything. */
  clearCategory(groupKey: string): void;
  clearAll(): void;
  /** Full deduped property snapshot right now (no throttle, no IPC trigger). */
  getProperties(): EffectProperty[];
  /**
   * Reset the incremental baseline to `full` (what is now considered applied).
   * Called after a forced full apply (e.g. camera switch) so subsequent deltas
   * are computed against the new camera's freshly-applied state.
   */
  markBaseline(full: EffectProperty[]): void;
  /**
   * Stable identity (labelKey/key) of the currently-picked beautyTemplate tile,
   * or null when none is selected. The main window persists this per camera so
   * edit mode can restore the template highlight by identity — instead of
   * reverse-matching the expanded effValues, which drift the moment the user
   * tweaks a mapped intensity slider and would otherwise lose the highlight (and
   * strand the effect on native) across a dialog reopen.
   */
  getSelectedTemplateKey(): string | null;
}

/** Stable identity of a beautyTemplate tile (labelKey preferred, key fallback). */
function templateTileKey(tile: any): string {
  return String(tile?.labelKey ?? tile?.key ?? '');
}

function deepClone<T>(input: T): T {
  return JSON.parse(JSON.stringify(input)) as T;
}

/** Whether an intensity value contributes (xmagic default is always 0). */
function isContributingIntensity(value: number | undefined): boolean {
  return typeof value === 'number' && value !== 0;
}

/**
 * Seed the three indexes from the (possibly back-filled) effectConstant. In
 * edit mode the plugin has already merged historical effValue / isSelected into
 * the tree, so we just read those.
 */
function seedFromConstant(
  constant: Record<string, any>,
  intensities: Record<string, number>,
  picks: Record<string, PickedItem>,
  makeupParts: Record<string, EffectDetail>,
) {
  for (const [groupKey, group] of Object.entries(constant) as Array<[string, any]>) {
    if (!group) continue;
    const kind = getGroupKind(groupKey);
    const items = group?.details;

    if (kind === 'motion') {
      if (!Array.isArray(items)) continue;
      for (const sub of items) {
        if (!Array.isArray(sub?.details)) continue;
        for (const item of sub.details) {
          if (item?.isSelected) picks[groupKey] = { effKey: String(item.effKey ?? ''), detail: item };
        }
      }
      continue;
    }

    if (kind === 'pointMakeup') {
      if (!Array.isArray(items)) continue;
      for (const part of items) {
        const partKey = String(part?.labelKey ?? '');
        const opts = part?.options;
        if (!Array.isArray(opts)) continue;
        for (const opt of opts) {
          if (opt?.isSelected) makeupParts[partKey] = opt;
        }
      }
      continue;
    }

    if (!Array.isArray(items)) continue;

    if (kind === 'intensity') {
      for (const item of items) {
        if (isContributingIntensity(item?.effValue)) {
          intensities[String(item.effKey ?? '')] = item.effValue as number;
        }
      }
      continue;
    }

    // pickIntensity / pick / template
    for (const item of items) {
      if (item?.isSelected) {
        picks[groupKey] = { effKey: String(item.effKey ?? ''), detail: item };
      }
    }
  }
}

/** Reset effValue/isSelected inside one top-level group. Mutates in place. */
function clearGroupVisuals(constant: Record<string, any>, groupKey: string) {
  const group = constant[groupKey];
  if (!group) return;
  const kind = getGroupKind(groupKey);

  const resetItem = (item: any) => {
    if (item == null) return;
    if (typeof item.effValue === 'number') item.effValue = 0;
    item.isSelected = false;
  };

  if (kind === 'motion') {
    if (Array.isArray(group.details)) {
      for (const sub of group.details) {
        if (Array.isArray(sub?.details)) sub.details.forEach(resetItem);
      }
    }
    return;
  }

  if (kind === 'pointMakeup') {
    if (Array.isArray(group.details)) {
      for (const part of group.details) {
        if (Array.isArray(part?.options)) part.options.forEach(resetItem);
      }
    }
    return;
  }

  if (Array.isArray(group.details)) group.details.forEach(resetItem);
}

export function createEffectStore(opts: EffectStoreOptions): EffectStore {
  const cloned = opts.effectConstant ? deepClone(opts.effectConstant) : null;
  const constantRef = ref<Record<string, any> | null>(cloned);

  const intensities: Record<string, number> = {};
  const picks: Record<string, PickedItem> = {};
  const makeupParts: Record<string, EffectDetail> = {};

  // effKeys the currently picked beautyTemplate has written into intensity
  // groups. A template (美颜模板) expands into per-item beauty/imageQuality/
  // advancedBeauty properties; we mirror those into the matching intensity-group
  // details so the corresponding tabs' sliders reflect the preset in real time
  // (matching what edit-mode back-fill already shows). Tracked so switching /
  // clearing the template can reset exactly the keys it wrote back to 0.
  const templateAppliedKeys = new Set<string>();

  // Incremental baseline: the full deduped snapshot last handed to onChange.
  // Keyed by effKey. commitChange diffs the new snapshot against this to emit
  // only what changed (+ 0-clears for keys that disappeared).
  let lastSnapshot = new Map<string, EffectProperty>();

  if (cloned) seedFromConstant(cloned, intensities, picks, makeupParts);

  // Re-seed templateAppliedKeys after an edit-mode reopen. seedFromConstant can
  // restore picks.beautyTemplate (via isSelected) and the intensity-group
  // sliders (via effValue), but templateAppliedKeys — which records exactly the
  // effKeys the template expanded into intensity groups — starts empty on a
  // fresh store. Without it, clearing the template (pick None) would iterate an
  // empty set and never reset those intensity keys, so the beauty effect would
  // visually deselect yet remain applied on native. Rebuild it here by mapping
  // the restored template's effects onto the intensity groups, mirroring what
  // applyTemplateEffects does on a live pick (registration only; effValue was
  // already restored by seedFromConstant).
  const seededTemplate = picks.beautyTemplate;
  if (seededTemplate) {
    const effects = Array.isArray(seededTemplate.detail?.effects)
      ? seededTemplate.detail.effects
      : [];
    for (const eff of effects) {
      const effKey = String(eff?.effKey ?? '');
      if (!effKey) continue;
      if (findIntensityDetail(effKey)) templateAppliedKeys.add(effKey);
    }
  }

  // Seed the incremental baseline with what was just restored from history.
  // On an edit-mode reopen the native plugin still holds the previously applied
  // effects (it is not destroyed when the child window closes), so the baseline
  // must reflect that state. Otherwise removing a restored-from-history effect
  // would diff against an empty baseline and never emit its 0-clear, leaving a
  // residual effect on native.
  lastSnapshot = snapshotMap(getProperties());

  // ---- Throttle ---------------------------------------------------------
  let scheduled = false;
  function commitChange() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      try {
        const full = getProperties();
        const delta = computeDelta(full);
        lastSnapshot = snapshotMap(full);
        // Nothing actually changed since the last emit → skip, so we don't push
        // an empty beautySetting (which would still cost one native log line).
        if (delta.length === 0) return;
        opts.onChange(delta, full);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('[effectStore] onChange callback threw', e);
      }
    });
  }

  // ---- Incremental diff helpers ----------------------------------------
  /** Index a property list by effKey (assumes already deduped). */
  function snapshotMap(list: EffectProperty[]): Map<string, EffectProperty> {
    const map = new Map<string, EffectProperty>();
    for (const p of list) {
      const k = String(p?.effKey ?? '');
      if (k) map.set(k, p);
    }
    return map;
  }

  /** Keep only the last occurrence of each effKey, preserving relative order. */
  function dedupeByEffKey(list: EffectProperty[]): EffectProperty[] {
    const lastIndex = new Map<string, number>();
    list.forEach((p, i) => {
      const k = String(p?.effKey ?? '');
      if (k) lastIndex.set(k, i);
    });
    const out: EffectProperty[] = [];
    list.forEach((p, i) => {
      const k = String(p?.effKey ?? '');
      if (!k || lastIndex.get(k) === i) out.push(p);
    });
    return out;
  }

  /** Structural equality on the fields the native plugin actually reads. */
  function propsEqual(a: EffectProperty, b: EffectProperty): boolean {
    return a?.category === b?.category
      && a?.effKey === b?.effKey
      && (a?.effValue ?? 0) === (b?.effValue ?? 0)
      && (a?.resPath ?? '') === (b?.resPath ?? '')
      && (a?.bgPath ?? '') === (b?.bgPath ?? '')
      && (a?.makeupLutStrength ?? -1) === (b?.makeupLutStrength ?? -1);
  }

  /** A 0-strength / empty clear for a property that disappeared. */
  function makeClear(prev: EffectProperty): EffectProperty {
    return { category: prev?.category, effKey: prev?.effKey, effValue: 0, resPath: '' };
  }

  /** Whether a property is a "clear" (turns its channel off). */
  function isClearProp(p: EffectProperty): boolean {
    return String(p?.effKey ?? '') === 'None' || (p?.effValue ?? 0) === 0;
  }

  /**
   * Diff the new full snapshot against lastSnapshot. Returns ONLY the changed
   * entries: added/changed props, plus 0-clears for keys that were present last
   * time but are gone now. Clears are ordered first so that — when an effect is
   * replaced on a shared native slot — the real value is applied last and wins.
   */
  function computeDelta(full: EffectProperty[]): EffectProperty[] {
    const next = snapshotMap(full);
    const changed: EffectProperty[] = [];
    for (const p of full) {
      const k = String(p?.effKey ?? '');
      if (!k) continue;
      const prev = lastSnapshot.get(k);
      if (!prev || !propsEqual(prev, p)) changed.push(p);
    }
    const removed: EffectProperty[] = [];
    for (const [k, prev] of lastSnapshot) {
      if (!next.has(k)) removed.push(makeClear(prev));
    }
    const delta = [...removed, ...changed];
    // Keep clears ahead of real effects within the delta as well.
    const clears: EffectProperty[] = [];
    const reals: EffectProperty[] = [];
    for (const p of delta) (isClearProp(p) ? clears : reals).push(p);
    return [...clears, ...reals];
  }

  /** Reset the incremental baseline (after a forced full apply). */
  function markBaseline(full: EffectProperty[]) {
    lastSnapshot = snapshotMap(full);
  }

  /**
   * Stable key of the currently-picked beautyTemplate tile, or null when none.
   * Reads live from `picks.beautyTemplate` so it always reflects the latest
   * pick / clear / switch (a manual slider drag does NOT clear the pick, so the
   * key persists — exactly the identity we want to carry across a reopen).
   */
  function getSelectedTemplateKey(): string | null {
    const picked = picks.beautyTemplate;
    if (!picked) return null;
    const key = templateTileKey(picked.detail);
    return key || null;
  }

  // ---- Property assembly ------------------------------------------------
  function buildOne(detail: EffectDetail): EffectProperty[] {
    const built = TRTCXmagicFactory.buildEffectProperty(detail) as EffectProperty[] | undefined;
    return Array.isArray(built) ? built : [];
  }

  function getProperties(): EffectProperty[] {
    const result: EffectProperty[] = [];
    const constant = constantRef.value;
    if (!constant) return result;

    for (const [groupKey, group] of Object.entries(constant) as Array<[string, any]>) {
      if (!group) continue;
      const kind = getGroupKind(groupKey);

      if (kind === 'intensity') {
        const items = (group.details as any[]) || [];
        for (const item of items) {
          const effKey = String(item?.effKey ?? '');
          if (!effKey) continue;
          const v = intensities[effKey];
          if (!isContributingIntensity(v)) continue;
          result.push(...buildOne({ ...item, effValue: v }));
        }
        continue;
      }

      if (kind === 'pointMakeup') {
        // Each part's selected option carries its own effValue. For UNSELECTED
        // parts we emit an explicit clear (effValue 0) instead of nothing: the
        // native layer is stateful, and these parts share their `effKey`
        // (beauty.faceFeature*) with the light-makeup expansion, so a positive
        // clear is what actually resets a deselected part — and what wipes any
        // residual light-makeup mask when the user switches over to point makeup.
        const items = (group.details as any[]) || [];
        for (const part of items) {
          const partKey = String(part?.labelKey ?? '');
          const option = makeupParts[partKey];
          if (option) {
            result.push(...buildOne(option));
          } else {
            const effKey = String(part?.options?.[0]?.effKey ?? '');
            if (effKey) {
              result.push({
                category: part?.options?.[0]?.category ?? TRTCXmagicEffectCategory?.Beauty,
                effKey,
                effValue: 0,
                resPath: '',
              });
            }
          }
        }
        continue;
      }

      // pickIntensity / motion / pick / template: single picked detail.
      const picked = picks[groupKey];
      if (picked) {
        const isNoneSentinel = String(picked.detail?.effKey ?? '') === 'None';
        if (groupKey === 'lightMakeup' && isNoneSentinel) {
          // Light makeup is expanded natively into component effects (lut +
          // beauty.faceFeature* masks); its built-in "无" tile (effKey "None")
          // would hit the studio "makeup" channel and never reset them. Emit an
          // explicit light.makeup clear (effValue 0 / empty resPath) so the bridge
          // clears the components. Skip it when point makeup is active: point
          // makeup owns the same mask channels and emits its own full set, so a
          // clear here would only fight it (and is unnecessary).
          const pointMakeupActive = Object.keys(makeupParts).length > 0;
          const realItem = (group.details as any[] | undefined)?.find(
            (d: any) => String(d?.effKey ?? '') !== 'None',
          );
          if (!pointMakeupActive && realItem) {
            result.push({
              category: realItem.category,
              effKey: String(realItem.effKey ?? ''),
              effValue: 0,
              resPath: '',
            });
            // The native ApplyLightMakeup clear path (dir empty) resets the
            // beauty.faceFeature* components but intentionally omits `lut` to
            // protect a user-selected standalone filter. However, MUTEX_RESET
            // guarantees lightMakeup and lut are mutually exclusive — when
            // lightMakeup is being cleared, no standalone filter is active — so
            // the residual lut set by the previous light-makeup bundle (e.g.
            // light_baixi's lut.png) must be explicitly cleared here. This goes
            // through the Lut category channel (setEffect("lut", 0, "")) which
            // bypasses ApplyLightMakeup and resets the native lut slot directly.
            if (!picks.lut) {
              result.push({
                category: TRTCXmagicEffectCategory?.Lut,
                effKey: 'lut',
                effValue: 0,
                resPath: '',
              });
            }
          }
        } else if (groupKey === 'lightMakeup') {
          // Real light-makeup pick. The filter(lut)-only strength is attached
          // ONLY when the preset declares `extraInfo.markupLutSupport === true`;
          // presets without lut support omit `makeupLutStrength` entirely so the
          // native bridge never receives an irrelevant lut scale. The overall
          // makeup strength (effValue) is always carried by buildOne().
          const built = buildOne(picked.detail);
          if (picked.detail?.extraInfo?.markupLutSupport === true) {
            const lutStrength = typeof picked.detail?.lutStrength === 'number'
              ? picked.detail.lutStrength
              : DEFAULT_LIGHT_MAKEUP_LUT_STRENGTH;
            for (const p of built) p.makeupLutStrength = lutStrength;
          }
          result.push(...built);
        } else if (groupKey === 'beautyTemplate') {
          // The picked template expands into per-item beauty effects. Keys that
          // map to an intensity group (see applyTemplateEffects / templateAppliedKeys)
          // are emitted by that group instead — this keeps a single source of
          // truth so a later manual slider drag overrides the preset regardless
          // of group iteration order. Only keys NOT owned by any slider group are
          // emitted here so native still receives the full preset.
          const effects = Array.isArray(picked.detail?.effects) ? picked.detail.effects : [];
          for (const eff of effects) {
            const effKey = String(eff?.effKey ?? '');
            if (!effKey || templateAppliedKeys.has(effKey)) continue;
            result.push(...buildOne({ effects: [eff] }));
          }
        } else {
          result.push(...buildOne(picked.detail));
        }
      }
    }

    // Stable-partition so every "no effect / 原图" clear sentinel is applied
    // BEFORE the real effects. The makeup-category "无/原图" tiles serialize to
    // an empty LightCore template carrying `effKey === 'None'` on the native
    // makeup channel. Because the native plugin applies the beautySetting array
    // in order and a later item wins the shared makeup slot, an empty sentinel
    // emitted AFTER a real makeup effect (e.g. advancedMakeup sitting at 原图
    // while lightMakeup has a real pick) would wipe that real effect out — which
    // is exactly why picking light-makeup 白皙/淡颜 rendered nothing. Moving all
    // clear sentinels to the front guarantees the real selection is applied last
    // and therefore wins, regardless of group iteration order. No item is
    // dropped, so the LightCore base that studio makeup relies on is preserved.
    const clears: EffectProperty[] = [];
    const reals: EffectProperty[] = [];
    for (const p of result) {
      if (String(p?.effKey ?? '') === 'None') clears.push(p);
      else reals.push(p);
    }
    // Dedupe by effKey (keep the last occurrence): defensively collapses any
    // accidental duplicate effKey so a single key is never pushed/logged twice.
    return dedupeByEffKey([...clears, ...reals]);
  }

  // ---- Mutators ---------------------------------------------------------
  function setIntensity(detail: EffectDetail, value: number) {
    const effKey = String(detail?.effKey ?? '');
    if (!effKey) return;
    // Mirror into the tree so templates bound to effValue reflect live state.
    detail.effValue = value;

    // For pickIntensity groups (lut / advancedMakeup / lightMakeup) the picked
    // detail IS the source of truth (it lives in picks[groupKey]); we only need
    // to mutate its effValue above. These carry Lut(2) / Makeup(5) categories.
    if (
      detail.category === TRTCXmagicEffectCategory?.Lut
      || detail.category === TRTCXmagicEffectCategory?.Makeup
    ) {
      commitChange();
      return;
    }

    // Pure intensity groups: track by effKey; 0 means "not contributing".
    if (value === 0) {
      delete intensities[effKey];
    } else {
      intensities[effKey] = value;
    }
    commitChange();
  }

  function pickItem(groupKey: string, detail: EffectDetail | null) {
    const constant = constantRef.value;
    if (!constant) return;
    const group = constant[groupKey];
    const kind = getGroupKind(groupKey);

    // Clear peers so a single card highlights. For pick + intensity groups
    // (lut / advancedMakeup / lightMakeup) we ALSO reset each item's strength
    // state (effValue -> 0, drop lutStrength): the picked item's own effValue is
    // the slider's source of truth, and a stale value would otherwise survive an
    // unpick / switch. Resetting to 0 makes the next pick of ANY item in this
    // group re-hit the default-strength seeding below (60 / 50 / 60), so a
    // deselect-then-reselect returns to the default just like a freshly-opened
    // dialog does — instead of restoring the last dragged value.
    const isPickIntensity = kind === 'pickIntensity';
    const clearSel = (items: any[] | undefined) => {
      if (!Array.isArray(items)) return;
      for (const it of items) {
        it.isSelected = false;
        if (isPickIntensity) {
          if (typeof it.effValue === 'number') it.effValue = 0;
          if ('lutStrength' in it) delete it.lutStrength;
        }
      }
    };
    if (kind === 'motion') {
      if (Array.isArray(group?.details)) for (const sub of group.details) clearSel(sub?.details);
    } else {
      clearSel(group?.details);
    }

    if (detail) {
      detail.isSelected = true;
      // Detect "无"/"原图" sentinel tiles (labelKey ending with '_NONE', or
      // effKey 'None'/'naught') so we can skip cross-group mutual exclusion and
      // strength seeding for them — they clear the effect, they don't compete
      // for shared native channels or need a default strength.
      const sentinelLabelKey = String(detail.labelKey ?? detail.key ?? '');
      const isNoneSentinel = sentinelLabelKey.endsWith('_NONE')
        || String(detail.effKey ?? '') === 'None'
        || String(detail.effKey ?? '') === 'naught';
      // Cross-group mutual exclusion (see MUTEX_RESET): picking a real item clears
      // the conflicting groups. A "None" sentinel is a clear, not a real pick,
      // so it must not wipe peers.
      if (!isNoneSentinel) {
        MUTEX_RESET[groupKey]?.forEach(resetGroupState);
      }
      // Beauty template: expand the preset into the intensity groups so the
      // beauty / imageQuality / advancedBeauty tabs sync live (see
      // applyTemplateEffects). Resets any previously-applied template keys first.
      if (kind === 'template') {
        applyTemplateEffects(detail);
      }
      // For pick + intensity groups (lut / advancedMakeup / lightMakeup) the
      // applied strength is `effValue`. A freshly-built item ships with
      // effValue 0, which for strength-scaled resources (e.g. the light-makeup
      // `makeup.json` sets, whose component alphas are multiplied by
      // makeup.strength) renders as completely invisible — the user picks an
      // item and "nothing happens". Seed an untouched pick to its default
      // strength (60 for lut / lightMakeup / advancedMakeup, see
      // DEFAULT_PICK_STRENGTH; otherwise maxValue) so the effect shows
      // immediately; the slider then lets the user tune it. The commitChange()
      // below then dispatches this seeded strength to native in one shot. Pure-
      // pick groups (motion / segment / template) carry no strength slider and
      // are unaffected. "None" sentinels are also skipped: their effValue must
      // stay 0 so the store's clear logic (isNoneSentinel branch / native
      // effValue=0) fires correctly.
      if (
        kind === 'pickIntensity'
        && !isNoneSentinel
        && (typeof detail.effValue !== 'number' || detail.effValue === 0)
      ) {
        const seed = DEFAULT_PICK_STRENGTH[groupKey]
          ?? (typeof detail.maxValue === 'number' ? detail.maxValue : undefined);
        if (typeof seed === 'number') detail.effValue = seed;
      }
      picks[groupKey] = { effKey: String(detail.effKey ?? ''), detail };
    } else {
      // Clearing (原图 / re-click). For a template, also reset the intensity-group
      // keys it wrote back to 0 so the beauty / imageQuality / advancedBeauty tabs
      // return to "no effect".
      if (kind === 'template') {
        clearTemplateEffects();
      }
      delete picks[groupKey];
    }
    commitChange();
  }

  function pickMakeupOption(partKey: string, option: EffectDetail | null) {
    const constant = constantRef.value;
    if (!constant) return;
    // makeup is the only pointMakeup group.
    const group = constant.makeup;
    const part = Array.isArray(group?.details)
      ? group.details.find((d: any) => String(d?.labelKey ?? '') === partKey)
      : undefined;
    if (part && Array.isArray(part.options)) {
      for (const o of part.options) o.isSelected = false;
    }
    if (option) {
      option.isSelected = true;
      // On pick, apply the freshly selected color card at strength 0 and let the
      // commitChange() below dispatch it immediately. Within one part the color
      // cards are mutually exclusive and share a single native channel (e.g.
      // beauty.faceFeatureLipsLut): emitting the newly picked card at strength 0
      // replaces whatever the previously selected card in this part had applied,
      // clearing the old shade so the user starts from a clean slate. The effect
      // stays invisible at 0 and only becomes visible once the user dials in a
      // strength via the slider (matching the reference mobile SDK behaviour:
      // pick a shade, then set its strength for it to take effect).
      option.effValue = 0;
      makeupParts[partKey] = option;
      // Point makeup conflicts with light makeup on the shared makeup channels
      // (see MUTEX_RESET). Selecting a point-makeup option disables light makeup.
      MUTEX_RESET.makeup?.forEach(resetGroupState);
    } else {
      delete makeupParts[partKey];
    }
    commitChange();
  }

  function setMakeupIntensity(option: EffectDetail, value: number) {
    if (!option) return;
    option.effValue = value;
    commitChange();
  }

  function setMakeupLutStrength(detail: EffectDetail, value: number) {
    if (!detail) return;
    // Persist on the picked light-makeup detail; getProperties reads it back as
    // `makeupLutStrength`. Kept separate from effValue so the overall and the
    // filter strength can be tuned independently.
    detail.lutStrength = value;
    commitChange();
  }

  /**
   * Find the intensity-group detail (in beauty / imageQuality / advancedBeauty /
   * bodyBeauty) whose effKey matches. Used to map a beautyTemplate's expanded
   * effects onto the sliders those tabs render. Returns undefined if no
   * intensity group in the active beautyLevel owns this key (that key is then
   * left to the template branch of getProperties, so native still receives it).
   */
  function findIntensityDetail(effKey: string): EffectDetail | undefined {
    const constant = constantRef.value;
    if (!constant) return undefined;
    for (const [groupKey, group] of Object.entries(constant) as Array<[string, any]>) {
      if (getGroupKind(groupKey) !== 'intensity') continue;
      const items = group?.details;
      if (!Array.isArray(items)) continue;
      const found = items.find((it: any) => String(it?.effKey ?? '') === effKey);
      if (found) return found;
    }
    return undefined;
  }

  /**
   * Reset every intensity-group key the current template wrote back to 0 (both
   * the tree detail — so the slider drops to 0 — and the intensities index). Per
   * product decision, keys the template touched are cleared wholesale on
   * switch / cancel; subsequent manual edits then take over. Keys not owned by
   * any intensity group were never tracked here and are dropped naturally when
   * the template pick is removed.
   */
  function clearTemplateEffects() {
    for (const effKey of templateAppliedKeys) {
      const detail = findIntensityDetail(effKey);
      if (detail && typeof detail.effValue === 'number') detail.effValue = 0;
      delete intensities[effKey];
    }
    templateAppliedKeys.clear();
  }

  /**
   * Expand a picked beautyTemplate preset into the intensity groups: for each of
   * its effects, mirror the value onto the matching intensity-group detail
   * (drives the beauty / imageQuality / advancedBeauty sliders) and into the
   * intensities index (drives native + lets a later manual slider drag override
   * it, since getProperties emits mapped keys ONLY via their intensity group).
   * Any previously-applied template keys are reset first so switching presets
   * doesn't leave stale values behind.
   */
  function applyTemplateEffects(tile: EffectDetail) {
    clearTemplateEffects();
    const effects = Array.isArray(tile?.effects) ? tile.effects : [];
    for (const eff of effects) {
      const effKey = String(eff?.effKey ?? '');
      if (!effKey) continue;
      const value = typeof eff?.effValue === 'number' ? eff.effValue : 0;
      const detail = findIntensityDetail(effKey);
      if (!detail) continue; // not slider-owned; handled by template branch
      detail.effValue = value;
      if (value !== 0) intensities[effKey] = value;
      else delete intensities[effKey];
      templateAppliedKeys.add(effKey);
    }
  }



  /** Reset one group's state + visuals WITHOUT emitting (caller commits). */
  function resetGroupState(groupKey: string) {
    const constant = constantRef.value;
    if (!constant) return;
    const kind = getGroupKind(groupKey);

    clearGroupVisuals(constant, groupKey);

    if (kind === 'intensity') {
      const items = (constant[groupKey]?.details as any[]) || [];
      for (const it of items) {
        const k = String(it?.effKey ?? '');
        if (k) delete intensities[k];
      }
    } else if (kind === 'pointMakeup') {
      const items = (constant[groupKey]?.details as any[]) || [];
      for (const part of items) {
        const partKey = String(part?.labelKey ?? '');
        delete makeupParts[partKey];
      }
    } else {
      delete picks[groupKey];
    }
  }

  function clearCategory(groupKey: string) {
    resetGroupState(groupKey);
    commitChange();
  }

  function clearAll() {
    const constant = constantRef.value;
    if (!constant) return;
    for (const k of Object.keys(constant)) clearGroupVisuals(constant, k);
    for (const k of Object.keys(intensities)) delete intensities[k];
    for (const k of Object.keys(picks)) delete picks[k];
    for (const k of Object.keys(makeupParts)) delete makeupParts[k];
    templateAppliedKeys.clear();
    commitChange();
  }

  return {
    effectConstant: constantRef,
    setIntensity,
    pickItem,
    getPicked: (groupKey) => picks[groupKey],
    pickMakeupOption,
    getMakeupOption: (partKey) => makeupParts[partKey],
    setMakeupIntensity,
    setMakeupLutStrength,
    clearCategory,
    clearAll,
    getProperties,
    markBaseline,
    getSelectedTemplateKey,
  };
}
