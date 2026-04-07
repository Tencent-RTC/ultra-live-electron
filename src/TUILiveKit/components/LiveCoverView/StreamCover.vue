<template>
  <div ref="streamCoverRef" class="tui-live-cover-stream" :style="positonStyle">
    <template v-if="region.userId">
      <div class="tui-stream-avatar" v-if="region.userCameraStatus !== TUIDeviceStatus.TUIDeviceStatusOpened">
        <img :src="region.userAvatar || DEFAULT_USER_AVATAR_URL" width="3rem" height="3rem" />
      </div>
      <div class="tui-stream-state">
        <span class="tui-mic-state">
          <MicOffIcon v-if="region.userMicrophoneStatus !== TUIDeviceStatus.TUIDeviceStatusOpened" />
        </span>
        <span class="tui-stream-name">{{ props.region.userName || props.region.userId }}</span>
      </div>
    </template>
    <div v-else class="tui-empty-region">
      <span class="tui-seat-index">{{ props.region.seatIndex }}</span>
      <span class="tui-seat-hint">{{ t('LiveView.WaitingForConnection') }}</span>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, defineProps, onMounted, onUnmounted } from 'vue';
import type { Ref } from 'vue';
import { TUIDeviceStatus } from '@tencentcloud/tuiroom-engine-electron';
import { TUIConnectionMode, TUIUserSeatStreamRegion } from '../../types';
import { useUIKit } from '@tencentcloud/uikit-base-component-vue3';
import MicOffIcon from '../../common/icons/MicOffIcon.vue';
import { DEFAULT_USER_AVATAR_URL } from '../../constants/tuiConstant';
import logger from '../../utils/logger';

type Props = {
  region: TUIUserSeatStreamRegion;
  mode: TUIConnectionMode;
};

const logPrefix = '[TUILiveKitStreamCover]';

const { t } = useUIKit();
const props = defineProps<Props>();

const streamCoverRef: Ref<HTMLElement | null> = ref(null);

const positonStyle = computed(() => {
  return {
    left: `${props.region.rect.left}px`,
    top: `${props.region.rect.top}px`,
    width: `${props.region.rect.right - props.region.rect.left}px`,
    height: `${props.region.rect.bottom - props.region.rect.top}px`,
  };
});

// eslint-disable-next-line no-undef
let timerId: string | number | NodeJS.Timeout | undefined;
const bindMouseEnterLeaveEvent = () => {
  if (streamCoverRef.value) {
    streamCoverRef.value.addEventListener('mouseleave', () => {
      window.ipcRenderer.send('set-ignore-mouse-events', true, { forward: true });
    });
    streamCoverRef.value.addEventListener('mouseenter', () => {
      window.ipcRenderer.send('set-ignore-mouse-events', false);
    });
  } else {
    logger.warn(`${logPrefix}onMounted error, streamCoverRef not exist`);
    timerId = setTimeout(() => {
      timerId = 0;
      bindMouseEnterLeaveEvent();
    }, 200);
  }
};

onMounted(() => {
  bindMouseEnterLeaveEvent();
});

onUnmounted(() => {
  if (timerId) {
    clearTimeout(timerId);
  }
});
</script>

<style lang="scss" scoped>
@import '../../assets/variable.scss';

.tui-live-cover-stream {
  position: absolute;
  border: 1px solid var(--stroke-color-primary);

  .tui-stream-avatar {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);

    img {
      width: 3rem;
      height: 3rem;
      border-radius: 1.5rem;
    }
  }

  .tui-stream-state {
    position: absolute;
    left: 0.125rem;
    bottom: 0.125rem;
    display: inline-flex;
    align-items: center;
    height: 1rem;
    width: 3rem;
    padding: 0.125rem 0 0.125rem 0.125rem;
    border-radius: 0.5rem;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    background-color: $color-cover-pendant-background;
    font-size: 0.75rem;
    color: var(--text-color-button);

    .tui-mic-state {
      display: inline-flex;
      justify-content: center;
      align-items: center;
      width: auto;
      max-width: 0.75rem;
      height: 0.75rem;
      margin-right: 0.25rem;
      color: $color-audio-setting-tab-mic-bar-active-background;
    }

    .tui-stream-name {
      width: auto;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }

  .tui-empty-region {
    width: 100%;
    height: 100%;
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    color: var(--text-color-secondary);

    .tui-seat-index {
      font-size: 1.5rem;
      font-weight: 500;
    }

    .tui-seat-hint {
      max-width: 80%;
      font-size: 0.875rem;
      font-weight: 400;
      overflow-wrap: break-word;
    }
  }
}
</style>
