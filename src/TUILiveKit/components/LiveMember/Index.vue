<template>
  <div class="tui-live-member">
    <div class="tui-title">
      {{t('Audience List')}}
    </div>
    <div class="tui-member-list">
      <div v-for="item in remoteUserList" :key="item.userId" class="tui-member-item">
        <img class="tui-user-avatar" :src="item.avatarUrl || defaultAvatarURL" alt="">
        <span class="tui-user-name">{{item.userName || item.userId}}</span>
        <span class="tui-user-level">{{ 0 }}</span>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useI18n } from '../../locales';
import { useRoomStore } from '../../store/main/room';
import { defaultAvatarURL } from '../../utils/common';

const { t } = useI18n();
const roomStore = useRoomStore()
const { remoteUserList }  = storeToRefs(roomStore);

</script>
<style scoped lang="scss">
@import "../../assets/variable.scss";

.tui-live-member {
  height: 100%;
  background-color: var(--bg-color-operate);
}

.tui-title {
  font-size: $font-live-message-title-size;
}

.tui-member-list{
  height: calc(100% - 2.5rem);
  padding: 0.5rem;
  overflow: auto;
}
.tui-user-avatar{
  flex-shrink: 0;
  width: 1.5rem;
  height: 1.5rem;
  margin: 0.5rem;
  border-radius: 1.5rem;
}
.tui-user-name{
  overflow: hidden;
  padding-right: 0.25rem;
  max-width: 12rem;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-color-primary);
  font-size: $font-live-member-user-name-size;
  font-style: $font-live-member-user-name-style;
  font-weight: $font-live-member-user-name-weight;
  line-height: 1.375rem;
}
.tui-user-level {
  padding: 0 0.5rem;
  border-radius: 0.5rem;
  background-color: $color-live-member-user-level-background;
}
.tui-member-item {
  display: flex;
  align-items: center;
  overflow-y: auto;
  flex: 1;
  &::-webkit-scrollbar {
    display: none;
  }
}
</style>