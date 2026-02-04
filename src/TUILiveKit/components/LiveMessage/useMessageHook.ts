import { onUnmounted } from 'vue';
import { useChatStore } from '../../store/main/chat';
import { useBasicStore } from '../../store/main/basic';
import TUIRoomEngine, { TencentCloudChat } from '@tencentcloud/tuiroom-engine-electron';
import useRoomEngine from '../../utils/useRoomEngine';
import logger from '../../utils/logger';

const logPrefix = '[useMessageHook]';

export default function useMessageHook() {
  logger.log(`${logPrefix}invoked`);
  const roomEngine = useRoomEngine();
  const chatStore = useChatStore();
  const basicStore = useBasicStore();

  const onReceiveMessage = (options: { data: any }) => {
    logger.debug(`${logPrefix}onReceivceMessage:`, options);
    if (!options || !options.data) {
      return;
    }
    options.data.forEach((message: any) => {
      if (message.type === TencentCloudChat.TYPES.MSG_TEXT) {
        handleTextMessage(message);
      } else if (message.type === TencentCloudChat.TYPES.MSG_CUSTOM) {
        handleCustomMessage(message);
      }
    });
  };

  const handleTextMessage = (message: any) => {
    if (message.type !== TencentCloudChat.TYPES.MSG_TEXT) {
      return;
    }
    const { ID, payload: { text }, nick: userName, from: userId } = message;
    chatStore.updateMessageList({
      ID,
      type: 'TIMTextElem',
      payload: {
        text,
      },
      nick: userName || userId,
      from: userId,
      flow: 'in',
      sequence: Math.random(),
    });
  };

  const handleCustomMessage = (message: any) => {
    if (message.type !== TencentCloudChat.TYPES.MSG_CUSTOM) {
      return;
    }
  }

  TUIRoomEngine.once('ready', () => {
    logger.log(`${logPrefix}TUIRoomEngine ready`);
    let tim = roomEngine.instance?.getTIM();
    if (!tim) {
      logger.warn(`${logPrefix} create TIM instance here`);
      tim = TencentCloudChat.create({ SDKAppID: basicStore.sdkAppId });
    }
    tim?.on(TencentCloudChat.EVENT.MESSAGE_RECEIVED, onReceiveMessage);
  });
  onUnmounted(() => {
    logger.log(`${logPrefix}onUnmounted`);
    const tim = roomEngine.instance?.getTIM();
    tim?.off(TencentCloudChat.EVENT.MESSAGE_RECEIVED, onReceiveMessage);
  });

  return {};
}
