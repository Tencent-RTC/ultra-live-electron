<template>
    <div class="tui-voice-chat">
        <div class="tui-voice-chat-title" >
            <span>{{ t('Continuous wheat management') }}</span>
            <svg-icon :icon="CloseIcon" @click="handleCloseSetting"></svg-icon>
        </div>
        <div class="tui-voice-chat-control">
            <span class="tui-voice-chat-control-text">{{ t('Allow viewers to apply for continuous miking') }}</span>
            <SwitchControl v-model="isAllowed"></SwitchControl>
        </div>
        <div class="tui-voice-chat-list-container" >
            <div class="tui-voice-chat-list" >
                <div>
                <span>{{ t('Apply for a mic link') }}</span>
                <span v-if="isAllowed">{{applyNumber}}</span>
                </div>
                <div class="tui-voice-chat-member">
                    <span v-if="!isAllowed" class="tui-voice-chat-status">{{ t('Not yet opened') }}</span>
                    <div v-else v-for="user in applyToAnchorList" :key="user.userId"  class="tui-voice-chat-apply">
                        <img class="tui-voice-chat-avatar" :src="user.avatarUrl" alt="">
                        <span class="tui-voice-chat-name">{{ user.userName || user.userId }}</span>
                        <div class="tui-voice-chat-options">
                          <span class="tui-voice-chat-accept" @click="handleUserApply(user, true)">{{ t('accept')}}</span>
                          <span class="tui-voice-chat-reject" @click="handleUserApply(user, false)">{{ t('rejection')}}</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="tui-voice-chat-list">
                <div>
                    <span>{{ t('Current wheat position') }}</span>
                    <span v-if="isAllowed">{{currentSeat}}</span>
                </div>
                <div class="tui-voice-chat-member">
                    <span class="tui-voice-chat-status" v-if="!isAllowed">{{ t('Not yet opened') }}</span>
                    <div v-else class="tui-voice-chat-seat" v-for="( item, index ) in anchorList" :key="item.userInfo.userId || index">
                        <span class="tui-voice-chat-seatIndex">{{item.seat}}</span>
                        <svg-icon v-if="!item.userInfo.avatarUrl" class="tui-voice-chat-avatar" :icon="item.icon"></svg-icon>
                        <img v-else class="tui-voice-chat-avatar" :src="item.userInfo.avatarUrl" alt="">
                        <span class="tui-voice-chat-name"> {{ item.userInfo.userName || item.userInfo.userId }}</span>
                        <mic-more-icon class="tui-voice-chat-more"  @click.stop="handleShowMemberControl(item)" ></mic-more-icon>
                        <live-member-control v-if="controlUserId === item.userInfo.userId" 
                         :userId="controlUserId"
                         v-click-outside="handleClickOutsideMemberControl"
                         @on-close="handleClose">
                        </live-member-control>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useI18n } from '../../locales';
import SvgIcon from '../../common/base/SvgIcon.vue';
import CloseIcon from '../../common/icons/CloseIcon.vue';
import SwitchControl from '../../common/base/SwitchControl.vue';
import MicMoreIcon from '../../common/icons/MicMoreIcon.vue';
import SeatIcon from '../../common/icons/SeatIcon.vue';
import vClickOutside from '../../utils/vClickOutside';
import LiveMemberControl from './LiveMemberControl.vue';
import { useCurrentSourcesStore } from '../../store/currentSources';
import { UserInfo } from '../../store/room';
import useGetRoomEngine from '../../utils/useRoomEngine';

const logger = console;
const logPrefix = '[LiveVoiceChat]';

const roomEngine = useGetRoomEngine();
const sourcesStore = useCurrentSourcesStore();
const { applyToAnchorList, currentAnchorList } = storeToRefs(sourcesStore);
const { t } = useI18n();
const controlUserId = ref('');
const showMemberControl = ref(false);
const isAllowed = ref(false);
const applyNumber = computed(() => {
  return '(' + applyToAnchorList.value.length + ')'
})
const currentNumber = ref(0);
const currentSeat = computed(() => {
  return '(' + currentNumber.value + '/' + anchorList.value.length+ ')'
})
const anchorList = ref([
  {
    seat: t('first position'),
    icon: SeatIcon,
    userInfo: {} as UserInfo,
  },
  {
    seat: t('second position'),
    icon: SeatIcon,
    userInfo: {} as UserInfo,
  },
  {
    seat: t('third position'),
    icon: SeatIcon,
    userInfo: {} as UserInfo,
  },
  {
    seat: t('fourth position'),
    icon: SeatIcon,
    userInfo: {} as UserInfo,
  },
  {
    seat: t('fifth position'),
    icon: SeatIcon,
    userInfo: {} as UserInfo,
  },
  {
    seat: t('sixth position'),
    icon: SeatIcon,
    userInfo: {} as UserInfo,
  },
  {
    seat: t('seventh position'),
    icon: SeatIcon,
    userInfo: {} as UserInfo,
  },
  {
    seat: t('eighth position'),
    icon: SeatIcon,
    userInfo: {} as UserInfo,
  },
])

watch(currentAnchorList, (newVal,val) => {
  logger.debug(`${logPrefix}wathch currentAnchorList:`, newVal, val);
  if (newVal) {
    if (newVal.length > 8) {
      logger.warn(`${logPrefix}wathch currentAnchorList: too many anchor, max 8, current: ${newVal.length}`);
    }
    for (let i = 0; i < 8; i++) {
      if (i < newVal.length) {
        anchorList.value[i].userInfo = newVal[i];
      } else {
        anchorList.value[i].userInfo = {} as UserInfo;
      }
    }
    currentNumber.value = newVal.length <= 8 ? newVal.length : 8;
  }
},{
  immediate: true,
  deep: true,
}
)

const handleShowMemberControl = (item:any) => {
  if(currentNumber.value === 0) return
  if (item.userInfo.userId) {
    controlUserId.value = item.userInfo.userId;
  } else {
    // empty seat
  }
}
const handleClose = () => {
  controlUserId.value = ''
}
const handleClickOutsideMemberControl = () => {
  controlUserId.value = ''
}
const handleCloseSetting = () => {
  window.mainWindowPort?.postMessage({
    key: "closeVoiceChat",
  });
  window.ipcRenderer.send("close-child");
  resetCurrentView();
}
const resetCurrentView = () => {
  sourcesStore.setCurrentViewName('');
}
// 处理用户请求
async function handleUserApply(user:any, agree: boolean) {
  window.mainWindowPort?.postMessage({
    key: "handleUserApply",
    data: {
      user: JSON.stringify(user),
      agree
    }
  });
}

onBeforeUnmount(() => {
  anchorList.value = anchorList.value.map(item => ({ ...item, userInfo: {} }));
})
</script>
<style scoped lang="scss">
.tui-voice-chat{
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow-y: scroll;
    &-title{
        height: 4rem;
        line-height: 2.5rem;
        border-bottom: 1px solid rgba(230, 236, 245, 0.80);
        font-weight: 500;
        padding: 0 1.5rem 0 1.375rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
    } 
    &-control{
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin: 0 1.5rem;
        border-bottom: 1px solid rgba(230, 236, 245, 0.8);
        height: 3rem;
        &-text{
            color: var(--G3, #4F586B);
            font-family: PingFang SC;
            font-size: 0.875rem;
            font-style: normal;
            font-weight: 400;
            line-height: 1.375rem; /* 157.143% */
        }
    }
    &-list-container{
        display: flex;
        padding: 1rem 1.5rem;
        justify-content: space-between
    }
    &-list{
        width: 50%;
    }
    &-member{
        width:16.875rem;
        height:23.875rem;
        border-radius: 0.5rem;
        border: 1px solid #E4E8EE;
        background: rgba(240, 243, 250, 0.40);
        margin-top: 1rem;
        position: relative;
    }
    &-status{
        color: rgba(79, 88, 107, 0.40);
        font-family: PingFang SC;
        font-size: 0.875rem;
        font-style: normal;
        font-weight: 400;
        line-height: 1.375rem; /* 157.143% */
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
    }
    &-apply{
        display: flex;
        align-items: center;
        padding: 0.875rem 0.875rem 0 0.875rem;
    }
    &-avatar{
        width: 2rem;
        height: 2rem;
        border-radius: 2rem;
        margin-left: 0.5rem;
    }
    &-name{
        flex: 1;
        padding-left: 0.5rem;
        color: var(--G3, #4F586B);
        font-family: PingFang SC;
        font-size: 0.875rem;
        font-style: normal;
        font-weight: 500;
        line-height: 1.25rem; /* 166.667% */
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
    }
    &-accept{
        color: #1C66E5;
        font-family: PingFang SC;
        font-size: 0.875rem;
        font-style: normal;
        font-weight: 500;
        line-height: 1.25rem; /* 166.667% */
        cursor: pointer;
    }
    &-reject{
        padding-left: 0.625rem;
        color: #8F9AB2;
        font-family: PingFang SC;
        font-size: 0.875rem;
        font-style: normal;
        font-weight: 500;
        line-height: 1.25rem; /* 166.667% */
        cursor: pointer;
    }
    &-seat{
        display: flex;
        align-items: center;
        padding: 0.875rem 0.875rem 0 0.875rem;
        position: relative;
    }
    &-seatIndex{
        color: var(--G3, #4F586B);
        font-family: PingFang SC;
        font-size: 0.875rem;
        font-style: normal;
        font-weight: 400;
        line-height: 1.25rem; /* 166.667% */
    }
    &-more{
        position: absolute;
        right: 0.5rem;
        cursor: pointer;
    }
}
</style>