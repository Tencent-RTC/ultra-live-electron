import { defineStore } from 'pinia';
import { TUIDeviceInfo, TUIDeviceType } from '@tencentcloud/tuiroom-engine-electron/plugins/device-manager-plugin';
import { TRTCScreenCaptureSourceInfo } from '@tencentcloud/tuiroom-engine-electron';
import { UserInfo } from './room';
import { TUIBeautyProperty } from '../utils/beauty';

const logger = console;
const logPrefix = '[currentSources]';

const defaultCameraResolution = { width: 640, height: 360 };

type CurrentViewType = 'camera' | 'screen' | 'file' | 'image' | 'voice-chat' | 'setting' | '';

interface TUICurrentMediaSourcesState {
    currentCameraResolution: {width: number; height: number;};
    isCurrentCameraMirrored: boolean;
    currentCameraId: string;
    currentMicrophoneId: string;
    currentSpeakerId: string;
    cameraList: TUIDeviceInfo[];
    microphoneList: TUIDeviceInfo[];
    speakerList: TUIDeviceInfo[];
    pictureList: Array<Record<string, any>>;
    currentViewName: CurrentViewType;
    screenList: Array<TRTCScreenCaptureSourceInfo>;
    windowList: Array<TRTCScreenCaptureSourceInfo>;
    applyToAnchorList: Array<UserInfo>;
    currentAnchorList: Array<UserInfo>;
    micVolume: number;
    speakerVolume: number;
    currentBeautySetting: Array<TUIBeautyProperty>;
}

export const useCurrentSourcesStore = defineStore('currentSources', {
  state: (): TUICurrentMediaSourcesState => ({
    currentCameraResolution: defaultCameraResolution,
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
    applyToAnchorList: [],
    currentAnchorList: [],
    micVolume: 0,
    speakerVolume: 0,
    currentBeautySetting: [],
  }),
  getters:{

  },
  actions:{
    setCurrentCameraId(deviceId: string) {
      this.currentCameraId = deviceId;
      const currentCamera = this.cameraList.find((item: TUIDeviceInfo) => item.deviceId === deviceId);
      if (currentCamera) {
        this.currentCameraResolution =  currentCamera.deviceProperties?.SupportedResolution[0] || defaultCameraResolution;
      } else {
        this.currentCameraResolution =  defaultCameraResolution;
      }
      logger.log('[CurrentSources]setCurrentCameraId', this.currentCameraId, this.currentCameraResolution, this.cameraList);
      window.mainWindowPort?.postMessage({
        key: "setCurrentDevice",
        data: {
          deviceType: TUIDeviceType.DeviceTypeCamera,
          deviceId,
        }
      });
    },
    setCurrentMicrophoneId(deviceId: string) {
      this.currentMicrophoneId = deviceId;
    },
    setCurrentSpeakerId(deviceId: string) {
      this.currentSpeakerId = deviceId;
    },
    setCurrentCameraResolution(resolution: {width: number; height: number;}) {
      this.currentCameraResolution = resolution;
    },
    setCameraList(deviceList: TUIDeviceInfo[]) {
      this.cameraList = deviceList;
      if (!this.currentCameraId && deviceList.length > 0) {
        this.setCurrentCameraId(deviceList[0].deviceId);
        this.setCurrentCameraResolution(deviceList[0].deviceProperties.SupportedResolution[0]);
      }
    },
    setMicrophoneList(deviceList: TUIDeviceInfo[]) {
      this.microphoneList = deviceList;
      if (!this.currentMicrophoneId && deviceList.length > 0) {
        this.setCurrentMicrophoneId(deviceList[0].deviceId);
      }
    },
    setSpeakerList(deviceList: TUIDeviceInfo[]) {
      this.speakerList = deviceList;
      if (!this.currentSpeakerId && deviceList.length > 0) {
        this.setCurrentSpeakerId(deviceList[0].deviceId);
      }
    },
    setIsCurrentCameraMirrored(mirror: boolean) {
      this.isCurrentCameraMirrored = mirror;
      // To do: send change state to main window
    },
    setCurrentViewName(name: CurrentViewType) {
      this.currentViewName = name;
    },
    setScreenList(screenList: any) {
      this.screenList = screenList;
    },
    setWindowList(windowList: any){
      this.windowList = windowList;
    },
    setApplyToAnchorList(applyToAnchorList: any) {
      this.applyToAnchorList = applyToAnchorList;
    },
    updateApplyToAnchorList(userInfo: any){
      const userId = userInfo.userId;
      const isUserIdInApplyToAnchorList = this.applyToAnchorList.some(item => item.userId === userId);
      if(isUserIdInApplyToAnchorList) {
        this.applyToAnchorList = this.applyToAnchorList.filter(item => item.userId !== userId);
      } else {
        this.applyToAnchorList.push(userInfo);
      }
    },  
    setAnchorList(userInfo: any){
      if(userInfo.agree) {
        this.currentAnchorList.push(userInfo);
      }
    },
    updateAnchorList(userId: any){
      this.currentAnchorList = this.currentAnchorList.filter(item => item.userId !== userId);
    },
    updateAudioVolume(volume: number) {
      this.micVolume = volume
    },
    updateSpeakerVolume(volume: number) {
      this.speakerVolume = volume
    },
    setCurrentBeautySetting(setting: TUIBeautyProperty){
      const currentSetting = Object.assign({},setting);
      const index = this.currentBeautySetting.findIndex(obj => obj.effKey === currentSetting.effKey);
      if (index !== -1) {
        // 更新对象
        Object.assign(this.currentBeautySetting[index], currentSetting)
      } else{
        this.currentBeautySetting.push(currentSetting)
      }
    },
    setBeautySettings(settings: TUIBeautyProperty[]) {
      this.currentBeautySetting = settings;
    },
    reset() {
      this.currentCameraResolution = defaultCameraResolution;
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
      this.applyToAnchorList = [];
      this.currentAnchorList = [];
      this.micVolume = 0;
      this.speakerVolume = 0;
    },
  },
})