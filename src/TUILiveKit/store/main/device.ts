import { defineStore } from 'pinia';
import { TRTCDeviceInfo, TRTCDeviceState, TRTCDeviceType } from 'trtc-electron-sdk';
import { messageChannels } from './../../communication';
import trtcCloud from '../../utils/trtcCloud';
import logger from '../../utils/logger';

interface deviceState {
  cameraList: TRTCDeviceInfo[];
  microphoneList: TRTCDeviceInfo[];
  speakerList: TRTCDeviceInfo[];
  currentCameraId: string;
  currentMicrophoneId: string;
  currentSpeakerId: string;
}

export const useDeviceStore = defineStore('device', {
  state: (): deviceState => ({
    cameraList: [],
    microphoneList: [],
    speakerList: [],
    currentCameraId: '',
    currentMicrophoneId: '',
    currentSpeakerId: '',
  }),
  actions: {
    async init() {
      this.cameraList = trtcCloud.getCameraDevicesList();
      this.microphoneList = trtcCloud.getMicDevicesList();
      this.speakerList = trtcCloud.getSpeakerDevicesList();
      this.currentCameraId = this.cameraList.length > 0 ? this.cameraList[0].deviceId : '';
      this.currentMicrophoneId = this.microphoneList.length > 0 ? this.microphoneList[0].deviceId : '';
      this.currentSpeakerId = this.speakerList.length > 0 ? this.speakerList[0].deviceId : '';

      logger.log('init device store');
      logger.log('cameraList:', this.cameraList);
      logger.log('microphoneList:', this.microphoneList);
      logger.log('speakerList:', this.speakerList);
      logger.log('currentCameraId:', this.currentCameraId);
      logger.log('currentMicrophoneId:', this.currentMicrophoneId);
      logger.log('currentSpeakerId:', this.currentSpeakerId);
      this._postDeviceList();
      this._postCurrentDevice();
    },
    changeDevice(deviceId: string, type: TRTCDeviceType, state: TRTCDeviceState) {
      switch (type) {
      case TRTCDeviceType.TRTCDeviceTypeCamera:
        this._changeCameraDevice(deviceId, state);
        break;
      case TRTCDeviceType.TRTCDeviceTypeMic:
        this._changeMicrophoneDevice(deviceId, state);
        break;
      case TRTCDeviceType.TRTCDeviceTypeSpeaker:
        this._changeSpeakerDevice(deviceId, state);
        break;
      default:
        break;
      }
    },
    _changeCameraDevice(deviceId: string, state: TRTCDeviceState) {
      if (state === TRTCDeviceState.TRTCDeviceStateAdd || state === TRTCDeviceState.TRTCDeviceStateRemove) {
        this.cameraList = trtcCloud.getCameraDevicesList();
        this._postDeviceList();
      } else if (state === TRTCDeviceState.TRTCDeviceStateActive) {
        this.currentCameraId = deviceId;
        this._postCurrentDevice();
      }
    },
    _changeMicrophoneDevice(deviceId: string, state: TRTCDeviceState) {
      if (state === TRTCDeviceState.TRTCDeviceStateAdd || state === TRTCDeviceState.TRTCDeviceStateRemove) {
        this.microphoneList = trtcCloud.getMicDevicesList();
        this._postDeviceList();
      } else if (state === TRTCDeviceState.TRTCDeviceStateActive) {
        this.currentMicrophoneId = deviceId;
        this._postCurrentDevice();
      }
    },
    _changeSpeakerDevice(deviceId: string, state: TRTCDeviceState) {
      if (state === TRTCDeviceState.TRTCDeviceStateAdd || state === TRTCDeviceState.TRTCDeviceStateRemove) {
        this.speakerList = trtcCloud.getSpeakerDevicesList();
        this._postDeviceList();
      } else if (state === TRTCDeviceState.TRTCDeviceStateActive) {
        this.currentSpeakerId = deviceId;
        this._postCurrentDevice();
      }
    },
    _postDeviceList() {
      messageChannels.messagePortToChild?.postMessage({
        key: 'update-device-list',
        data: {
          cameraList: JSON.stringify(this.cameraList),
          microphoneList: JSON.stringify(this.microphoneList),
          speakerList: JSON.stringify(this.speakerList),
        }
      });
    },
    _postCurrentDevice() {
      messageChannels.messagePortToChild?.postMessage({
        key: 'update-current-device',
        data: {
          cameraId: this.currentCameraId,
          microphoneId: this.currentMicrophoneId,
          speakerId: this.currentSpeakerId,
        }
      });
    }
  }
});
