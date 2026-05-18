/**
 * @module useMusicPlaybackPolicy
 * @description Pure helpers that encode the BGM playback policy shared by both
 *              `MusicButton` (Windows main window / child-window owner) and
 *              `MusicPanel` (Mac self-managed mode).
 *
 * Keeping the policy in one place avoids drift between the two call sites: any
 * change to "what plays after the current track ends" or "should we auto-play a
 * newly added track" only needs to be made here.
 */
import { MusicPlayStatus } from 'tuikit-atomicx-vue3-electron';
import type { MusicLibItem } from './useMusicLibrary';

/**
 * Decide which track should start playing after the current one completes.
 *
 * Rules:
 * - Empty library → null (nothing to play).
 * - The completed url is no longer in the list (e.g. user removed it during
 *   playback) → fall back to the first item.
 * - Otherwise → next item with wrap-around. If the library has only one
 *   track, this naturally yields the same track again — that's the desired
 *   "single-track loop" behavior. By the time `onPlayCompleted` fires, the
 *   underlying SDK has already finalized the previous play (playStatus is
 *   Idle, playURL cleared), so calling startPlay(sameUrl) is a clean restart,
 *   not a duplicate trigger.
 *
 * @param list          Current music library
 * @param completedUrl  The url whose playback just completed
 * @returns The track to play next, or null if the library is empty
 */
export function planNextTrack(
  list: ReadonlyArray<MusicLibItem>,
  completedUrl: string,
): MusicLibItem | null {
  if (list.length === 0) return null;
  const idx = list.findIndex((i) => i.url === completedUrl);
  return idx >= 0 ? list[(idx + 1) % list.length] : list[0];
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
