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
  useMusicState,
} from 'tuikit-atomicx-vue3-electron';
import { useMusicLibrary } from '../hooks/useMusicLibrary';
import { planNextTrack, shouldAutoPlayAfterAdd } from '../hooks/useMusicPlaybackPolicy';
import MusicPanel from './MusicPanel/index.vue';
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
// onPlayCompleted: app-layer decides the "play next" policy. Keep it in the main
// window so child windows don't need to coordinate scheduling.
const onPlayCompleted = ({ url }: { url: string }) => {
  const next = planNextTrack(library.musicList.value, url);
  if (next) {
    musicState.startPlay(next.url).catch((error) => {
      console.error('[MusicButton] auto-play next failed:', error);
    });
  }
};

// onPlayError: forward to child window for toast (child owns its own localized toast
// UI); also surface as a local toast when child is closed / Mac self-managed mode,
// so the user always sees the error.
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
      message: t('MusicPanel.PlayFailedWithCode').replace('{code}', String(payload.code)),
    });
  }
};

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
