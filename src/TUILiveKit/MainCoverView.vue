<template>
  <div class="tui-live-kit-main-cover dark-theme"  ref="mainCoverRef">
    <template v-for="region in userSeatStreamRegions" :key="region.userId">
      <StreamCover v-if="region.userId !== roomOwner" :region="region" :mode="connectionMode"/>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, onBeforeUnmount } from 'vue';
import type { Ref } from 'vue';
import StreamCover from './components/LiveCoverView/StreamCover.vue';
import { TUIConnectionMode, TUIUserSeatStreamRegion } from './types';
import { changeTheme } from './utils/utils';
import logger from './utils/logger';

const logPrefix = '[CoverView]';

const mainCoverRef: Ref<HTMLElement | null> = ref(null);

const roomId: Ref<string> = ref('');
const roomOwner: Ref<string> = ref('');

const userSeatStreamRegions: Ref<Array<TUIUserSeatStreamRegion>> = ref([]);
const connectionMode: Ref<TUIConnectionMode> = ref(TUIConnectionMode.None);

const onStreamLayout = (layout: { roomId: string; roomOwner: string; regions: Array<TUIUserSeatStreamRegion>; }) => {
  logger.log(`${logPrefix}onStreamLayout`, layout);
  roomId.value = layout.roomId;
  roomOwner.value = layout.roomOwner;
  userSeatStreamRegions.value = layout.regions;
};

function onMouseEnter() {
  window.ipcRenderer.send('set-ignore-mouse-events', true, { forward: true });
}

// eslint-disable-next-line no-undef
let mouseEventTimerId: string | number | NodeJS.Timeout | undefined;
function bindMouseEnterLeaveEvent() {
  if (mainCoverRef.value) {
    mainCoverRef.value.addEventListener('mouseenter', onMouseEnter);
  } else {
    logger.warn(`${logPrefix}onMounted error, mainCoverRef not exist`);
    mouseEventTimerId = setTimeout(() => {
      mouseEventTimerId = 0;
      bindMouseEnterLeaveEvent();
    }, 200);
  }
}

function onMessage(event: Record<string, any>) {
  logger.log(`${logPrefix}message from main window:`, event.data, event);
  const { key, data } = event.data;
  switch (key) {
  case 'change-theme':
    if (mainCoverRef.value) {
      changeTheme(mainCoverRef.value, data);
    }
    break;
  case 'stream-layout':
    onStreamLayout(data);
    break;
  case 'set-connection-mode':
    connectionMode.value = data;
    break;
  default:
    logger.warn(`${logPrefix}message unknown:`, key, data);
    break;
  }
}

// eslint-disable-next-line no-undef
let messageEventTimerId: string | number | NodeJS.Timeout | undefined;
function initMainWindowMessageListener() {
  logger.log(`${logPrefix}initMainWindowMessageListener`);
  if (window.mainWindowPortInCover) {
    window.mainWindowPortInCover.addEventListener('message', onMessage);
    window.mainWindowPortInCover.start();
    window.mainWindowPortInCover.postMessage({
      key: 'notice-from-cover',
      data: 'cover window port started',
    });
  } else {
    logger.warn(`${logPrefix}initMainWindowMessageListener port not ready, will retry in 1s`);
    messageEventTimerId = setTimeout(()=>{
      messageEventTimerId = 0;
      initMainWindowMessageListener();
    }, 1000);
  }
}

onMounted(() => {
  bindMouseEnterLeaveEvent();
  initMainWindowMessageListener();
});

onBeforeUnmount(() => {
  if (mainCoverRef.value) {
    mainCoverRef.value.removeEventListener('mouseenter', onMouseEnter);
  }
});

onUnmounted(() => {
  if (mouseEventTimerId) {
    clearTimeout(mouseEventTimerId);
  }
  if (messageEventTimerId) {
    clearTimeout(messageEventTimerId);
  }
  if (window.mainWindowPortInCover) {
    window.mainWindowPortInCover.removeEventListener('message', onMessage);
  }
});
</script>

<style lang="css" scoped>
@import './assets/global.scss';

.tui-live-kit-main-cover {
  width: 100vw;
  height: 100vh;
}
</style>
