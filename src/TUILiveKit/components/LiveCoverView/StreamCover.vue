<template>
  <div ref="streamCoverRef" class="tui-live-cover-stream" :style="positonStyle">
    <template v-if="region.userId">
      <div class="tui-stream-avatar" v-if="region.userCameraStatus !== TUIDeviceStatus.TUIDeviceStatusOpened">
        <img :src="region.userAvatar || DEFAULT_USER_AVATAR_URL" width="3rem" height="3rem" />
      </div>
      <div v-if="mode === TUIConnectionMode.CoGuest" class="tui-menu-icon" ref="moreIconRef">
        <MoreIcon @click="openMoreMenu" class="tui-more-icon"/>
      </div>
      <div class="tui-stream-state">
        <span class="tui-mic-state">
          <MicOffIcon v-if="region.userMicrophoneStatus !== TUIDeviceStatus.TUIDeviceStatusOpened" />
        </span>
        <span class="tui-stream-name">{{ props.region.userName || props.region.userId }}</span>
      </div>
      <LiveMemberControl v-if="isMoreMenuVisible" class="tui-stream-cover-pop-menu" :user-id="region.userId"
          @on-close="closeMoreMenu" @on-kick-off-seat="onKickOffSeat" @on-kick-out-room="onKickOutRoom" />
    </template>
    <div v-else class="tui-empty-region">
      +
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, defineProps, onMounted, onUnmounted } from 'vue';
import type { Ref } from 'vue';
import { TUIDeviceStatus } from '@tencentcloud/tuiroom-engine-electron';
import { TUIConnectionMode, TUIUserSeatStreamRegion } from '../../types';
import MicOffIcon from '../../common/icons/MicOffIcon.vue';
import MoreIcon from '../../common/icons/MoreIcon.vue';
import LiveMemberControl from '../LiveChildView/LiveMemberControl.vue';
import { DEFAULT_USER_AVATAR_URL } from '../../constants/tuiConstant';
import logger from '../../utils/logger';

type Props = {
  region: TUIUserSeatStreamRegion;
  mode: TUIConnectionMode;
};

const logPrefix = '[TUILiveKitStreamCover]';

const props = defineProps<Props>();

const streamCoverRef: Ref<HTMLElement | null> = ref(null);
const moreIconRef: Ref<HTMLElement | null> = ref(null);
const isMoreMenuVisible: Ref<boolean> = ref(false);

const positonStyle = computed(() => {
  return {
    left: `${props.region.rect.left}px`,
    top: `${props.region.rect.top}px`,
    width: `${props.region.rect.right - props.region.rect.left}px`,
    height: `${props.region.rect.bottom - props.region.rect.top}px`,
  };
});

const openMoreMenu = () => {
  isMoreMenuVisible.value = true;
};

const closeMoreMenu = () => {
  isMoreMenuVisible.value = false;
};

const onKickOffSeat = (userId: string) => {
  logger.log(`${logPrefix}onKickOffSeat:${userId}`);
  window.mainWindowPortInCover?.postMessage({
    key: 'kickOffSeat',
    data: {
      userId,
    }
  });
};


const onKickOutRoom = (userId: string) => {
  logger.log(`${logPrefix}onKickOutRoom:${userId}`);
  window.mainWindowPortInCover?.postMessage({
    key: 'kickOutRoom',
    data: {
      userId,
    }
  });
};

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

const onClickOutMenuSide = (event: MouseEvent) => {
  if (moreIconRef.value && moreIconRef.value.contains(event.target as Node)) {
    return;
  }
  closeMoreMenu();
};

onMounted(() => {
  bindMouseEnterLeaveEvent();
  document.addEventListener('click', onClickOutMenuSide, false);
});

onUnmounted(() => {
  if (timerId) {
    clearTimeout(timerId);
  }
  document.removeEventListener('click', onClickOutMenuSide, false);
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

  &:hover .tui-menu-icon {
    display: block;
  }
  .tui-menu-icon {
    display: none;
    position: absolute;
    top: 0.125rem;
    right: 0.125rem;
    width: 1.25rem;
    height: 1.25rem;
    border-radius: 0.25rem;
    background-color: $color-cover-pendant-background;
    cursor: pointer;

    .tui-more-icon {
      transform: rotate(90deg);
    }

    &:hover {
      background-color: $font-button-text-hover-color;
    }

    &:active {
      background-color: $font-button-text-active-color;
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
    align-items: center;
    justify-content: center;
    font-size: 3rem;
    color: var(--text-color-secondary);
  }

  .tui-stream-cover-pop-menu {
    top: 1.5rem;
  }
}
</style>
