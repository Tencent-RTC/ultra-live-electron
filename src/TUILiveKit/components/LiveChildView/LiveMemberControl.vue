<template>
    <div class="tui-member-control">
        <div
          class="tui-member-control-container"
          :class="{'danger': index === controlList.length - 1}"
          v-for="(item, index) in controlList"
          :key="index"
          @click="item.fun()"

        >
            <svg-icon class="tui-member-control-icon" :icon="item.icon"></svg-icon>
            <span class="tui-member-control-options" >{{item.text}}</span>
        </div>
    </div>
</template>
<script setup lang="ts">
import { shallowRef, defineProps, defineEmits } from 'vue';
import { useI18n } from '../../locales';
import SvgIcon from '../../common/base/SvgIcon.vue';
import ViewProfileIcon from '../../common/icons/ViewProfileIcon.vue';
import UnMuteIcon from '../../common/icons/UnMuteIcon.vue';
import CloseCameraIcon from '../../common/icons/CloseCameraIcon.vue';
import MicropositionIcon from '../../common/icons/MicropositionIcon.vue';
import CancelMikeIcon from '../../common/icons/CancelMikeIcon.vue';
import BlacklistIcon from '../../common/icons/BlacklistIcon.vue';
import KickedIcon from '../../common/icons/KickedIcon.vue';
import logger from '../../utils/logger';

const logPrefix = '[LiveMemberControl]';

interface Props {
  userId: string;
}

const emit = defineEmits([
  'on-close',
  'on-kick-off-seat',
  'on-kick-out-room',
]);
const props = defineProps<Props>();
const { t } = useI18n();
const controlList = shallowRef([
  // {
  //   icon: ViewProfileIcon,
  //   text: t('View Profile'),
  //   fun: handleViewProfile,
  // },
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
  logger.log(props.userId,'view profile')
}

function handleMoveSeat() {
  logger.log('mobile seat')
}

function handleKickSeat() {
  emit('on-kick-off-seat', props.userId);
  emit('on-close');
}

function handleBlackList() {
  logger.log('blackList')
}

async function handleKickOut() {
  emit('on-kick-out-room', props.userId);
  emit('on-close');
}
</script>

<style lang="scss" scoped>
@import '../../assets/variable.scss';

.tui-member-control{
  width: 7.5rem;
	height: 4rem;
  border-radius: 0.25rem;
  position: absolute;
	right: 0;
	top: 2.5rem;
  z-index: 1;
	flex-shrink: 0;
	background-color: var(--dropdown-color-default);
	box-shadow: 0px 1px 5px var(--shadow-color),0px 8px 12px var(--shadow-color),0px 12px 26px var(--shadow-color);
  color: var(--text-color-secondary);

  &-container{
    display: flex;
    height: 2rem;
    line-height: 2rem;
    padding-left: 1rem;
    cursor: pointer;
    &:hover {
      background-color: var(--dropdown-color-hover);
    }
  }
  &:icon {
    color: var(--text-color-secondary);
  }
  &-options{
    padding-left: 0.625rem;
    font-size: 0.75rem;
    font-style: normal;
    font-weight: 400;
  }

  .danger {
    color: var(--text-color-error);
  }
}
</style>
