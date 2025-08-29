<template>
    <div class="chat-editor">
      <emoji class="chat-emoji" @choose-emoji="handleChooseEmoji"></emoji>
      <textarea
        ref="editorInputEle"
        :disabled="props.disabled"
        v-model="sendMsg"
        maxlength="80"
        spellcheck="false"
        class="content-bottom-input"
        :placeholder="placeholder"
        @keyup.enter="sendMessage"
      />
    </div>
  </template>

<script setup lang="ts">
import { ref, defineProps, computed } from 'vue';
import { storeToRefs } from 'pinia';
import { TencentCloudChat } from '@tencentcloud/tuiroom-engine-electron';
import Emoji from './emoji.vue';
import { useI18n } from '../../locales'
import useRoomEngine from '../../utils/useRoomEngine';
import { useBasicStore } from '../../store/main/basic';
import { useChatStore } from '../../store/main/chat';
import { decodeSendTextMsg } from './util';
import logger from '../../utils/logger';

const logPrefix = '[ChatEditor]';

type Props = {
  disabled: boolean;
}

const props = defineProps<Props>()

const { t }  = useI18n()
const basicStore = useBasicStore();
const chatStore = useChatStore();
const { roomId } = storeToRefs(basicStore);

const roomEngine = useRoomEngine();
const sendMsg = ref('');
const editorInputEle = ref();

const placeholder = computed(() => {
  return !props.disabled ? t('Type a message') : t('Living not started');
})

const sendMessage = async () => {
  const msg = decodeSendTextMsg(sendMsg.value);
  sendMsg.value = '';
  if (msg === '') {
    return;
  }
  try {
    const tim = roomEngine.instance?.getTIM();
    if (tim) {
      const message = tim.createTextMessage({
        to: roomId.value,
        conversationType: TencentCloudChat.TYPES.CONV_GROUP,
        payload: {
          text: msg,
        },
      });
      await tim.sendMessage(message);
      chatStore.updateMessageList({
        ID: Math.random().toString(),
        type: 'TIMTextElem',
        payload: {
          text: msg,
        },
        nick: basicStore.userName || basicStore.userId,
        from: basicStore.userId,
        flow: 'out',
        sequence: Math.random(),
      });
    } else {
      logger.error(`${logPrefix}sendMessage failed due to no TIM instance`);
    }
  } catch (e) {
    /**
     * Message delivery failure
     */
    // TUIMessage({ type: 'error', message: t('Failed to send the message') }); // To do: to implelement
    logger.warn(`${logPrefix}sendMessage failed to send the message:`, e);
  }
};

const handleChooseEmoji = (emojiName: string) => {
  sendMsg.value += emojiName;
  editorInputEle.value.focus();
};
</script>

<style lang="scss" scoped>
@import "../../assets/variable.scss";

.chat-editor {
  width: 90%;
  margin:0 0 0 5%;
	height: 4.25rem;
	border: 1px solid var(--stroke-color-primary);
	border-radius: 0.375rem;
  background: var(--bg-color-operate);
	display: flex;
  position: relative;
  .chat-emoji {
    width: 1.25rem;
    height: 1.25rem;
    display: flex;
    margin: 0.625rem 0 0 1rem;
  }
  .content-bottom-input {
    background-color: var(--bg-color-transparency);
    border: none;
    outline: none;
    resize: none;
    box-shadow: none;
    width: 100%;
    color: var(--text-color-primary);
    line-height: 1.375rem;
    margin: 0.4375rem 0 0 0.375rem;
    &:focus-visible {
      outline: none;
    }
    &::placeholder {
      color: var(--text-color-tertiary);
      font-size: $font-chat-editor-content-input-placeholder-size;
      font-weight: $font-chat-editor-content-input-placeholder-weight;
      line-height: 1.375rem;
    }
    &::-webkit-scrollbar {
      display: none;
    }
    &:disabled {
      cursor: not-allowed;
    }
  }
}
  </style>
