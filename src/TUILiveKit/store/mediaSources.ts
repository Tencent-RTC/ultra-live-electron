import { defineStore } from 'pinia';
import { TUIMediaSourceType, TUIMediaSource, TUIVideoEncParam } from '@tencentcloud/tuiroom-engine-electron/plugins/media-mixing-plugin';
import { TRTCCameraCaptureMode, TRTCVideoResolution, TRTCVideoResolutionMode } from 'trtc-electron-sdk';
import { resolutionMap } from '../utils/trtcCloud';
import useMediaMixingPlugin from "../utils/useMediaMixingPlugin";
import videoEffectManager from "../utils/useVideoEffectPlugin";
import { TUIBeautyProperty } from '../utils/beauty';


const logger = console;
const mediaMixingPlugin = useMediaMixingPlugin();

export type TUIBeautyConfig = {
  isEnabled: boolean;
  beautySetting: TUIBeautyProperty[];
}

export type TUIMediaSourceViewModel = {
  sourceName: string;
  left: number;
  top: number;
  resolution?: { // 摄像头采集分辨率
    width: number;
    height: number;
  };
  mediaSourceInfo: TUIMediaSource;
  beautyConfig?: TUIBeautyConfig;
}

type TUISelectedMediaKey = {
  sourceType: TUIMediaSourceType | null;
  sourceId: string;
}

type TUIMediaSourcesState = {
  mixingVideoEncodeParam: TUIVideoEncParam;
  backgroundColor: number;
  mediaList: Array<TUIMediaSourceViewModel>;
  selectedMediaKey: TUISelectedMediaKey;
}

function isSameMediaSource(mediaSource1: TUISelectedMediaKey | TUIMediaSource, mediaSource2: TUISelectedMediaKey | TUIMediaSource) {
  return mediaSource1.sourceId === mediaSource2.sourceId && mediaSource1.sourceType === mediaSource2.sourceType;
}

export const useMediaSourcesStore = defineStore('mediaSources', {
  state: (): TUIMediaSourcesState => ({
    mixingVideoEncodeParam: {
      resMode: TRTCVideoResolutionMode.TRTCVideoResolutionModeLandscape,
      videoResolution: TRTCVideoResolution.TRTCVideoResolution_1920_1080,
      videoFps: 24,
      videoBitrate: 2000,
      minVideoBitrate: 2000,
      enableAdjustRes: false,
    },
    backgroundColor: 0x191919,
    mediaList: [],
    selectedMediaKey: {
      sourceType: null,
      sourceId: '',
    }
  }),
  getters:{
    isHasSources(state) {
      return state.mediaList.length >= 1;
    },
  },
  actions:{
    setMixingVideoEncodeParams(params: TUIVideoEncParam) {
      this.mixingVideoEncodeParam = params;
    },
    updateMixingVideoEncodeParams(params: TUIVideoEncParam) {
      this.mixingVideoEncodeParam = Object.assign({}, this.mixingVideoEncodeParam, params);
    },
    async addMediaSource(mediaSource: TUIMediaSourceViewModel) {
      mediaSource.mediaSourceInfo.zOrder = this.mediaList.length + 1;
      
      if (mediaSource.mediaSourceInfo.rect) {
        // 缩小媒体源显示大小， 保证默认不超出视频分辨率大小
        const { width: resWidth, height: resHeight } = resolutionMap[this.mixingVideoEncodeParam.videoResolution];
        const width = mediaSource.mediaSourceInfo.rect.right - mediaSource.mediaSourceInfo.rect.left;
        const height = mediaSource.mediaSourceInfo.rect.bottom - mediaSource.mediaSourceInfo.rect.top;
        if (width > resWidth || height > resHeight) {
          const shrinkRate = width * resHeight > height * resWidth ? resWidth/width : resHeight/height;
          mediaSource.mediaSourceInfo.rect.right = Math.round(width * shrinkRate);
          mediaSource.mediaSourceInfo.rect.bottom = Math.round(height * shrinkRate);
        }

        this.mediaList.push(mediaSource);
        await mediaMixingPlugin.addMediaSource(mediaSource.mediaSourceInfo);
        if (mediaSource.mediaSourceInfo.sourceType === TUIMediaSourceType.kCamera) {
          if (mediaSource.resolution) {
            await mediaMixingPlugin.setCameraCaptureParam(mediaSource.mediaSourceInfo.sourceId, {
              mode: TRTCCameraCaptureMode.TRTCCameraCaptureManual,
              width: mediaSource.resolution?.width,
              height: mediaSource.resolution?.height
            });
          }
          
          if (mediaSource.beautyConfig) {
            videoEffectManager.startEffect(mediaSource.mediaSourceInfo.sourceId, mediaSource.beautyConfig);
          }
        }
      } else {
        logger.error("New added media source with no valid rect:", mediaSource);
      }
    },
    async removeMediaSource2(mediaSource: TUIMediaSourceViewModel) {
      let indexToRemove = -1;
      for(let i = 0; i < this.mediaList.length; i++) {
        const item = this.mediaList[i];
        if (indexToRemove !== -1) {
          item.mediaSourceInfo.zOrder = (item.mediaSourceInfo.zOrder as number) - 1;
          continue;
        }
        if (isSameMediaSource(item.mediaSourceInfo, mediaSource.mediaSourceInfo)) {
          indexToRemove = i;
          await mediaMixingPlugin.removeMediaSource(mediaSource.mediaSourceInfo);
        }
      }

      if (indexToRemove !== -1) {
        this.mediaList.splice(indexToRemove, 1);
      }
      mediaMixingPlugin.updatePublishParams({
        inputSourceList: this.mediaList.map(item => item.mediaSourceInfo), // To do: zOrder 修改未生效
        videoEncoderParams: this.mixingVideoEncodeParam,
        canvasColor: this.backgroundColor,
      });
    },
    async removeMediaSource(mediaSource: TUIMediaSourceViewModel) {
      let indexToRemove = -1;
      for(let i = 0; i < this.mediaList.length; i++) {
        const item = this.mediaList[i];
        if (indexToRemove !== -1) {
          item.mediaSourceInfo.zOrder = (item.mediaSourceInfo.zOrder as number) - 1;
          await mediaMixingPlugin.updateMediaSource(item.mediaSourceInfo);
          continue;
        }
        if (isSameMediaSource(item.mediaSourceInfo, mediaSource.mediaSourceInfo)) {
          indexToRemove = i;
          if (mediaSource.mediaSourceInfo.sourceType === TUIMediaSourceType.kCamera) {
            videoEffectManager.stopEffect(mediaSource.mediaSourceInfo.sourceId);
          }
          await mediaMixingPlugin.removeMediaSource(mediaSource.mediaSourceInfo);
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
        if (mediaSource.mediaSourceInfo.sourceType === TUIMediaSourceType.kCamera) {
          if (mediaSource.resolution 
            && (target.resolution?.width !== mediaSource.resolution?.width 
            || target.resolution?.height !== mediaSource.resolution?.height)
          ) {
            await mediaMixingPlugin.setCameraCaptureParam(mediaSource.mediaSourceInfo.sourceId, {
              mode: TRTCCameraCaptureMode.TRTCCameraCaptureManual,
              width: mediaSource.resolution?.width,
              height: mediaSource.resolution?.height
            });
          }

          if (mediaSource.beautyConfig) {
            videoEffectManager.updateEffect(mediaSource.mediaSourceInfo.sourceId, mediaSource.beautyConfig);
          }
        }

        await mediaMixingPlugin.updateMediaSource(mediaSource.mediaSourceInfo);
        this.mediaList[targetIndex] = {
          ...mediaSource
        };
      } else {
        logger.warn('[MedisSources]updateMediaSource not found media source:', mediaSource);
      }
    },
    async replaceMediaSource(srcMediaSource: TUIMediaSourceViewModel, destMediaSource: TUIMediaSourceViewModel) {
      let targetIndex = -1;
      for(let i = 0; i < this.mediaList.length; i++) {
        if (isSameMediaSource(this.mediaList[i].mediaSourceInfo, srcMediaSource.mediaSourceInfo)) {
          targetIndex = i;
          break;
        }
      }
      if (targetIndex >= 0) {
        let target = this.mediaList[targetIndex];
        await mediaMixingPlugin.removeMediaSource(target.mediaSourceInfo);
        target = {
          ...destMediaSource,
        };
        await mediaMixingPlugin.addMediaSource(target.mediaSourceInfo);
        this.mediaList[targetIndex] = target;
        
        // 摄像头需要再设置采集参数、重建美颜插件
        if (target.mediaSourceInfo.sourceType === TUIMediaSourceType.kCamera) {
          videoEffectManager.stopEffect(srcMediaSource.mediaSourceInfo.sourceId);
          if (destMediaSource.beautyConfig) {
            videoEffectManager.startEffect(destMediaSource.mediaSourceInfo.sourceId, destMediaSource.beautyConfig);
          }

          if (destMediaSource.resolution) {
            await mediaMixingPlugin.setCameraCaptureParam(destMediaSource.mediaSourceInfo.sourceId, {
              mode: TRTCCameraCaptureMode.TRTCCameraCaptureManual,
              width: destMediaSource.resolution?.width,
              height: destMediaSource.resolution?.height
            });
          }
        }
      } else {
        await this.addMediaSource(destMediaSource);
      }
    },
    setSelectedMediaKey(selected: TUISelectedMediaKey) {
      let oldSelected = null, newSelected = null;
      for(let i = 0; i < this.mediaList.length; i++) {
        const item = this.mediaList[i];
        if (!newSelected && isSameMediaSource(item.mediaSourceInfo, selected)) {
          item.mediaSourceInfo.isSelected = true;
          newSelected = item;
        }
        if (!oldSelected && this.selectedMediaKey.sourceId && isSameMediaSource(item.mediaSourceInfo, this.selectedMediaKey)) {
          item.mediaSourceInfo.isSelected = false;
          oldSelected = item;
          
        }
      }

      if (oldSelected) {
        mediaMixingPlugin.updateMediaSource(oldSelected.mediaSourceInfo);
      }

      if (newSelected) {
        mediaMixingPlugin.updateMediaSource(newSelected.mediaSourceInfo);
      }
      this.selectedMediaKey = selected;
    },
    selectMediaSource(mediaSource: TUIMediaSourceViewModel) {
      let oldSelected = null, newSelected = null;
      for(let i = 0; i < this.mediaList.length; i++) {
        const item = this.mediaList[i];
        if (!newSelected && isSameMediaSource(item.mediaSourceInfo, mediaSource.mediaSourceInfo)) {
          item.mediaSourceInfo.isSelected = true;
          newSelected = item;
        }
        if (!oldSelected && this.selectedMediaKey.sourceId && isSameMediaSource(item.mediaSourceInfo, this.selectedMediaKey)) {
          item.mediaSourceInfo.isSelected = false;
          oldSelected = item;
          
        }
      }
      if (oldSelected) {
        mediaMixingPlugin.updateMediaSource(oldSelected.mediaSourceInfo);
      }
      if (newSelected) {
        mediaMixingPlugin.updateMediaSource(newSelected.mediaSourceInfo);
      }
      this.selectedMediaKey = {
        sourceType: mediaSource.mediaSourceInfo.sourceType,
        sourceId: mediaSource.mediaSourceInfo.sourceId,
      };
    },
    updateBackgroundColor(color: number) {
      this.backgroundColor = color;
      mediaMixingPlugin.updatePublishParams({
        inputSourceList: this.mediaList.map(item => item.mediaSourceInfo),
        videoEncoderParams: this.mixingVideoEncodeParam,
        canvasColor: this.backgroundColor,
      });
    },
    updateResolutionMode(resMode: TRTCVideoResolutionMode) {
      this.mixingVideoEncodeParam.resMode = resMode;
      mediaMixingPlugin.updatePublishParams({
        inputSourceList: this.mediaList.map(item => item.mediaSourceInfo),
        videoEncoderParams: this.mixingVideoEncodeParam,
        canvasColor: this.backgroundColor,
      });
    },
    async muteMediaSource(mediaSource: TUIMediaSourceViewModel, mute: boolean) {
      await mediaMixingPlugin.muteMediaSource(mediaSource.mediaSourceInfo, mute);
    },
    reset() {
      this.mediaList = [];     
    }
  },
})