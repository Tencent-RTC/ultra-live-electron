import { getBeautyI18nResource } from '../TUILiveKit/utils/beauty';

/**
 * Beauty panel i18n bridge.
 *
 * The xmagic plugin returns every label-bearing node with a stable `labelKey`
 * plus a built-in `{ zh, en }` baseline (via `getBeautyI18nResource()`). The
 * app translates those keys through its own i18next resources so beauty panel
 * text follows the global language and can be switched at runtime.
 *
 * Here we flatten the plugin's `labelKey -> { zh, en }` table into a
 * single-language `labelKey -> text` map, which `main.ts` merges into each
 * language bundle as a baseline. App-provided translations (in the per-language
 * `index.ts`) take precedence and override these defaults.
 */
type BaselineLang = 'zh' | 'en';

/**
 * Flatten the plugin baseline into a `labelKey -> text` map for one language.
 * `zh-CN` / `zh-TW` seed from the `zh` baseline; `en-US` / `ja-JP` / `ko-KR`
 * seed from `en`. Missing entries fall back across zh/en and finally to the key
 * itself, so the UI never renders an empty label.
 */
export function buildBeautyTranslation(lang: BaselineLang): Record<string, string> {
  const base = getBeautyI18nResource();
  const out: Record<string, string> = {};
  for (const key of Object.keys(base)) {
    const entry = base[key];
    out[key] = entry?.[lang] ?? entry?.en ?? entry?.zh ?? key;
  }
  return out;
}
