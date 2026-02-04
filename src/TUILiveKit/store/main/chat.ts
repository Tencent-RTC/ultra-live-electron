import { defineStore } from 'pinia';
import { TUIGiftInfo, TUIUserInfo } from '@tencentcloud/tuiroom-engine-electron';

type MessageItem = {
  ID: string;
  type: string;
  payload: {
    text: string;
  };
  nick: string;
  from: string;
  flow: string;
  sequence: number;
}

type GiftItem = {
  id: string;
  liveId: string;
  gift: TUIGiftInfo;
  sender: {
    userId: string;
    userName: string;
    nameCard: string;
    avatarUrl: string;
    level: number;
  };
  count: number;
}

type ChatState = {
  messageList: MessageItem[];
  giftList: GiftItem[];
  totalGiftCoins: number;
  totalGiftsSent: number;
  totalUniqueSenders: number;
}

export const useChatStore = defineStore('chat', {
  state: (): ChatState => ({
    messageList: [],
    giftList: [],
    totalGiftCoins: 0,
    totalGiftsSent: 0,
    totalUniqueSenders: 0,
  }),
  getters: {
  },
  actions: {
    updateMessageList(message: MessageItem) {
      const messageIndex = this.messageList.findIndex(item => item.ID === message.ID);
      if (messageIndex === -1) {
        if (this.messageList.length >= 200) {
          this.messageList.shift();
        }
        this.messageList.push(message);
      }
    },
    addReceivedGift(liveId: string, gift: TUIGiftInfo, sender: TUIUserInfo, count: number) {
      if (this.giftList.length >= 200) {
        this.giftList.shift();
      }
      this.giftList.push({
        id: `${gift.giftID}_${sender.userId}_${Date.now()}`,
        liveId,
        gift,
        sender : {
          userId: sender.userId,
          userName: sender.userName,
          nameCard: sender.nameCard,
          avatarUrl: sender.avatarUrl,
          level: sender.level,
        },
        count,
      });
    },
    updateGiftStatistics(totalGiftCoins: number, totalGiftsSent: number, totalUniqueSenders: number) {
      this.totalGiftCoins = totalGiftCoins;
      this.totalGiftsSent = totalGiftsSent;
      this.totalUniqueSenders = totalUniqueSenders;
    },
    reset() {
      this.messageList = [];
      this.giftList = [];
      this.totalGiftCoins = 0;
      this.totalGiftsSent = 0;
      this.totalUniqueSenders = 0;
    },
  },
});
