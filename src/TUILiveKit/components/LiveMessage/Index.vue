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
        <span class="tui-live-message-title">{{t('Gift-giving news')}}</span>
        <div class="tui-live-message-list">
          <span v-for="item in giftList" :key="item.ID" class="tui-live-message-item">
            <span class="tui-live-message-item-level">{{ 0 }}</span>
            <span class="tui-live-message-item-nick">{{item.nick}}</span>
            <span class="tui-live-message-item-content">
              <span>{{t('send out')}}</span>
              <span>{{item.gift.giftName}}</span>
              <img with = 12, height = 12, :src="item.gift.imageUrl" />
              <span>x</span>
              <span>{{item.gift.giftCount}}</span>
            </span>
          </span>
          <div ref="giftBottomEl" class="message-bottom" />
        </div>
      </div>
      <div class="tui-live-message-interactive">
        <span class="tui-live-message-title">{{t('Interactive messages')}}</span>
        <div class="tui-live-message-list">
          <span v-for="item in messageList" :key="item.ID" class="tui-live-message-item">
            <span class="tui-live-message-item-level">{{ 0 }}</span>
            <span class="tui-live-message-item-nick">{{item.nick}}</span>
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

const { t } = useI18n();

const basicStore = useBasicStore();
const { isLiving } = storeToRefs(basicStore);

const chatStore = useChatStore();
// useMessageHook(); // To do: Invoke useMessageHook() is best for closure, but it is too early before Chat/IM SDK is ready to receive message. So currently invoked in LiveKit/index.vue.
const messageBottomEl = ref<HTMLInputElement | null>(null);
const giftBottomEl = ref<HTMLInputElement | null>(null);

const { messageList, giftList } = storeToRefs(chatStore);

let isScrollNotAtBottom = false;
let isScrollToTop = false;

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
watch(messageList, async (newMessageList, oldMessageList) => {
  await nextTick();
  if (isScrollNotAtBottom) {
    if (newMessageList.length >= 1) {
      const lastMessage = newMessageList[newMessageList.length - 1];
      const oldLastMessage = oldMessageList[oldMessageList.length - 1];
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
});

// gift
watch(giftList, async () => {
  await nextTick();
  giftBottomEl.value && giftBottomEl.value.scrollIntoView();
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
    color: var(--text-color-tertiary);
    font-size: $font-live-message-title-size;
    font-style: $font-live-message-title-style;
    font-weight: $font-live-message-title-weight;
    line-height: 1.25rem;
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
    &-level {
      padding: 0 0.5rem;
      border-radius: 0.5rem;
      background-color: $color-live-message-item-level-background;
    }
    &-nick{
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      min-width: 0;
      padding-left: 0.25rem;
      color: var(--text-color-primary);
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
