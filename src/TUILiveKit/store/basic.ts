import { defineStore } from "pinia";
import { TRTCAppScene, TRTCStatistics } from "trtc-electron-sdk";

interface BasicState {
  sdkAppId: number,
  userId: string,
  userSig: string,
  userName: string,
  avatarUrl: string,
  roomId: string,
  roomType: TRTCAppScene,
  isLiving: boolean;
  activeSettingTab: string;
  statistics: Record<string, any>; // TRTCStatistics,
}

export const useBasicStore = defineStore('basic', {
  state: (): BasicState => ({
    sdkAppId: 0,
    userId: '',
    userSig: '',
    userName: '',
    avatarUrl: '',
    roomId: '',
    roomType: TRTCAppScene.TRTCAppSceneLIVE,
    isLiving: false,
    activeSettingTab: 'audio',
    statistics: {
      appCpu: 0,
      downLoss: 0,
      localStatisticsArray: [],
      localStatisticsArraySize: 0,
      receivedBytes: 0,
      remoteStatisticsArray: [],
      remoteStatisticsArraySize: 0,
      rtt: 0,
      sentBytes: 0,
      systemCpu: 0,
      upLoss: 0,
      appMemoryUsageInMB: 0,
    },
  }),
  getters: {
    localFrameRate: (state) => {
      return state.statistics.localStatisticsArray?.[0]?.frameRate;
    },
    roomName(): string {
      return `${this.userName || this.userId} 的直播间: ${this.roomId}`;
    }
  },
  actions: {
    setSdkAppId(sdkAppId: number) {
      this.sdkAppId = sdkAppId;
    },
    setUserId(userId: string) {
      this.userId = userId;
    },
    setUserSig(userSig: string) {
      this.userSig = userSig;
    },
    setUserName(userName: string) {
      this.userName = userName;
    },
    setAvatarUrl(avatarUrl: string) {
      this.avatarUrl = avatarUrl;
    },
    setRoomId(roomId: string) {
      this.roomId = roomId;
    },
    setRoomType(type: TRTCAppScene) {
      this.roomType = type;
    },
    setBasicInfo(info: Record<string, any>) {
      if (!info) {
        return;
      }
      const { sdkAppId, userId, userSig, userName, avatarUrl, roomId } = info;
      sdkAppId && this.setSdkAppId(sdkAppId);
      userId && this.setUserId(userId);
      userSig && this.setUserSig(userSig);
      userName && this.setUserName(userName);
      avatarUrl && this.setAvatarUrl(avatarUrl);
      roomId && this.setRoomId(roomId);
    },
    setIsLiving(flag: boolean) {
      this.isLiving = flag;
    },
    setActiveSettingTab(tabName: string) {
      this.activeSettingTab = tabName;
    },
    setStatistics(statistics: Record<string, any>) {
      this.statistics = statistics;
    },
    reset() {
      this.roomId = '0';
      this.isLiving = false;
      this.activeSettingTab = 'audio';
      this.statistics = {
        appCpu: 0,
        downLoss: 0,
        localStatisticsArray: [],
        localStatisticsArraySize: 0,
        receivedBytes: 0,
        remoteStatisticsArray: [],
        remoteStatisticsArraySize: 0,
        rtt: 0,
        sentBytes: 0,
        systemCpu: 0,
        upLoss: 0,
        appMemoryUsageInMB: 0,
      };
    }
  }
});
