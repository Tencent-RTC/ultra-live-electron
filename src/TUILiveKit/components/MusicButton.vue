<template>
  <div
    class="custom-icon-container"
    @click="handleToggleMusicPanel"
  >
    <svg
      class="custom-icon music-btn-icon"
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
    <span class="custom-text music-text">{{ t('Music') }}</span>
  </div>
  <!-- Self-managed mode (Mac, or Windows without child-window flag): inline TUIDialog -->
  <TUIDialog
    v-if="!props.isShowingInChildWindow"
    :custom-classes="['music-dialog']"
    :visible="musicPanelVisible"
    width="520px"
    height="560px"
    @close="musicPanelVisible = false"
    @confirm="musicPanelVisible = false"
    @cancel="musicPanelVisible = false"
  >
    <div class="music-dialog-body">
      <MusicPanel @close="musicPanelVisible = false" />
    </div>
    <template #footer>
      <div />
    </template>
  </TUIDialog>
</template>

<script lang="ts" setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue';
import { TUIDialog, TUIToast, TOAST_TYPE, useUIKit } from '@tencentcloud/uikit-base-component-vue3';
import {
  MusicEvent,
  MusicPlayStatus,
  useMusicState,
} from 'tuikit-atomicx-vue3-electron';
import { useMusicLibrary } from '../hooks/useMusicLibrary';
import {
  planNextTrackOnCompleted,
  planNextTrackOnError,
  shouldAutoPlayAfterAdd,
} from '../hooks/useMusicPlaybackPolicy';
import MusicPanel from './MusicPanel/index.vue';
import { getPlayErrorMessage } from './MusicPanel/helpers';
import { ipcBridge, IPCMessageType, toPlainIpcPayload, ChildPanelType } from '../ipc';
import type {
  MusicActionPayload,
  MusicPanelSnapshot,
  ShowChildPanelPayload,
  UpdateChildDataPayload,
} from '../ipc';

/**
 * MusicButton supports two modes:
 *
 * - `isShowingInChildWindow=false` (default, Mac): opens an inline TUIDialog rendering
 *   MusicPanel directly. MusicPanel operates in its self-managed mode, owning its
 *   state via useMusicState() + useMusicLibrary(). No IPC is involved.
 *
 * - `isShowingInChildWindow=true` (Windows): opens a real child BrowserWindow that
 *   renders MusicPanel in controlled mode. This component (main window) remains the
 *   sole owner of MusicState/MusicLibrary; it pushes state snapshots to the child via
 *   UPDATE_CHILD_DATA and receives user intents via MUSIC_ACTION.
 *
 * Mirrors the pattern already in use by CoGuestButton.vue.
 */
const props = withDefaults(defineProps<{
  isShowingInChildWindow?: boolean;
}>(), {
  isShowingInChildWindow: false,
});

const { t } = useUIKit();
const musicPanelVisible = ref(false);

// NOTE: Always resolve state and library in MusicButton (regardless of mode). In
// child-window mode the main window still owns them; in self-managed mode MusicPanel
// would resolve them too, but useMusicState/useMusicLibrary are module-level
// singletons so double-resolving is cheap and idempotent.
const musicState = useMusicState();
const library = useMusicLibrary();

// ==================== Snapshot push to child window ====================
// Progress throttling: SDK emits onPlayProgress every 100~500ms. Pushing each frame
// over IPC is wasteful. We coalesce progress into a 500ms window and push a full
// snapshot at most twice per second. Other fields (playStatus / playURL / volume /
// pitch / musicList) push immediately because they change rarely and matter for UX.
const PROGRESS_THROTTLE_MS = 500;
let progressThrottleTimer: ReturnType<typeof setTimeout> | null = null;
const isMusicChildOpen = ref(false);

function buildSnapshot(): MusicPanelSnapshot {
  return {
    musicList: library.musicList.value.map(i => ({ ...i })),
    playURL: musicState.playURL.value,
    playStatus: musicState.playStatus.value,
    playProgress: musicState.playProgress.value,
    totalDuration: musicState.totalDuration.value,
    musicVolume: musicState.musicVolume.value,
    musicPitch: musicState.musicPitch.value,
  };
}

function pushSnapshot() {
  if (!props.isShowingInChildWindow || !isMusicChildOpen.value) return;
  ipcBridge.sendToChild<UpdateChildDataPayload<MusicPanelSnapshot>>(IPCMessageType.UPDATE_CHILD_DATA, {
    panelType: ChildPanelType.Music,
    data: toPlainIpcPayload(buildSnapshot()),
  });
}

function schedulePushThrottled() {
  if (progressThrottleTimer !== null) return;
  progressThrottleTimer = setTimeout(() => {
    progressThrottleTimer = null;
    pushSnapshot();
  }, PROGRESS_THROTTLE_MS);
}

// ==================== Button click ====================
function handleToggleMusicPanel() {
  if (props.isShowingInChildWindow) {
    isMusicChildOpen.value = true;
    ipcBridge.sendToChild<ShowChildPanelPayload<MusicPanelSnapshot>>(IPCMessageType.SHOW_CHILD_PANEL, {
      panelType: ChildPanelType.Music,
      initialData: toPlainIpcPayload(buildSnapshot()),
    });
  } else {
    musicPanelVisible.value = !musicPanelVisible.value;
  }
}

// ==================== Main-window action handler ====================
// Receives MUSIC_ACTION from child window and executes against the real state/library.
// Library side-effects (auto-play on add, stop-then-remove on delete) are centralized
// here so the child window's MusicPanel stays a dumb view.
function onMusicAction(payload: MusicActionPayload) {
  switch (payload.action) {
  case 'startPlay':
    // User-initiated play (including re-trying a previously failed entry).
    // Clear any prior unplayable mark and reset the error-round guard so the
    // auto-play loop treats this as a brand-new probing round.
    {
      const item = library.musicList.value.find(i => i.url === payload.url);
      if (item) library.clearUnplayable(item.id);
      errorRoundOriginUrl.value = null;
    }
    musicState.startPlay(payload.url).catch((error) => {
      console.error('[MusicButton] startPlay failed:', error);
    });
    break;
  case 'pausePlay':
    musicState.pausePlay().catch((error) => console.error('[MusicButton] pausePlay failed:', error));
    break;
  case 'resumePlay':
    musicState.resumePlay().catch((error) => console.error('[MusicButton] resumePlay failed:', error));
    break;
  case 'stopPlay':
    musicState.stopPlay().catch((error) => console.error('[MusicButton] stopPlay failed:', error));
    break;
  case 'seek':
    musicState.seek(payload.positionMs).catch((error) => console.error('[MusicButton] seek failed:', error));
    break;
  case 'setVolume':
    musicState.setMusicVolume(payload.volume).catch(() => { /* noop */ });
    break;
  case 'setPitch':
    musicState.setPitch(payload.pitch).catch(() => { /* noop */ });
    break;
  case 'addMusic': {
    try {
      const before = library.musicList.value.length;
      const item = library.addMusic({
        urlOrFilePath: payload.urlOrFilePath,
        name: payload.name,
        durationMs: payload.durationMs,
      });
      const isNewlyAdded = library.musicList.value.length > before;
      if (isNewlyAdded) {
        TUIToast({
          type: TOAST_TYPE.SUCCESS,
          message: t('MusicPanel.AddedToast').replace('{name}', item.name),
        });
        // A brand-new entry may be exactly what the user adds to break a
        // currently halted error round. Reset the guard so the next failure
        // (if any) starts a fresh probing round that includes this new entry.
        errorRoundOriginUrl.value = null;
      } else {
        // Same url/path was already in the library — surface a clear warning
        // instead of misleading "Added" success toast.
        TUIToast({
          type: TOAST_TYPE.WARNING,
          message: t('MusicPanel.AlreadyExistsToast'),
        });
      }
      if (shouldAutoPlayAfterAdd(before, library.musicList.value.length, musicState.playStatus.value)) {
        musicState.startPlay(item.url).catch((error) => {
          console.error('[MusicButton] auto-play after add failed:', error);
        });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t('MusicPanel.AddFailed');
      TUIToast({ type: TOAST_TYPE.ERROR, message });
    }
    break;
  }
  case 'removeMusic': {
    const item = library.musicList.value.find(i => i.id === payload.id);
    // If removing the currently playing track, stop SDK playback first to release
    // native resources, then remove from the library regardless of stop outcome.
    if (item && musicState.playURL.value === item.url) {
      musicState.stopPlay()
        .catch(() => { /* noop */ })
        .finally(() => library.removeMusic(payload.id));
    } else {
      library.removeMusic(payload.id);
    }
    break;
  }
  default: {
    // Exhaustiveness guard: adding a new variant to MusicActionPayload without
    // handling it here will fail TS compilation.
    const _exhaustive: never = payload;
    void _exhaustive;
  }
  }
}

// ==================== MusicState event handlers (main window) ====================
// Error-round guard. The auto-play loop walks the whole library on every
// `onPlayError` (including tracks previously marked unplayable), so the user
// gets a chance to recover transient failures automatically. Without a guard,
// a library where *every* track is unplayable would loop forever, producing a
// toast / IPC storm.
//
// `errorRoundOriginUrl` records the url that kicked off the current failure
// round. As soon as `planNextTrackOnError` would route us back to this url —
// meaning we've already tried every other entry without success — we stop the
// loop and wait for the user to act (or for `onPlayCompleted` / Playing-state
// to signal a recovered track and clear the guard).
const errorRoundOriginUrl = ref<string | null>(null);

// onPlayCompleted: a track played end-to-end → the round is definitively
// "healthy". Reset the guard so the next error (if any) restarts a fresh
// round of probing.
const onPlayCompleted = ({ url }: { url: string }) => {
  errorRoundOriginUrl.value = null;
  const next = planNextTrackOnCompleted(library.musicList.value, url);
  if (next) {
    musicState.startPlay(next.url).catch((error) => {
      console.error('[MusicButton] auto-play next failed:', error);
    });
  }
};

// onPlayError: surface a toast (locally on Mac / forwarded via IPC on Windows),
// mark the failing entry as unplayable (UI hint only — never used as a filter),
// then advance to the next track. The error-round guard breaks the loop once
// we've cycled through the whole library without any successful playback.
const onPlayError = (payload: { url: string; code: number }) => {
  if (props.isShowingInChildWindow && isMusicChildOpen.value) {
    ipcBridge.sendToChild(IPCMessageType.MUSIC_EVENT, {
      event: 'onPlayError',
      url: payload.url,
      code: payload.code,
    });
  } else {
    TUIToast({
      type: TOAST_TYPE.ERROR,
      message: getPlayErrorMessage(payload.code, t),
    });
  }

  library.markUnplayable(payload.url);

  const next = planNextTrackOnError(library.musicList.value, payload.url);
  if (!next) {
    // Library is empty or single-track — definitive stop, no further probing.
    errorRoundOriginUrl.value = null;
    return;
  }
  // Multi-track path: detect "we've come full circle on this failure round".
  if (errorRoundOriginUrl.value === null) {
    // Start a fresh round, with the failed url as its origin.
    errorRoundOriginUrl.value = payload.url;
  } else if (next.url === errorRoundOriginUrl.value) {
    // Every track in the library has failed in this round → halt to avoid a
    // tight error loop. Wait for the user to manually retry or add a new
    // track.
    errorRoundOriginUrl.value = null;
    return;
  }
  musicState.startPlay(next.url).catch((error) => {
    console.error('[MusicButton] auto-play after error failed:', error);
  });
};

// playStatus transitions into Playing → a track is actually producing audio.
//
// Two follow-up effects:
// 1) End the error-probing round so the next failure (if any) starts fresh.
// 2) Clear the "Unplayable" mark on the now-playing entry. The flag was a
//    snapshot of an older failure; if the same track is now producing audio
//    (e.g. file was replaced, network came back), the UI should reflect the
//    current reality rather than show a stale red tag.
watch(() => musicState.playStatus.value, (status) => {
  if (status !== MusicPlayStatus.Playing) return;
  errorRoundOriginUrl.value = null;
  const url = musicState.playURL.value;
  if (!url) return;
  const item = library.musicList.value.find(i => i.url === url);
  if (item && item.isUnplayable) {
    library.clearUnplayable(item.id);
  }
});

// Authoritative-duration backfill into the library.
//
// MusicState exposes two duration sources that may differ:
//  1) `getMusicDurationInMS()`, called synchronously by AtomicX `startPlay`
//     before the SDK has decoded anything. For some formats (notably VBR mp3)
//     this returns a rough estimate based on bitrate × filesize that can be
//     off by several seconds.
//  2) `onPlayProgress(id, curPtsMS, durationMS)`, fired once the SDK is
//     actually decoding the file. This durationMS is the authoritative value.
//
// The progress bar shows whatever `totalDuration` currently holds, so it
// updates from estimate → authoritative seamlessly. The library entry's
// `durationMs`, however, used to be filled exactly once from whatever value
// happened to be in `totalDuration` first — which is usually the estimate.
// That left the list row showing a stale, inaccurate duration forever.
//
// Naive fix v1: "only backfill once playStatus reaches Playing, then always
// overwrite". That works for the steady-state but loses against a track-
// switch race: when track N fails and we auto-advance to track N+1, the
// SDK's `onPlayProgress` does not carry a url and so its durationMS is
// written into the shared `totalDuration` ref under whatever `playURL` is
// currently observed. If reactive scheduling lands in just the wrong order
// a watch tick could read `[playURL = failed track, totalDuration = next
// track's real duration]` and pollute the failed track's library entry.
//
// Naive fix v2 (url-stability grace): the watch defers backfill until the
// current `playURL` has been stable for `BACKFILL_URL_STABILITY_MS`. Each
// `playURL` change cancels pending writes. Re-validates the snapshot url
// against `playURL.value` at write time.
//
// Hardened fix v3 (this version): v2 still permits a single failure mode in
// which the SDK delivers `onPlayProgress` for the new track before the JS-
// side `startPlay(newUrl)` finishes running, leaving the snapshot inside the
// watch with mixed-track values. To kill that residual race, in addition to
// v2 we apply two stricter invariants:
//   1) **Never backfill into a track that is marked unplayable.** A track
//      can only be marked unplayable by `onPlayError`, which happens before
//      we advance to the next track. So if a stray `totalDuration` from
//      track N+1 reaches a watch tick whose snapshot `url` is still the
//      failed track N, the unplayable flag will already be true and we
//      refuse to write — this is the hard backstop that the user-visible
//      bug needed.
//   2) **Per-url duration stability**: only backfill once we have observed
//      the same `(url, totalDuration)` pair at least twice in a row. A
//      stale single-frame `totalDuration` that briefly mismatches the
//      current url will never get a second frame in agreement, so it is
//      filtered out.
const BACKFILL_URL_STABILITY_MS = 1500;
let backfillUrlChangedAt = 0;
let backfillScheduled: { url: string; timer: ReturnType<typeof setTimeout> } | null = null;
// Track the last `(url, duration)` we saw arrive together so we can require
// two consecutive agreeing frames before writing to the library.
let lastObservedUrl: string | null = null;
let lastObservedDuration = 0;

function cancelScheduledBackfill() {
  if (backfillScheduled) {
    clearTimeout(backfillScheduled.timer);
    backfillScheduled = null;
  }
}

// Reset the stability clock the moment `playURL` changes. Any in-flight
// `totalDuration` write that arrives within the grace window after a url
// switch is treated as suspect (it may belong to the previous track) and
// the backfill is deferred until url has been stable again.
watch(() => musicState.playURL.value, () => {
  backfillUrlChangedAt = Date.now();
  cancelScheduledBackfill();
  lastObservedUrl = null;
  lastObservedDuration = 0;
});

watch(
  [() => musicState.playStatus.value, () => musicState.playURL.value, () => musicState.totalDuration.value],
  ([status, url, duration]) => {
    if (status !== MusicPlayStatus.Playing) return;
    if (!url || duration <= 0) return;

    // Invariant 2: require two consecutive frames to agree on `(url, duration)`
    // before treating the value as trustworthy. A single stray progress
    // callback from a different track cannot fake this — its next progress
    // tick will carry a different duration or arrive after the url has
    // already switched.
    const sameAsLast = lastObservedUrl === url && lastObservedDuration === duration;
    lastObservedUrl = url;
    lastObservedDuration = duration;
    if (!sameAsLast) {
      return;
    }

    const sinceUrlChange = Date.now() - backfillUrlChangedAt;
    const performBackfill = () => {
      // Re-validate everything at the moment we actually write. By this
      // time a later url switch could have happened and we must not pollute
      // the previous track's library entry.
      if (musicState.playURL.value !== url) return;
      if (musicState.playStatus.value !== MusicPlayStatus.Playing) return;
      const currentDuration = musicState.totalDuration.value;
      if (currentDuration <= 0) return;
      const item = library.musicList.value.find(i => i.url === url);
      if (!item) return;
      // Invariant 1: never backfill into a track that is currently flagged
      // unplayable. Such tracks are the failed pivot of an error round; any
      // duration arriving against this url must be a leak from the
      // subsequently-started replacement track.
      if (item.isUnplayable) return;
      if (item.durationMs !== currentDuration) {
        library.updateMusic(item.id, { durationMs: currentDuration });
      }
    };
    if (sinceUrlChange >= BACKFILL_URL_STABILITY_MS) {
      // Url has already been stable long enough; safe to write right away.
      performBackfill();
      return;
    }
    // Defer the write until the url has been stable for the full grace
    // window. If another url change comes in before then, the url-change
    // watch above will cancel this pending write entirely.
    cancelScheduledBackfill();
    const timer = setTimeout(() => {
      backfillScheduled = null;
      performBackfill();
    }, BACKFILL_URL_STABILITY_MS - sinceUrlChange);
    backfillScheduled = { url, timer };
  },
);

// Observe HIDE_CHILD_PANEL so we know when to stop pushing snapshots.
// NOTE: we do NOT stopPlay on close — the BGM deliberately survives the panel
// lifecycle (the "debug before going live" workflow requires it). Only user-
// initiated stop, logout, and app-exit tear down the actual playback.
const onHideChildPanel = (payload: { panelType: ChildPanelType }) => {
  if (payload.panelType === ChildPanelType.Music) {
    isMusicChildOpen.value = false;
  }
};

// ==================== State → snapshot push wiring ====================
// Primitive fields (playURL/playStatus/totalDuration/volume/pitch) only need a
// shallow comparison; deep watching them would force an unnecessary traversal
// every time any of these unrelated primitives changes.
watch(
  () => [
    musicState.playURL.value,
    musicState.playStatus.value,
    musicState.totalDuration.value,
    musicState.musicVolume.value,
    musicState.musicPitch.value,
  ],
  () => pushSnapshot(),
);

// `musicList` is a reference type. Deep-watch only the array itself so that
// in-place metadata edits (e.g. updateMusic backfilling durationMs) still push
// a fresh snapshot, while the primitive watch above stays cheap.
watch(library.musicList, () => pushSnapshot(), { deep: true });

// High-frequency progress updates are throttled to 500ms so the IPC bus doesn't get
// saturated. Every other state change still triggers an immediate push above, so the
// user never sees a stale playStatus/volume/etc.
watch(() => musicState.playProgress.value, () => schedulePushThrottled());

// ==================== Lifecycle ====================
// All `ipcBridge.on(...)` and `subscribeEvent(...)` are bound here in a single
// onMounted hook (mirrored by a single onBeforeUnmount). Keeping registrations
// and tear-down side by side makes accidental leaks easier to spot during code
// review.
onMounted(() => {
  if (props.isShowingInChildWindow) {
    ipcBridge.on(IPCMessageType.MUSIC_ACTION, onMusicAction);
  }
  ipcBridge.on(IPCMessageType.HIDE_CHILD_PANEL, onHideChildPanel);
  musicState.subscribeEvent(MusicEvent.onPlayCompleted, onPlayCompleted);
  musicState.subscribeEvent(MusicEvent.onPlayError, onPlayError);
});

onBeforeUnmount(() => {
  if (props.isShowingInChildWindow) {
    ipcBridge.off(IPCMessageType.MUSIC_ACTION, onMusicAction);
  }
  ipcBridge.off(IPCMessageType.HIDE_CHILD_PANEL, onHideChildPanel);
  musicState.unsubscribeEvent(MusicEvent.onPlayCompleted, onPlayCompleted);
  musicState.unsubscribeEvent(MusicEvent.onPlayError, onPlayError);
  if (progressThrottleTimer !== null) {
    clearTimeout(progressThrottleTimer);
    progressThrottleTimer = null;
  }
  // Drop any pending duration backfill so a late timer cannot touch the
  // library after the component is gone.
  cancelScheduledBackfill();
});
</script>

<style lang="scss" scoped>
@import '../assets/mac.scss';

.custom-icon-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-width: 56px;
  width: auto;
  height: 56px;
  cursor: pointer;
  color: $text-color1;
  border-radius: 12px;
  position: relative;

  .custom-icon {
    @include icon-size-24;
    background: transparent;
  }

  .custom-text {
    @include text-size-12;
  }

  &:hover {
    box-shadow: 0 0 10px 0 var(--bg-color-mask);

    .custom-icon {
      color: $icon-hover-color;
    }

    .custom-text {
      color: $icon-hover-color;
    }
  }
}

:deep(.music-dialog) {
  width: 520px !important;
  height: 560px !important;
  max-height: 560px !important;
  min-height: 560px !important;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
  padding: 0 !important;
  display: flex;
  flex-direction: column;

  > .tui-dialog-header {
    display: none;
  }

  > .tui-dialog-body {
    flex: 1 1 auto;
    padding: 0 !important;
    min-height: 0;
    height: 100%;
    display: flex;
    overflow: hidden;
  }

  > .tui-dialog-footer {
    display: none;
  }
}

.music-dialog-body {
  flex: 1;
  display: flex;
  min-height: 0;
  overflow: hidden;
}

.music-btn-icon {
  color: currentColor;
}
</style>
