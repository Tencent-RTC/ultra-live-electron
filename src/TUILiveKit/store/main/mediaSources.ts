import { defineStore } from 'pinia';
import { TRTCMediaSourceType, TRTCMediaSource, TRTCVideoEncParam, TRTCVideoResolutionMode, TRTCCameraCaptureMode, TRTCVideoRotation, TRTCVideoResolution, TRTCVideoMirrorType } from 'trtc-electron-sdk';
import trtcCloud from '../../utils/trtcCloud';
import { resolutionMap } from '../../constants/tuiConstant';
import { TUIMediaSourceViewModel } from '../../types';
import useMediaMixingManager from "../../utils/useMediaMixingManager";
import useVideoEffectManager from "../../utils/useVideoEffectManager";
import { useI18n } from '../../locales/index';

const { t } = useI18n();

const logger = console;
const mediaMixingManager = useMediaMixingManager();
const videoEffectManager = useVideoEffectManager();


type TUISelectedMediaKey = {
  sourceType: TRTCMediaSourceType | null;
  sourceId: string;
}

type TUIMediaSourcesState = {
  mixingVideoEncodeParam: TRTCVideoEncParam;
  backgroundColor: number;
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
  default:
    logger.warn(`[MediaSource]aliasMediaSource unsupported media type:`, newMediaSource);
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

function adjustMediaSourceRect(mediaSource: TUIMediaSourceViewModel, params: TRTCVideoEncParam): void {
  // Reduce the display size of the media source to ensure that it does not exceed the video resolution size.
  const size = resolutionMap[params.videoResolution];
  let resWidth = 0;
  let resHeight = 0;
  if (params.resMode === TRTCVideoResolutionMode.TRTCVideoResolutionModeLandscape) {
    resWidth = size.width;
    resHeight = size.height;
  } else {
    resWidth = size.height;
    resHeight = size.width;
  }
  const width = mediaSource.mediaSourceInfo.rect.right - mediaSource.mediaSourceInfo.rect.left;
  const height = mediaSource.mediaSourceInfo.rect.bottom - mediaSource.mediaSourceInfo.rect.top;
  if (width > resWidth || height > resHeight) {
    const shrinkRate = width * resHeight > height * resWidth ? resWidth/width : resHeight/height;
    mediaSource.mediaSourceInfo.rect.right = Math.round(width * shrinkRate);
    mediaSource.mediaSourceInfo.rect.bottom = Math.round(height * shrinkRate);
  }
}

export const useMediaSourcesStore = defineStore('mediaSources', {
  state: (): TUIMediaSourcesState => ({
    mixingVideoEncodeParam: {
      resMode: TRTCVideoResolutionMode.TRTCVideoResolutionModeLandscape,
      videoResolution: TRTCVideoResolution.TRTCVideoResolution_1920_1080,
      videoFps: 30,
      videoBitrate: 5000,
      minVideoBitrate: 5000,
      enableAdjustRes: false,
    },
    backgroundColor: 0x191919,
    mediaList: [],
    selectedMediaKey: {
      sourceType: null,
      sourceId: '',
    },
    isHevcEncodeEnabled: false
  }),
  getters:{
    isHasSources(state) {
      return state.mediaList.length >= 1;
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
      });
    },
    updateBackgroundColor(color: number) {
      this.backgroundColor = color;
      this.updateMediaMixingParams();
    },
    updateResolutionMode(resMode: TRTCVideoResolutionMode) {
      this.mixingVideoEncodeParam.resMode = resMode;
      this.updateMediaMixingParams();
    },
    updateVideoResolution(value: TRTCVideoResolution) {
      this.mixingVideoEncodeParam.videoResolution = value;
      this.updateMediaMixingParams();
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
    async addMediaSource(mediaSource: TUIMediaSourceViewModel): Promise<void>{
      this.checkMediaExisting(mediaSource);

      mediaSource.mediaSourceInfo.zOrder = this.mediaList.length + 1;
      if (mediaSource.mediaSourceInfo.rect) {
        adjustMediaSourceRect(mediaSource, this.mixingVideoEncodeParam);
        this.mediaList.unshift(mediaSource);
        aliasMediaSource(mediaSource, this.mediaList);
        await mediaMixingManager.addMediaSource(mediaSource.mediaSourceInfo);
        if (mediaSource.mediaSourceInfo.sourceType === TRTCMediaSourceType.kCamera) {
          if (mediaSource.resolution) {
            await mediaMixingManager.setCameraCaptureParam(mediaSource.mediaSourceInfo.sourceId, {
              mode: TRTCCameraCaptureMode.TRTCCameraCaptureManual,
              width: mediaSource.resolution?.width,
              height: mediaSource.resolution?.height
            });
          }

          if (mediaSource.beautyConfig?.beautyProperties.length) {
            videoEffectManager.startEffect(mediaSource.mediaSourceInfo.sourceId, mediaSource.beautyConfig);
          }
        }
      } else {
        logger.error("New added media source with no valid rect:", mediaSource);
        throw new Error(t('MediaSource rect invalid or does not exist'));
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
          if (mediaSource.resolution
            && (target.resolution?.width !== mediaSource.resolution?.width
            || target.resolution?.height !== mediaSource.resolution?.height)
          ) {
            await mediaMixingManager.setCameraCaptureParam(mediaSource.mediaSourceInfo.sourceId, {
              mode: TRTCCameraCaptureMode.TRTCCameraCaptureManual,
              width: mediaSource.resolution?.width,
              height: mediaSource.resolution?.height
            });
          }

          if (mediaSource.beautyConfig?.beautyProperties.length) {
            if(!target.muted && target.beautyConfig?.beautyProperties.length){
              videoEffectManager.updateEffect(mediaSource.mediaSourceInfo.sourceId, mediaSource.beautyConfig);
            } else {
              videoEffectManager.startEffect(mediaSource.mediaSourceInfo.sourceId, mediaSource.beautyConfig);
            }
          }
        }

        this.mediaList[targetIndex] = {
          ...mediaSource,
          muted: false
        };
      } else {
        logger.warn('[MedisSources]updateMediaSource not found media source:', mediaSource);
      }
    },
    async updateMediaSourceRect(mediaSource: TUIMediaSourceViewModel) {
      let targetIndex = -1;
      for(let i = 0; i < this.mediaList.length; i++) {
        if (isSameMediaSource(this.mediaList[i].mediaSourceInfo, mediaSource.mediaSourceInfo)) {
          targetIndex = i;
          break;
        }
      }
      if (targetIndex >= 0) {
        this.mediaList[targetIndex].mediaSourceInfo.rect = mediaSource.mediaSourceInfo.rect;
        await mediaMixingManager.updateMediaSource(this.mediaList[targetIndex].mediaSourceInfo);
      }
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

          if (destMediaSource.resolution) {
            await mediaMixingManager.setCameraCaptureParam(destMediaSource.mediaSourceInfo.sourceId, {
              mode: TRTCCameraCaptureMode.TRTCCameraCaptureManual,
              width: destMediaSource.resolution?.width,
              height: destMediaSource.resolution?.height
            });
          }
        }
      } else {
        logger.warn('[MedisSources]replaceMediaSource not found media source:', srcMediaSource);
      }
    },
    setSelectedMediaKey(selected: TUISelectedMediaKey) {
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
        if (oldSelected && !oldSelected.muted) {
          mediaMixingManager.updateMediaSource(oldSelected.mediaSourceInfo);
        }
      }

      if (newSelected && !newSelected.muted) {
        mediaMixingManager.updateMediaSource(newSelected.mediaSourceInfo);
        this.selectedMediaKey = {
          ...selected
        };
      } else {
        this.selectedMediaKey = {
          sourceType: TRTCMediaSourceType.kCamera,
          sourceId: '',
        };
      }
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
    },
    async rotateMediaSource(mediaSource: TUIMediaSourceViewModel, degree: number) {
      logger.log(`[MedisSources]rotateMediaSource:`, mediaSource, degree);
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
    },
    async toggleHorizontalMirror(mediaSource: TUIMediaSourceViewModel) {
      logger.log(`[MedisSources]toggleHorizontalMirror:`, mediaSource);
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

          if (target.mediaSourceInfo.sourceType === TRTCMediaSourceType.kCamera) {
            if (target.resolution) {
              await mediaMixingManager.setCameraCaptureParam(mediaSource.mediaSourceInfo.sourceId, {
                mode: TRTCCameraCaptureMode.TRTCCameraCaptureManual,
                width: target.resolution?.width,
                height: target.resolution?.height
              });
            }

            if (target.beautyConfig?.beautyProperties.length) {
              videoEffectManager.startEffect(target.mediaSourceInfo.sourceId, target.beautyConfig);
            }
          }
        }
        logger.log(`[MedisSources]muteMediaSource:`, target, muted);
      } else {
        logger.warn('[MedisSources]muteMediaSource not found media source:', mediaSource, muted);
      }
    },
    isMediaSourceExisted(mediaSource: TUIMediaSourceViewModel): boolean {
      return this.mediaList.some(mediaItem => isSameMediaSource(mediaItem.mediaSourceInfo, mediaSource.mediaSourceInfo));
    },
    checkMediaExisting(mediaSource: TUIMediaSourceViewModel) {
      if (this.isMediaSourceExisted(mediaSource)) {
        logger.warn(`[MediaSource]addMediaSource Media source to be added already existing.:`, mediaSource);
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
          logger.warn(`[MediaSource]addMediaSource unsupported media type:`, mediaSource);
          break;
        }
        throw new Error(t('Media source to be added already existing.', { deviceType: deviceType.toLocaleLowerCase() }));
      }
    },
    updateHevcEncodeState(enable: boolean) {
      logger.log(`updateHevcEncodeState ${enable}`);
      this.isHevcEncodeEnabled = !!enable;
      trtcCloud.callExperimentalAPI(JSON.stringify({
        "api":"enableHevcEncode",
        "params":{
          "enable": this.isHevcEncodeEnabled ? 1 : 0
        }
      }));
    },
    reset() {
      this.mediaList.forEach((mediaSource: TUIMediaSourceViewModel) => {
        if (!mediaSource.muted) {
          if (mediaSource.mediaSourceInfo.sourceType === TRTCMediaSourceType.kCamera && mediaSource.beautyConfig?.beautyProperties.length) {
            videoEffectManager.stopEffect(mediaSource.mediaSourceInfo.sourceId);
          }
          mediaMixingManager.removeMediaSource(mediaSource.mediaSourceInfo);
        }
      });
      this.mediaList = [];
    }
  },
});
