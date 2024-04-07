import { defineStore } from 'pinia';
import { messageChannels } from '../communication';

export type UserInfo = {
    userId: string,
    userName?: string,
    avatarUrl?: string,
    // 是否在麦上
    onSeat?: boolean,
    // 用户是否正在申请上麦
    isUserApplyingToAnchor?: boolean,
    // 用户申请上麦的 requestId
    applyToAnchorRequestId?: string,
    // 用户申请上麦的时间点
    applyToAnchorTimestamp?: number,
}

interface RoomState {
    localUser: UserInfo,
    remoteUserList: Array<UserInfo>,
    remoteUserObj: Record<string, UserInfo>,
    masterUserId: string,
    isShowVoiceChat: boolean,
}
export const useRoomStore = defineStore('room', {
  state: (): RoomState => ({
    localUser: {
      userId: '',
      userName: '',
      avatarUrl: '',
    },
    remoteUserList: [],
    remoteUserObj: {},
    masterUserId: '',
    isShowVoiceChat: false,
  }),
  getters: {
    isMaster(state) {
      return state.localUser.userId === state.masterUserId;
    },
    remoteUserList(): Array<UserInfo> {
      return [...Object.values(this.remoteUserObj)];
    },
    applyToAnchorList: state => [...Object.values(state.remoteUserObj)]
      .filter(item => item.isUserApplyingToAnchor)
      .sort((item1, item2) => (item1?.applyToAnchorTimestamp || 0) - (item2?.applyToAnchorTimestamp || 0)) || [],
  },
  actions: {
    getNewUserInfo(userId: string) {
      const newUserInfo = {
        userId,
        userName: '',
        avatarUrl: '',
        onSeat: false,
        isUserApplyingToAnchor: false,
      };
      return newUserInfo;
    },
    addRemoteUser(userInfo: UserInfo) {
      const { userId } = userInfo;
      if (this.remoteUserObj[userId]) {
        Object.assign(this.remoteUserObj[userId], userInfo);
      } else {
        const newUserInfo = Object.assign(this.getNewUserInfo(userId), userInfo);
        this.remoteUserObj[userId] = newUserInfo;
      }
    },
    removeRemoteUser(userId: string) {
      delete this.remoteUserObj[userId];
    },
    addApplyToAnchorUser(options: { userId: string, requestId: string, timestamp: number }) {
      const { userId, requestId, timestamp } = options;
      const remoteUserInfo = this.remoteUserObj[userId];
      if (remoteUserInfo) {
        remoteUserInfo.isUserApplyingToAnchor = true;
        remoteUserInfo.applyToAnchorRequestId = requestId;
        remoteUserInfo.applyToAnchorTimestamp = timestamp;
      }
      if(this.isShowVoiceChat) {
        messageChannels.childWindowPort?.postMessage({
          key: "update-apply-list",
          data: JSON.stringify(remoteUserInfo)
        });
      }
    },
    removeApplyToAnchorUser(userId: string) {
      const remoteUserInfo = this.remoteUserObj[userId];
      if (remoteUserInfo) {
        remoteUserInfo.isUserApplyingToAnchor = false;
        remoteUserInfo.applyToAnchorRequestId = '';
        remoteUserInfo.applyToAnchorTimestamp = 0;
      }
    },
    updateApplyToAnchorList(userInfo: UserInfo) {
      const { userId } = userInfo;
      if (this.remoteUserObj[userId]) {
        Object.assign(this.remoteUserObj[userId], userInfo);
      }
    },
    setIsShowVoiceChat(show: boolean){
      this.isShowVoiceChat = show
    },
    reset() {
      this.remoteUserObj = {};
    }
  }
})