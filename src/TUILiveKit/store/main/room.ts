import { defineStore } from 'pinia';
import {
  TRTCVideoResolutionMode,
  TUIErrorCode,
  TUIRole,
  TUIRoomInfo,
  TUISeatInfo,
  TUISeatMode,
} from '@tencentcloud/tuiroom-engine-electron';
import { TUILiveUserInfo, TUIStreamLayoutMode, TUISeatLayoutTemplate } from '../../types';
import { useBasicStore } from './basic';
import { useChatStore } from './chat';
import { TUIMediaSourcesState, useMediaSourcesStore } from './mediaSources';
import useRoomEngine from '../../utils/useRoomEngine';
import { messageChannels } from '../../communication';
import { onError } from '../../hooks/useRoomErrorHandler';
import { useI18n } from '../../locales';
import streamLayoutService from '../../service/StreamLayoutService';
import TUIMessageBox from '../../common/base/MessageBox';
import logger from '../../utils/logger';

const logPrefix = '[RoomStore]';
const { t } = useI18n();

const roomEngine = useRoomEngine();
const mediaSourceStore = useMediaSourcesStore();

interface RoomState {
  localUser: TUILiveUserInfo,
  remoteUserList: Array<TUILiveUserInfo>,
  masterUserId: string,
  canControlSelfAudio: boolean;
  canControlSelfVideo: boolean;
  isMicrophoneDisableForAllUser: boolean;
  isCameraDisableForAllUser: boolean;
  isMessageDisableForAllUser: boolean;
  isSeatEnabled: boolean;
  seatMode: TUISeatMode;
  maxSeatCount: number;
  roomId: string;
  roomName: string;
  streamLayout: {
    layoutMode: TUIStreamLayoutMode;
    isAutoAdjusting: boolean;
  };
  seatLayoutTemplateId: TUISeatLayoutTemplate;
  localVideoResMode: TRTCVideoResolutionMode;
}
export const useRoomStore = defineStore('room', {
  state: (): RoomState => ({
    localUser: {
      userId: '',
      userName: '',
      avatarUrl: '',
      userRole: TUIRole.kRoomOwner,
      onSeat: false,
    },
    remoteUserList: [],
    masterUserId: '',
    canControlSelfAudio: true,
    canControlSelfVideo: true,
    isMicrophoneDisableForAllUser: false,
    isCameraDisableForAllUser: false,
    isMessageDisableForAllUser: false,
    isSeatEnabled: true,
    seatMode: TUISeatMode.kApplyToTake,
    maxSeatCount: 0,
    roomId: '',
    roomName: '',
    streamLayout: {
      layoutMode: TUIStreamLayoutMode.Grid,
      isAutoAdjusting: true,
    },
    seatLayoutTemplateId: TUISeatLayoutTemplate.PortraitDynamic_Grid9,
    localVideoResMode: TRTCVideoResolutionMode.TRTCVideoResolutionModePortrait,
  }),
  getters: {
    isMaster(state) {
      return state.localUser.userId === state.masterUserId;
    },
    first200RemoteUserList(state){
      if (state.remoteUserList.length <= 200) {
        return state.remoteUserList;
      } else {
        return state.remoteUserList.slice(0, 200);
      }
    },
    applyToAnchorList: state => state.remoteUserList
      .filter(item => item.isUserApplyingToAnchor)
      .sort((item1, item2) => (item1?.applyToAnchorTimestamp || 0) - (item2?.applyToAnchorTimestamp || 0)) || [],
    anchorList: state => {
      const tempList = state.remoteUserList.filter(item => item.onSeat);
      return tempList.sort((item1, item2) => (item1?.onSeatTimestamp || 0) - (item2?.onSeatTimestamp || 0));
    },
  },
  actions: {
    setLocalUser(obj: Record<string, any>) {
      Object.assign(this.localUser, obj);
    },
    setRoomInfo(roomInfo: TUIRoomInfo) {
      const {
        roomOwner, isMicrophoneDisableForAllUser,
        isCameraDisableForAllUser, isMessageDisableForAllUser,
        isSeatEnabled, seatMode, maxSeatCount, roomName, roomId,
      } = roomInfo;
      if (this.localUser.userId === roomOwner) {
        this.localUser.userRole = TUIRole.kRoomOwner;
      }

      this.masterUserId = roomOwner;
      this.isMicrophoneDisableForAllUser = isMicrophoneDisableForAllUser;
      this.isCameraDisableForAllUser = isCameraDisableForAllUser;
      this.isMessageDisableForAllUser = isMessageDisableForAllUser;
      this.isSeatEnabled = isSeatEnabled;
      this.seatMode = seatMode;
      this.canControlSelfAudio = !this.isMicrophoneDisableForAllUser;
      this.canControlSelfVideo = !this.isCameraDisableForAllUser;
      this.maxSeatCount = maxSeatCount;
      this.roomName = roomName;
      this.roomId = roomId;

      streamLayoutService.setRoomInfo({
        roomId: roomId,
        roomOwner: roomOwner,
      });
      streamLayoutService.setLayoutMode(this.streamLayout.layoutMode);
    },
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
    addRemoteUser(userInfo: TUILiveUserInfo) {
      const { userId, userName } = userInfo;
      if (userId === this.localUser.userId) {
        return;
      }

      const userIndex= this.remoteUserList.findIndex(item => item.userId === userId);
      if (userIndex !== -1) {
        Object.assign(this.remoteUserList[userIndex], userInfo);
      } else {
        const newUserInfo = Object.assign(this.getNewUserInfo(userId), userInfo);
        this.remoteUserList.push(newUserInfo);
      }

      const chatStore = useChatStore();
      chatStore.updateMessageList({
        ID: `tui-custom-enter-room-${userId}`,
        type: 'CustomUserEnter',
        payload: {
          text: t('enter room'),
        },
        nick: userName || userId,
        from: userId,
        flow: 'in',
        sequence: -1,
      });
    },
    removeRemoteUser(userId: string) {
      const userIndex = this.remoteUserList.findIndex(item => item.userId === userId);
      if (userIndex !== -1) {
        this.remoteUserList.splice(userIndex, 1);
      }
    },
    addApplyToAnchorUser(options: { userId: string, requestId: string, timestamp: number }) {
      const { userId, requestId, timestamp } = options;
      const userIndex = this.remoteUserList.findIndex(item => item.userId === userId);
      const remoteUserInfo = userIndex !== -1 ? this.remoteUserList[userIndex] : null;
      if (remoteUserInfo) {
        remoteUserInfo.isUserApplyingToAnchor = true;
        remoteUserInfo.applyToAnchorRequestId = requestId;
        remoteUserInfo.applyToAnchorTimestamp = timestamp;
        remoteUserInfo.onSeat = false;
      }
      messageChannels.messagePortToChild?.postMessage({
        key: 'set-apply-list',
        data: JSON.stringify(this.applyToAnchorList),
      });
    },
    removeApplyToAnchorUser(userId: string) {
      const userIndex = this.remoteUserList.findIndex(item => item.userId === userId);
      const remoteUserInfo = userIndex !== -1 ? this.remoteUserList[userIndex] : null;
      if (remoteUserInfo) {
        remoteUserInfo.isUserApplyingToAnchor = false;
        remoteUserInfo.applyToAnchorRequestId = '';
        remoteUserInfo.applyToAnchorTimestamp = 0;
        remoteUserInfo.onSeat = false;

        messageChannels.messagePortToChild?.postMessage({
          key: 'set-apply-list',
          data: JSON.stringify(this.applyToAnchorList),
        });
      }
    },
    async handleApplyToAnchorUser(userId: string, agree: boolean) {
      const userIndex = this.remoteUserList.findIndex(item => item.userId === userId);
      const remoteUserInfo = userIndex !== -1 ? this.remoteUserList[userIndex] : null;
      if (remoteUserInfo) {
        try {
          const requestId = remoteUserInfo.applyToAnchorRequestId;
          if (requestId) {
            await roomEngine.instance?.responseRemoteRequest({
              requestId,
              agree,
            });
          }
          remoteUserInfo.isUserApplyingToAnchor = false;
          remoteUserInfo.applyToAnchorRequestId = '';
          remoteUserInfo.applyToAnchorTimestamp = 0;
          remoteUserInfo.onSeat = !!agree;
          remoteUserInfo.onSeatTimestamp = Date.now();

          messageChannels.messagePortToChild?.postMessage({
            key: 'set-apply-list',
            data: JSON.stringify(this.applyToAnchorList),
          });
        } catch (e: any) {
          if (e.code === TUIErrorCode.ERR_NO_PERMISSION) {
            TUIMessageBox({
              title: t('Note'),
              message: t('No more seat available'),
              confirmButtonText: t('Sure'),
            });
          } else {
            onError(e);
          }
        }
      }
    },
    async kickUserOffSeat(userId: string) {
      if (userId) {
        await roomEngine.instance?.kickUserOffSeatByAdmin({
          seatIndex: -1,
          userId
        });
      }
    },
    kickUserOutOfRoom(userId: string) {
      if (userId) {
        roomEngine.instance?.kickRemoteUserOutOfRoom({
          userId
        });
      }
    },
    // Updating changes to seatList
    // The onSeatListChanged, onUserVideoAvailable, onUserAudioAvailable events are notified as soon as the room is entered, so they are updated to the userMap first.
    // Wait for getUserList to get the full list of users before updating it.
    updateOnSeatList(seatedList: TUISeatInfo[], leftList: TUISeatInfo[]) {
      seatedList.forEach((seat) => {
        const { userId } = seat;
        if (userId === this.localUser.userId) {
          Object.assign(this.localUser, { onSeat: true });
        } else {
          const userIndex = this.remoteUserList.findIndex(item => item.userId === userId);
          if (userIndex !== -1) {
            Object.assign(this.remoteUserList[userIndex], { onSeat: true });
          } else {
            const newUserInfo = Object.assign(this.getNewUserInfo(userId), { onSeat: true });
            this.remoteUserList.push(newUserInfo);
          }
        }
      });
      leftList.forEach((seat) => {
        if (seat.userId === this.localUser.userId) {
          Object.assign(this.localUser, { onSeat: false });
          const basicStore = useBasicStore();
          basicStore.setIsOpenMic(false);
        } else {
          const userIndex = this.remoteUserList.findIndex(item => item.userId === seat.userId);
          if (userIndex !== -1) {
            Object.assign(this.remoteUserList[userIndex], { onSeat: false });
          }
        }
      });

      messageChannels.messagePortToChild?.postMessage({
        key: 'set-apply-and-anchor-list',
        data: JSON.stringify({
          applyList: this.applyToAnchorList,
          anchorList: this.anchorList,
        })
      });
    },
    setStreamLayoutMode(layoutMode: TUIStreamLayoutMode) {
      this.streamLayout.layoutMode = layoutMode;
      this.updateSeatLayoutTemplate();

      streamLayoutService.setLayoutMode(layoutMode);
    },
    setStreamLayoutAutoAdjust(value: boolean) {
      this.streamLayout.isAutoAdjusting = value;
      this.updateSeatLayoutTemplate();

      streamLayoutService.setIsAutoAdjusting(value);
    },
    setLocalVideoResMode(resMode: TRTCVideoResolutionMode) {
      this.localVideoResMode = resMode;
      if (resMode === TRTCVideoResolutionMode.TRTCVideoResolutionModeLandscape) {
        this.seatLayoutTemplateId = TUISeatLayoutTemplate.LandscapeDynamic_1v3;
      } else {
        this.seatLayoutTemplateId = TUISeatLayoutTemplate.PortraitDynamic_Grid9;
        this.streamLayout = {
          layoutMode: TUIStreamLayoutMode.Grid,
          isAutoAdjusting: true,
        };
      }
      mediaSourceStore.updateResolutionMode(resMode);

      streamLayoutService.setResolutionMode(resMode);
    },
    async updateSeatLayoutTemplate() {
      if (this.localVideoResMode === TRTCVideoResolutionMode.TRTCVideoResolutionModeLandscape) {
        this.seatLayoutTemplateId = TUISeatLayoutTemplate.LandscapeDynamic_1v3;
      } else if (this.streamLayout.isAutoAdjusting) {
        switch (this.streamLayout.layoutMode) {
        case TUIStreamLayoutMode.Float:
          this.seatLayoutTemplateId = TUISeatLayoutTemplate.PortraitDynamic_1v6;
          break;
        case TUIStreamLayoutMode.Grid:
          this.seatLayoutTemplateId = TUISeatLayoutTemplate.PortraitDynamic_Grid9;
          break;
        case TUIStreamLayoutMode.None:
          break;
        default:
          logger.warn(`${logPrefix}updateLiveStreamTemplate failed: Invalid layoutMode: ${this.streamLayout.layoutMode}`);
          break;
        }
      } else {
        switch (this.streamLayout.layoutMode) {
        case TUIStreamLayoutMode.Float:
          this.seatLayoutTemplateId = TUISeatLayoutTemplate.PortraitFixed_1v6;
          break;
        case TUIStreamLayoutMode.Grid:
          this.seatLayoutTemplateId = TUISeatLayoutTemplate.PortraitFixed_Grid9
          break;
        case TUIStreamLayoutMode.None:
          break;
        default:
          logger.warn(`${logPrefix}updateLiveStreamTemplate failed: Invalid layoutMode: ${this.streamLayout.layoutMode}`);
          break;
        }
      }

      if (this.seatLayoutTemplateId && this.roomId) {
        const liveListManager = roomEngine.instance?.getLiveListManager();
        if (liveListManager) {
          try {
            await liveListManager.setLiveInfo({
              roomId: this.roomId,
              seatLayoutTemplateId: this.seatLayoutTemplateId,
            });
          } catch (error: any) {
            logger.error(`${logPrefix}setLiveInfo error:`, error);
            if (error.code !== undefined && error.code !== -2) {
              onError(error);
            } else {
              TUIMessageBox({
                title: t('Note'),
                message: t('Layout switch failed, please retry'),
                confirmButtonText: t('Sure'),
              });
            }
          }
        } else {
          logger.error(`${logPrefix}updateSeatLayoutTemplate failed: No LiveListManager`);
        }
      }
    },
    reset() {
      this.localUser = {
        userId: '',
        userName: '',
        avatarUrl: '',
        userRole: TUIRole.kRoomOwner,
        onSeat: false,
      };
      this.remoteUserList = [];
      this.masterUserId = '';
      this.canControlSelfAudio = true;
      this.canControlSelfVideo = true;
      this.isMicrophoneDisableForAllUser = false;
      this.isCameraDisableForAllUser = false;
      this.isMessageDisableForAllUser = false;
      this.isSeatEnabled = true;
      this.seatMode = TUISeatMode.kApplyToTake;
      this.maxSeatCount = 0;
      this.roomName = '';
      this.roomId = '';

      streamLayoutService.reset();
    },
    restoreMediaSource(mediaSourceState: TUIMediaSourcesState) {
      this.setLocalVideoResMode(mediaSourceState.mixingVideoEncodeParam.resMode);
      mediaSourceStore.restoreState(mediaSourceState);
    }
  }
});
