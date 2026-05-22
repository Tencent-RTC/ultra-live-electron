<template>
  <div
    class="music-item"
    :class="{ 'is-active': isActive, 'is-unplayable': item.isUnplayable }"
  >
    <div class="music-item-main" @click="handlePlay">
      <div class="music-icon">
        <svg
          v-if="isActive && playStatus === MusicPlayStatus.Playing"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <rect x="6" y="5" width="4" height="14" rx="1" />
          <rect x="14" y="5" width="4" height="14" rx="1" />
        </svg>
        <svg
          v-else-if="isActive && playStatus === MusicPlayStatus.Paused"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M8 5.14v13.72a1 1 0 0 0 1.55.83l10.56-6.86a1 1 0 0 0 0-1.66L9.55 4.31A1 1 0 0 0 8 5.14z" />
        </svg>
        <svg
          v-else-if="isActive && playStatus === MusicPlayStatus.Loading"
          class="loading-spin"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
        >
          <path d="M12 3a9 9 0 1 0 9 9" />
        </svg>
        <svg
          v-else
          width="14"
          height="14"
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
      </div>
      <div class="music-info">
        <div class="music-name" :title="item.name">{{ item.name }}</div>
        <div class="music-meta">
          <span v-if="item.isNetwork" class="badge">{{ t('MusicPanel.BadgeNetwork') }}</span>
          <span v-else class="badge">{{ t('MusicPanel.BadgeLocal') }}</span>
          <span v-if="effectiveDurationMs > 0" class="duration">{{ formatDuration(effectiveDurationMs) }}</span>
        </div>
      </div>
    </div>
    <div class="music-item-actions">
      <span
        v-if="item.isUnplayable"
        class="unplayable-tag"
        :title="t('MusicPanel.UnplayableTag')"
      >{{ t('MusicPanel.UnplayableTag') }}</span>
      <button class="action-btn remove-btn" :title="t('MusicPanel.Remove')" @click.stop="handleRemove">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useUIKit } from '@tencentcloud/uikit-base-component-vue3';
import { MusicPlayStatus } from 'tuikit-atomicx-vue3-electron';
import type { MusicLibItem } from '../../hooks/useMusicLibrary';

const { t } = useUIKit();

const props = defineProps<{
  item: MusicLibItem;
  isActive: boolean;
  playStatus: MusicPlayStatus;
  totalDuration: number;
}>();

const emits = defineEmits<{
  play: [item: MusicLibItem];
  remove: [item: MusicLibItem];
}>();

// Prefer the item's own duration; fall back to live `totalDuration` while it is the active track
// (useful for network resources whose duration is only known after first play).
const effectiveDurationMs = computed(() => {
  if (props.item.durationMs > 0) return props.item.durationMs;
  if (props.isActive && props.totalDuration > 0) return props.totalDuration;
  return 0;
});

function handlePlay() {
  emits('play', props.item);
}

function handleRemove() {
  emits('remove', props.item);
}

function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '--:--';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
</script>

<style lang="scss" scoped>
.music-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  border-radius: 10px;
  cursor: pointer;
  transition: background-color 0.15s ease;
  position: relative;

  &:hover {
    background-color: var(--mp-bg-hover, rgba(255, 255, 255, 0.05));
  }

  &.is-active {
    background-color: var(--mp-bg-active, rgba(28, 102, 229, 0.16));

    &::before {
      content: '';
      position: absolute;
      top: 10px;
      bottom: 10px;
      left: 0;
      width: 3px;
      border-radius: 2px;
      background: var(--mp-primary, #1c66e5);
    }

    .music-icon {
      background: linear-gradient(135deg, #3b7ff0 0%, #1c66e5 100%);
      color: #fff;
      border-color: transparent;
    }

    .music-name {
      color: var(--mp-primary, #1c66e5);
    }
  }
}

.music-item-main {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.music-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.06);
  color: var(--mp-text-secondary, #9ca3af);
  flex-shrink: 0;
  transition: all 0.15s ease;

  .loading-spin {
    animation: mp-item-spin 0.9s linear infinite;
  }
}

@keyframes mp-item-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.music-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.music-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--mp-text, #f3f4f6);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color 0.15s ease;
}

.music-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 2px;
  font-size: 11px;
  color: var(--mp-text-tertiary, #6b7280);
}

.badge {
  padding: 1px 6px;
  border-radius: 4px;
  border: 1px solid var(--mp-border, rgba(28, 102, 229, 0.24));
  color: var(--mp-primary, #1c66e5);
  font-size: 10px;
  line-height: 1.4;
  background: transparent;
}

.duration {
  font-variant-numeric: tabular-nums;
}

.music-item-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  opacity: 0;
  transition: opacity 0.15s ease;

  .music-item:hover &,
  .music-item.is-unplayable & {
    /* Keep the "Unplayable" tag visible without requiring hover so the user
       can immediately spot tracks that have been auto-skipped. */
    opacity: 1;
  }
}

.unplayable-tag {
  font-size: 11px;
  line-height: 1;
  font-weight: 500;
  color: #ef4444;
  white-space: nowrap;
  user-select: none;
}

.action-btn {
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--mp-text-secondary, #9ca3af);
  border-radius: 6px;
  cursor: pointer;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
    color: var(--mp-text, #f3f4f6);
  }

  &.remove-btn:hover {
    color: #ef4444;
  }
}
</style>
