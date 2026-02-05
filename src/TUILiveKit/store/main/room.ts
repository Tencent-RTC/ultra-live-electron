import { defineStore } from 'pinia';
import TUIRoomEngine, {
  TRTCVideoResolutionMode,
  TUIErrorCode,
  TUIRole,
  TUISeatInfo,
  TUISeatMode,
  TUILiveConnectionUser,
  TUILiveListResult,
  TUILiveInfo,
  TUIConnectionCode,
  TUIBattleUser,
  TUIBattleInfo,
  TUIRoomType,
} from '@tencentcloud/tuiroom-engine-electron';
import { TUILiveUserInfo, TUISeatLayoutTemplate, TUIConnectionMode, TUICoHostLayoutTemplate } from '../../types';
import { useBasicStore } from './basic';
import { useChatStore } from './chat';
import { TUIMediaSourcesState, useMediaSourcesStore } from './mediaSources';
import useRoomEngine from '../../utils/useRoomEngine';
import { messageChannels } from '../../communication';
import { onRoomError, onAnchorConnectionError } from '../../hooks/useRoomErrorHandler';
import { useI18n } from '../../locales';
import streamLayoutService from '../../service/StreamLayoutService';
import TUIMessageBox from '../../common/base/MessageBox';
import { INVITATION_TIMEOUT } from '../../constants/tuiConstant';
import logger from '../../utils/logger';
import { BattleStatus, TUIBattleInfoEx } from '../types';

const DEFAULT_BATTLE_DURATION = 5 * 60;
const logPrefix = '[RoomStore]';
const { t } = useI18n();

const roomEngine = useRoomEngine();
const mediaSourceStore = useMediaSourcesStore();

function handleRoomError(state: any, error: any) {
  onRoomError(error);
}

interface RoomState {
  localUser: TUILiveUserInfo & { sdkAppId: number; userSig: string;},
  remoteUserList: Array<TUILiveUserInfo>,
  currentLive: TUILiveInfo;
  localVideoResMode: TRTCVideoResolutionMode;
  liveListCursor: string;
  liveList: Array<TUILiveInfo>;
  anchorConnection: {
    inviter: TUILiveConnectionUser | null;
    inviteeList: Array<TUILiveConnectionUser>;
    extensionInfo: string;
    connectedUserList: Array<TUILiveConnectionUser>;
  };
  coHostLayoutTemplate: TUICoHostLayoutTemplate;
  anchorBattleInfo: TUIBattleInfoEx;
  connectionMode: TUIConnectionMode;
}
export const useRoomStore = defineStore('room', {
  state: (): RoomState => ({
    localUser: {
      sdkAppId: 0,
      userId: '',
      userSig: '',
      userName: '',
      avatarUrl: '',
      userRole: TUIRole.kRoomOwner,
      onSeat: false,
    },
    remoteUserList: [],
    currentLive: {
      roomId: '',
      roomType: TUIRoomType.kLive,
      name: '',
      notice: '',
      isMessageDisableForAllUser: false,
      isGiftEnabled: true,
      isLikeEnabled: true,
      isPublicVisible: true,
      isSeatEnabled: true,
      keepOwnerOnSeat: true,
      seatLayoutTemplateId: TUISeatLayoutTemplate.None,
      maxSeatCount: 0,
      seatMode: TUISeatMode.kApplyToTake,
      coverUrl: '',
      backgroundUrl: '',
      categoryList: [],
      activityStatus: 0,
      roomOwner: '',
      ownerName: '',
      ownerAvatarUrl: '',
      createTime: 0,
      totalViewers: 0,
      isUnlimitedRoomEnabled: true,
      cdnStreamUrl: '',
      lebSecretKey: '',
      lebEncrypted: '',
      lebSignature: '',
    },
    localVideoResMode: TRTCVideoResolutionMode.TRTCVideoResolutionModePortrait,
    liveListCursor: '',
    liveList: [],
    anchorConnection: {
      inviter: null,
      inviteeList: [],
      extensionInfo: '',
      connectedUserList: [],
    },
    coHostLayoutTemplate: TUICoHostLayoutTemplate.HostDynamicGrid,
    anchorBattleInfo: {
      fromUser: null,
      toUserList: [],
      extensionInfo: '',
      battleId: '',
      needResponse: false,
      duration: DEFAULT_BATTLE_DURATION,
      startTime: 0,
      endTime: 0,
      status: BattleStatus.None,
      isBattleWithoutConnection: false,
      isSelfExited: false
    },
    connectionMode: TUIConnectionMode.None,
  }),
  getters: {
    isMaster(state) {
      return state.localUser.userId === state.currentLive.roomOwner;
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
      tempList.sort((item1, item2) => (item1?.onSeatTimestamp || 0) - (item2?.onSeatTimestamp || 0));
      tempList.unshift(state.localUser);
      return tempList;
    },
    connectedHostList: state => state.anchorConnection.connectedUserList || [],
    battleId(state) {
      return state.anchorBattleInfo.battleId;
    }
  },
  actions: {
    setLocalUser(obj: Record<string, any>) {
      Object.assign(this.localUser, obj);
    },
    async updateLocalUserProfile(profile: Record<string, any>) {
      logger.debug(`${logPrefix}updateLocalUserProfile new and old data:`, profile, JSON.parse(JSON.stringify(this.localUser)));
      let isSDKAPPIDChanged = false;
      let isAuthInfoChanged = false;
      const basicStore = useBasicStore();

      // modify sdk app id
      if (profile.sdkAppId !== basicStore.sdkAppId) {
        isSDKAPPIDChanged = true;
        try {
          await TUIRoomEngine.logout();
          this.localUser.sdkAppId = profile.sdkAppId;
          basicStore.setSdkAppId(profile.sdkAppId);
        } catch (error) {
          logger.error(`${logPrefix}updateLocalUserProfile logout error:`, error);
          TUIMessageBox({
            title: t('Note'),
            message: t('SDKAPPID changed, logout old failed.'),
            confirmButtonText: t('Sure'),
          });
          return;
        }
      }

      // modify user sig
      if (isSDKAPPIDChanged || profile.userId !== this.localUser.userId || profile.userSig !== this.localUser.userSig) {
        isAuthInfoChanged = true;
        try {
          if (!isSDKAPPIDChanged && !basicStore.isUserSigExpired) {
            await TUIRoomEngine.logout();
          }
          await TUIRoomEngine.login({
            sdkAppId: profile.sdkAppId,
            userId: profile.userId,
            userSig: profile.userSig,
          });
          if (basicStore.isUserSigExpired) {
            // To do: reenter TRTC room or restart living with same live info
          }
          this.localUser.userId = profile.userId;
          this.localUser.userSig = profile.userSig;
          basicStore.setUserId(profile.userId);
          basicStore.setUserSig(profile.userSig);
        } catch (error) {
          logger.error(`${logPrefix}updateLocalUserProfile login error:`, error);
          TUIMessageBox({
            title: t('Note'),
            message: t('Authentication data changed, logout old or login new failed'),
            confirmButtonText: t('Sure'),
          });
          return;
        }
      }

      // modify user name and avatar
      if (isSDKAPPIDChanged || isAuthInfoChanged || profile.userName !== this.localUser.userName || profile.avatarUrl !== this.localUser.avatarUrl) {
        try {
          await TUIRoomEngine.setSelfInfo({ userName: profile.userName, avatarUrl: profile.avatarUrl });
          this.localUser.userName = profile.userName;
          this.localUser.avatarUrl = profile.avatarUrl;
          basicStore.setUserName(profile.userName);
          basicStore.setAvatarUrl(profile.avatarUrl);
        } catch (error) {
          logger.error(`${logPrefix}updateLocalUserProfile setSelfInfo error:`, error);
          TUIMessageBox({
            title: t('Note'),
            message: t('Update user name and avatar failed'),
            confirmButtonText: t('Sure'),
          });
          return;
        }
      }

      logger.info(`${logPrefix}updateLocalUserProfile success`);
      TUIMessageBox({
        title: t('Note'),
        message: t('Update user profile success'),
        confirmButtonText: t('Sure'),
      });
    },
    setCurrentLive(liveInfo: TUILiveInfo) {
      Object.assign(this.currentLive, liveInfo);
      if (liveInfo.roomOwner === this.localUser.userId) {
        this.localUser.userRole = TUIRole.kRoomOwner;
      }

      streamLayoutService.setRoomInfo({
        roomId: liveInfo.roomId,
        roomOwner: liveInfo.roomOwner || '',
      });
      streamLayoutService.setLayoutTemplate(this.currentLive.seatLayoutTemplateId);
      messageChannels.messagePortToChild?.postMessage({
        key: 'set-room-info',
        data: JSON.stringify({
          roomId: this.currentLive.roomId,
          roomName: this.currentLive.name,
          roomOwner: this.currentLive.roomOwner, // masterUserId,
        }),
      });
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
    updateConnectionMode() {
      let newConnectionMode;
      if (this.applyToAnchorList.length >= 1 || this.anchorList.length >= 2) {
        newConnectionMode = TUIConnectionMode.CoGuest;
      } else if (this.anchorConnection.inviteeList.length >= 1 || this.anchorConnection.connectedUserList.length >= 1) {
        newConnectionMode = TUIConnectionMode.CoHost;
      } else {
        newConnectionMode = TUIConnectionMode.None;
      }

      if (this.connectionMode !== newConnectionMode) {
        this.connectionMode = newConnectionMode;
        messageChannels.messagePortToCover?.postMessage({
          key: 'set-connection-mode',
          data: this.connectionMode
        });
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
      this.updateConnectionMode();
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
        this.updateConnectionMode();
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
          this.updateConnectionMode();
        } catch (e: any) {
          if (e.code === TUIErrorCode.ERR_NO_PERMISSION) {
            TUIMessageBox({
              title: t('Note'),
              message: t('No more seat available'),
              confirmButtonText: t('Sure'),
            });
          } else {
            handleRoomError(this, e);
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
        key: 'set-apply-and-seated-list',
        data: JSON.stringify({
          applyList: this.applyToAnchorList,
          anchorList: this.anchorList,
        })
      });
      this.updateConnectionMode();
    },
    setCoGuestLayoutTemplate(template: TUISeatLayoutTemplate) {
      this.currentLive.seatLayoutTemplateId = template;
      this.updateSeatLayoutTemplate(template);

      streamLayoutService.setLayoutTemplate(template);
    },
    setCoHostSetting(options: { layoutTemplate: TUICoHostLayoutTemplate; duration: number }) {
      this.coHostLayoutTemplate = options.layoutTemplate;
      this.anchorBattleInfo.duration = options.duration;

      this.updateSeatLayoutTemplate(options.layoutTemplate);

      streamLayoutService.setLayoutTemplate(options.layoutTemplate);
    },
    setLocalVideoResMode(resMode: TRTCVideoResolutionMode) {
      this.localVideoResMode = resMode;
      if (resMode === TRTCVideoResolutionMode.TRTCVideoResolutionModeLandscape) {
        this.currentLive.seatLayoutTemplateId = TUISeatLayoutTemplate.LandscapeDynamic_1v3;
      } else {
        this.currentLive.seatLayoutTemplateId = TUISeatLayoutTemplate.PortraitDynamic_Grid9;
      }
      mediaSourceStore.updateResolutionMode(resMode);

      streamLayoutService.setResolutionMode(resMode);
    },
    async updateSeatLayoutTemplate(template : TUISeatLayoutTemplate | TUICoHostLayoutTemplate) {
      if (template && this.currentLive.roomId) {
        const liveListManager = roomEngine.instance?.getLiveListManager();
        if (liveListManager) {
          try {
            await liveListManager.setLiveInfo({
              roomId: this.currentLive.roomId,
              seatLayoutTemplateId: template,
            });
          } catch (error: any) {
            logger.error(`${logPrefix}setLiveInfo error:`, error);
            if (error.code !== undefined && error.code !== -2) {
              handleRoomError(this, error);
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
    async fetchLiveList() {
      const liveListManager = roomEngine.instance?.getLiveListManager();
      if (liveListManager) {
        try {
          const result: TUILiveListResult = await liveListManager.fetchLiveList({ cursor: '', count: 20 });
          this.liveListCursor = result.cursor;
          this.liveList = result.liveInfoList;
          messageChannels.messagePortToChild?.postMessage({
            key: 'set-live-list',
            data: JSON.stringify({
              list: result.liveInfoList,
              isLoadedAll: result.cursor === '',
            }),
          });
          logger.info(`${logPrefix}fetchLiveList success:`, result);
        } catch (error) {
          handleRoomError(this, error);
        }
      } else {
        logger.error(`${logPrefix}fetchLiveList failed: No LiveListManager`);
      }
    },
    async fetchMoreLiveList() {
      const liveListManager = roomEngine.instance?.getLiveListManager();
      if (liveListManager) {
        try {
          if (this.liveListCursor !== '') {
            const result: TUILiveListResult = await liveListManager.fetchLiveList({ cursor: this.liveListCursor, count: 10 });
            this.liveListCursor = result.cursor;
            this.liveList = this.liveList.concat(result.liveInfoList);
            messageChannels.messagePortToChild?.postMessage({
              key: 'append-live-list',
              data: JSON.stringify({
                list: result.liveInfoList,
                isLoadedAll: result.cursor === '',
              }),
            });
          }
        } catch (error) {
          handleRoomError(this, error);
        }
      } else {
        logger.error(`${logPrefix}fetchMoreLiveList failed: No LiveListManager`);
      }
    },
    onConnectionRequestReceived(inviter: TUILiveConnectionUser, inviteeList: Array<TUILiveConnectionUser>, extensionInfo: string) {
      this.anchorConnection.inviter = inviter;
      this.anchorConnection.inviteeList = inviteeList;
      this.anchorConnection.extensionInfo = extensionInfo;
      messageChannels.messagePortToChild?.postMessage({
        key: 'set-host-connection',
        data: JSON.stringify(this.anchorConnection)
      });
      this.updateConnectionMode();
    },
    onConnectionUserListChanged(connectedList: Array<TUILiveConnectionUser>, joinedList: Array<TUILiveConnectionUser>, leavedList: Array<TUILiveConnectionUser>) {
      this.anchorConnection.connectedUserList = connectedList;
      joinedList.forEach((user) => {
        const index = this.anchorConnection.inviteeList.findIndex(item => item.userId === user.userId && item.roomId === user.roomId);
        if (index === -1) {
          this.anchorConnection.inviteeList.splice(index, 1);
        }
      });
      messageChannels.messagePortToChild?.postMessage({
        key: 'set-host-connection',
        data: JSON.stringify(this.anchorConnection)
      });
      this.updateConnectionMode();

      if (this.anchorBattleInfo.isBattleWithoutConnection && connectedList.length >= 2) {
        this.startAnchorBattle();
      }
    },
    onConnectionRequestCancelled(inviter: TUILiveConnectionUser) {
      // only triggered when other user invite current user
      if (this.anchorConnection.inviter?.userId === inviter.userId && this.anchorConnection.inviter?.roomId === inviter.roomId) {
        this.anchorConnection.inviter = null;
        this.anchorConnection.inviteeList = [];
        this.anchorConnection.extensionInfo = '';
        this.anchorConnection.connectedUserList = [];
        messageChannels.messagePortToChild?.postMessage({
          key: 'set-host-connection',
          data: JSON.stringify(this.anchorConnection)
        });
        this.updateConnectionMode();
      }
    },
    onConnectionRequestAccept(invitee: TUILiveConnectionUser) {
      const inviteeIndex = this.anchorConnection.inviteeList.findIndex(item => item.userId === invitee.userId && item.roomId === invitee.roomId);
      if (inviteeIndex !== -1) {
        this.anchorConnection.inviteeList.splice(inviteeIndex, 1);
      }
      this.anchorConnection.connectedUserList.push(invitee);
      messageChannels.messagePortToChild?.postMessage({
        key: 'set-host-connection',
        data: JSON.stringify(this.anchorConnection)
      });
      this.updateConnectionMode();
    },
    onConnectionRequestReject(invitee: TUILiveConnectionUser) {
      const inviteeIndex = this.anchorConnection.inviteeList.findIndex(item => item.userId === invitee.userId && item.roomId === invitee.roomId);
      if (inviteeIndex !== -1) {
        this.anchorConnection.inviteeList.splice(inviteeIndex, 1);

        if (this.anchorConnection.inviteeList.length === 0 && this.anchorBattleInfo.isBattleWithoutConnection) {
          this.anchorBattleInfo.isBattleWithoutConnection = false;
          this.anchorBattleInfo.status = BattleStatus.None;
          this.anchorBattleInfo.fromUser = null;
          this.anchorBattleInfo.toUserList = [];
          messageChannels.messagePortToChild?.postMessage({
            key: 'set-host-battle',
            data: JSON.stringify(this.anchorBattleInfo)
          });
        } else if (this.anchorBattleInfo.isBattleWithoutConnection) {
          const index = this.anchorBattleInfo.toUserList.findIndex(item => item.userId === invitee.userId && item.roomId === invitee.roomId);
          if (index !== -1) {
            this.anchorBattleInfo.toUserList.splice(index, 1);
            messageChannels.messagePortToChild?.postMessage({
              key: 'set-host-battle',
              data: JSON.stringify(this.anchorBattleInfo)
            });
          }
        }

        messageChannels.messagePortToChild?.postMessage({
          key: 'set-host-connection',
          data: JSON.stringify(this.anchorConnection)
        });
        this.updateConnectionMode();
      }
    },
    onConnectionRequestTimeout(inviter: TUILiveConnectionUser, invitee: TUILiveConnectionUser) {
      if (this.anchorConnection.inviter?.userId === inviter.userId
          && this.anchorConnection.inviter?.roomId === inviter.roomId) {
        if (invitee.roomId === this.currentLive.roomId && invitee.userId === this.localUser.userId) {
          this.anchorConnection.inviter = null;
          this.anchorConnection.inviteeList = [];
          this.anchorConnection.extensionInfo = '';
          this.anchorConnection.connectedUserList = [];
          messageChannels.messagePortToChild?.postMessage({
            key: 'set-host-connection',
            data: JSON.stringify(this.anchorConnection)
          });
        } else {
          const inviteeIndex = this.anchorConnection.inviteeList.findIndex(item => item.userId === invitee.userId && item.roomId === invitee.roomId);
          if (inviteeIndex !== -1) {
            this.anchorConnection.inviteeList.splice(inviteeIndex, 1);
            messageChannels.messagePortToChild?.postMessage({
              key: 'set-host-connection',
              data: JSON.stringify(this.anchorConnection)
            });

            if (this.anchorConnection.inviteeList.length === 0 && this.anchorBattleInfo.isBattleWithoutConnection) {
              this.anchorBattleInfo.isBattleWithoutConnection = false;
              this.anchorBattleInfo.status = BattleStatus.None;
              this.anchorBattleInfo.fromUser = null;
              this.anchorBattleInfo.toUserList = [];
              messageChannels.messagePortToChild?.postMessage({
                key: 'set-host-battle',
                data: JSON.stringify(this.anchorBattleInfo)
              });
            } else if (this.anchorBattleInfo.isBattleWithoutConnection) {
              const index = this.anchorBattleInfo.toUserList.findIndex(item => item.userId === invitee.userId && item.roomId === invitee.roomId);
              if (index !== -1) {
                this.anchorBattleInfo.toUserList.splice(index, 1);
                messageChannels.messagePortToChild?.postMessage({
                  key: 'set-host-battle',
                  data: JSON.stringify(this.anchorBattleInfo)
                });
              }
            }
          }
        }

        this.updateConnectionMode();
      }
    },
    async requestAnchorConnection(liveInfo: TUILiveInfo, widthBattle = false): Promise<boolean> {
      if (this.coHostLayoutTemplate) {
        await TUIRoomEngine.callExperimentalAPI(JSON.stringify({
          api: 'setCoHostLayoutTemplateId',
          params: {
            templateId: this.coHostLayoutTemplate,
          },
        }));
      }

      let result = false;
      if (this.connectionMode === TUIConnectionMode.CoGuest) {
        TUIMessageBox({
          message: t('You are in co-guest mode, please stop co-guest connection and retry.'),
          confirmButtonText: t('Sure')
        });
      } else {
        const liveConnectionManager = roomEngine.instance?.getLiveConnectionManager();
        if (liveConnectionManager) {
          try {
            const response = await liveConnectionManager.requestConnection({
              roomIdList: [liveInfo.roomId],
              timeout: INVITATION_TIMEOUT,
              extensionInfo: JSON.stringify({
                timeout: INVITATION_TIMEOUT,
                withBattle: widthBattle,
              }),
            });
            if (response.get(liveInfo.roomId) === TUIConnectionCode.TUIConnectionCodeSuccess) {
              logger.log(`${logPrefix}requestAnchorConnection success`);
              if(!this.anchorConnection.inviter) {
                this.anchorConnection.inviter = {
                  roomId: this.currentLive.roomId,
                  userId: this.localUser.userId,
                  userName: this.localUser.userName || this.localUser.userId,
                  avatarUrl: this.localUser.avatarUrl || '',
                  joinConnectionTime: 0,
                };
              }
              this.anchorConnection.inviteeList.push({
                roomId: liveInfo.roomId,
                userId: liveInfo.roomOwner || '',
                userName: liveInfo.ownerName || '',
                avatarUrl: liveInfo.ownerAvatarUrl || '',
                joinConnectionTime: 0,
              });
              messageChannels.messagePortToChild?.postMessage({
                key: 'set-host-connection',
                data: JSON.stringify(this.anchorConnection)
              });
              TUIMessageBox({
                message: t('Sent connection invitation to', { userName: liveInfo.ownerName || liveInfo.roomOwner}),
                confirmButtonText: t('Sure'),
                callback: () => Promise.resolve(),
                timeout: 3000,
              });
              result = true;
            } else {
              logger.error(`${logPrefix}requestAnchorConnection failed:`, response);
              onAnchorConnectionError({ code: response.get(liveInfo.roomId) as number, message: liveInfo.roomId });
            }
          } catch (error) {
            // To do: notify child window failed.
            handleRoomError(this, error);
          }

          this.updateConnectionMode();
        } else {
          logger.error(`${logPrefix}requestAnchorConnection failed: No LiveConnectionManager`);
        }
      }
      return result;
    },
    async cancelAnchorConnection(liveInfo: TUILiveInfo): Promise<boolean> {
      let result = false;
      const liveConnectionManager = roomEngine.instance?.getLiveConnectionManager();
      if (liveConnectionManager) {
        try {
          await liveConnectionManager.cancelConnectionRequest({
            roomIdList: [liveInfo.roomId],
          });
          const inviteeIndex = this.anchorConnection.inviteeList.findIndex(item => item.userId === liveInfo.roomOwner && item.roomId === liveInfo.roomId);
          if (inviteeIndex !== -1) {
            this.anchorConnection.inviteeList.splice(inviteeIndex, 1);
            if (this.anchorConnection.inviteeList.length === 0) {
              this.anchorConnection.inviter = null;
              this.anchorConnection.extensionInfo = '';
            }
            messageChannels.messagePortToChild?.postMessage({
              key: 'set-host-connection',
              data: JSON.stringify(this.anchorConnection)
            });
          }
          result = true;
        } catch (error) {
          // To do: notify child window failed.
          handleRoomError(this, error);
        }
        this.updateConnectionMode();
      } else {
        logger.error(`${logPrefix}cancelAnchorConnection failed: No LiveConnectionManager`);
      }

      return result;
    },
    async stopAnchorConnection() {
      const liveConnectionManager = roomEngine.instance?.getLiveConnectionManager();
      if (liveConnectionManager) {
        try {
          await liveConnectionManager.disconnect();
          this.anchorConnection = {
            inviter: null,
            inviteeList: [],
            extensionInfo: '',
            connectedUserList: [],
          };
          messageChannels.messagePortToChild?.postMessage({
            key: 'set-host-connection',
            data: JSON.stringify(this.anchorConnection)
          });
        } catch (error) {
          // To do: notify child window failed.
          handleRoomError(this, error);
        }
        this.updateConnectionMode();
      } else {
        logger.error(`${logPrefix}stopAnchorConnection failed: No LiveConnectionManager`);
      }
    },
    async acceptConnectionRequest(inviter: TUILiveConnectionUser) {
      const liveConnectionManager = roomEngine.instance?.getLiveConnectionManager();
      if (liveConnectionManager) {
        try {
          await liveConnectionManager.acceptConnection({ roomId: inviter.roomId });
          messageChannels.messagePortToChild?.postMessage({
            key: 'set-host-connection',
            data: JSON.stringify(this.anchorConnection)
          });
        } catch (error) {
          handleRoomError(this, error);
        }
      } else {
        logger.error(`${logPrefix}acceptConnectionRequest failed: No LiveConnectionManager`);
      }
    },
    async rejectConnectionRequest(inviter: TUILiveConnectionUser) {
      const liveConnectionManager = roomEngine.instance?.getLiveConnectionManager();
      if (liveConnectionManager) {
        try {
          await liveConnectionManager.rejectConnection({ roomId: inviter.roomId });
          if (this.anchorConnection.inviter?.roomId === inviter.roomId) {
            this.anchorConnection.inviter = null;
            this.anchorConnection.inviteeList = [];
          }
          messageChannels.messagePortToChild?.postMessage({
            key: 'set-host-connection',
            data: JSON.stringify(this.anchorConnection)
          });
        } catch (error) {
          handleRoomError(this, error);
        }
      } else {
        logger.error(`${logPrefix}rejectConnectionRequest failed: No LiveConnectionManager`);
      }
    },
    async startAnchorBattle() {
      if (this.anchorBattleInfo.status === BattleStatus.Started) {
        logger.error(`${logPrefix}startAnchorBattle failed: already started`, this.anchorBattleInfo);
        return;
      }
      if (this.anchorConnection.connectedUserList.length === 0) {
        logger.error(`${logPrefix}startAnchorBattle failed: connectedUserList is empty`);
        return;
      }

      const liveBattleManager = roomEngine.instance?.getLiveBattleManager();
      if (liveBattleManager) {
        try {
          const result = await liveBattleManager.requestBattle({
            config: {
              duration: this.anchorBattleInfo.duration,
              needResponse: true,
              extensionInfo: '',
            },
            userIdList: this.anchorConnection.connectedUserList.filter(item => item.userId !== this.localUser.userId).map(item => item.userId),
            timeout: 10,
          });
          logger.log(`${logPrefix}startAnchorBattle`, result);
          if (result.battleId) {
            this.anchorBattleInfo.isBattleWithoutConnection = false;
            this.anchorBattleInfo.battleId = result.battleId;
            this.anchorBattleInfo.status = BattleStatus.Preparing;
            messageChannels.messagePortToChild?.postMessage({
              key: 'set-host-battle',
              data: JSON.stringify(this.anchorBattleInfo)
            });
          } else {
            logger.error(`${logPrefix}startAnchorBattle failed: No battleId`);
          }
        } catch (error) {
          handleRoomError(this, error);
        }
      } else {
        // To do: notify child window failed.
        logger.error(`${logPrefix}startAnchorBattle failed: No LiveBattleManager`);
      }
    },
    async stopAnchorBattle() {
      if (!this.anchorBattleInfo.battleId) {
        logger.error(`${logPrefix}stopAnchorBattle failed: No battleId`);
        return;
      }

      const liveBattleManager = roomEngine.instance?.getLiveBattleManager()
      if (liveBattleManager) {
        try {
          await liveBattleManager.exitBattle({
            battleId: this.anchorBattleInfo.battleId,
          });
          if (this.anchorBattleInfo.fromUser?.roomId === this.currentLive.roomId) {
            this.anchorBattleInfo.fromUser = null;
          } else {
            const index = this.anchorBattleInfo.toUserList.findIndex(item => item.roomId === this.currentLive.roomId);
            if (index !== -1) {
              this.anchorBattleInfo.toUserList.splice(index, 1);
            }
          }
          this.anchorBattleInfo.isSelfExited = true;
          messageChannels.messagePortToChild?.postMessage({
            key: 'set-host-battle',
            data: JSON.stringify(this.anchorBattleInfo)
          });
        } catch (error) {
          handleRoomError(this, error);
        }
      } else {
        // To do: notify child window failed.
        logger.error(`${logPrefix}stopAnchorBattle failed: No LiveBattleManager`);
      }
    },
    async requestAnchorBattle(liveInfo: TUILiveInfo) {
      if (!liveInfo.roomOwner) {
        logger.error(`${logPrefix}requestAnchorBattle failed: No roomOwner`, liveInfo);
        return;
      }
      if (this.anchorBattleInfo.status === BattleStatus.Started) {
        logger.error(`${logPrefix}requestAnchorBattle failed: already in battle, cannot send request`);
        return;
      }

      try {
        const result = await this.requestAnchorConnection(liveInfo, true);
        if (result) {
          this.anchorBattleInfo.isBattleWithoutConnection = true;
          this.anchorBattleInfo.status = BattleStatus.Preparing;

          if (!this.anchorBattleInfo.fromUser || this.anchorBattleInfo.fromUser.roomId !== this.currentLive.roomId) {
            this.anchorBattleInfo.fromUser = {
              roomId: this.currentLive.roomId,
              userId: this.localUser.userId,
              userName: this.localUser.userName || this.localUser.userId,
              avatarUrl: this.localUser.avatarUrl || '',
              score: 0,
            };
          }
          if (this.anchorBattleInfo.toUserList.findIndex(item => item.roomId === liveInfo.roomId) === -1) {
            this.anchorBattleInfo.toUserList.push({
              roomId: liveInfo.roomId,
              userId: liveInfo.roomOwner,
              userName: liveInfo.ownerName || liveInfo.roomOwner,
              avatarUrl: liveInfo.ownerAvatarUrl || '',
              score: 0
            });
          }

          messageChannels.messagePortToChild?.postMessage({
            key: 'set-host-battle',
            data: JSON.stringify(this.anchorBattleInfo)
          });
        }
      } catch (error) {
        logger.error(`${logPrefix}requestAnchorBattle failed: requestAnchorConnection failed`, error);
      }
    },
    async cancelAnchorBattle(liveInfo: TUILiveInfo) {
      if (!liveInfo.roomOwner) {
        logger.error(`${logPrefix}cancelAnchorBattle failed: No roomOwner`, liveInfo);
        return;
      }

      if (this.anchorBattleInfo.isBattleWithoutConnection) {
        try {
          const result = await this.cancelAnchorConnection(liveInfo);

          if (result) {
            const index = this.anchorBattleInfo.toUserList.findIndex(item => item.roomId === liveInfo.roomId);
            if (index !== -1) {
              this.anchorBattleInfo.toUserList.splice(index, 1);
            }
            if (this.anchorBattleInfo.toUserList.length === 0) {
              this.anchorBattleInfo.status = BattleStatus.None;
              this.anchorBattleInfo.fromUser = null;
              this.anchorBattleInfo.isBattleWithoutConnection = false;
            }

            messageChannels.messagePortToChild?.postMessage({
              key: 'set-host-battle',
              data: JSON.stringify(this.anchorBattleInfo)
            });
          }
        } catch (error) {
          logger.error(`${logPrefix}cancelAnchorBattle failed: cancelAnchorConnection failed`, error);
          return;
        }
      }
    },
    acceptBattleRequest() {
      // To do: to be implemented
    },
    rejectBattleRequest() {
      // To do: to be implemented
    },
    onBattleRequestReceived(battleInfo: TUIBattleInfo, inviter: TUIBattleUser, invitee: TUIBattleUser) {
      // To do: to be implemented
    },
    onBattleRequestRejected() {
      // To do: to be implemented
    },
    onBattlerequestCancelled() {
      // To do: to be implemented
    },
    onBattleRequestTimeout() {
      // To do: to be implemented
    },
    onBattleStarted(battleInfo: TUIBattleInfo) {
      if (!this.anchorBattleInfo.battleId || this.anchorBattleInfo.battleId === battleInfo.battleId) {
        Object.assign(this.anchorBattleInfo, battleInfo);
        this.anchorBattleInfo.status = BattleStatus.Started;
        messageChannels.messagePortToChild?.postMessage({
          key: 'set-host-battle',
          data: JSON.stringify(this.anchorBattleInfo)
        });
      } else {
        logger.warn(`${logPrefix}updateBattleInfo: battleId not match`, battleInfo);
      }
    },
    onBattleEnded(battleId: string) {
      if (this.anchorBattleInfo.battleId === battleId) {
        this.anchorBattleInfo.status = BattleStatus.Ended;
        this.anchorBattleInfo.battleId = '';
        this.anchorBattleInfo.toUserList = [];
        this.anchorBattleInfo.fromUser = null;
        this.anchorBattleInfo.isBattleWithoutConnection = false;
        this.anchorBattleInfo.isSelfExited = false;
        messageChannels.messagePortToChild?.postMessage({
          key: 'set-host-battle',
          data: JSON.stringify(this.anchorBattleInfo)
        });
      }
    },
    addBattleUser(battleId: string, battleUser: TUIBattleUser) {
      if (this.anchorBattleInfo.battleId === battleId) {
        const index = this.anchorBattleInfo.toUserList.findIndex(battleUser => battleUser.userId === battleUser.userId);
        if (index === -1) {
          this.anchorBattleInfo.toUserList.push(battleUser);
        } else {
          Object.assign(this.anchorBattleInfo.toUserList[index], battleUser);
        }
        messageChannels.messagePortToChild?.postMessage({
          key: 'set-host-battle',
          data: JSON.stringify(this.anchorBattleInfo)
        });
      }
    },
    removeBattleUser(battleId: string, user: TUIBattleUser) {
      if (this.anchorBattleInfo.battleId === battleId) {
        if (user.roomId === this.anchorBattleInfo.fromUser?.roomId && user.userId === this.anchorBattleInfo.fromUser?.userId) {
          this.anchorBattleInfo.fromUser = null;
          messageChannels.messagePortToChild?.postMessage({
            key: 'set-host-battle',
            data: JSON.stringify(this.anchorBattleInfo)
          });
        } else {
          const index = this.anchorBattleInfo.toUserList.findIndex(battleUser => battleUser.userId === user.userId);
          if (index !== -1) {
            this.anchorBattleInfo.toUserList.splice(index, 1);
            messageChannels.messagePortToChild?.postMessage({
              key: 'set-host-battle',
              data: JSON.stringify(this.anchorBattleInfo)
            });
          }
        }
      }
    },
    updateBattleScore(battleId: string, battleUserList: Array<TUIBattleUser>) {
      if (this.anchorBattleInfo.battleId === battleId) {
        this.anchorBattleInfo.toUserList = battleUserList;
        messageChannels.messagePortToChild?.postMessage({
          key: 'set-host-battle',
          data: JSON.stringify(this.anchorBattleInfo)
        });
      }
    },
    addBattleRequest(battleInfo: TUIBattleInfo, inviter: TUIBattleUser, invitee: TUIBattleUser) {
      if (!this.anchorBattleInfo.battleId || this.anchorBattleInfo.battleId === battleInfo.battleId) {
        const index = this.anchorBattleInfo.toUserList.findIndex(battleUser => battleUser.userId === invitee.userId && battleUser.roomId === invitee.roomId);
        if (index === -1) {
          this.anchorBattleInfo.toUserList.push(invitee);
        } else {
          Object.assign(this.anchorBattleInfo.toUserList[index], invitee);
        }
        this.anchorBattleInfo.fromUser = inviter;
        if (this.anchorBattleInfo.status !== BattleStatus.Started) {
          this.anchorBattleInfo.status = BattleStatus.Preparing;
        }
        messageChannels.messagePortToChild?.postMessage({
          key: 'set-host-battle',
          data: JSON.stringify(this.anchorBattleInfo)
        });
        roomEngine.instance?.getLiveBattleManager().acceptBattle({ battleId: battleInfo.battleId });
      }
    },
    removeBattleRequest(battleInfo: TUIBattleInfo, inviter: TUIBattleUser, invitee: TUIBattleUser) {
      if (!this.anchorBattleInfo.battleId || this.anchorBattleInfo.battleId === battleInfo.battleId) {
        const index = this.anchorBattleInfo.toUserList.findIndex(battleUser => battleUser.userId === invitee.userId && battleUser.roomId === invitee.roomId);
        if (index !== -1) {
          this.anchorBattleInfo.toUserList.splice(index, 1);
          this.anchorBattleInfo.fromUser = inviter;
          if (this.anchorBattleInfo.toUserList.length === 0 && this.anchorBattleInfo.status !== BattleStatus.Started) {
            this.anchorBattleInfo.status = BattleStatus.None;
          }
          messageChannels.messagePortToChild?.postMessage({
            key: 'set-host-battle',
            data: JSON.stringify(this.anchorBattleInfo)
          });
        }
      }
    },
    reset() {
      this.localUser = {
        sdkAppId: 0,
        userId: '',
        userSig: '',
        userName: '',
        avatarUrl: '',
        userRole: TUIRole.kRoomOwner,
        onSeat: false,
      };
      this.remoteUserList = [];
      this.currentLive = {
        roomId: '',
        roomType: TUIRoomType.kLive,
        name: '',
        notice: '',
        isMessageDisableForAllUser: false,
        isGiftEnabled: true,
        isLikeEnabled: true,
        isPublicVisible: true,
        isSeatEnabled: true,
        keepOwnerOnSeat: true,
        seatLayoutTemplateId: this.currentLive.seatLayoutTemplateId,
        maxSeatCount: 0,
        seatMode: TUISeatMode.kApplyToTake,
        coverUrl: '',
        backgroundUrl: '',
        categoryList: [],
        activityStatus: 0,
        roomOwner: '',
        ownerName: '',
        ownerAvatarUrl: '',
        createTime: 0,
        totalViewers: 0,
        isUnlimitedRoomEnabled: true,
        cdnStreamUrl: '',
        lebSecretKey: '',
        lebEncrypted: '',
        lebSignature: '',
      },
      this.liveListCursor = '';
      this.liveList = [];
      this.anchorConnection = {
        inviter: null,
        inviteeList: [],
        extensionInfo: '',
        connectedUserList: [],
      };
      this.coHostLayoutTemplate = TUICoHostLayoutTemplate.HostDynamicGrid;
      this.anchorBattleInfo = {
        fromUser: null,
        toUserList: [],
        extensionInfo: '',
        battleId: '',
        needResponse: false,
        duration: DEFAULT_BATTLE_DURATION,
        startTime: 0,
        endTime: 0,
        status: BattleStatus.None,
        isBattleWithoutConnection: false,
        isSelfExited: false
      };
      this.connectionMode = TUIConnectionMode.None;

      streamLayoutService.reset();
    },
    restoreMediaSource(mediaSourceState: TUIMediaSourcesState) {
      this.setLocalVideoResMode(mediaSourceState.mixingVideoEncodeParam.resMode);
      mediaSourceStore.restoreState(mediaSourceState);
    }
  }
});
