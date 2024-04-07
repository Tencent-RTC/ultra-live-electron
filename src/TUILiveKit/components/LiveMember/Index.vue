<template>
  <div class="tui-live-member">
    <div class="tui-title">
      {{t('Audience List')}}
    </div>
    <div class="tui-member-list">
      <div v-for="item in remoteUserList" :key="item.userID" class="tui-member-list-container">
        <img class="tui-avatar" :src="item.avatarUrl" alt="">
        <span class="tui-name">{{item.userName || item.userID}}</span>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { ref } from "vue";
import { useI18n } from '../../locales';
import { useRoomStore } from '../../store/room';
const { t } = useI18n();

const roomStore = useRoomStore()

const { remoteUserList }  = storeToRefs(roomStore);

// TODO 调用获取成员列表接口，初始化成员列表。

// TODO 监听成员进入或退出直播间事件，来动态维护成员列表。

</script>
<style scoped lang="scss">
.tui-member-list{
  height: 18.25rem;
  overflow: auto;
}
.tui-avatar{
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 1.5rem;
  margin: 0.5rem;
}
.tui-name{
  color: var(--G7, #D5E0F2);
  font-family: PingFang SC;
  font-size: 0.875rem;
  font-style: normal;
  font-weight: 400;
  line-height: 1.375rem; /* 157.143% */
}
.tui-member-list-container {
  display: flex;
  align-items: center;
  overflow-y: scroll;
  flex: 1;
  margin-top: 0.625rem;
  &::-webkit-scrollbar {
    display: none;
  }
}
</style>