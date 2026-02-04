<template>
  <div class="tui-co-host-battle">
    <div class="tui-co-host-battle-content" ref="liveListContentRef" :style="{ height: isInBattle ? 'calc(100% - 3rem)' : '100%' }">
      <div v-if="isInBattle" class="tui-co-host-list">
        <div v-for="(item) in battledUserList" :key="item.roomId" class="tui-co-host-list-item">
          <div class="tui-co-host-list-item-left">
            <img :src="item.avatarUrl?.startsWith('http') ? item.avatarUrl : DEFAULT_USER_AVATAR_URL" class="tui-co-host-list-item-avatar"/>
          </div>
          <div class="tui-co-host-list-item-right">
            <span class="tui-co-host-list-item-owner">{{ item.userName }}&nbsp;</span>
            <span class="tui-co-host-list-item-status">{{ t('In battle ...') }}</span>
          </div>
        </div>
      </div>
      <div v-else class="tui-co-host-list">
        <div  class="tui-co-host-list-title">
          <span>{{  t('Candidate anchors') }}</span>
          <RefreshIcon class="tui-co-host-list-refresh-icon" @click="refreshLiveList"/>
        </div>
        <div v-for="(item) in battleInviteeList" :key="item.roomId" class="tui-co-host-list-item">
          <div class="tui-co-host-list-item-left">
            <img :src="item.avatarUrl?.startsWith('http') ? item.avatarUrl : DEFAULT_USER_AVATAR_URL" class="tui-co-host-list-item-avatar"/>
          </div>
          <div class="tui-co-host-list-item-right">
            <span class="tui-co-host-list-item-owner">{{ item.userName }}&nbsp;</span>
            <TUILiveButton class="tui-button-in-list" @click="cancelInvitation(item)">{{ t('Cancel Invitation') }}</TUILiveButton>
          </div>
        </div>
        <template v-for="(item) in liveList" :key="item.roomId">
          <div v-if="item.battleStatus !== 'Connected' && item.roomId !== roomId && (!connectionInviter || connectionInviter.roomId !== item.roomId)" class="tui-co-host-list-item">
            <div class="tui-co-host-list-item-left">
              <img :src="item.ownerAvatarUrl?.startsWith('http') ? item.ownerAvatarUrl : DEFAULT_USER_AVATAR_URL" class="tui-co-host-list-item-avatar"/>
            </div>
            <div class="tui-co-host-list-item-right">
              <span class="tui-co-host-list-item-owner">{{ item.ownerName || item.roomOwner }}&nbsp;</span>
              <TUILiveButton class="tui-button-in-list" @click="inviteOrCancel(item)">{{ item.battleStatus === 'Disconnected' ? t('Invite Battle') : t('Cancel Invitation') }}</TUILiveButton>
            </div>
          </div>
        </template>
      </div>
      <div v-if="isLoadedAllLiveList && !isInBattle" class="tui-co-host-no-more-data">
        {{ t('No more anchors') }}
      </div>
    </div>
    <div v-if="isInBattle && !isSelfExited" class="tui-co-host-footer">
      <TUILiveButton class="" @click="stopbattle">{{ t('End Battle') }}</TUILiveButton>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, Ref, onBeforeUnmount, onMounted, defineEmits } from 'vue';
import { storeToRefs } from 'pinia';
import { TUIBattleUser } from '@tencentcloud/tuiroom-engine-electron';
import TUILiveButton from '../../../../common/base/Button.vue';
import RefreshIcon from '../../../../common/icons/RefreshIcon.vue';
import TUIMessageBox from '../../../../common/base/MessageBox';
import { TUILiveInfoEx, useCurrentSourceStore } from '../../../../store/child/currentSource';
import { DEFAULT_USER_AVATAR_URL } from '../../../../constants/tuiConstant';
import { useI18n } from '../../../../locales';
import logger from '../../../../utils/logger';

const logPrefix = '[LiveCoHostBattle]';

const emits = defineEmits(['on-load-more', 'on-refresh-list']);

const liveListContentRef: Ref<HTMLElement | null> = ref(null);

const { t } = useI18n();

const currentSourceStore = useCurrentSourceStore();
const { roomId, isSelfExited, isInBattle, battledUserList, connectionInviter, battleInviteeList, liveList, isLoadedAllLiveList } = storeToRefs(currentSourceStore);

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

const cancelInvitation = (battleUser: TUIBattleUser) => {
  logger.log(`${logPrefix} cancelInvitation`, battleUser);
  currentSourceStore.cancelAnchorBattle(JSON.parse(JSON.stringify({
    roomId: battleUser.roomId,
    roomOwner: battleUser.userId,
  })));
};

const inviteOrCancel = (liveInfo: TUILiveInfoEx) => {
  if (liveInfo.battleStatus === 'Disconnected') {
    currentSourceStore.requestAnchorBattle(JSON.parse(JSON.stringify(liveInfo)));
  } else {
    currentSourceStore.cancelAnchorBattle(JSON.parse(JSON.stringify(liveInfo)));
  }
};

const stopbattle = () => {
  logger.log(`${logPrefix}stopBattle`);
  TUIMessageBox({
    message: t('Are you sure to stop battle?'),
    confirmButtonText: t('End Battle'),
    cancelButtonText: t('Cancel'),
    callback: () => {
      currentSourceStore.stopAnchorBattle();
      return Promise.resolve();
    },
    cancelCallback: () => { return Promise.resolve(); },
  });
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
.tui-co-host-battle {
  height: 100%;
}
</style>
