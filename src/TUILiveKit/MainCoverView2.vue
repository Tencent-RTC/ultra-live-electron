<template>
  <div class="tui-live-kit-main-cover dark-theme"  ref="mainCoverRef">
    <template v-for="region in userSeatStreamRegions" :key="region.userId">
      <StreamCover v-if="region.userId !== liveOwner" :region="region" :mode="connectionMode"/>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, onBeforeUnmount } from 'vue';
import type { Ref } from 'vue';
import StreamCover from './components/LiveCoverView/StreamCover.vue';
import { TUIConnectionMode, TUIUserSeatStreamRegion } from './types';
import { ipcBridge } from './ipc/IPCBridge';
import { IPCMessageType } from './ipc/types';
import { changeTheme } from './utils/utils';
import logger from './utils/logger';

const logPrefix = '[CoverView]';

const mainCoverRef: Ref<HTMLElement | null> = ref(null);

const liveId: Ref<string> = ref('');
const liveOwner: Ref<string> = ref('');

const userSeatStreamRegions: Ref<Array<TUIUserSeatStreamRegion>> = ref([]);
const connectionMode: Ref<TUIConnectionMode> = ref(TUIConnectionMode.None);

const onUpdateLiveInfo = (payload: { liveId: string; liveOwner: string }) => {
  logger.log(`${logPrefix}onUpdateLiveInfo`, payload);
  const { liveId: newLiveId, liveOwner: newLiveOwner } = payload;
  liveId.value = newLiveId;
  liveOwner.value = newLiveOwner;
  if (!newLiveId) {
    userSeatStreamRegions.value = [];
  }
};

const onUpdateUserOnSeat = (userOnSeatInfos: Array<Record<string, any>>) => {
  logger.log(`${logPrefix}onUpdateUserOnSeat`, userOnSeatInfos);
  userSeatStreamRegions.value = userOnSeatInfos as Array<TUIUserSeatStreamRegion>;
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

// function onMessage(event: Record<string, any>) {
//   logger.log(`${logPrefix}message from main window:`, event.data, event);
//   const { key, data } = event.data;
//   switch (key) {
//   case 'change-theme':
//     if (mainCoverRef.value) {
//       changeTheme(mainCoverRef.value, data);
//     }
//     break;
//   case 'stream-layout':
//     onStreamLayout(data);
//     break;
//   case 'set-connection-mode':
//     connectionMode.value = data;
//     break;
//   default:
//     logger.warn(`${logPrefix}message unknown:`, key, data);
//     break;
//   }
// }

onMounted(() => {
  ipcBridge.on(IPCMessageType.SYNC_LIVE_INFO, onUpdateLiveInfo);
  ipcBridge.on(IPCMessageType.UPDATE_USER_ON_SEAT, onUpdateUserOnSeat);
  bindMouseEnterLeaveEvent();
});

onBeforeUnmount(() => {
  ipcBridge.off(IPCMessageType.SYNC_LIVE_INFO, onUpdateLiveInfo);
  ipcBridge.off(IPCMessageType.UPDATE_USER_ON_SEAT, onUpdateUserOnSeat);
  if (mainCoverRef.value) {
    mainCoverRef.value.removeEventListener('mouseenter', onMouseEnter);
  }
});

onUnmounted(() => {
  if (mouseEventTimerId) {
    clearTimeout(mouseEventTimerId);
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
