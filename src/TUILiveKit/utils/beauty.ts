/**
 * Open-source build of the beauty (xmagic) config.
 *
 * THIS FILE IS THE OPEN-SOURCE REPLACEMENT FOR `beauty.ts`. The publish script
 * (`scripts/publish.js`) renames it to `beauty.ts` when syncing to the public
 * GitHub repo, so the public build never ships the internal license
 * credentials.
 *
 * The ONLY intended differences from the internal `beauty.ts` are:
 *   1. `XmagicLicense` is empty — open-source developers fill in their own.
 *   2. The virtual-background image list keeps only `Blackboard`; the other
 *      background photos are copyrighted assets that must not be exposed.
 *
 * Everything else — exports, logic, and the other resource lists (LUT / makeup
 * / lightMakeup / motion) — MUST stay 1:1 with `beauty.ts`. `scripts/publish.js`
 * runs an export-symbol consistency check that ABORTS the release if the two
 * files diverge on their public API. When you change `beauty.ts`, mirror the
 * change here (except the two items above), or the open-source build breaks.
 */
import TRTCXmagicFactory, {
  TRTCXmagicEffectConstant,
  TRTCXmagicEffectValueType,
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
} from 'trtc-electron-plugin-xmagic';
import { getAppPath } from './envUtils';

export {
  TRTCXmagicEffectConstant,
  TRTCXmagicEffectValueType,
  TRTCXmagicEffectCategory,
  default as TRTCXmagicFactory
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
} from 'trtc-electron-plugin-xmagic';

export type TRTCXmagicEffectProperty = {
  category?: any; // TRTCXmagicEffectCategory;
  effKey: string;
  effValue?: string;
  resPath?: string;
  imgPath?: string;
  bgPath?: string;
  label?: string;
}

/**
 * Beauty capability level (aligned with the mobile SDK tiers, e.g. "A1-00" ~
 * "S1-07"). It controls which effect categories/items `getEffectConstant()`
 * returns. Declared as a standalone constant rather than a field of
 * `XmagicLicense`, because it is an init-time capability switch, NOT a license
 * credential (it is not consumed by `buildEffectInitParam`).
 */
export const BEAUTY_LEVEL = 'S1-07';

async function init() {
  const appPath = await getAppPath();
  // The plugin's new `init` takes an options object; `beautyLevel` is stored as
  // factory state and later consumed by `getEffectConstant()`. The legacy
  // string form `init(appPath)` is still accepted by the plugin for backward
  // compatibility, but we pass the object form to carry the level.
  TRTCXmagicFactory.init({ appPath, beautyLevel: BEAUTY_LEVEL });
}
init();

const { platform } = process;

// Open-source build: fill in your own xmagic license credentials here. Left
// empty on purpose so no internal credential is ever published. When both
// fields are empty, `isBeautyLicenseConfigured()` returns false and the camera
// dialog surfaces a "please enable the Tencent Effect SDK" hint.
export const XmagicLicense = {
  licenseURL: '',
  licenseKey: '',
};

/**
 * Whether the Tencent Effect (xmagic) license is configured. The beauty feature
 * is only usable once a valid `licenseURL` + `licenseKey` pair is filled in
 * `XmagicLicense`. The camera dialog uses this to surface a "please enable the
 * Tencent Effect SDK" hint when the developer left the credentials empty.
 */
export function isBeautyLicenseConfigured(): boolean {
  return Boolean(
    XmagicLicense
    && typeof XmagicLicense.licenseURL === 'string'
    && XmagicLicense.licenseURL.trim() !== ''
    && typeof XmagicLicense.licenseKey === 'string'
    && XmagicLicense.licenseKey.trim() !== '',
  );
}

const lutResourceList = [
  {
    key: 'LUT_REFRESHING',
    label: '清晰',
    label_en: 'Refreshing',
    resPath: 'lut.bundle/moren_lf.png',
    icon: './assets/beauty_panel/panel_icon/lut_icon/moren_lf.png',
  },
  {
    key: 'LUT_TOKYO',
    label: '东京',
    label_en: 'Tokyo',
    resPath: 'lut.bundle/dongjing_lf.png',
    icon: './assets/beauty_panel/panel_icon/lut_icon/dongjing_lf.png',
  },
  {
    key: 'LUT_WHITE',
    label: '白皙',
    label_en: 'White',
    resPath: 'lut.bundle/baixi_lf.png',
    icon: './assets/beauty_panel/panel_icon/lut_icon/baixi_lf.png',
  },
  {
    key: 'LUT_NATURAL',
    label: '自然',
    label_en: 'Natural',
    resPath: 'lut.bundle/ziran_lf.png',
    icon: './assets/beauty_panel/panel_icon/lut_icon/ziran_lf.png',
  },
  {
    key: 'LUT_ALLURE',
    label: '心动',
    label_en: 'Allure',
    resPath: 'lut.bundle/xindong_lf.png',
    icon: './assets/beauty_panel/panel_icon/lut_icon/xindong_lf.png',
  },
]
// Lut(Filter)
TRTCXmagicEffectConstant['EFFECT_LUT'].options = TRTCXmagicEffectConstant['EFFECT_LUT'].options.concat(
  lutResourceList.map(item => {
    return {
      ...TRTCXmagicEffectConstant['EFFECT_LUT'].valueMeta.value,
      ...item,
    }
  })
);

// Makeup
TRTCXmagicEffectConstant['EFFECT_MAKEUP'].options = TRTCXmagicEffectConstant['EFFECT_MAKEUP'].options.concat([
  {
    key: 'MAKEUP_PEACH',
    label: '桃花',
    label_en: 'Peach',
    effKey: 'video_fenfenxia',
    valueType: TRTCXmagicEffectValueType.ZERO_ONE,
    resPath: 'makeupMotionRes.bundle/video_fenfenxia/template.json',
    icon: './assets/beauty_panel/panel_icon/makeup_icon/video_fenfenxia.png'
  },
  {
    key: 'MAKEUP_XUEMEI',
    label: '学妹',
    label_en: 'Younge',
    effKey: 'video_makeup_xuemei',
    valueType: TRTCXmagicEffectValueType.ZERO_ONE,
    resPath: 'makeupMotionRes.bundle/video_makeup_xuemei/template.json',
    icon: './assets/beauty_panel/panel_icon/makeup_icon/video_makeup_xuemei.png'
  },
]);

// Light Makeup. Aligned with the mobile SDK: Windows uses a dedicated effKey
// `light.makeup`; resPath points at the resource "directory" (which contains
// makeup.json + image/), NOT at the makeup.json file itself. The strength is
// driven by effValue (seeded to full strength by effectStore once selected).
// Note: the native plugin must distinguish `light.makeup` by effKey under the
// MAKEUP category (see beauty-plugin-cpp).
const lightMakeupResourceList = [
  {
    key: 'LIGHT_MAKEUP_BAIXI',
    label: '白皙',
    label_en: 'Fair',
    effKey: 'light.makeup',
    valueType: TRTCXmagicEffectValueType.ZERO_ONE,
    resPath: 'lightMakeupRes.bundle/light_baixi',
    icon: './assets/beauty_panel/panel_icon/light_makeup_icon/light_baixi.png',
    extraInfo: {
      markupLutSupport: true,
    }
  },
  {
    key: 'LIGHT_MAKEUP_DANYAN',
    label: '淡颜',
    label_en: 'Light',
    effKey: 'light.makeup',
    valueType: TRTCXmagicEffectValueType.ZERO_ONE,
    resPath: 'lightMakeupRes.bundle/light_danyan',
    icon: './assets/beauty_panel/panel_icon/light_makeup_icon/light_danyan.png',
    extraInfo: {
      markupLutSupport: false,
    }
  },
];
// `EFFECT_LIGHT_MAKEUP` may be absent in older plugin constants; create it as a
// fallback before weaving in our items.
if (!TRTCXmagicEffectConstant['EFFECT_LIGHT_MAKEUP']) {
  TRTCXmagicEffectConstant['EFFECT_LIGHT_MAKEUP'] = { options: [] };
}
TRTCXmagicEffectConstant['EFFECT_LIGHT_MAKEUP'].options =
  TRTCXmagicEffectConstant['EFFECT_LIGHT_MAKEUP'].options.concat(lightMakeupResourceList);

// Motion
TRTCXmagicEffectConstant['EFFECT_MOTION']['2dOptions'] = TRTCXmagicEffectConstant['EFFECT_MOTION']['2dOptions'].concat([
  {
    key: 'MOTION_BUNNY',
    label: '兔兔酱',
    label_en: 'Bunny',
    effKey: 'video_tutujiang',
    resPath: '2dMotionRes.bundle/video_tutujiang/template.json',
    icon: './assets/beauty_panel/panel_icon/motions_icon/video_tutujiang.png',
    valueType: TRTCXmagicEffectValueType.NONE,
  },
]);

TRTCXmagicEffectConstant['EFFECT_MOTION']['3dOptions'] = TRTCXmagicEffectConstant['EFFECT_MOTION']['3dOptions'].concat([
  {
    key: 'MOTION_ROSE',
    label: '知性玫瑰',
    label_en: 'Glasses',
    effKey: 'video_zhixingmeigui',
    resPath: '3dMotionRes.bundle/video_zhixingmeigui/template.json',
    icon:'./assets/beauty_panel/panel_icon/motions_icon/video_zhixingmeigui.png',
    valueType: TRTCXmagicEffectValueType.NONE,
  }
]);

TRTCXmagicEffectConstant['EFFECT_MOTION']['handOptions'] = TRTCXmagicEffectConstant['EFFECT_MOTION']['handOptions'].concat([
  {
    key: 'MOTION_SAKURA',
    label: '樱花女孩',
    label_en: 'Sakura',
    effKey: 'video_sakuragirl',
    resPath: 'handMotionRes.bundle/video_sakuragirl/template.json',
    icon:'./assets/beauty_panel/panel_icon/motions_icon/video_sakuragirl.png',
    valueType: TRTCXmagicEffectValueType.NONE,
  }
]);

const greenScreenBackgroundImageList = [
  {
    key: 'SEG_GREEN_WATER_DROPS',
    label: '绿幕/水滴',
    label_en: 'Green Screen/Water Drops',
    icon: './assets/virtual_bg/water-drops.jpg',
  }
];

const virtualBackgroundImageList = [
  {
    key: 'SEG_BLACKBOARD',
    label: '黑板',
    label_en: 'Blackboard',
    icon: './assets/virtual_bg/Blackboard.jpg',
  },
]
// Virtual background
TRTCXmagicEffectConstant['EFFECT_SEGMENTATION'].options = TRTCXmagicEffectConstant['EFFECT_SEGMENTATION'].options.concat(
  greenScreenBackgroundImageList.map(item => {
    return {
      ...TRTCXmagicEffectConstant['EFFECT_SEGMENTATION'].valueMeta.greenScreen,
      ...item,
    }
  }),
  virtualBackgroundImageList.map(item => {
    return {
      ...TRTCXmagicEffectConstant['EFFECT_SEGMENTATION'].valueMeta.background,
      ...item,
    }
  })
);

export const customEffectConstant = TRTCXmagicEffectConstant;

/**
 * Cached snapshot of the unmerged effect constant produced by
 * `TRTCXmagicFactory.getEffectConstant(customEffectConstant)`. Used as the
 * baseline shape (with default effValue/isSelected) when no historical
 * properties exist for a camera. Lazily populated by `prewarmEffectConstant()`.
 */
let cachedBaselineEffectConstant: any = null;

/**
 * Prewarm the xmagic factory: triggers `TRTCXmagicFactory.init(appPath)` (which
 * happens at module import time) to actually finish, then computes and caches
 * the baseline effect constant. Calling this at app startup ensures that the
 * very first time the camera dialog opens, the main window already has a
 * ready-to-ship `effectConstant` payload to put on `SHOW_CHILD_PANEL.extra`.
 *
 * Safe to call multiple times — subsequent calls reuse the cached snapshot.
 */
export async function prewarmEffectConstant(): Promise<any> {
  if (cachedBaselineEffectConstant) return cachedBaselineEffectConstant;
  // `init()` was scheduled at module import; awaiting a microtask gives it a
  // chance to settle before we ask the factory to build the constant.
  await Promise.resolve();
  cachedBaselineEffectConstant = TRTCXmagicFactory.getEffectConstant(customEffectConstant);
  console.log('[beauty]cachedBaselineEffectConstant:', cachedBaselineEffectConstant);
  return cachedBaselineEffectConstant;
}

/** Coerce anything to a finite number (defaults to 0). */
function toNum(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Stable identity of a beautyTemplate tile (labelKey preferred, key fallback). */
function templateTileKey(tile: any): string {
  return String(tile?.labelKey ?? tile?.key ?? '');
}

/** Normalize a resource path for comparison (slashes + lowercase). */
function normResPath(p: any): string {
  if (typeof p !== 'string') return '';
  return p.replace(/\\/g, '/').replace(/\/{2,}/g, '/').toLowerCase();
}

/**
 * Compare two resource paths. History entries and a freshly rebuilt tree derive
 * their resPath from the SAME `_prefixResPath`, so a normalized full-string
 * compare matches. As a safety net (in case the install/runtime prefix drifts
 * between sessions) we also compare the resource-relative tail after ".bundle/".
 */
function resPathEqual(a: any, b: any): boolean {
  const na = normResPath(a);
  const nb = normResPath(b);
  if (!na || !nb) return na === nb;
  if (na === nb) return true;
  const tail = (s: string) => {
    const i = s.lastIndexOf('.bundle/');
    return i >= 0 ? s.slice(i) : s;
  };
  return tail(na) === tail(nb);
}

/**
 * Second-pass "reverse selection" back-fill for edit mode.
 *
 * The bundled xmagic plugin's own `_mergeInitProperties` fails to flag
 * `isSelected` for four kinds of effects, so the camera dialog never highlights
 * the previously-applied item when re-editing:
 *   - lut (filter): plugin restores effValue but forgets `isSelected`.
 *   - makeup (point makeup): plugin matches via a non-existent `extraKey`
 *     channel that our download path never produces.
 *   - lightMakeup: injected via the app-level constant; plugin matching misses.
 *   - beautyTemplate: plugin has no template-matching branch at all.
 *
 * Because we don't patch node_modules, we re-derive selection here from the
 * SAME `history` the plugin was given. History entries were produced by
 * `buildEffectProperty(detail)` off a previous tree, so for the same item the
 * `effKey` / `resPath` line up with a freshly rebuilt tree and can be matched
 * exactly. Mutates `tree` in place (it is already a fresh per-open object).
 *
 * Multi-camera note: `history` is the caller's per-camera snapshot (keyed by
 * cameraId in beautyPropertiesStore). This function is pure over its arguments
 * and holds no cross-call/cross-camera state, so each camera's dialog is
 * back-filled strictly from its own data.
 */
function backfillSelection(tree: any, history: any[], selectedTemplateKey?: string | null): void {
  if (!tree || !Array.isArray(history) || history.length === 0) return;

  for (const groupKey of Object.keys(tree)) {
    const group = tree[groupKey];
    const details = group?.details;
    if (!Array.isArray(details)) continue;

    // Point makeup: parts -> color-card options. buildEffectProperty writes the
    // option's `extraValue` into the emitted `resPath`, so match effKey +
    // (resPath === option.extraValue) to disambiguate cards sharing one effKey.
    if (groupKey === 'makeup') {
      for (const part of details) {
        if (!Array.isArray(part?.options)) continue;
        for (const opt of part.options) {
          if (String(opt?.effKey ?? '') === 'None') continue;
          const match = history.find(
            (h) => String(h?.effKey ?? '') === String(opt?.effKey ?? '')
              && resPathEqual(h?.resPath, opt?.extraValue),
          );
          if (match) {
            opt.isSelected = true;
            opt.effValue = toNum(match.effValue);
          }
        }
      }
      continue;
    }

    // Beauty template: a tile expands to several category-Beauty component
    // effects. Prefer the persisted identity: the main window caches the picked
    // tile's stable key (labelKey/key) per camera, so we can highlight it
    // directly regardless of the current effValues. This is what fixes the bug
    // where tweaking (or clearing) a template-owned intensity slider drifts the
    // history values so the reverse effValue-match below fails — the template
    // then lost its highlight yet stayed applied on native and "None" could not
    // clear it. Identity matching keeps the cross-reopen behaviour consistent
    // with the in-session state (where a slider drag never deselects the tile).
    if (groupKey === 'beautyTemplate') {
      if (selectedTemplateKey) {
        const hit = details.find((tile: any) => templateTileKey(tile) === selectedTemplateKey);
        if (hit) {
          hit.isSelected = true;
          continue;
        }
        // Persisted key no longer resolves to a tile (e.g. a beautyLevel change
        // dropped it): fall through to best-effort value matching below.
      }
      // Fallback (no persisted key / stale key): a tile is the applied one when
      // every one of its (non-empty) effects is present in history (matched by
      // effKey + effValue [+ resPath]). Pick the tile with the most matched
      // effects to avoid partial collisions.
      let best: any = null;
      let bestCount = 0;
      for (const tile of details) {
        const effects = Array.isArray(tile?.effects) ? tile.effects : [];
        if (effects.length === 0) continue; // skip the empty "None" tile
        const allMatched = effects.every((e: any) => history.some(
          (h) => String(h?.effKey ?? '') === String(e?.effKey ?? '')
            && toNum(h?.effValue) === toNum(e?.effValue)
            && (e?.resPath ? resPathEqual(h?.resPath, e?.resPath) : true),
        ));
        if (allMatched && effects.length > bestCount) {
          best = tile;
          bestCount = effects.length;
        }
      }
      if (best) best.isSelected = true;
      continue;
    }

    // pickIntensity groups (lut / advancedMakeup / lightMakeup): single-resource
    // items matched by effKey + resPath. lut items share one effKey, so resPath
    // is what tells them apart; hence both are required.
    if (groupKey === 'lut' || groupKey === 'advancedMakeup' || groupKey === 'lightMakeup') {
      for (const detail of details) {
        if (String(detail?.effKey ?? '') === 'None') continue;
        const match = history.find(
          (h) => String(h?.effKey ?? '') === String(detail?.effKey ?? '')
            && resPathEqual(h?.resPath, detail?.resPath),
        );
        if (match) {
          detail.isSelected = true;
          detail.effValue = toNum(match.effValue);
          // Restore the filter-only strength slider for light makeup, but only
          // when the preset actually supports a lut component. Presets with
          // markupLutSupport === false never exposed a filter slider, so any
          // historical makeupLutStrength is stale and must not be restored
          // (otherwise the UI would show a value it cannot tune).
          if (
            groupKey === 'lightMakeup'
            && typeof match.makeupLutStrength === 'number'
            && detail.extraInfo?.markupLutSupport === true
          ) {
            detail.lutStrength = match.makeupLutStrength;
          }
        }
      }
      continue;
    }
    // Other groups (beauty / imageQuality / motion / segment / ...) are already
    // handled correctly by the plugin's own merge, so we leave them untouched.
  }
}

/**
 * Build a per-open effectConstant snapshot for the camera dialog.
 *
 * In add mode (no `historyProperties`), returns a fresh baseline (all defaults).
 * In edit mode, calls `getEffectConstant(custom, history)` so that the library
 * back-fills `details[i].effValue` / `isSelected` according to the camera's
 * existing properties, then runs our `backfillSelection` second pass to repair
 * the selection flags the plugin misses (lut / makeup / lightMakeup /
 * beautyTemplate) — the child window can then render the constant directly with
 * no merge logic of its own.
 *
 * Always returns a fresh top-level object (not the cached one) so that the
 * dialog can mutate its copy locally without polluting the baseline cache.
 *
 * `historyProperties` is the per-camera snapshot supplied by the caller, so the
 * returned tree reflects only that camera's applied effects.
 *
 * `selectedTemplateKey` is the per-camera persisted identity of the picked
 * beautyTemplate tile (see beautyPropertiesStore). When present, the template
 * highlight is restored by identity in `backfillSelection` instead of reverse-
 * matching drifted effValues.
 */
export function buildEffectConstantForCamera(
  historyProperties?: any[],
  selectedTemplateKey?: string | null,
): any {
  if (historyProperties && historyProperties.length > 0) {
    const tree = TRTCXmagicFactory.getEffectConstant(customEffectConstant, historyProperties);
    backfillSelection(tree, historyProperties, selectedTemplateKey);
    return tree;
  }
  // Re-run getEffectConstant rather than cloning the cached one, because the
  // cached object is shared by all callers (including potential future ones)
  // and we want a clean, isolated tree per dialog open.
  return TRTCXmagicFactory.getEffectConstant(customEffectConstant);
}

/**
 * Expose the plugin's built-in i18n base table: `labelKey -> { zh, en }`.
 *
 * Every label-bearing node returned by `getEffectConstant()` now carries a
 * stable `labelKey`; the app layer translates those keys via its i18next
 * resources (see `src/i18n`). This helper surfaces the plugin's built-in zh/en
 * baseline so the app can seed those two languages automatically and only needs
 * to hand-translate the remaining languages.
 *
 * Returns `{}` when the running plugin version predates multi-language support,
 * so callers degrade gracefully (UI then falls back to each node's `label` /
 * `label_en`).
 */
export function getBeautyI18nResource(): Record<string, { zh: string; en: string }> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fn = (TRTCXmagicFactory as any).getI18nResource;
    return typeof fn === 'function' ? fn.call(TRTCXmagicFactory) : {};
  } catch {
    return {};
  }
}

/**
 * Whether a beauty property snapshot carries ANY real effect.
 *
 * A property is "effective" only when it has a non-zero strength (`effValue`)
 * OR references a resource (`resPath`, e.g. lut / makeup / motion / segment /
 * lightMakeup). This is NOT the same as "array is non-empty": effectStore's
 * getProperties() intentionally emits explicit clear entries
 * ({ effValue: 0, resPath: '' }) for every unselected point-makeup part (to
 * reset any residual native makeup). So a camera with NO beauty still yields a
 * non-empty snapshot full of pure clears.
 *
 * Length-based guards ("no beauty -> no plugin") are therefore defeated by
 * these clears: switching to a fresh camera would create an effect-less
 * spinning plugin. Callers that decide whether to CREATE a plugin (startEffect,
 * onBeautyUpdate, camera-switch migration, crash recovery) must use this
 * predicate instead of `properties.length`. Clears remain meaningful only when
 * a plugin already exists (to reset it) — that path is unaffected.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function hasEffectiveBeautyProperties(properties: readonly any[] | undefined | null): boolean {
  if (!Array.isArray(properties) || properties.length === 0) {
    return false;
  }
  return properties.some((p) => {
    if (!p) return false;
    const val = Number(p.effValue);
    const hasStrength = Number.isFinite(val) && val !== 0;
    const res = typeof p.resPath === 'string' ? p.resPath.trim() : '';
    return hasStrength || res.length > 0;
  });
}
