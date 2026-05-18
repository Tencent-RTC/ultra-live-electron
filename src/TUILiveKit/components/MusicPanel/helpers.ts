/**
 * Pure helpers extracted from MusicPanel/index.vue.
 *
 * These functions/constants have no Vue reactivity or component dependency,
 * so they live in a plain module that can be unit-tested in isolation and
 * imported by both the panel itself and any future sibling component (e.g.
 * a mini player widget) without dragging the whole SFC along.
 */

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
