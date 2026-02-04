import { defineStore } from 'pinia';
import { TRTCScreenCaptureSourceInfo, TRTCDeviceInfo, TRTCDeviceType, TRTCPhoneMirrorParam, TRTCVideoColorSpace, TRTCVideoColorRange } from 'trtc-electron-sdk';
import { TUIBattleUser, TUILiveConnectionUser, TUILiveInfo } from '@tencentcloud/tuiroom-engine-electron';
import { TUILiveUserInfo } from '../../types';
import { defaultCameraCaptureWidth, defaultCameraCaptureHeight } from '@/TUILiveKit/constants/tuiConstant';
import { TRTCXmagicEffectProperty, TRTCXmagicEffectCategory } from '../../utils/beauty';
import logger from '../../utils/logger';
import { BattleStatus, TUIBattleInfoEx } from '../types';

const logPrefix = '[currentSources]';

const defaultCameraResolution = { width: defaultCameraCaptureWidth, height: defaultCameraCaptureHeight };

type CurrentViewType = 'camera' | 'screen' | 'file' | 'image' | 'co-guest-connection' | 'setting' | 'add-bgm' | 'reverb-voice' | 'change-voice' | 'phone-mirror' | 'online-video' | 'video-file' | 'co-host-connection' | 'user-profile' | '';

export type TUILiveInfoEx = TUILiveInfo & {
  connectionStatus?: 'Disconnected' | 'Connecting' | 'Connected';
  battleStatus?: 'Disconnected' | 'Connecting' | 'Connected';
};

interface TUICurrentMediaSourceState {
  roomId: string;
  roomName: string;
  roomOwner: string;
  currentCameraResolution: {width: number; height: number;};
  currentCameraColorSpace: TRTCVideoColorSpace;
  currentCameraColorRange: TRTCVideoColorRange;
  isCurrentCameraMirrored: boolean;
  currentCameraId: string;
  currentMicrophoneId: string;
  currentSpeakerId: string;
  cameraList: TRTCDeviceInfo[];
  microphoneList: TRTCDeviceInfo[];
  speakerList: TRTCDeviceInfo[];
  pictureList: Array<Record<string, any>>;
  currentViewName: CurrentViewType;
  screenList: Array<TRTCScreenCaptureSourceInfo>;
  windowList: Array<TRTCScreenCaptureSourceInfo>;
  applyOnSeatList: Array<TUILiveUserInfo>;
  seatedList: Array<TUILiveUserInfo>;
  micVolume: number;
  speakerVolume: number;
  beautyProperties: Array<TRTCXmagicEffectProperty>;
  phoneDeviceList: Array<TRTCPhoneMirrorParam>;
  liveList: Array<TUILiveInfoEx>;
  isLoadedAllLiveList: boolean;
  anchorConnection: {
    inviter: TUILiveConnectionUser | null;
    inviteeList: Array<TUILiveConnectionUser>;
    extensionInfo: string;
    connectedUserList: Array<TUILiveConnectionUser>;
  },
  anchorBattleInfo: TUIBattleInfoEx;
}

export const useCurrentSourceStore = defineStore('currentSource', {
  state: (): TUICurrentMediaSourceState => ({
    roomId: '',
    roomName: '',
    roomOwner: '',
    currentCameraResolution: defaultCameraResolution,
    currentCameraColorSpace: TRTCVideoColorSpace.TRTCVideoColorSpace_Auto,
    currentCameraColorRange: TRTCVideoColorRange.TRTCVideoColorRange_Auto,
    currentCameraId: '',
    currentMicrophoneId: '',
    currentSpeakerId: '',
    cameraList: [],
    microphoneList: [],
    speakerList: [],
    isCurrentCameraMirrored: false,
    screenList: [],
    windowList: [],
    pictureList: [],
    currentViewName: '',
    applyOnSeatList: [],
    seatedList: [],
    micVolume: 0,
    speakerVolume: 0,
    beautyProperties: [],
    phoneDeviceList: [],
    liveList: [],
    isLoadedAllLiveList: false,
    anchorConnection: {
      inviter: null,
      inviteeList: [],
      extensionInfo: '',
      connectedUserList: [],
    },
    anchorBattleInfo: {
      fromUser: null,
      toUserList: [],
      extensionInfo: '',
      battleId: '',
      needResponse: false,
      duration: 0,
      startTime: 0,
      endTime: 0,
      status: BattleStatus.None,
      isBattleWithoutConnection: false,
      isSelfExited: false
    }
  }),
  getters:{
    getBeautyPropertyByEffKey(state): Record<string, any> | null {
      return (effKey: string) => state.beautyProperties.find(item => item.effKey === effKey) || null;
    },
    isSelfExited(state): boolean { return state.anchorBattleInfo.isSelfExited },
    isInBattle(state): boolean { return state.anchorBattleInfo.status === BattleStatus.Started },
    isInConnection(state): boolean { return state.anchorConnection.connectedUserList.length > 0 },
    battledUserList(state): Array<TUIBattleUser> {
      if (state.anchorBattleInfo.fromUser) {
        return state.anchorBattleInfo.toUserList.concat(state.anchorBattleInfo.fromUser)
      } else {
        return state.anchorBattleInfo.toUserList
      }
    },
    battleInviteeList(state): Array<TUIBattleUser> { return state.anchorBattleInfo.toUserList },
    connectionInviter(state): TUILiveConnectionUser|null { return state.anchorConnection.inviter },
    contentionInviteeList(state): Array<TUILiveConnectionUser> { return state.anchorConnection.inviteeList },
    connectedUserList(state): Array<TUILiveConnectionUser> { return state.anchorConnection.connectedUserList },
  },
  actions:{
    reset() {
      this.roomId = '';
      this.roomName = '';
      this.roomOwner = '';
      this.currentCameraResolution = defaultCameraResolution;
      this.currentCameraColorSpace = TRTCVideoColorSpace.TRTCVideoColorSpace_Auto;
      this.currentCameraColorRange = TRTCVideoColorRange.TRTCVideoColorRange_Auto;
      this.currentCameraId = '';
      this.currentMicrophoneId = '';
      this.currentSpeakerId = '';
      this.cameraList = [];
      this.microphoneList = [];
      this.speakerList = [];
      this.isCurrentCameraMirrored = false;
      this.screenList = [];
      this.windowList = [];
      this.pictureList = [];
      this.currentViewName = '';
      this.applyOnSeatList = [];
      this.seatedList = [];
      this.micVolume = 0;
      this.speakerVolume = 0;
      this.beautyProperties = [];
      this.phoneDeviceList = [];
      this.liveList = [];
      this.anchorConnection = {
        inviter: null,
        inviteeList: [],
        extensionInfo: '',
        connectedUserList: [],
      };
      this.anchorBattleInfo =  {
        fromUser: null,
        toUserList: [],
        extensionInfo: '',
        battleId: '',
        needResponse: false,
        duration: 0,
        startTime: 0,
        endTime: 0,
        status: BattleStatus.None,
        isBattleWithoutConnection: false,
        isSelfExited: false
      };
    },
    resetCurrentCamera() {
      this.currentCameraResolution = defaultCameraResolution;
      this.currentCameraColorSpace = TRTCVideoColorSpace.TRTCVideoColorSpace_Auto;
      this.currentCameraColorRange = TRTCVideoColorRange.TRTCVideoColorRange_Auto;
      this.currentCameraId = '';
      this.beautyProperties = [];
    },
    setRoomInfo(data: {roomId: string; roomName: string; roomOwner: string;}) {
      if (!data) {
        logger.warn(`${logPrefix}setRoomInfo invalid data`, data);
        return;
      }
      this.roomId = data.roomId || '';
      this.roomName = data.roomName || '';
      this.roomOwner = data.roomOwner || '';
    },
    setCurrentCameraId(deviceId: string) {
      this.currentCameraId = deviceId;
      const currentCamera = this.cameraList.find((item: TRTCDeviceInfo) => item.deviceId === deviceId);
      if (currentCamera && currentCamera.deviceProperties?.SupportedResolution?.length) {
        this.currentCameraResolution =  currentCamera.deviceProperties?.SupportedResolution[0] || defaultCameraResolution;
      } else {
        this.currentCameraResolution =  defaultCameraResolution;
      }
      logger.log(`${logPrefix}setCurrentCameraId`, this.currentCameraId, this.currentCameraResolution, this.cameraList);
      window.mainWindowPortInChild?.postMessage({
        key: 'setCurrentDevice',
        data: {
          deviceType: TRTCDeviceType.TRTCDeviceTypeCamera,
          deviceId,
        }
      });
      window.mainWindowPortInChild?.postMessage({
        key: 'setCameraTestDeviceId',
        data: {
          cameraId: deviceId
        }
      });
    },
    setCurrentMicrophoneId(deviceId: string) {
      this.currentMicrophoneId = deviceId;
      logger.log(`${logPrefix}setCurrentMicrophoneId`, this.currentMicrophoneId, this.microphoneList);
      window.mainWindowPortInChild?.postMessage({
        key: 'setCurrentDevice',
        data: {
          deviceType: TRTCDeviceType.TRTCDeviceTypeMic,
          deviceId,
        }
      });
    },
    setCurrentSpeakerId(deviceId: string) {
      this.currentSpeakerId = deviceId;
      logger.log(`${logPrefix}setCurrentSpeakerId`, this.currentSpeakerId);
      window.mainWindowPortInChild?.postMessage({
        key: 'setCurrentDevice',
        data: {
          deviceType: TRTCDeviceType.TRTCDeviceTypeSpeaker,
          deviceId,
        }
      });
    },
    setCurrentCameraResolution(resolution: {width: number; height: number;}) {
      this.currentCameraResolution = resolution;
    },
    setCameraCaptureColorSpace(colorSpace: TRTCVideoColorSpace) {
      this.currentCameraColorSpace = colorSpace;
    },
    setCameraCaptureColorRange(colorRange: TRTCVideoColorRange) {
      this.currentCameraColorRange = colorRange;
    },
    setCameraCaptureColor(options: {colorSpace: TRTCVideoColorSpace; colorRange: TRTCVideoColorRange;}) {
      this.currentCameraColorSpace = options.colorSpace;
      this.currentCameraColorRange = options.colorRange;
    },
    setCameraList(deviceList: TRTCDeviceInfo[]) {
      this.cameraList = deviceList;
      if (!this.currentCameraId && deviceList.length > 0 && deviceList[0].deviceProperties?.SupportedResolution?.length) {
        this.setCurrentCameraId(deviceList[0].deviceId);
        this.setCurrentCameraResolution(deviceList[0].deviceProperties.SupportedResolution[0]);
      } else {
        this.setCurrentCameraId('');
        this.setCurrentCameraResolution(defaultCameraResolution);
      }
    },
    setMicrophoneList(deviceList: TRTCDeviceInfo[]) {
      this.microphoneList = deviceList;
      if (!this.currentMicrophoneId && deviceList.length > 0) {
        this.setCurrentMicrophoneId(deviceList[0].deviceId);
      }
    },
    setSpeakerList(deviceList: TRTCDeviceInfo[]) {
      this.speakerList = deviceList;
      if (!this.currentSpeakerId && deviceList.length > 0) {
        this.setCurrentSpeakerId(deviceList[0].deviceId);
      }
    },
    setIsCurrentCameraMirrored(mirror: boolean) {
      this.isCurrentCameraMirrored = mirror;
    },
    setCurrentViewName(name: CurrentViewType) {
      this.currentViewName = name;
    },
    setScreenList(screenList: Array<TRTCScreenCaptureSourceInfo>) {
      this.screenList = screenList;
    },
    setWindowList(windowList: Array<TRTCScreenCaptureSourceInfo>){
      this.windowList = windowList;
    },
    setApplyOnSeatList(applyOnSeatList: Array<TUILiveUserInfo>) {
      this.applyOnSeatList = applyOnSeatList;
    },
    setApplyAndSeatedList(data: {applyList: Array<TUILiveUserInfo>; anchorList: Array<TUILiveUserInfo>;}) {
      this.applyOnSeatList = data.applyList;
      this.seatedList = data.anchorList;
    },
    setLiveList(options: { list: Array<TUILiveInfo>; isLoadedAll: boolean; }) {
      options.list.forEach(item => {
        if (this.anchorConnection.connectedUserList.find(user => user.roomId === item.roomId)) {
          Object.assign(item, {connectionStatus: 'Connected', battleStatus: 'Disconnected'});
        } else if (this.anchorConnection.inviteeList.find(invitee => invitee.roomId === item.roomId)) {
          Object.assign(item, {connectionStatus: 'Connecting', battleStatus: 'Disconnected'});
        } else {
          Object.assign(item, {connectionStatus: 'Disconnected', battleStatus: 'Disconnected'});
        }
      });
      this.liveList = options.list;
      this.isLoadedAllLiveList = options.isLoadedAll;
      logger.debug(`${logPrefix}setLiveList`, JSON.parse(JSON.stringify(this.liveList)));
    },
    appendLiveList(options: { list: Array<TUILiveInfo>; isLoadedAll: boolean; }){
      options.list.forEach(item => {
        if (this.anchorConnection.connectedUserList.find(user => user.roomId === item.roomId)) {
          Object.assign(item, {connectionStatus: 'Connected', battleStatus: 'Disconnected'});
        } else if (this.anchorConnection.inviteeList.find(invitee => invitee.roomId === item.roomId)) {
          Object.assign(item, {connectionStatus: 'Connecting', battleStatus: 'Disconnected'});
        } else {
          Object.assign(item, {connectionStatus: 'Disconnected', battleStatus: 'Disconnected'});
        }
      });
      this.liveList = this.liveList.concat(options.list);
      this.isLoadedAllLiveList = options.isLoadedAll;
      logger.debug(`${logPrefix}appendLiveList`, JSON.parse(JSON.stringify(this.liveList)));
    },
    setHostConnection(data: {
      inviter: TUILiveConnectionUser;
      inviteeList: Array<TUILiveConnectionUser>;
      connectedUserList: Array<TUILiveConnectionUser>;
      extensionInfo: string;
      battledUserList: Array<Record<string, any>>;
    }) {
      this.anchorConnection = data;
      this.liveList.forEach(item => {
        if (this.anchorConnection.connectedUserList.find(user => user.roomId === item.roomId)) {
          Object.assign(item, { connectionStatus: 'Connected' });
        } else if (this.anchorConnection.inviteeList.find(invitee => invitee.roomId === item.roomId)) {
          Object.assign(item, { connectionStatus: 'Connecting' });
        } else {
          Object.assign(item, { connectionStatus: 'Disconnected' });
        }
      });
      logger.log(`${logPrefix}setHostConnection`, this.liveList, this.anchorConnection);
    },
    requestAnchorConnection(liveInfo: TUILiveInfo) {
      window.mainWindowPortInChild?.postMessage({
        key: 'requestAnchorConnection',
        data: liveInfo,
      });
    },
    cancelAnchorConnection(liveInfo: TUILiveInfo) {
      window.mainWindowPortInChild?.postMessage({
        key: 'cancelAnchorConnection',
        data: liveInfo,
      });
    },
    stopAnchorConnection() {
      window.mainWindowPortInChild?.postMessage({
        key: 'stopAnchorConnection',
        data: null,
      });
    },
    startAnchorBattle() {
      window.mainWindowPortInChild?.postMessage({
        key: 'startAnchorBattle',
        data: null,
      });
    },
    requestAnchorBattle(liveInfo: TUILiveInfo) {
      window.mainWindowPortInChild?.postMessage({
        key: 'requestAnchorBattle',
        data: liveInfo,
      });
    },
    cancelAnchorBattle(liveInfo: TUILiveInfo) {
      window.mainWindowPortInChild?.postMessage({
        key: 'cancelAnchorBattle',
        data: liveInfo,
      });
    },
    stopAnchorBattle() {
      window.mainWindowPortInChild?.postMessage({
        key: 'stopAnchorBattle',
        data: null,
      });
    },
    setHostBattle(data: TUIBattleInfoEx) {
      this.anchorBattleInfo = data;
      this.liveList.forEach(item => {
        if (data.status === BattleStatus.Started) {
          if (item.roomId === data.fromUser?.roomId || data.toUserList.find(user => user.roomId === item.roomId)) {
            Object.assign(item, { battleStatus: 'Connected'});
          } else {
            Object.assign(item, { battleStatus: 'Disconnected'});
          }
        } else if (data.status === BattleStatus.Preparing) {
          if (item.roomId === data.fromUser?.roomId || data.toUserList.find(user => user.roomId === item.roomId)) {
            Object.assign(item, { battleStatus: 'Connecting'});
          } else {
            Object.assign(item, { battleStatus: 'Disconnected'});
          }
        } else {
          Object.assign(item, { battleStatus: 'Disconnected'});
        }
      });
    },
    updateAudioVolume(volume: number) {
      this.micVolume = volume;
    },
    updateSpeakerVolume(volume: number) {
      this.speakerVolume = volume;
    },
    setBeautyProperty(property: TRTCXmagicEffectProperty){
      const currentProperty = Object.assign({}, property);
      const excludedCategory = [TRTCXmagicEffectCategory.Segmentation, TRTCXmagicEffectCategory.Makeup, TRTCXmagicEffectCategory.Motion];
      let indexToUpdate = -1;
      switch (currentProperty.category) {
      case TRTCXmagicEffectCategory.Beauty:
      case TRTCXmagicEffectCategory.BodyBeauty:
      case TRTCXmagicEffectCategory.Lut:
        indexToUpdate = this.beautyProperties.findIndex(item => item.effKey === currentProperty.effKey);
        if (indexToUpdate !== -1) {
          Object.assign(this.beautyProperties[indexToUpdate], currentProperty);
        } else{
          this.beautyProperties.push(currentProperty);
        }
        break;
      case TRTCXmagicEffectCategory.Motion:
      case TRTCXmagicEffectCategory.Segmentation:
      case TRTCXmagicEffectCategory.Makeup:
        indexToUpdate = this.beautyProperties.findIndex(item => excludedCategory.indexOf(item.category) !== -1);
        if (indexToUpdate !== -1) {
          Object.assign(this.beautyProperties[indexToUpdate], currentProperty);
          indexToUpdate = this.beautyProperties.findIndex(item => item.category === TRTCXmagicEffectCategory.AssetData);
          if (indexToUpdate !== -1) {
            this.beautyProperties.splice(indexToUpdate, 1);
          }
        } else{
          this.beautyProperties.push(currentProperty);
        }
        break;
      case TRTCXmagicEffectCategory.AssetData:
        indexToUpdate = this.beautyProperties.findIndex(item => item.category === TRTCXmagicEffectCategory.AssetData);
        if (indexToUpdate !== -1) {
          this.beautyProperties.splice(indexToUpdate, 1);
        }
        this.beautyProperties.push(currentProperty);
        break;
      default:
        logger.warn(`${logPrefix}setBeautyProperty unsupported beauty effect category.`, property);
        break;
      }
    },
    setBeautyProperty_1(setting: TRTCXmagicEffectProperty){
      const currentSetting = Object.assign({},setting);
      const index = this.beautyProperties.findIndex(obj => {
        return obj.effKey === currentSetting.effKey
          || (currentSetting.category === TRTCXmagicEffectCategory.Segmentation && obj.category === TRTCXmagicEffectCategory.Segmentation);
      });
      if (index !== -1) {
        Object.assign(this.beautyProperties[index], currentSetting);
      } else{
        this.beautyProperties.push(currentSetting);
      }
    },
    setBeautyProperties(properties: TRTCXmagicEffectProperty[]) {
      properties.forEach(item => this.setBeautyProperty(item));
    },
    setPhoneDeviceList(data: TRTCPhoneMirrorParam[]){
      this.phoneDeviceList = data;
    },
  },
});
