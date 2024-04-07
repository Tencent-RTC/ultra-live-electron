<template>
  <div class="tui-live-message">
    <div class="tui-title">
      {{t('Message list')}}
    </div>
    <!-- <div class="tui-live-message-gift">
      <span class="tui-live-message-title">{{t('Gift-giving news')}}</span>
      <div class="tui-live-message-container">
        <span v-for="(item, index) in giftMessageList" :key="index" class="tui-live-message-list">
          <span class="tui-live-message-list-nick">{{item.nick}}</span>
          <span class="tui-live-message-list-message">{{item.message}}</span>
        </span>
      </div>
    </div> -->
    <div class="tui-live-message-interactive">
      <!-- <span class="tui-live-message-title">{{t('Interactive messages')}}</span> -->
      <div class="tui-live-message-container">
        <span v-for="item in messageList" :key="item.ID" class="tui-live-message-list">
          <span class="tui-live-message-list-nick">{{item.nick}}</span>
          <message-text  v-if="item.type === 'TIMTextElem'" :data="item.payload.text" />
        </span>
        <div ref="messageBottomEl" class="message-bottom" />
      </div>
    </div>
    <chat-editor></chat-editor>
  </div>
</template>
<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useI18n } from '../../locales';
// import useMessageHook from './useMessageHook';
import ChatEditor from './chatEditor.vue';
import { useChatStore } from '../../store/chat';
import MessageText from './MessageText.vue';

const { t } = useI18n();
const chatStore = useChatStore();
// useMessageHook(); // To do: 这里调用会出现无法接收消息的问题，原因未知，暂时先改为在 LiveKit/index.vue 中调用
const messageBottomEl = ref<HTMLInputElement | null>(null);

const { messageList } = storeToRefs(chatStore);
const giftMessageList = ref([
  {
    nick: 'Johntaz',
    message: '送出了 爱心',
  },
  {
    nick: 'Nightbot',
    message: '送出了 喝彩'
  },
  {
    nick:'Spektral0_0',
    message: '送出了 火箭',
  },
  {
    nick: 'Johntaz',
    message: '送出了 爱心',
  },
  {
    nick: 'Nightbot',
    message: '送出了 喝彩'
  },
  {
    nick:'Spektral0_0',
    message: '送出了 火箭',
  },
]);
let isScrollNotAtBottom = false;
let isScrollToTop = false;

const handleMessageListScroll = (e: Event) => {
  const messageContainer = e.target as HTMLElement;
  const bottom = messageContainer.scrollHeight - messageContainer.scrollTop - messageContainer.clientHeight;
  if (bottom > 80) {
    /**
     * 30 is the threshold for determining whether to scroll up through the messages
     *
     * 30 为判断是否向上滚动浏览消息的阈值
    **/
    isScrollNotAtBottom = true;
  } else {
    isScrollNotAtBottom = false;
  }
  if (isScrollToTop) {
    messageContainer.scrollTop = 0;
    isScrollToTop = false;
  }
};

watch(messageList, async (newMessageList, oldMessageList) => { // eslint-disable-line
  await nextTick();
  if (isScrollNotAtBottom) {
    if (newMessageList.length >= 1) {
      const lastMessage = newMessageList[newMessageList.length - 1];
      const oldLastMessage = oldMessageList[oldMessageList.length - 1];
      if ((lastMessage as any).flow === 'out'  && lastMessage.ID !== oldLastMessage.ID) {
        /**
         * The latest one was sent by myself
         *
         * 最新一条是自己发送的
        **/
        messageBottomEl.value && messageBottomEl.value.scrollIntoView();
      }
    }
    return;
  }
  /**
   * If you don't scroll all the way to the bottom, show the latest news directly
   *
   * 如果没进行滚动一直在底部, 直接展示最新消息
  **/
  messageBottomEl.value && messageBottomEl.value.scrollIntoView();
});
onMounted(async () => {
  window.addEventListener('scroll', handleMessageListScroll, true);
});
onUnmounted(() => {
  window.removeEventListener('scroll', handleMessageListScroll, true);
});
</script>
<style scoped lang="scss">
.tui-live-message{
  height: 28rem;
  &-gift{
    display: flex;
    flex-direction: column;
  }
  &-interactive{
    display: flex;
    flex-direction: column;
  }
  &-title{
    color: var(--G5, #8F9AB2);
    font-family: PingFang SC;
    font-size: 0.75rem;
    font-style: normal;
    font-weight: 500;
    line-height: 1.25rem; /* 166.667% */
  }
  &-container{
    overflow: auto;
    display: flex;
    flex-direction: column;
    height: 20.5rem;
    overflow-y: auto;
  }
  &-list{
    padding: 0.375rem 0;
    &-nick{
      color: #80BEF6;
      font-family: PingFang SC;
      font-size: 0.75rem;
      font-style: normal;
      font-weight: 500;
      line-height: 1.25rem; /* 166.667% */
    }
    &-message{
      color: #D5E0F2;
      font-family: PingFang SC;
      font-size: 0.75rem;
      font-style: normal;
      font-weight: 500;
      line-height: 1.25rem;
      padding-left: 0.5rem;
    }
  }
}
</style>