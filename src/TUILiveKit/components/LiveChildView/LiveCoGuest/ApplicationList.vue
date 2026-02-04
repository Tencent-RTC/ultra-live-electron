<template>
  <div class="tui-co-guest-list">
    <template v-if="applyOnSeatList.length >= 1">
      <div v-for="user in applyOnSeatList" :key="user.userId"  class="tui-co-guest-item">
        <div class="tui-co-guest-item-left">
          <img :src="user.avatarUrl?.startsWith('http') ? user.avatarUrl : DEFAULT_USER_AVATAR_URL" alt=""
            class="tui-co-guest-avatar">
        </div>
        <div class="tui-co-guest-item-right">
          <span class="tui-co-guest-name">{{ user.userName || user.userId }}</span>
          <div class="tui-co-guest-actions">
            <TUILiveButton class="live-action tui-co-guest-accept" @click="handleUserApply(user, true)">{{ t('Accept')}}</TUILiveButton>
            <TUILiveButton class="live-action tui-co-guest-reject" @click="handleUserApply(user, false)">{{ t('Rejection')}}</TUILiveButton>
          </div>
        </div>
      </div>
    </template>
    <div v-else class="tui-co-guest-empty">
      {{ t('No application for live') }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineEmits } from 'vue';
import { storeToRefs } from 'pinia';
import TUILiveButton from '../../../common/base/Button.vue';
import { useCurrentSourceStore } from '../../../store/child/currentSource';
import { DEFAULT_USER_AVATAR_URL } from '../../../constants/tuiConstant';
import { useI18n } from '../../../locales';
import { TUILiveUserInfo } from '../../../types';
import logger from '../../../utils/logger';

const logPrefix = '[LiveCoGuestApplicationList]';

const emit = defineEmits(['on-accept', 'on-reject']);

const { t } = useI18n();

const currentSourceStore = useCurrentSourceStore();
const { applyOnSeatList } = storeToRefs(currentSourceStore);

async function handleUserApply(user: TUILiveUserInfo, agree: boolean) {
  logger.log(`${logPrefix}handleUserApply userId:${user.userId}, agree:${agree}`);
  if (agree) {
    emit('on-accept', user);
  } else {
    emit('on-reject', user);
  }
}

</script>
