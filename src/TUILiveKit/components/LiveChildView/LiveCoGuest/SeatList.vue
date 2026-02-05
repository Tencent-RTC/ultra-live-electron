<template>
  <div class="tui-co-guest-list">
    <template v-if="seatedList.length >= 1">
      <div class="tui-co-guest-list-title">
        <span>{{ t('Current seat') }}</span>
        <span>{{ `(${seatedList.length})` }}</span>
      </div>
      <div v-for="item in seatedList" :key="item.userId" class="tui-co-guest-item">
        <div class="tui-co-guest-item-left">
          <img :src="item.avatarUrl?.startsWith('http') ? item.avatarUrl : DEFAULT_USER_AVATAR_URL" alt=""
            class="tui-co-guest-avatar">
        </div>
        <div class="tui-co-guest-item-right">
          <div class="tui-co-guest-user-info">
            <span class="tui-co-guest-name"> {{ item.userName || item.userId }}</span>
            <span v-if="item.userId === roomOwner" class="tui-co-guest-is-me">{{ `(${t('Me')})` }}</span>
          </div>
          <div v-if="item.userId !== roomOwner" class="tui-co-guest-actions">
            <TUILiveButton class="live-action tui-co-guest-reject" @click="onKickOffSeat(item.userId)">{{ t('Disconnect')}}</TUILiveButton>
          </div>
        </div>
      </div>
    </template>
    <div v-else class="tui-co-guest-empty">
      {{ t('Seat is empty') }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import TUILiveButton from '../../../common/base/Button.vue';
import { useCurrentSourceStore } from '../../../store/child/currentSource';
import { DEFAULT_USER_AVATAR_URL } from '@/TUILiveKit/constants/tuiConstant';
import { useI18n } from '../../../locales';
import logger from '../../../utils/logger';

const logPrefix = '[LiveCoHostSeatList]';

const { t } = useI18n();

const currentSourceStore = useCurrentSourceStore();
const { seatedList, roomOwner } = storeToRefs(currentSourceStore);

const onKickOffSeat = (userId: string) => {
  logger.log(`${logPrefix}onKickOffSeat:${userId}`);
  window.mainWindowPortInChild?.postMessage({
    key: 'kickOffSeat',
    data: {
      userId,
    }
  });
};
</script>
