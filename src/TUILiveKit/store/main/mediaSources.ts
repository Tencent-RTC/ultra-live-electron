import { defineStore } from 'pinia';
import { TRTCMediaSourceType, TRTCMediaSource, TRTCVideoEncParam, TRTCVideoResolutionMode, TRTCCameraCaptureMode, TRTCVideoRotation, TRTCVideoResolution, TRTCVideoMirrorType, TRTCVideoColorRange, TRTCVideoColorSpace, TRTCVideoEncodeComplexity } from 'trtc-electron-sdk';
import trtcCloud from '../../utils/trtcCloud';
import { TUIMediaMixingError, TUIMediaSourceViewModel } from '../../types';
import { defaultCameraCaptureHeight, defaultCameraCaptureWidth } from '../../constants/tuiConstant';
import useMediaMixingManager, { fitMediaSourceToResolution } from '../../utils/useMediaMixingManager';
import useVideoEffectManager from '../../utils/useVideoEffectManager';
import streamLayoutService from '../../service/StreamLayoutService';
import onMediaMixingError from '../../hooks/useMediaMixingErrorHandler';
import { useI18n } from '../../locales/index';
import { resolutionMap, MEDIA_SOURCE_STORAGE_KEY } from '../../constants/tuiConstant';
import logger from '../../utils/logger';

const logPrefix = '[MediaSourceStore]';

const { t } = useI18n();

const mediaMixingManager = useMediaMixingManager();
const videoEffectManager = useVideoEffectManager();

type TUISelectedMediaKey = {
  sourceType: TRTCMediaSourceType | null;
  sourceId: string;
}

export type TUIMediaSourcesState = {
  mixingVideoEncodeParam: TRTCVideoEncParam;
  mixingVideoWidth: number;
  mixingVideoHeight: number;
  backgroundColor: number;
  selectedBorderColor: number;
  mediaList: Array<TUIMediaSourceViewModel>; // 'zOrder' desc order
  selectedMediaKey: TUISelectedMediaKey;
  isHevcEncodeEnabled: boolean;
}

function isSameMediaSource(mediaSource1: TUISelectedMediaKey | TRTCMediaSource, mediaSource2: TUISelectedMediaKey | TRTCMediaSource) {
  return mediaSource1.sourceId === mediaSource2.sourceId && mediaSource1.sourceType === mediaSource2.sourceType;
}

function aliasMediaSource(newMediaSource: TUIMediaSourceViewModel, mediaList: Array<TUIMediaSourceViewModel>) {
  let newAliasName = '';
  switch (newMediaSource.mediaSourceInfo.sourceType) {
  case TRTCMediaSourceType.kCamera:
    newAliasName = t('Camera');
    break;
  case TRTCMediaSourceType.kScreen:
    if (newMediaSource.screenType === 0) {
      newAliasName = t('Window');
    } else {
      newAliasName = t('Screen');
    }
    break;
  case TRTCMediaSourceType.kImage:
    newAliasName = t('Image');
    break;
  case TRTCMediaSourceType.kPhoneMirror:
    newAliasName = t('Phone Mirror');
    break;
  default:
    logger.warn('[MediaSource]aliasMediaSource unsupported media type:', newMediaSource);
    return;
  }

  const aliasNameMap = new Map<string, string>();
  mediaList.forEach(mediaItem => {
    aliasNameMap.set(mediaItem.aliasName, '');
  });

  let i = 0;
  while(aliasNameMap.has(newAliasName+(i ? i : ''))) {
    i++;
  }
  newMediaSource.aliasName = newAliasName + (i ? i : '');
}

function isCameraCaptureParamChanged(newParam: TUIMediaSourceViewModel, oldParam: TUIMediaSourceViewModel) {
  return (newParam.resolution && (newParam.resolution.width !== oldParam.resolution?.width || newParam.resolution.height !== oldParam.resolution?.height))
    || newParam.colorSpace !== oldParam.colorSpace
    || newParam.colorRange !== oldParam.colorRange;
}

export const useMediaSourcesStore = defineStore('mediaSources', {
  state: (): TUIMediaSourcesState => ({
    mixingVideoEncodeParam: {
      resMode: TRTCVideoResolutionMode.TRTCVideoResolutionModePortrait,
      videoResolution: TRTCVideoResolution.TRTCVideoResolution_1920_1080,
      videoFps: 30,
      videoBitrate: 5000,
      minVideoBitrate: 5000,
      enableAdjustRes: false,
      colorRange: TRTCVideoColorRange.TRTCVideoColorRange_Auto,
      colorSpace: TRTCVideoColorSpace.TRTCVideoColorSpace_Auto,
      complexity: TRTCVideoEncodeComplexity.TRTCVideoEncodeComplexity_Fastest
    },
    mixingVideoWidth: 1080,
    mixingVideoHeight: 1920,
    backgroundColor: 0x191919,
    selectedBorderColor: 0xFF0000,
    mediaList: [],
    selectedMediaKey: {
      sourceType: null,
      sourceId: '',
    },
    isHevcEncodeEnabled: false,
  }),
  getters:{
    isSourceExisted(state) {
      return state.mediaList.length >= 1;
    },
    isPhoneSourceExisted(state) {
      return state.mediaList.filter(item => item.mediaSourceInfo.sourceType === TRTCMediaSourceType.kPhoneMirror).length > 0;
    },
    resMode(state) {
      return state.mixingVideoEncodeParam.resMode;
    },
  },
  actions:{
    updateMediaMixingParams(params?: TRTCVideoEncParam) {
      if (params) {
        this.mixingVideoEncodeParam = Object.assign({}, this.mixingVideoEncodeParam, params);
      }
      mediaMixingManager.updatePublishParams({
        videoEncoderParams: this.mixingVideoEncodeParam,
        canvasColor: this.backgroundColor,
        selectedBorderColor: this.selectedBorderColor,
      });
      this.saveState();
    },
    updateBackgroundColor(color: number) {
      this.backgroundColor = color;
      this.updateMediaMixingParams();
    },
    updateSelectedBorderColor(color: number) {
      this.selectedBorderColor = color;
      this.updateMediaMixingParams();
    },
    updateResolutionMode(resMode: TRTCVideoResolutionMode) {
      this.mixingVideoEncodeParam.resMode = resMode;
      this.updateMixingVideoSize();
      this.updateMediaMixingParams();
    },
    updateVideoResolution(value: TRTCVideoResolution) {
      this.mixingVideoEncodeParam.videoResolution = value;
      this.updateMixingVideoSize();
      this.updateMediaMixingParams();
      streamLayoutService.setResolution(value);
    },
    updateMixingVideoSize() {
      const size = resolutionMap[this.mixingVideoEncodeParam.videoResolution];
      if (this.mixingVideoEncodeParam.resMode === TRTCVideoResolutionMode.TRTCVideoResolutionModeLandscape) {
        this.mixingVideoWidth = size.width;
        this.mixingVideoHeight = size.height;
      } else {
        this.mixingVideoWidth = size.height;
        this.mixingVideoHeight = size.width;
      }
    },
    updateVideoFps(value: number) {
      this.mixingVideoEncodeParam.videoFps = value;
      this.updateMediaMixingParams();
    },
    updateVideobitrate(value: number) {
      this.mixingVideoEncodeParam.videoBitrate = value;
      this.mixingVideoEncodeParam.minVideoBitrate = value;
      this.updateMediaMixingParams();
    },
    updateMixingColorSpace(value: TRTCVideoColorSpace) {
      this.mixingVideoEncodeParam.colorSpace = value;
      this.updateMediaMixingParams();
    },
    updateMixingColorRange(value: TRTCVideoColorRange) {
      this.mixingVideoEncodeParam.colorRange = value;
      this.updateMediaMixingParams();
    },
    updateMixingEncodeGear(value: TRTCVideoEncodeComplexity) {
      this.mixingVideoEncodeParam.complexity = value;
      this.updateMediaMixingParams();
    },
    async addMediaSource(mediaSource: TUIMediaSourceViewModel): Promise<void>{
      this.checkMediaExisting(mediaSource);

      mediaSource.mediaSourceInfo.zOrder = this.mediaList.length + 1;
      if (mediaSource.mediaSourceInfo.rect) {
        mediaSource.mediaSourceInfo.rect = fitMediaSourceToResolution(mediaSource.mediaSourceInfo.rect, this.mixingVideoWidth, this.mixingVideoHeight);
        this.mediaList.unshift(mediaSource);
        aliasMediaSource(mediaSource, this.mediaList);
        await mediaMixingManager.addMediaSource(mediaSource.mediaSourceInfo);
        this.postAddMediaSource(mediaSource);
      } else {
        logger.error('New added media source with no valid rect:', mediaSource);
        throw new Error(t('MediaSource rect invalid or does not exist'));
      }
      this.saveState();
    },
    postAddMediaSource(mediaSource: TUIMediaSourceViewModel) {
      if (mediaSource.mediaSourceInfo.sourceType === TRTCMediaSourceType.kCamera) {
        if (mediaSource.resolution || mediaSource.colorSpace || mediaSource.colorRange) {
          mediaMixingManager.setCameraCaptureParam(mediaSource.mediaSourceInfo.sourceId, {
            mode: TRTCCameraCaptureMode.TRTCCameraCaptureManual,
            width: mediaSource.resolution?.width || defaultCameraCaptureWidth,
            height: mediaSource.resolution?.height || defaultCameraCaptureHeight,
            colorSpace: mediaSource?.colorSpace,
            colorRange: mediaSource?.colorRange,
          });
        }

        if (mediaSource.beautyConfig?.beautyProperties.length) {
          videoEffectManager.startEffect(mediaSource.mediaSourceInfo.sourceId, mediaSource.beautyConfig);
        }
      } else if (mediaSource.mediaSourceInfo.sourceType === TRTCMediaSourceType.kPhoneMirror) {
        if (mediaSource.mirrorParams?.deviceId) {
          mediaMixingManager.setPhoneMirrorParam(
            mediaSource.mediaSourceInfo.sourceId,
            mediaSource.mirrorParams
          );
        }
      }
    },
    async removeMediaSource(mediaSource: TUIMediaSourceViewModel) {
      let indexToRemove = -1;
      const length = this.mediaList.length;
      for(let i = length - 1; i >= 0; i--) {
        const item = this.mediaList[i];
        if (indexToRemove === -1 && isSameMediaSource(item.mediaSourceInfo, mediaSource.mediaSourceInfo)) {
          indexToRemove = i;
          if (mediaSource.mediaSourceInfo.sourceType === TRTCMediaSourceType.kCamera && mediaSource.beautyConfig?.beautyProperties.length) {
            videoEffectManager.stopEffect(mediaSource.mediaSourceInfo.sourceId);
          }
          if (isSameMediaSource(this.mediaList[indexToRemove].mediaSourceInfo, this.selectedMediaKey)) {
            this.selectedMediaKey = {
              sourceId: '',
              sourceType: null,
            }
          }
          if (!this.mediaList[indexToRemove].muted) {
            await mediaMixingManager.removeMediaSource(mediaSource.mediaSourceInfo);
          }
          continue;
        }

        if (indexToRemove !== -1) {
          item.mediaSourceInfo.zOrder = (item.mediaSourceInfo.zOrder as number) - 1;
          if (!item.muted) {
            await mediaMixingManager.updateMediaSource(item.mediaSourceInfo);
          }
        }
      }

      if (indexToRemove !== -1) {
        this.mediaList.splice(indexToRemove, 1);
      }
      this.saveState();
    },
    async updateMediaSource(mediaSource: TUIMediaSourceViewModel) {
      let targetIndex = -1;
      for(let i = 0; i < this.mediaList.length; i++) {
        if (isSameMediaSource(this.mediaList[i].mediaSourceInfo, mediaSource.mediaSourceInfo)) {
          targetIndex = i;
          break;
        }
      }
      if (targetIndex >= 0) {
        const target = this.mediaList[targetIndex];
        if(!target.muted){
          await mediaMixingManager.updateMediaSource(mediaSource.mediaSourceInfo);
        } else {
          await mediaMixingManager.addMediaSource(mediaSource.mediaSourceInfo);
        }

        if (mediaSource.mediaSourceInfo.sourceType === TRTCMediaSourceType.kCamera) {
          if (isCameraCaptureParamChanged(mediaSource, target)) {
            await mediaMixingManager.setCameraCaptureParam(mediaSource.mediaSourceInfo.sourceId, {
              mode: TRTCCameraCaptureMode.TRTCCameraCaptureManual,
              width: mediaSource.resolution?.width || defaultCameraCaptureWidth,
              height: mediaSource.resolution?.height || defaultCameraCaptureHeight,
              colorSpace: mediaSource?.colorSpace,
              colorRange: mediaSource?.colorRange,
            });
          }

          if (mediaSource.beautyConfig?.beautyProperties.length) {
            if(!target.muted && target.beautyConfig?.beautyProperties.length){
              videoEffectManager.updateEffect(mediaSource.mediaSourceInfo.sourceId, mediaSource.beautyConfig);
            } else {
              videoEffectManager.startEffect(mediaSource.mediaSourceInfo.sourceId, mediaSource.beautyConfig);
            }
          }
        } else if (mediaSource.mediaSourceInfo.sourceType === TRTCMediaSourceType.kPhoneMirror) {
          if (mediaSource.mirrorParams?.deviceId) {
            await mediaMixingManager.setPhoneMirrorParam(
              mediaSource.mediaSourceInfo.sourceId,
              mediaSource.mirrorParams
            );
          }
        }

        this.mediaList[targetIndex] = {
          ...mediaSource,
          muted: false
        };
      } else {
        logger.warn('[MedisSources]updateMediaSource not found media source:', mediaSource);
      }
      this.saveState();
    },
    async updateMediaSourceRect(mediaSource: TUIMediaSourceViewModel, updateUIOnly = false) {
      let targetIndex = -1;
      for(let i = 0; i < this.mediaList.length; i++) {
        if (isSameMediaSource(this.mediaList[i].mediaSourceInfo, mediaSource.mediaSourceInfo)) {
          targetIndex = i;
          break;
        }
      }
      if (targetIndex >= 0) {
        this.mediaList[targetIndex].mediaSourceInfo.rect = mediaSource.mediaSourceInfo.rect;
        if (!updateUIOnly) {
          await mediaMixingManager.updateMediaSource(this.mediaList[targetIndex].mediaSourceInfo);
        }
      }
      this.saveState();
    },
    async replaceMediaSource(srcMediaSource: TUIMediaSourceViewModel, destMediaSource: TUIMediaSourceViewModel) {
      this.checkMediaExisting(destMediaSource);

      let targetIndex = -1;
      for(let i = 0; i < this.mediaList.length; i++) {
        if (isSameMediaSource(this.mediaList[i].mediaSourceInfo, srcMediaSource.mediaSourceInfo)) {
          targetIndex = i;
          break;
        }
      }
      if (targetIndex >= 0) {
        let target = this.mediaList[targetIndex];
        if (target.mediaSourceInfo.sourceType === TRTCMediaSourceType.kCamera && target.beautyConfig?.beautyProperties.length) {
          videoEffectManager.stopEffect(target.mediaSourceInfo.sourceId);
        }
        if (!target.muted) {
          await mediaMixingManager.removeMediaSource(target.mediaSourceInfo);
        }

        target = {
          ...destMediaSource,
        };
        await mediaMixingManager.addMediaSource(target.mediaSourceInfo);
        this.mediaList[targetIndex] = target;

        if (target.mediaSourceInfo.sourceType === TRTCMediaSourceType.kCamera) {
          if (srcMediaSource.beautyConfig?.beautyProperties.length) {
            videoEffectManager.stopEffect(srcMediaSource.mediaSourceInfo.sourceId);
          }
          if (destMediaSource.beautyConfig?.beautyProperties.length) {
            videoEffectManager.startEffect(destMediaSource.mediaSourceInfo.sourceId, destMediaSource.beautyConfig);
          }

          if (destMediaSource.resolution || destMediaSource.colorSpace || destMediaSource.colorRange) {
            await mediaMixingManager.setCameraCaptureParam(destMediaSource.mediaSourceInfo.sourceId, {
              mode: TRTCCameraCaptureMode.TRTCCameraCaptureManual,
              width: destMediaSource.resolution?.width || defaultCameraCaptureWidth,
              height: destMediaSource.resolution?.height || defaultCameraCaptureHeight,
              colorSpace: destMediaSource?.colorSpace,
              colorRange: destMediaSource?.colorRange,
            });
          }
        }
      } else {
        logger.warn('[MedisSources]replaceMediaSource not found media source:', srcMediaSource);
      }
      this.saveState();
    },
    setSelectedMediaKey(selected: TUISelectedMediaKey, updateUIOnly = false) {
      let oldSelected = null, newSelected = null;
      for(let i = 0; i < this.mediaList.length; i++) {
        const item = this.mediaList[i];
        if (!oldSelected && this.selectedMediaKey.sourceId && isSameMediaSource(item.mediaSourceInfo, this.selectedMediaKey)) {
          item.mediaSourceInfo.isSelected = false;
          oldSelected = item;
        }
        if (!newSelected && isSameMediaSource(item.mediaSourceInfo, selected)) {
          item.mediaSourceInfo.isSelected = true;
          newSelected = item;
        }
      }

      if(oldSelected !== newSelected) {
        if (oldSelected && !oldSelected.muted && !updateUIOnly) {
          mediaMixingManager.updateMediaSource(oldSelected.mediaSourceInfo);
        }
      }

      if (newSelected && !newSelected.muted) {
        if (!updateUIOnly) {
          mediaMixingManager.updateMediaSource(newSelected.mediaSourceInfo);
        }
        this.selectedMediaKey = {
          ...selected
        };
      } else {
        this.selectedMediaKey = {
          sourceType: TRTCMediaSourceType.kCamera,
          sourceId: '',
        };
      }
      this.saveState();
    },
    selectMediaSource(mediaSource: TUIMediaSourceViewModel) {
      this.setSelectedMediaKey(mediaSource.mediaSourceInfo);
    },
    changeMediaOrder(mediaSource: TUIMediaSourceViewModel, changeValue: number) {
      let targetIndex = -1;
      let target = null;
      for(let i = 0; i < this.mediaList.length; i++) {
        if (isSameMediaSource(this.mediaList[i].mediaSourceInfo, mediaSource.mediaSourceInfo)) {
          targetIndex = i;
          target = this.mediaList[i];
          break;
        }
      }
      if (targetIndex >= 0 && target) {
        if (
          changeValue === 0 ||
          (targetIndex - changeValue < 0) ||
          (targetIndex - changeValue > this.mediaList.length - 1)
        ) {
          logger.warn(`[MedisSources]changeMediaOrder invalid order change: ${changeValue}`);
          return;
        }

        if (changeValue > 0) {
          for (let i = 1; i <= changeValue; i++) {
            this.mediaList[targetIndex-i].mediaSourceInfo.zOrder = this.mediaList[targetIndex-i].mediaSourceInfo.zOrder - 1;
            if (!this.mediaList[targetIndex-i].muted) {
              mediaMixingManager.updateMediaSource(this.mediaList[targetIndex-i].mediaSourceInfo);
            }
            this.mediaList[targetIndex-i+1] = this.mediaList[targetIndex-i];
          }
        } else if (changeValue < 0){
          for (let i = 1; i <= (-changeValue); i++) {
            this.mediaList[targetIndex+i].mediaSourceInfo.zOrder = this.mediaList[targetIndex+i].mediaSourceInfo.zOrder + 1;
            if (!this.mediaList[targetIndex+i].muted) {
              mediaMixingManager.updateMediaSource(this.mediaList[targetIndex+i].mediaSourceInfo);
            }
            this.mediaList[targetIndex + i - 1] = this.mediaList[targetIndex + i];
          }
        }

        target.mediaSourceInfo.zOrder = target.mediaSourceInfo.zOrder + changeValue;
        if (!target.muted) {
          mediaMixingManager.updateMediaSource(target.mediaSourceInfo);
        }
        this.mediaList[targetIndex - changeValue] = target;
      } else {
        logger.warn('[MedisSources]changeMediaOrder not valid media source:', mediaSource);
      }
      this.saveState();
    },
    moveMediaTop(mediaSource: TUIMediaSourceViewModel) {
      let indexToChange = -1;
      const length = this.mediaList.length;
      for(let i = length - 1; i >= 0; i--) {
        if (indexToChange === -1 && isSameMediaSource(this.mediaList[i].mediaSourceInfo, mediaSource.mediaSourceInfo)) {
          indexToChange = i;
          break;
        }
      }
      if (indexToChange > 0) {
        for(let i = 0; i < indexToChange; i++) {
          this.mediaList[i].mediaSourceInfo.zOrder = this.mediaList[i].mediaSourceInfo.zOrder - 1;
          mediaMixingManager.updateMediaSource(this.mediaList[i].mediaSourceInfo);
        }
        this.mediaList[indexToChange].mediaSourceInfo.zOrder = this.mediaList.length;
        mediaMixingManager.updateMediaSource(this.mediaList[indexToChange].mediaSourceInfo);

        const target = this.mediaList[indexToChange];
        this.mediaList.splice(indexToChange, 1);
        this.mediaList.unshift(target);
      }
      this.saveState();
    },
    moveMediaBottom(mediaSource: TUIMediaSourceViewModel) {
      let indexToChange = -1;
      const length = this.mediaList.length;
      for(let i = 0; i < length; i++) {
        if (indexToChange === -1 && isSameMediaSource(this.mediaList[i].mediaSourceInfo, mediaSource.mediaSourceInfo)) {
          indexToChange = i;
          continue;
        }
        if (indexToChange >= 0) {
          this.mediaList[i].mediaSourceInfo.zOrder = this.mediaList[i].mediaSourceInfo.zOrder + 1;
          mediaMixingManager.updateMediaSource(this.mediaList[i].mediaSourceInfo);
        }
      }

      if (indexToChange >= 0 && indexToChange !== length -1) {
        const target = this.mediaList[indexToChange];
        target.mediaSourceInfo.zOrder = 1;
        mediaMixingManager.updateMediaSource(target.mediaSourceInfo);

        this.mediaList.splice(indexToChange, 1);
        this.mediaList.push(target);
      }
      this.saveState();
    },
    async rotateMediaSource(mediaSource: TUIMediaSourceViewModel, degree: number) {
      logger.log('[MedisSources]rotateMediaSource:', mediaSource, degree);
      let targetIndex = -1;
      for(let i = 0; i < this.mediaList.length; i++) {
        if (isSameMediaSource(this.mediaList[i].mediaSourceInfo, mediaSource.mediaSourceInfo)) {
          targetIndex = i;
          break;
        }
      }
      if (targetIndex >= 0) {
        const currentRotation = mediaSource.mediaSourceInfo.rotation || TRTCVideoRotation.TRTCVideoRotation0;
        const newRotation = (4 + (currentRotation as number) + degree/90) % 4;
        mediaSource.mediaSourceInfo.rotation = newRotation;
        const changed = Math.abs(newRotation - currentRotation);
        if (changed === 1 || changed === 3) {
          const { left, right, top, bottom } = mediaSource.mediaSourceInfo.rect;
          mediaSource.mediaSourceInfo.rect.right = left + bottom - top;
          mediaSource.mediaSourceInfo.rect.bottom = top + right - left;
        }
        await mediaMixingManager.updateMediaSource(mediaSource.mediaSourceInfo);
        this.mediaList[targetIndex].mediaSourceInfo.rotation = mediaSource.mediaSourceInfo.rotation;
        this.mediaList[targetIndex].mediaSourceInfo.rect.right = mediaSource.mediaSourceInfo.rect.right;
        this.mediaList[targetIndex].mediaSourceInfo.rect.bottom = mediaSource.mediaSourceInfo.rect.bottom;
      } else {
        logger.warn('[MedisSources]rotateMediaSource not found media source:', mediaSource);
      }
      this.saveState();
    },
    async toggleHorizontalMirror(mediaSource: TUIMediaSourceViewModel) {
      logger.log('[MedisSources]toggleHorizontalMirror:', mediaSource);
      let targetIndex = -1;
      for(let i = 0; i < this.mediaList.length; i++) {
        if (isSameMediaSource(this.mediaList[i].mediaSourceInfo, mediaSource.mediaSourceInfo)) {
          targetIndex = i;
          break;
        }
      }
      if (targetIndex >= 0) {
        const target = this.mediaList[targetIndex];
        target.mediaSourceInfo.mirrorType = target.mediaSourceInfo.mirrorType !== TRTCVideoMirrorType.TRTCVideoMirrorType_Enable ? TRTCVideoMirrorType.TRTCVideoMirrorType_Enable : TRTCVideoMirrorType.TRTCVideoMirrorType_Disable;
        await mediaMixingManager.updateMediaSource(target.mediaSourceInfo);
      } else {
        logger.warn('[MedisSources]toggleHorizontalMirror not found media source:', mediaSource);
      }
      this.saveState();
    },
    async muteMediaSource(mediaSource: TUIMediaSourceViewModel, muted: boolean) {
      let targetIndex = -1;
      const length = this.mediaList.length;
      for(let i = 0; i < length; i++) {
        if (isSameMediaSource(this.mediaList[i].mediaSourceInfo, mediaSource.mediaSourceInfo)) {
          targetIndex = i;
          break;
        }
      }

      if (targetIndex >= 0) {
        const target = this.mediaList[targetIndex];
        if(muted){
          if (target.mediaSourceInfo.sourceType === TRTCMediaSourceType.kCamera && target.beautyConfig?.beautyProperties.length) {
            videoEffectManager.stopEffect(target.mediaSourceInfo.sourceId);
          }

          await mediaMixingManager.removeMediaSource(target.mediaSourceInfo);
          target.muted = true;
          if (target.mediaSourceInfo.isSelected) {
            this.selectedMediaKey = {
              sourceType: TRTCMediaSourceType.kCamera,
              sourceId: '',
            }
          }
        }else{
          if (this.selectedMediaKey.sourceId) {
            for(let i = 0; i < length; i++) {
              if (isSameMediaSource(this.mediaList[i].mediaSourceInfo, this.selectedMediaKey)) {
                this.mediaList[i].mediaSourceInfo.isSelected = false;
                await mediaMixingManager.updateMediaSource(this.mediaList[i].mediaSourceInfo);
                break;
              }
            }
          }

          target.mediaSourceInfo.isSelected = true;
          await mediaMixingManager.addMediaSource(target.mediaSourceInfo);
          target.muted = false;
          this.selectedMediaKey = {
            sourceType: target.mediaSourceInfo.sourceType,
            sourceId: target.mediaSourceInfo.sourceId,
          }
          this.postAddMediaSource(target);
        }
        logger.log('[MedisSources]muteMediaSource:', target, muted);
      } else {
        logger.warn('[MedisSources]muteMediaSource not found media source:', mediaSource, muted);
      }
      this.saveState();
    },
    isMediaSourceExisted(mediaSource: TUIMediaSourceViewModel): boolean {
      return this.mediaList.some(mediaItem => isSameMediaSource(mediaItem.mediaSourceInfo, mediaSource.mediaSourceInfo));
    },
    checkMediaExisting(mediaSource: TUIMediaSourceViewModel) {
      if (this.isMediaSourceExisted(mediaSource)) {
        logger.warn('[MediaSource]checkMediaExisting Media source to be added already existing.:', mediaSource);
        let deviceType = '';
        switch (mediaSource.mediaSourceInfo.sourceType) {
        case TRTCMediaSourceType.kCamera:
          deviceType = t('Camera');
          break;
        case TRTCMediaSourceType.kScreen:
          if (mediaSource.screenType === 0) {
            deviceType = t('Window');
          } else {
            deviceType = t('Screen');
          }
          break;
        case TRTCMediaSourceType.kImage:
          deviceType = t('Image');
          break;
        default:
          logger.warn('[MediaSource]checkMediaExisting unsupported media type:', mediaSource);
          break;
        }
        throw new Error(t('Media source to be added already existing.', { deviceType: deviceType.toLocaleLowerCase() }));
      }
    },
    updateHevcEncodeState(enable: boolean) {
      logger.log(`updateHevcEncodeState ${enable}`);
      this.isHevcEncodeEnabled = !!enable;
      trtcCloud.callExperimentalAPI(JSON.stringify({
        'api':'enableHevcEncode',
        'params':{
          'enable': this.isHevcEncodeEnabled ? 1 : 0
        }
      }));
      this.saveState();
    },
    recoverMediaSource() {
      this.mediaList.forEach(async (mediaSource) => {
        try {
          await mediaMixingManager.addMediaSource(mediaSource.mediaSourceInfo);
        } catch (error) {
          logger.error('[MediaSource]recover media source error:', error);
          onMediaMixingError(error as TUIMediaMixingError);
        }
      });
    },
    clear() {
      this.mediaList.forEach(async (mediaSource: TUIMediaSourceViewModel) => {
        if (!mediaSource.muted) {
          if (mediaSource.mediaSourceInfo.sourceType === TRTCMediaSourceType.kCamera && mediaSource.beautyConfig?.beautyProperties.length) {
            videoEffectManager.stopEffect(mediaSource.mediaSourceInfo.sourceId);
          }
          try {
            await mediaMixingManager.removeMediaSource(mediaSource.mediaSourceInfo);
          } catch (error) {
            logger.error('[MediaSource]recover media source error:', error);
            onMediaMixingError(error as TUIMediaMixingError);
          }
        }
      });
      this.mediaList = [];
    },
    saveState() {
      const stateStr = JSON.stringify(this.$state);
      try {
        window.localStorage.setItem(MEDIA_SOURCE_STORAGE_KEY, stateStr);
      } catch (error) {
        logger.warn(`${logPrefix}saveState failed:`, error);
      }
    },
    async restoreState(storeState: TUIMediaSourcesState) {
      this.mixingVideoEncodeParam = storeState.mixingVideoEncodeParam;
      this.mixingVideoWidth = storeState.mixingVideoWidth;
      this.mixingVideoHeight = storeState.mixingVideoHeight;
      this.backgroundColor = storeState.backgroundColor;
      this.selectedBorderColor = storeState.selectedBorderColor;

      mediaMixingManager.updatePublishParams({
        videoEncoderParams: this.mixingVideoEncodeParam,
        canvasColor: this.backgroundColor,
        selectedBorderColor: this.selectedBorderColor,
      });

      this.mediaList = storeState.mediaList;
      const length = storeState.mediaList.length;
      for(let i = length - 1; i >= 0; i--) {
        const current = storeState.mediaList[i];
        try {
          await mediaMixingManager.addMediaSource(current.mediaSourceInfo);
        } catch(error) {
          onMediaMixingError(error as TUIMediaMixingError);
        }

        this.postAddMediaSource(current);
      }
      this.selectedMediaKey = storeState.selectedMediaKey;
      this.updateHevcEncodeState(storeState.isHevcEncodeEnabled);
    }
  },
});
