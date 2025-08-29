import { defineStore } from 'pinia';
import { useI18n } from '../../locales/index';

const { t } = useI18n();

interface BasicState {
  sdkAppId: number;
  userId: string;
  userSig: string;
  userName: string;
  avatarUrl: string;
  useStringRoomId: boolean;
  roomId: string;
  isLiving: boolean;
  isOpenMic: boolean;
  statistics: Record<string, any>; // TRTCStatistics,
}

export const useBasicStore = defineStore('basic', {
  state: (): BasicState => ({
    sdkAppId: 0,
    userId: '',
    userSig: '',
    userName: '',
    avatarUrl: '',
    useStringRoomId: false,
    roomId: '',
    isLiving: false,
    isOpenMic: false,
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
      return t('sb. living room: NO.', {
        userName: this.userName || this.userId,
      });
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
      this.useStringRoomId = typeof roomId === 'string';
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
    setIsOpenMic(isOpen: boolean) {
      this.isOpenMic = isOpen;
    },
    setIsLiving(flag: boolean) {
      this.isLiving = flag;
    },
    setStatistics(statistics: Record<string, any>) {
      this.statistics = statistics;
    },
    reset() {
      this.sdkAppId = 0;
      this.userId = '';
      this.userSig = '';
      this.userName = '';
      this.avatarUrl = '';
      this.useStringRoomId = false;
      this.roomId = '0';
      this.isLiving = false;
      this.isOpenMic = false;
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
