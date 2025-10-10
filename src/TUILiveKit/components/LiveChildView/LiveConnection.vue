<template>
    <div class="tui-connection">
        <div class="tui-connection-title tui-window-header" >
            <span>{{ t('Voice Chat Management') }}</span>
            <button class="tui-icon" @click="handleCloseWindow">
              <svg-icon :icon="CloseIcon" class="tui-secondary-icon"></svg-icon>
            </button>
        </div>
        <div class="tui-connection-setting">
            <div class="tui-connection-layout">
              <TUIButton class="tui-connection-layout-grid" :class="currentLayout === TUIStreamLayoutMode.Grid ? 'selected' : ''"  @click="handleLayoutChange(TUIStreamLayoutMode.Grid)">
                {{ t('Grid Layout') }}
              </TUIButton>
              <TUIButton class="tui-connection-layout-float" :class="currentLayout === TUIStreamLayoutMode.Float ? 'selected' : ''" @click="handleLayoutChange(TUIStreamLayoutMode.Float)">
                {{ t('Float Layout') }}
              </TUIButton>
            </div>
            <div class="tui-connection-adjusting">
              <TUICheckBox :model-value="isAutoAdjusting" @update:modelValue="handleLayoutAutoAdjust">
                {{ t('Layout adjusts according to connection user count') }}
              </TUICheckBox>
            </div>
        </div>
        <div class="tui-connection-list-container" >
            <div class="tui-connection-list" >
                <div class="tui-connection-list-title">
                  <span>{{ t('Apply for chat') }}</span>
                  <span v-if="isAllowed">{{applyNumber}}</span>
                </div>
                <div class="tui-connection-member">
                    <span v-if="!isAllowed" class="tui-connection-status">{{ t('Not allowed') }}</span>
                    <div v-else v-for="user in applyToAnchorList" :key="user.userId"  class="tui-connection-apply">
                        <img class="tui-connection-avatar" :src="user.avatarUrl" alt="">
                        <span class="tui-connection-name">{{ user.userName || user.userId }}</span>
                        <div class="tui-connection-options">
                          <span class="tui-connection-accept" @click="handleUserApply(user, true)">{{ t('Accept')}}</span>
                          <span class="tui-connection-reject" @click="handleUserApply(user, false)">{{ t('Rejection')}}</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="tui-connection-list">
                <div class="tui-connection-list-title">
                    <span>{{ t('Chat Seat List') }}</span>
                    <span v-if="isAllowed">{{currentSeat}}</span>
                </div>
                <div class="tui-connection-member">
                    <span class="tui-connection-status" v-if="!isAllowed">{{ t('Not allowed') }}</span>
                    <div v-else class="tui-connection-seat" v-for="( item, index ) in validAnchorList" :key="item.userInfo.userId || index">
                        <span class="tui-connection-seatIndex">{{item.seat}}</span>
                        <img v-if="item.userInfo.avatarUrl" class="tui-connection-avatar" :src="item.userInfo.avatarUrl" alt="">
                        <span class="tui-connection-name"> {{ item.userInfo.userName || item.userInfo.userId }}</span>
                        <mic-more-icon class="tui-connection-more"  @click.stop="handleShowMemberControl(item)" ></mic-more-icon>
                        <live-member-control v-if="controlUserId === item.userInfo.userId"
                         :userId="controlUserId"
                         v-click-outside="handleClickOutsideMemberControl"
                         @on-close="handleClose"
                         @on-kick-off-seat="onKickOffSeat"
                         @on-kick-out-room="onKickOutRoom">
                        </live-member-control>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed, onBeforeUnmount, ref, watch, Ref, defineProps } from 'vue';
import { useI18n } from '../../locales';
import SvgIcon from '../../common/base/SvgIcon.vue';
import CloseIcon from '../../common/icons/CloseIcon.vue';
import MicMoreIcon from '../../common/icons/MicMoreIcon.vue';
import SeatIcon from '../../common/icons/SeatIcon.vue';
import TUIButton from '../../common/base/Button.vue';
import vClickOutside from '../../utils/vClickOutside';
import LiveMemberControl from './LiveMemberControl.vue';
import { useCurrentSourceStore } from '../../store/child/currentSource';
import { TUILiveUserInfo, TUIStreamLayoutMode } from '../../types';
import TUICheckBox from '../../common/base/CheckBox.vue';
import logger from '../../utils/logger';

const logPrefix = '[LiveConnection]';

interface Props {
  data?: Record<string, any> | undefined
}

const props = defineProps<Props>();

const currentSourceStore = useCurrentSourceStore();
const { applyToAnchorList, currentAnchorList } = storeToRefs(currentSourceStore);
const { t } = useI18n();
const controlUserId = ref('');
const isAllowed = ref(true);
const layoutMode: Ref<TUIStreamLayoutMode | null> = ref(null);

const currentLayout = computed(() => {
  return layoutMode.value || props.data?.layoutMode;
});

const isAutoAdjusting = ref(props.data?.isAutoAdjusting);

const applyNumber = computed(() => {
  return '(' + applyToAnchorList.value.length + ')'
})
const currentNumber = ref(0);

const anchorList = ref([
  {
    seat: t('Position 1'),
    icon: SeatIcon,
    userInfo: {} as TUILiveUserInfo,
  },
  {
    seat: t('Position 2'),
    icon: SeatIcon,
    userInfo: {} as TUILiveUserInfo,
  },
  {
    seat: t('Position 3'),
    icon: SeatIcon,
    userInfo: {} as TUILiveUserInfo,
  },
  {
    seat: t('Position 4'),
    icon: SeatIcon,
    userInfo: {} as TUILiveUserInfo,
  },
  {
    seat: t('Position 5'),
    icon: SeatIcon,
    userInfo: {} as TUILiveUserInfo,
  },
  {
    seat: t('Position 6'),
    icon: SeatIcon,
    userInfo: {} as TUILiveUserInfo,
  },
  {
    seat: t('Position 7'),
    icon: SeatIcon,
    userInfo: {} as TUILiveUserInfo,
  },
  {
    seat: t('Position 8'),
    icon: SeatIcon,
    userInfo: {} as TUILiveUserInfo,
  },
]);

const validAnchorList = computed(() => {
  return currentLayout.value === TUIStreamLayoutMode.Float ? anchorList.value.slice(0, 6) : anchorList.value;
});

const currentSeat = computed(() => {
  return '(' + currentNumber.value + '/' + validAnchorList.value.length+ ')'
});

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
        anchorList.value[i].userInfo = {} as TUILiveUserInfo;
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
};

const handleClickOutsideMemberControl = () => {
  controlUserId.value = ''
};

const onKickOffSeat = (userId: string) => {
  logger.log(`${logPrefix}onKickOffSeat:${userId}`);
  window.mainWindowPortInChild?.postMessage({
    key: 'kickOffSeat',
    data: {
      userId,
    }
  });
};

const onKickOutRoom = (userId: string) => {
  logger.log(`${logPrefix}onKickOutRoom:${userId}`);
  window.mainWindowPortInChild?.postMessage({
    key: 'kickOutRoom',
    data: {
      userId,
    }
  });
};

const handleCloseWindow = async () => {
  window.ipcRenderer.send('close-child');
  resetCurrentView();
};

const resetCurrentView = () => {
  currentSourceStore.setCurrentViewName('');
};


async function handleUserApply(user:any, agree: boolean) {
  if (!currentLayout.value || currentLayout.value === TUIStreamLayoutMode.None) {
    if (agree) {
      handleLayoutChange(TUIStreamLayoutMode.Grid);
    }
  }
  window.mainWindowPortInChild?.postMessage({
    key: 'handleUserApply',
    data: {
      user: JSON.stringify(user),
      agree
    }
  });
}

function handleLayoutChange(layout: TUIStreamLayoutMode) {
  logger.debug(`${logPrefix}handleLayoutChange:`, layout);
  layoutMode.value = layout;
  window.mainWindowPortInChild?.postMessage({
    key: 'setStreamLayoutMode',
    data: {
      layoutMode: layout
    }
  });
}

function handleLayoutAutoAdjust(value: boolean) {
  logger.debug(`${logPrefix}handleLayoutAutoAdjust:`, value);
  isAutoAdjusting.value = value;
  window.mainWindowPortInChild?.postMessage({
    key: 'setStreamLayoutAutoAdjust',
    data: {
      isAutoAdjusting: value
    }
  });
}

onBeforeUnmount(() => {
  anchorList.value.forEach(item => {
    item.userInfo = {} as TUILiveUserInfo;
  });
  layoutMode.value = null;
});
</script>
<style scoped lang="scss">
@import "../../assets/global.scss";
.tui-connection{
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: auto;
  &-title{
      font-weight: $font-live-connection-title-weight;
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
      border-bottom: 1px solid $color-live-connection-control-border;
      height: 3rem;
      &-text{
          font-size: $font-live-connection-control-text-size;
          font-style: $font-live-connection-control-text-style;
          font-weight: $font-live-connection-control-text-weight;
          line-height: 1.375rem; /* 157.143% */
      }
  }
  &-list-container{
      height: calc(100% - 2.75rem);
      display: flex;
      padding: 0.5rem;
      justify-content: space-between;
      background-color: var(--bg-color-dialog);
  }
  &-list-title{
    font-size: 0.75rem;
  }
  &-list{
      width: 49.5%;

      &-title {
        height: 2rem;
        line-height: 2rem;
      }
  }
  &-member{
      position: relative;
      height: calc(100% - 2rem);
      width: 100%;
      overflow-y: auto;
      overflow-x: hidden;
      border-radius: 0.5rem;
      background-color: var(--bg-color-dialog-module);
      color: $font-live-connection-member-color;
  }
  &-status{
      color: var(--text-color-primary);
      font-size: $font-live-connection-status-size;
      font-style: $font-live-connection-status-style;
      font-weight: $font-live-connection-status-weight;
      line-height: 1.375rem; /* 157.143% */
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
  }
  &-apply{
      height: 3rem;
      line-height: 3rem;
      display: flex;
      align-items: center;
      padding: 0 0.875rem;
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
      font-size: $font-live-connection-name-size;
      font-style: $font-live-connection-name-style;
      font-weight: $font-live-connection-name-weight;
      line-height: 1.25rem; /* 166.667% */
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
      color: var(--text-color-primary);
  }
  &-accept{
      color: var(--text-color-link);
      font-size: $font-live-connection-accept-size;
      font-style: $font-live-connection-accept-style;
      font-weight: $font-live-connection-accept-weight;
      line-height: 1.25rem; /* 166.667% */
      cursor: pointer;
  }
  &-reject{
      padding-left: 0.625rem;
      color: var(--text-color-secondary);
      font-size: $font-live-connection-reject-size;
      font-style: $font-live-connection-reject-style;
      font-weight: $font-live-connection-reject-weight;
      line-height: 1.25rem; /* 166.667% */
      cursor: pointer;
  }
  &-seat{
      height: 3rem;
      line-height: 3rem;
      display: flex;
      align-items: center;
      padding: 0 0.875rem;
      position: relative;
      color: var(--text-color-secondary);
  }
  &-seatIndex{
      color: var(--text-color-secondary);
      font-size: $font-live-connection-seatIndex-size;
      font-style: $font-live-connection-seatIndex-style;
      font-weight: $font-live-connection-seatIndex-weight;
      line-height: 1.25rem; /* 166.667% */
  }
  &-more{
      position: absolute;
      right: 0.5rem;
      cursor: pointer;
      transform: rotate(90deg);
  }

  .tui-connection-setting {
    font-size: $font-live-connection-layout-text-size;
    background-color: var(--bg-color-dialog);
  }

  .tui-connection-layout {
    display: flex;
    flex-direction: row;
    justify-content: space-around;
    padding-top: 0.5rem;

    .tui-connection-layout-grid,
    .tui-connection-layout-float {
      flex: 0 0 16rem;
      height: 3rem;
      line-height: 3rem;
      border-radius: 0.5rem;
      border: 1px solid var(--button-color-primary-default);
      background-color: var(--bg-color-transparency);
      color: var(--button-color-primary-default);
      text-align: center;
      cursor: pointer;

      &.selected {
        color: var(--text-color-primary);
        background-color: var(--button-color-primary-hover);
      }
    }
  }

  .tui-connection-adjusting {
    color: var(--text-color-primary);
    padding: 0.5rem 1rem 0 1rem;
  }
}
</style>
