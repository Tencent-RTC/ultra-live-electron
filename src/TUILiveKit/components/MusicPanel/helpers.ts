/**
 * Pure helpers extracted from MusicPanel/index.vue.
 *
 * These functions/constants have no Vue reactivity or component dependency,
 * so they live in a plain module that can be unit-tested in isolation and
 * imported by both the panel itself and any future sibling component (e.g.
 * a mini player widget) without dragging the whole SFC along.
 */
import { MusicErrorCode } from 'tuikit-atomicx-vue3-electron';

/** Primary slider fill color (matches the panel's CSS `--mp-primary`). */
export const SLIDER_PRIMARY = '#1c66e5';

/** Track background for the un-filled portion of a slider. */
export const SLIDER_TRACK = 'rgba(255, 255, 255, 0.1)';

/**
 * Build a `linear-gradient(...)` background string used to render the filled
 * portion of a `<input type="range">` slider.
 *
 * @param percent Fill percentage in the [0, 100] range. Out-of-range values
 *                are clamped.
 */
export function buildSliderBackground(percent: number): string {
  const p = Math.max(0, Math.min(100, percent));
  return `linear-gradient(to right, ${SLIDER_PRIMARY} 0%, ${SLIDER_PRIMARY} ${p}%, ${SLIDER_TRACK} ${p}%, ${SLIDER_TRACK} 100%)`;
}

/**
 * Format a millisecond duration as `m:ss` (e.g. `3:07`).
 *
 * Returns `'0:00'` for non-finite or non-positive inputs so the UI never has
 * to special-case the empty state.
 */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/** Translation function shape compatible with `useUIKit().t`. */
type TranslateFn = (key: string, params?: Record<string, string | number>) => string;

/**
 * App-layer mapping from a raw `MusicErrorCode` to the demo's i18n key.
 *
 * Kept in this UI module (not in the AtomicX `types/music.ts`) on purpose:
 * the AtomicX layer ships **codes only**, leaving translations entirely to
 * the consuming application. Other demos / business apps can copy this
 * table verbatim, swap it for a different naming convention, or merge
 * several codes into one message — without forking the AtomicX package.
 */
const ERROR_CODE_TO_I18N_KEY: Record<number, string> = {
  [MusicErrorCode.OpenFailed]:             'MusicPanel.Error.OpenFailed',
  [MusicErrorCode.DecodeFailed]:           'MusicPanel.Error.DecodeFailed',
  [MusicErrorCode.OverLimit]:              'MusicPanel.Error.OverLimit',
  [MusicErrorCode.InvalidOperation]:       'MusicPanel.Error.InvalidOperation',
  [MusicErrorCode.InvalidPath]:            'MusicPanel.Error.InvalidPath',
  [MusicErrorCode.InvalidUrl]:             'MusicPanel.Error.InvalidUrl',
  [MusicErrorCode.NoAudioStream]:          'MusicPanel.Error.NoAudioStream',
  [MusicErrorCode.FormatNotSupported]:     'MusicPanel.Error.FormatNotSupported',
  [MusicErrorCode.ConcurrentBgmOverLimit]: 'MusicPanel.Error.ConcurrentBgmOverLimit',
};

/**
 * Translate a raw music playback error code into a user-friendly localized
 * message.
 *
 * Strategy:
 * 1. Look up the code in {@link ERROR_CODE_TO_I18N_KEY}. Known codes produce
 *    a plain-language explanation of *why* playback failed (e.g. "Invalid
 *    file path. Please check whether the file exists." rather than
 *    "Playback failed (code=-4005)").
 * 2. Fall back to `MusicPanel.PlayFailedUnknown` (still surfaces the raw
 *    code, so diagnostics aren't lost) for codes not in the table.
 *
 * @param code Raw error code from `MusicEvent.onPlayError`.
 * @param t    i18n translate function (typically `useUIKit().t`).
 */
export function getPlayErrorMessage(code: number, t: TranslateFn): string {
  const key = ERROR_CODE_TO_I18N_KEY[code];
  if (key) return t(key);
  return t('MusicPanel.PlayFailedUnknown').replace('{code}', String(code));
}


