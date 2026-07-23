import { useUIKit } from '@tencentcloud/uikit-base-component-vue3';

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Resolve a localized label for an effectConstant node (top-level group,
 * detail item, color-card option, or motion sub-group).
 *
 * The xmagic plugin tags every label-bearing node with a stable `labelKey`.
 * We translate that key through the app's i18next resources (seeded from the
 * plugin's zh/en baseline in `src/i18n/beauty.ts`, overridable per language).
 * i18next returns the key unchanged on a miss, so we detect that and fall back
 * to the node's built-in `label` / `label_en`, guaranteeing a non-empty label
 * even for app-injected resources that lack a `labelKey`.
 */
export function useEffectLabel() {
  const { t } = useUIKit();
  return (node: any): string => {
    if (!node) return '';
    const key = node.labelKey;
    if (key) {
      const translated = t(key);
      if (translated && translated !== key) return String(translated);
    }
    return node.label ?? node.label_en ?? '';
  };
}
