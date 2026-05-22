/**
 * @module useMusicPlaybackPolicy
 * @description Pure helpers that encode the BGM playback policy shared by both
 *              `MusicButton` (Windows main window / child-window owner) and
 *              `MusicPanel` (Mac self-managed mode).
 *
 * Keeping the policy in one place avoids drift between the two call sites: any
 * change to "what plays after the current track ends/fails" or "should we
 * auto-play a newly added track" only needs to be made here.
 */
import { MusicPlayStatus } from 'tuikit-atomicx-vue3-electron';
import type { MusicLibItem } from './useMusicLibrary';

/**
 * Decide which track should start playing after the current one **completes
 * normally** (`onPlayCompleted`).
 *
 * Rules:
 * - Empty library → `null`.
 * - Pivot is no longer in the list (e.g. user removed it during playback) →
 *   fall back to the first entry (regardless of unplayable flag — see below).
 * - Otherwise → next entry with wrap-around. With a single-track library this
 *   naturally yields the same track again, giving the desired single-track
 *   loop behavior.
 *
 * ⚠️ `isUnplayable` is **not** used as a filter here. The flag is a UI hint
 * for the user (the "Unplayable" red tag in the list row), not a hard skip.
 * Every track is retried on each pass, so a track that recovered from a
 * transient failure (file replaced, network back, etc.) will play again as
 * soon as its turn comes — without the user having to manually retry.
 *
 * @param list          Current music library
 * @param completedUrl  Url of the track that just finished
 * @returns The next track to play, or `null` to stop the auto-play loop
 */
export function planNextTrackOnCompleted(
  list: ReadonlyArray<MusicLibItem>,
  completedUrl: string,
): MusicLibItem | null {
  const n = list.length;
  if (n === 0) return null;
  const pivotIdx = list.findIndex((i) => i.url === completedUrl);
  if (pivotIdx < 0) return list[0];
  return list[(pivotIdx + 1) % n];
}

/**
 * Decide which track should start playing after the current one **fails**
 * (`onPlayError`).
 *
 * Rules:
 * - Empty library → `null`.
 * - **Single-track library** → `null`. There is only one entry and it just
 *   failed; retrying it immediately would only produce the same error and a
 *   tight `onPlayError` loop. The caller stops auto-play and waits for an
 *   explicit user action.
 * - **Multi-track library** → next entry with wrap-around, **regardless of
 *   the next entry's `isUnplayable` flag**. The user's intent is "keep
 *   probing the library so any track that recovered comes back automatically",
 *   which means we deliberately give known-bad tracks another chance on each
 *   round. Tight runaway is prevented by the per-attempt-round guard the
 *   caller layers on top (see `attemptRoundOriginUrl` in MusicButton /
 *   MusicPanel) — once we cycle back to the originating url with every track
 *   in the round failing, the caller stops the loop.
 * - Pivot missing → fall back to the first entry.
 *
 * @param list       Current music library
 * @param failedUrl  Url of the track that just failed
 * @returns The next track to try, or `null` to stop the auto-play loop
 */
export function planNextTrackOnError(
  list: ReadonlyArray<MusicLibItem>,
  failedUrl: string,
): MusicLibItem | null {
  const n = list.length;
  if (n === 0) return null;
  if (n === 1) return null;
  const pivotIdx = list.findIndex((i) => i.url === failedUrl);
  if (pivotIdx < 0) return list[0];
  return list[(pivotIdx + 1) % n];
}

/**
 * Decide whether to auto-play a newly added track.
 *
 * The intent is "first-add UX shortcut": if the library was previously empty
 * or nothing is currently playing, start the new track right away so the user
 * gets immediate audible feedback. If something is already playing/paused,
 * do not interrupt it.
 *
 * @param beforeLen     Library length before addition
 * @param afterLen      Library length after addition
 * @param currentStatus Current MusicState.playStatus
 * @returns true when the caller should start playing the newly added track
 */
export function shouldAutoPlayAfterAdd(
  beforeLen: number,
  afterLen: number,
  currentStatus: MusicPlayStatus,
): boolean {
  return afterLen > beforeLen && currentStatus === MusicPlayStatus.Idle;
}
