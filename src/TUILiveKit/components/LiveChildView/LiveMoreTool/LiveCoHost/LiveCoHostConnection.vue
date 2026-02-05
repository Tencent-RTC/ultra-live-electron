<template>
  <div class="tui-co-host-connection">
    <div class="tui-co-host-connection-content" ref="liveListContentRef" :style="{ height: isInConnection ? 'calc(100% - 3rem)' : '100%' }">
      <div v-if="isInConnection" class="tui-co-host-list">
        <div class="tui-co-host-list-title">{{ `${t('Connected Anchors')}(${connectedUserList.length}/9)` }}</div>
        <div v-for="(item) in connectedUserList" :key="item.roomId" class="tui-co-host-list-item">
          <div class="tui-co-host-list-item-left">
            <img :src="item.avatarUrl?.startsWith('http') ? item.avatarUrl : DEFAULT_USER_AVATAR_URL" class="tui-co-host-list-item-avatar"/>
          </div>
          <div class="tui-co-host-list-item-right">
            <span class="tui-co-host-list-item-owner">{{ item.userName }}&nbsp;</span>
            <span class="tui-co-host-list-item-status">{{ t('In connection ...') }}</span>
          </div>
        </div>
      </div>
      <div class="tui-co-host-list">
        <div  class="tui-co-host-list-title">
          <span>{{ isInConnection ? t('Invite more anchors') : t('Candidate anchors')}}</span>
          <RefreshIcon class="tui-co-host-list-refresh-icon" @click="refreshLiveList"/>
        </div>
        <template v-for="(item) in contentionInviteeList" :key="item.roomId">
          <div v-if="item.roomId !== roomId && item.roomId !== connectionInviter?.roomId" class="tui-co-host-list-item">
            <div class="tui-co-host-list-item-left">
              <img :src="item.avatarUrl?.startsWith('http') ? item.avatarUrl : DEFAULT_USER_AVATAR_URL" class="tui-co-host-list-item-avatar"/>
            </div>
            <div class="tui-co-host-list-item-right">
              <span class="tui-co-host-list-item-owner">{{ item.userName }}&nbsp;</span>
              <TUILiveButton class="tui-button-in-list" @click="cancelInvitation(item)">{{ t('Cancel Invitation') }}</TUILiveButton>
            </div>
          </div>
        </template>
        <template v-for="(item) in liveList" :key="item.roomId">
          <div v-if="item.connectionStatus !== 'Connected' && item.roomId !== roomId && item.roomId !== connectionInviter?.roomId" class="tui-co-host-list-item">
            <div class="tui-co-host-list-item-left">
              <img :src="item.ownerAvatarUrl?.startsWith('http') ? item.ownerAvatarUrl : DEFAULT_USER_AVATAR_URL" class="tui-co-host-list-item-avatar"/>
            </div>
            <div class="tui-co-host-list-item-right">
              <span class="tui-co-host-list-item-owner">{{ item.ownerName || item.roomOwner }}&nbsp;</span>
              <TUILiveButton class="tui-button-in-list" @click="inviteOrCancel(item)">{{ item.connectionStatus === 'Disconnected' ? t('Invite Connection') : t('Cancel Invitation') }}</TUILiveButton>
            </div>
          </div>
        </template>
      </div>
      <div v-if="isLoadedAllLiveList" class="tui-co-host-no-more-data">
        {{ t('No more anchors') }}
      </div>
    </div>
    <div v-if="isInConnection" class="tui-co-host-footer">
      <TUILiveButton class="" @click="stopAnchorConnection">{{ t('Exit Connection') }}</TUILiveButton>
      <TUILiveButton class="" @click="startBattle">{{ t('Start Battle') }}</TUILiveButton>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, Ref, onBeforeUnmount, onMounted, defineEmits } from 'vue';
import { storeToRefs } from 'pinia';
import { TUILiveConnectionUser } from '@tencentcloud/tuiroom-engine-electron';
import TUILiveButton from '../../../../common/base/Button.vue';
import RefreshIcon from '../../../../common/icons/RefreshIcon.vue';
import TUIMessageBox from '../../../../common/base/MessageBox';
import { TUILiveInfoEx, useCurrentSourceStore } from '../../../../store/child/currentSource';
import { DEFAULT_USER_AVATAR_URL } from '../../../../constants/tuiConstant';
import { useI18n } from '../../../../locales';
import logger from '../../../../utils/logger';

const logPrefix = '[LiveCoHostConnection]';

const emits = defineEmits(['on-load-more', 'on-refresh-list']);

const liveListContentRef: Ref<HTMLElement | null> = ref(null);

const { t } = useI18n();

const currentSourceStore = useCurrentSourceStore();
const { roomId, isInConnection, connectedUserList, connectionInviter, contentionInviteeList, liveList, isLoadedAllLiveList } = storeToRefs(currentSourceStore);

const refreshLiveList = () => {
  logger.debug(`${logPrefix} refreshLiveList`);
  emits('on-refresh-list');
};

const onLiveRoomListScroll = (e: Event) => {
  logger.debug(`${logPrefix} onLiveRoomListScroll`, e);
  if (isLoadedAllLiveList.value) {
    return;
  }

  const target = e.target as HTMLElement;
  if (target.scrollHeight - target.scrollTop - target.clientHeight < 5) {
    logger.log(`${logPrefix} onLiveRoomListScroll reach bottom, fetch more live list`);
    emits('on-load-more');
  }
};

const cancelInvitation = (liveUser: TUILiveConnectionUser) => {
  logger.log(`${logPrefix} cancelInvitation`, liveUser);
  currentSourceStore.cancelAnchorConnection(JSON.parse(JSON.stringify({
    roomId: liveUser.roomId,
    roomOwner: liveUser.userId,
  })));
};

const inviteOrCancel = (liveInfo: TUILiveInfoEx) => {
  logger.log(`${logPrefix} inviteOrCancel roomId:`, liveInfo);
  if (liveInfo.connectionStatus === 'Disconnected') {
    currentSourceStore.requestAnchorConnection(JSON.parse(JSON.stringify(liveInfo)));
  } else if (liveInfo.connectionStatus === 'Connecting') {
    currentSourceStore.cancelAnchorConnection(JSON.parse(JSON.stringify(liveInfo)));
  } else {
    // nothing to do
  }
};

const stopAnchorConnection = () => {
  logger.log(`${logPrefix} stopAnchorConnection`);
  TUIMessageBox({
    message: t('Are you sure to stop connection?'),
    confirmButtonText: t('Exit Connection'),
    cancelButtonText: t('Cancel'),
    callback: () => {
      currentSourceStore.stopAnchorConnection();
      return Promise.resolve();
    },
    cancelCallback: () => { return Promise.resolve(); },
  });
};

const startBattle = () => {
  logger.log(`${logPrefix} startBattle`);
  currentSourceStore.startAnchorBattle();
};

onMounted(() => {
  logger.log(`${logPrefix} onMounted`);

  if (liveListContentRef.value) {
    liveListContentRef.value.addEventListener('scroll', onLiveRoomListScroll);
  } else {
    logger.warn(`${logPrefix} liveListContentRef is null`);
  }
});

onBeforeUnmount(() => {
  logger.log(`${logPrefix} onBeforeUnmount`);
  if (liveListContentRef.value) {
    liveListContentRef.value.removeEventListener('scroll', onLiveRoomListScroll);
  }
});
</script>

<style lang="scss" scoped>
.tui-co-host-connection {
  height: 100%;
}
</style>
