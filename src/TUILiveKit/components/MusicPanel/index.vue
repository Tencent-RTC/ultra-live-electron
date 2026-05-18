<template>
  <div class="music-panel">
    <div class="panel-header">
      <div class="brand">
        <div class="brand-title">{{ t('MusicPanel.Title') }}</div>
      </div>
      <div class="header-actions">
        <button
          class="icon-btn primary"
          :title="t('MusicPanel.AddBtn')"
          @click="showAddDialog = true"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
        <button
          class="close-btn"
          :title="t('MusicPanel.Cancel')"
          @click="$emit('close')"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>

    <div class="panel-body">
      <div
        v-if="musicList.length === 0"
        class="empty-state"
        role="button"
        tabindex="0"
        @click="showAddDialog = true"
        @keydown.enter.prevent="showAddDialog = true"
        @keydown.space.prevent="showAddDialog = true"
      >
        <div class="empty-icon-wrap">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
        </div>
        <div class="empty-text">{{ t('MusicPanel.EmptyText') }}</div>
        <div class="empty-subtext">{{ t('MusicPanel.EmptySubtext') }}</div>
      </div>

      <div v-else class="music-list">
        <MusicListItem
          v-for="item in musicList"
          :key="item.id"
          :item="item"
          :isActive="playURL === item.url"
          :playStatus="playStatus"
          :totalDuration="totalDuration"
          @play="handlePlayOrToggle"
          @remove="handleRemove"
        />
      </div>
    </div>

    <div class="playback-control">
      <div class="progress-row">
        <input
          type="range"
          class="mp-slider progress-slider"
          :style="progressSliderStyle"
          :min="0"
          :max="totalDuration || 0"
          :step="100"
          :value="progressSliderValue"
          :disabled="totalDuration <= 0 || !currentItem"
          @input="handleProgressInput"
          @change="handleProgressChange"
        />
        <div class="time-row">
          <span class="time">{{ formatDuration(playProgress) }}</span>
          <span class="time">{{ formatDuration(totalDuration) }}</span>
        </div>
      </div>

      <div class="setting-row">
        <svg class="setting-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
        </svg>
        <input
          type="range"
          class="mp-slider setting-slider"
          :style="volumeSliderStyle"
          :min="0"
          :max="100"
          :step="1"
          :value="musicVolume"
          @input="handleVolumeInput"
        />
        <span class="setting-value">{{ musicVolume }}</span>
      </div>

      <div class="setting-row">
        <svg
          class="setting-icon"
          :title="t('MusicPanel.Pitch')"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M3 12c2 0 2 -5 4 -5s2 10 4 10s2 -10 4 -10s2 5 4 5" />
        </svg>
        <input
          type="range"
          class="mp-slider setting-slider"
          :style="pitchSliderStyle"
          :min="-1"
          :max="1"
          :step="0.1"
          :value="musicPitch"
          @input="handlePitchInput"
        />
        <span class="setting-value">{{ musicPitch.toFixed(1) }}</span>
      </div>
    </div>

    <AddMusicDialog
      v-if="showAddDialog"
      @add="handleAdd"
      @close="showAddDialog = false"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { TUIToast, TOAST_TYPE, useUIKit } from '@tencentcloud/uikit-base-component-vue3';
import {
  MusicEvent,
  MusicPlayStatus,
  useMusicState,
} from 'tuikit-atomicx-vue3-electron';
import { useMusicLibrary } from '../../hooks/useMusicLibrary';
import { planNextTrack, shouldAutoPlayAfterAdd } from '../../hooks/useMusicPlaybackPolicy';
import type { MusicLibItem } from '../../hooks/useMusicLibrary';
import type { MusicPanelSnapshot, MusicActionPayload } from '../../ipc';
import AddMusicDialog from './AddMusicDialog.vue';
import MusicListItem from './MusicListItem.vue';
import { buildSliderBackground, formatDuration } from './helpers';

/**
 * MusicPanel supports two modes:
 *
 * 1. **Self-managed mode** (default, used by Mac and by Windows main window TUIDialog):
 *    Panel owns its state via useMusicState() + useMusicLibrary(); all actions call
 *    SDK/library APIs directly.
 *
 * 2. **Controlled mode** (`controlled=true`, used inside the Windows child window):
 *    Panel is a dumb view: state is read from `snapshot` prop pushed by the main
 *    window, user intents are emitted as typed `action` events so the child window
 *    can forward them back to the main window via IPC.
 *
 * The template and most of the script are mode-agnostic — the switch is isolated in
 * a handful of computed routers (playURL/playStatus/.../musicList) and a single
 * `dispatch(action)` function that routes intents to either local APIs or emits.
 */
const props = defineProps<{
  controlled?: boolean;
  snapshot?: MusicPanelSnapshot;
}>();

const emits = defineEmits<{
  close: [];
  action: [action: MusicActionPayload];
}>();

const { t } = useUIKit();

// Local state handles are only resolved in self-managed mode. In controlled mode
// we deliberately skip useMusicState() / useMusicLibrary() to avoid spawning a
// second MusicState singleton inside the child process (whose TRTCCloud wrapper
// would compete with the main window's SDK calls).
const localState = !props.controlled ? useMusicState() : null;
const localLibrary = !props.controlled ? useMusicLibrary() : null;

// ==================== State routers ====================
// In controlled mode read from snapshot; in self-managed mode read from local refs.
// All downstream template / script code consumes these computed properties and is
// blissfully unaware of the active mode.
const playURL = computed<string | null>(() =>
  props.controlled ? (props.snapshot?.playURL ?? null) : (localState?.playURL.value ?? null),
);
const playStatus = computed<MusicPlayStatus>(() =>
  props.controlled
    ? (props.snapshot?.playStatus ?? MusicPlayStatus.Idle)
    : (localState?.playStatus.value ?? MusicPlayStatus.Idle),
);
const playProgress = computed<number>(() =>
  props.controlled ? (props.snapshot?.playProgress ?? 0) : (localState?.playProgress.value ?? 0),
);
const totalDuration = computed<number>(() =>
  props.controlled ? (props.snapshot?.totalDuration ?? 0) : (localState?.totalDuration.value ?? 0),
);
const musicVolume = computed<number>(() =>
  props.controlled ? (props.snapshot?.musicVolume ?? 60) : (localState?.musicVolume.value ?? 60),
);
const musicPitch = computed<number>(() =>
  props.controlled ? (props.snapshot?.musicPitch ?? 0) : (localState?.musicPitch.value ?? 0),
);
const musicList = computed<MusicLibItem[]>(() =>
  props.controlled
    ? ((props.snapshot?.musicList ?? []) as MusicLibItem[])
    : (localLibrary?.musicList.value ?? []),
);

const currentItem = computed<MusicLibItem | null>(() => {
  const url = playURL.value;
  if (!url) return null;
  if (props.controlled) {
    return musicList.value.find(i => i.url === url) ?? null;
  }
  return localLibrary?.findMusicByUrl(url) ?? null;
});

// ==================== Action dispatcher ====================
// In controlled mode, emit a typed action so the child window can forward it via IPC.
// In self-managed mode, route to the local state/library APIs directly.
function dispatch(action: MusicActionPayload): void {
  if (props.controlled) {
    emits('action', action);
    return;
  }
  if (!localState || !localLibrary) return;
  switch (action.action) {
  case 'startPlay':
    localState.startPlay(action.url).catch((error) => {
      console.error('[MusicPanel] startPlay failed:', error);
      TUIToast({ type: TOAST_TYPE.ERROR, message: t('MusicPanel.PlayFailed') });
    });
    break;
  case 'pausePlay':
    localState.pausePlay().catch((error) => console.error('[MusicPanel] pausePlay failed:', error));
    break;
  case 'resumePlay':
    localState.resumePlay().catch((error) => console.error('[MusicPanel] resumePlay failed:', error));
    break;
  case 'stopPlay':
    localState.stopPlay().catch((error) => console.error('[MusicPanel] stopPlay failed:', error));
    break;
  case 'seek':
    localState.seek(action.positionMs).catch((error) => console.error('[MusicPanel] seek failed:', error));
    break;
  case 'setVolume':
    localState.setMusicVolume(action.volume).catch(() => { /* noop */ });
    break;
  case 'setPitch':
    localState.setPitch(action.pitch).catch(() => { /* noop */ });
    break;
  case 'addMusic': {
    const before = localLibrary.musicList.value.length;
    const item = localLibrary.addMusic({
      urlOrFilePath: action.urlOrFilePath,
      name: action.name,
      durationMs: action.durationMs,
    });
    const isNewlyAdded = localLibrary.musicList.value.length > before;
    if (isNewlyAdded) {
      TUIToast({
        type: TOAST_TYPE.SUCCESS,
        message: t('MusicPanel.AddedToast').replace('{name}', item.name),
      });
    } else {
      TUIToast({
        type: TOAST_TYPE.WARNING,
        message: t('MusicPanel.AlreadyExistsToast'),
      });
    }
    if (shouldAutoPlayAfterAdd(before, localLibrary.musicList.value.length, localState.playStatus.value)) {
      localState.startPlay(item.url).catch((error) => {
        console.error('[MusicPanel] auto-play after add failed:', error);
      });
    }
    break;
  }
  case 'removeMusic': {
    const item = localLibrary.musicList.value.find(i => i.id === action.id);
    if (item && localState.playURL.value === item.url) {
      localState.stopPlay().catch(() => { /* noop */ }).finally(() => {
        localLibrary.removeMusic(action.id);
      });
    } else {
      localLibrary.removeMusic(action.id);
    }
    break;
  }
  default: {
    // Exhaustiveness guard: adding a new variant to MusicActionPayload without
    // handling it here will fail TS compilation.
    const _exhaustive: never = action;
    void _exhaustive;
  }
  }
}

// ==================== Progress slider interaction ====================
const isDraggingProgress = ref(false);
const draggingProgressMs = ref(0);

const progressSliderValue = computed(() => {
  return isDraggingProgress.value ? draggingProgressMs.value : playProgress.value;
});

const progressSliderStyle = computed(() => {
  const max = totalDuration.value || 0;
  const val = progressSliderValue.value;
  const pct = max > 0 ? (val / max) * 100 : 0;
  return { background: buildSliderBackground(pct) };
});

const volumeSliderStyle = computed(() => ({
  background: buildSliderBackground(musicVolume.value),
}));

// Map pitch range -1..1 to 0..100 for slider fill visualization
const pitchSliderStyle = computed(() => ({
  background: buildSliderBackground(((musicPitch.value + 1) / 2) * 100),
}));

const showAddDialog = ref(false);

function handleAdd(payload: { url: string; name: string }) {
  showAddDialog.value = false;
  // Toast (success vs. duplicate-warning) is decided by whoever ultimately
  // owns the library and can compare list length before/after. That is the
  // main window's `MusicButton` in controlled mode, and our local `dispatch`
  // branch in self-managed mode. Don't pre-toast here — we cannot tell yet
  // whether the entry is a brand-new addition or a duplicate.
  dispatch({ action: 'addMusic', urlOrFilePath: payload.url, name: payload.name });
}

function handleRemove(item: MusicLibItem) {
  dispatch({ action: 'removeMusic', id: item.id });
}

function handlePlayOrToggle(item: MusicLibItem) {
  if (playURL.value === item.url) {
    handleToggle();
    return;
  }
  dispatch({ action: 'startPlay', url: item.url });
}

function handleToggle() {
  if (playStatus.value === MusicPlayStatus.Playing) {
    dispatch({ action: 'pausePlay' });
  } else if (playStatus.value === MusicPlayStatus.Paused) {
    dispatch({ action: 'resumePlay' });
  } else if (playStatus.value === MusicPlayStatus.Idle && currentItem.value) {
    dispatch({ action: 'startPlay', url: currentItem.value.url });
  }
}

function handleProgressInput(event: Event) {
  const target = event.target as HTMLInputElement;
  isDraggingProgress.value = true;
  draggingProgressMs.value = Number(target.value) || 0;
}

function handleProgressChange(event: Event) {
  const target = event.target as HTMLInputElement;
  const val = Number(target.value) || 0;
  isDraggingProgress.value = false;
  dispatch({ action: 'seek', positionMs: val });
}

function handleVolumeInput(event: Event) {
  const target = event.target as HTMLInputElement;
  const val = Number(target.value);
  dispatch({ action: 'setVolume', volume: val });
}

function handlePitchInput(event: Event) {
  const target = event.target as HTMLInputElement;
  const val = Number(target.value);
  dispatch({ action: 'setPitch', pitch: val });
}

// ==================== Event subscriptions (self-managed mode only) ====================
// Controlled mode: the main window owns event handling (auto-play next on completion,
// toast on error); child window just renders whatever snapshot/MUSIC_EVENT arrives.
//
// Self-managed mode: subscribe directly to MusicState events for auto-play-next and
// error toasts, identical to the pre-refactor behavior.
if (!props.controlled && localState && localLibrary) {
  const onPlayCompleted = ({ url }: { url: string }) => {
    const next = planNextTrack(localLibrary.musicList.value, url);
    if (next) {
      localState.startPlay(next.url).catch((error) => {
        console.error('[MusicPanel] auto-play next failed:', error);
      });
    }
  };

  const onPlayError = ({ url, code }: { url: string; code: number }) => {
    console.error('[MusicPanel] play error:', code, url);
    TUIToast({
      type: TOAST_TYPE.ERROR,
      message: t('MusicPanel.PlayFailedWithCode').replace('{code}', String(code)),
    });
  };

  localState.subscribeEvent(MusicEvent.onPlayCompleted, onPlayCompleted);
  localState.subscribeEvent(MusicEvent.onPlayError, onPlayError);

  onBeforeUnmount(() => {
    localState.unsubscribeEvent(MusicEvent.onPlayCompleted, onPlayCompleted);
    localState.unsubscribeEvent(MusicEvent.onPlayError, onPlayError);
  });

  // Backfill track duration into library once known from onPlayProgress.
  // Only in self-managed mode: library is owned here.
  watch([() => localState.playURL.value, () => localState.totalDuration.value], ([url, duration]) => {
    if (!url || duration <= 0) return;
    const item = localLibrary.findMusicByUrl(url);
    if (item && item.durationMs <= 0) {
      localLibrary.updateMusic(item.id, { durationMs: duration });
    }
  });
}
</script>

<style lang="scss" src="./MusicPanel.scss" scoped />
