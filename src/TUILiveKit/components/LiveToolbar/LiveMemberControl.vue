<template>
    <div class="tui-member-control">
        <div class="tui-member-control-container" v-for="(item, index) in controlList" :key="index" @click="item.fun()">
            <svg-icon :icon="item.icon"></svg-icon>
            <span :class="index === controlList.length - 1 ? 'tui-member-control-options-last' : 'tui-member-control-options'" >{{item.text}}</span>
        </div>
    </div>
</template>
<script setup lang="ts">
import { ref, defineProps, defineEmits } from 'vue';
import { useI18n } from '../../locales';
import SvgIcon from '../../common/base/SvgIcon.vue';
import ViewProfileIcon from '../../common/icons/ViewProfileIcon.vue';
import UnMuteIcon from '../../common/icons/UnMuteIcon.vue';
import CloseCameraIcon from '../../common/icons/CloseCameraIcon.vue';
import MicropositionIcon from '../../common/icons/MicropositionIcon.vue';
import CancelMikeIcon from '../../common/icons/CancelMikeIcon.vue';
import BlacklistIcon from '../../common/icons/BlacklistIcon.vue';
import KickedIcon from '../../common/icons/KickedIcon.vue';
import useGetRoomEngine from '../../utils/useRoomEngine';

const logger = console;

const logPrefix = '[LiveMemberControl]';

interface Props {
  userId: string;
}

const roomEngine = useGetRoomEngine();

const emit = defineEmits([
  "on-close",
]);
const props = defineProps<Props>();
const { t } = useI18n();
const controlList = ref([
  // {
  //   icon: ViewProfileIcon,
  //   text: t('View Profile'),
  //   fun: handleViewProfile,
  // },
  {
    icon: UnMuteIcon,
    text: t('Unmute'),
    fun: handleMute,
  },
  {
    icon: CloseCameraIcon,
    text: t('Close the camera'),
    fun: handleCloseCamera,
  },
  // {
  //   icon: MicropositionIcon,
  //   text: t('Move seat'),
  //   fun: handleMoveSeat,
  // },
  {
    icon: CancelMikeIcon,
    text: t('Kick seat'),
    fun: handleKickSeat,
  },
  // {
  //   icon: BlacklistIcon,
  //   text: t('Blacklist'),
  //   fun: handleBlackList,
  // },
  {
    icon: KickedIcon,
    text: t('Kicked off'),
    fun: handleKickOut,
  },
])

function handleViewProfile() {
  console.log(props.userId,'view profile')
}

async function handleMute() {
  window.mainWindowPort?.postMessage({
    key: "muteAudio",
    data: {
      userId: props.userId,
    }
  });
  emit('on-close');
  logger.log(`${logPrefix}muteAudio`)
}

async function handleCloseCamera(){
  window.mainWindowPort?.postMessage({
    key: "closeCamera",
    data: {
      userId: props.userId,
    }
  });
  emit('on-close');
  logger.log(`${logPrefix}closeCamera`)
}

function handleMoveSeat() {
  console.log('mobile seat')
}

function handleKickSeat() {
  window.mainWindowPort?.postMessage({
    key: "cancelWheatPosition",
    data: {
      userId: props.userId,
    }
  });
  logger.log(`${logPrefix}cancelWheatPosition`);
  emit('on-close');
}

function handleBlackList() {
  console.log('blackList')
}

async function handleKickOut() {
  window.mainWindowPort?.postMessage({
    key: "kickOut",
    data: {
      userId: props.userId,
    }
  });
  logger.log(`${logPrefix}kickOut`)
  emit('on-close');
}
</script>

<style lang="scss" scoped>
@import '../../assets/variable.scss';

.tui-member-control{
  width: 10.4375rem;
	height: 9rem;
  box-shadow: 0.0625rem 0.0625rem 0.75rem 0.25rem $color-gray-7;
  border-radius: 0.25rem;
	flex-shrink: 0;
	filter: drop-shadow(0rem 3.4.6875rem 0.625rem #E9F0FB);
	background: #FFF;
	position: absolute;
	right: -0.75rem;
	top: 2.5rem;
  z-index: 1;
  &-container{
    display: flex;
    padding: 14px 14px 0 14px;
  }
  &-options{
    padding-left:0.625rem;
    color: #6B758A;
    font-family: PingFang SC;
    font-size: 0.875rem;
    font-style: normal;
    font-weight: 400;
    line-height: normal;
    letter-spacing: -0.24px;
    &-last{
      padding-left:0.625rem;
      color: #E5395C;;
      font-family: PingFang SC;
      font-size: 0.875rem;
      font-style: normal;
      font-weight: 400;
      line-height: normal;
      letter-spacing: -0.24px;
    }
  }
}
</style>