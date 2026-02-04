<template>
  <div class="tui-live-message">
    <div class="tui-title">
      {{t('Message List')}}
    </div>
    <div v-if="!isLiving" class="tui-live-message-disabled">
      <div>{{t('No message yet')}}</div>
    </div>
    <div v-if="isLiving" class="tui-live-message-list-container">
      <div class="tui-live-message-gift">
        <span class="tui-live-message-title">
          <span>{{t('Gift-giving news')}}</span>
          <span class="tui-gift-statistics">
            <svg-icon class="tui-gift-count-icon" :icon="GiftCountIcon" :size="1"/>
            <span>{{ totalGiftsSent }}</span>
            <svg-icon class="tui-gift-value-icon" :icon="GiftValueIcon" :size="1"/>
            <span>{{ totalGiftCoins }}</span>
          </span>
        </span>
        <div class="tui-live-message-list">
          <span v-for="item in giftList" :key="item.id" class="tui-live-message-item">
            <span class="tui-live-message-item-nick">{{`${item.sender.nameCard || item.sender.userName || item.sender.userId}:`}}</span>
            <span class="tui-live-message-item-content">
              <span>{{t('send out')}}</span>
              <span :style="{color: getGiftNameColor()}">{{t(item.gift.name)}}</span>
              <img width="12" height="12" :src="item.gift.iconUrl" :alt="t(item.gift.name)" />
              <span>x</span>
              <span>{{item.count}}</span>
            </span>
          </span>
          <div ref="giftBottomEl" class="message-bottom"></div>
        </div>
      </div>
      <div class="tui-live-message-interactive">
        <span class="tui-live-message-title">{{t('Interactive messages')}}</span>
        <div class="tui-live-message-list">
          <span v-for="item in messageList" :key="item.ID" class="tui-live-message-item">
            <span class="tui-live-message-item-nick">{{`${item.nick}:`}}</span>
            <message-text  v-if="item.type === 'TIMTextElem'" :data="item.payload.text" />
            <message-text  v-else-if="item.type === 'CustomUserEnter'" :data="item.payload.text" />
          </span>
          <div ref="messageBottomEl" class="message-bottom" />
        </div>
      </div>
    </div>
    <chat-editor :disabled="!isLiving"></chat-editor>
  </div>
</template>
<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useI18n } from '../../locales';
// import useMessageHook from './useMessageHook';
import ChatEditor from './chatEditor.vue';
import { useBasicStore } from '../../store/main/basic';
import { useChatStore } from '../../store/main/chat';
import MessageText from './MessageText.vue';
import SvgIcon from '../../common/base/SvgIcon.vue';
import GiftCountIcon from '../../common/icons/GiftCountIcon.vue';
import GiftValueIcon from '../../common/icons/GiftValueIcon.vue';

const { t } = useI18n();

const basicStore = useBasicStore();
const { isLiving } = storeToRefs(basicStore);

const chatStore = useChatStore();
// useMessageHook(); // To do: Invoke useMessageHook() is best for closure, but it is too early before Chat/IM SDK is ready to receive message. So currently invoked in LiveKit/index.vue.
const messageBottomEl = ref<HTMLInputElement | null>(null);
const giftBottomEl = ref<HTMLInputElement | null>(null);

const { messageList, giftList, totalGiftsSent, totalGiftCoins } = storeToRefs(chatStore);

let isScrollNotAtBottom = false;
let isScrollToTop = false;

const giftNameColorList = ['#3074FD', '#3CCFA5', '#FF8607', '#F7AF97', '#FF8BB7', '#FC6091'];
const getGiftNameColor = () => {
  const index = Math.floor(Math.random() * 10 * giftNameColorList.length);
  return giftNameColorList[index % giftNameColorList.length];
};

const handleMessageListScroll = (e: Event) => {
  const messageContainer = e.target as HTMLElement;
  const bottom = messageContainer.scrollHeight - messageContainer.scrollTop - messageContainer.clientHeight;
  if (bottom > 80) {
    /**
     * 80 is the threshold for determining whether to scroll up through the messages
     */
    isScrollNotAtBottom = true;
  } else {
    isScrollNotAtBottom = false;
  }
  if (isScrollToTop) {
    messageContainer.scrollTop = 0;
    isScrollToTop = false;
  }
};

// message
watch(() => messageList.value, async (newMessageList) => {
  await nextTick();
  if (isScrollNotAtBottom) {
    if (newMessageList.length >= 2) {
      const lastMessage = newMessageList[newMessageList.length - 1];
      const oldLastMessage = newMessageList[newMessageList.length - 2];
      if ((lastMessage as any).flow === 'out'  && lastMessage.ID !== oldLastMessage.ID) {
        /**
         * The latest one was sent by myself
         */
        messageBottomEl.value && messageBottomEl.value.scrollIntoView();
      }
    }
    return;
  }
  /**
   * If you don't scroll all the way to the bottom, show the latest news directly
   */
  messageBottomEl.value && messageBottomEl.value.scrollIntoView();
}, {
  deep: true,
});

// gift
watch(() => giftList.value, async () => {
  await nextTick();
  giftBottomEl.value && giftBottomEl.value.scrollIntoView();
}, {
  deep: true,
});

onMounted(async () => {
  window.addEventListener('scroll', handleMessageListScroll, true);
});
onUnmounted(() => {
  window.removeEventListener('scroll', handleMessageListScroll, true);
});
</script>
<style scoped lang="scss">
@import "../../assets/variable.scss";

.tui-live-message{
  height: 100%;
  background-color: var(--bg-color-operate);
  .tui-title {
    font-size: $font-live-message-tui-title-size;
  }
  &-list-container {
    height: calc(100% - 6.75rem);
  }
  &-gift{
    display: flex;
    flex-direction: column;
    height: 50%;
  }
  &-interactive{
    display: flex;
    flex-direction: column;
    height: 50%;
  }
  &-title{
    padding: 0.5rem 1rem 0.25rem 1rem;
    color: var(--text-color-primary);
    font-size: $font-live-message-title-size;
    font-style: $font-live-message-title-style;
    font-weight: $font-live-message-title-weight;
    line-height: 1.25rem;

    display: inline-flex;
    align-items: center;
    justify-content: space-between;

    .tui-gift-statistics {
      display: inline-flex;
      align-items: center;
    }

    .svg-icon {
      margin-left: 0.75rem;
      &:first-child {
        margin-left: 0;
      }
    }
    svg {
      width: 1rem;
      height: 1rem;
    }

    .tui-gift-count-icon {
      color: $color-error;
    }
    .tui-gift-value-icon {
      color: $color-warning;
    }
  }
  &-list{
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow-y: auto;
    padding: 0 1rem;
  }
  &-item{
    padding: 0.375rem 0;
    color: var(--text-color-primary);
    &-nick{
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      min-width: 0;
      padding-left: 0.25rem;
      color: var(--text-color-secondary);
      font-size: $font-live-message-item-nick-size;
      font-style: $font-live-message-item-nick-style;
      font-weight: $font-live-message-item-nick-weight;
      line-height: 1.25rem;
    }
    &-message{
      padding-left: 0.25rem;
      color: $font-live-message-item-message-color;
      font-size: $font-live-message-item-message-size;
      font-style: $font-live-message-item-message-style;
      font-weight: $font-live-message-item-message-weight;
      line-height: 1.25rem;
    }
    &-content {
      span {
        padding-left: 0.5rem;
        line-height: 1.25rem;
      }
      img {
        padding-left: 0.25rem;
      }
    }
  }
  &-disabled {
    height: calc(100% - 6.75rem);
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: var(--font-size-secondary);
    color: var(--text-color-secondary);
  }
}
</style>
