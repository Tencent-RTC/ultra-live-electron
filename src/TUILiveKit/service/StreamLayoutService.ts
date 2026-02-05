import { TRTCStreamLayout, TRTCStreamLayoutMode, TRTCVideoFillMode, TRTCVideoResolution, TRTCVideoResolutionMode } from 'trtc-electron-sdk';
import { TUILiveLayoutManagerEvents, TUISeatLayout, TUISeatRegion, TUIDeviceStatus } from '@tencentcloud/tuiroom-engine-electron';
import { TUIUserSeatStreamRegion, TUISeatLayoutTemplate, TUICoHostLayoutTemplate } from '../types';
import { resolutionMap } from '../constants/tuiConstant';
import useMediaMixingManager from '../utils/useMediaMixingManager';
import useRoomEngine from '../utils/useRoomEngine';
import { messageChannels } from '../communication';
import logger from '../utils/logger';

const mediaMixingManager = useMediaMixingManager();
const roomEngine = useRoomEngine();

export class StreamLayoutService {
  private logPrefix = '[StreamLayoutService]';
  private roomId: string;
  private roomOwner: string;
  private container: HTMLElement | null;
  private layoutTemplateId: TUISeatLayoutTemplate | TUICoHostLayoutTemplate | null;

  private seatLayout: TUISeatLayout | null;
  private streamLayout: TRTCStreamLayout;

  private resMode: TRTCVideoResolutionMode;
  private resolution: TRTCVideoResolution;

  private layoutArea: {
    left: number;
    top: number;
    right: number;
    bottom: number;
    width: number;
    height: number;
  } = {
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    width: 0,
    height: 0,
  };

  private resWidth = 0;
  private resHeight = 0;

  private resizeObserver: ResizeObserver | null;

  private userSeatStreamRegions: Array<TUIUserSeatStreamRegion>;

  constructor() {
    this.roomId = '';
    this.roomOwner = '';
    this.container = null;
    this.layoutTemplateId = null;
    this.seatLayout = null;
    this.streamLayout = {
      layoutMode: TRTCStreamLayoutMode.None,
      userList: []
    };
    this.resMode = TRTCVideoResolutionMode.TRTCVideoResolutionModePortrait
    this.resolution = TRTCVideoResolution.TRTCVideoResolution_1920_1080;

    this.onSeatLayoutChanged = this.onSeatLayoutChanged.bind(this);
    this.bindEvent();

    this.resizeObserver = null;
    this.onResize = this.onResize.bind(this);

    this.updateResolutionSize();

    this.userSeatStreamRegions = [];
  }

  setLayoutTemplate(template: TUISeatLayoutTemplate | TUICoHostLayoutTemplate): void {
    if (template) {
      this.layoutTemplateId = template;
      this.setStreamLayout();
    }
  }

  setRoomInfo(options: { roomId: string; roomOwner: string; }): void {
    this.roomId = options.roomId;
    this.roomOwner = options.roomOwner;
  }

  setContainer(view: HTMLElement): void {
    logger.log(`${this.logPrefix}setContainer:`, view);
    if (view) {
      if (this.container !== view) {
        if (this.resizeObserver) {
          this.resizeObserver.disconnect();
          this.resizeObserver = null;
        }
        this.container = view;
        this.setResizeObserver();
        this.updateLayoutArea();
        this.setStreamLayout();
      } else {
        logger.warn(`${this.logPrefix}setContainer failed, view not changed.`, view);
      }
    } else {
      this.container = null;
      if (this.resizeObserver) {
        this.resizeObserver.disconnect();
        this.resizeObserver = null;
      }
    }
  }

  setResolution(resolution: TRTCVideoResolution): void {
    if (this.resolution !== resolution) {
      this.resolution = resolution;
      this.updateResolutionSize();
      this.setStreamLayout();
    } else {
      logger.warn(`${this.logPrefix}setResolution failed, resolution not changed.`, resolution);
    }
  }

  setResolutionMode(resMode: TRTCVideoResolutionMode): void {
    if (this.resMode !== resMode) {
      this.resMode = resMode;
      this.updateResolutionSize();
      this.setStreamLayout();
    } else {
      logger.warn(`${this.logPrefix}setResolutionMode failed, resMode not changed.`, resMode);
    }
  }

  refreshLayout(): void {
    this.setStreamLayout();
  }

  reset(): void {
    logger.debug(`${this.logPrefix}reset`);
    this.layoutTemplateId = null;
    this.seatLayout = null;
    this.roomId = '';
    this.roomOwner = '';
    this.setStreamLayout();
  }

  destroy() {
    logger.debug(`${this.logPrefix}destroy`);
    this.unbindEvent();
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
  }

  private onSeatLayoutChanged(options: {roomId: string, seatLayout: TUISeatLayout}) {
    const { roomId, seatLayout } = options;
    logger.log(`${this.logPrefix}onSeatLayoutChanged:`, roomId, seatLayout);
    if (roomId !== this.roomId) {
      logger.error(`${this.logPrefix}onSeatLayoutChanged received roomId:${roomId}, current roomId:${this.roomId}`);
      return;
    }

    if (seatLayout.templateId === TUISeatLayoutTemplate.LandscapeDynamic_1v3) {
      let y = 0;
      seatLayout.regions.forEach((region: TUISeatRegion) => {
        if (region.width === 0 || region.height === 0) {
          region.width = seatLayout.canvasHeight / 4;
          region.height = region.width;
          region.x = seatLayout.canvasWidth;
          region.y = y;
          y += region.height;
        }
      });
    }

    this.seatLayout = seatLayout;
    this.setStreamLayout();
  }

  private bindEvent() {
    const liveLayoutManager = roomEngine.instance?.getLiveLayoutManager();
    if (liveLayoutManager) {
      liveLayoutManager.on(TUILiveLayoutManagerEvents.onSeatLayoutChanged, this.onSeatLayoutChanged);
    } else {
      logger.warn(`${this.logPrefix}bindEvent failed, retry later`);
      setTimeout(() => {
        this.bindEvent();
      }, 300);
    }
  }

  private unbindEvent() {
    const liveLayoutManager = roomEngine.instance?.getLiveLayoutManager();
    if (liveLayoutManager) {
      liveLayoutManager.off(TUILiveLayoutManagerEvents.onSeatLayoutChanged, this.onSeatLayoutChanged);
    }
  }

  private setStreamLayout(): void {
    if (!this.container) {
      logger.warn(`${this.logPrefix}setStreamLayout failed, no container.`);
      return;
    }

    if (this.layoutTemplateId !== null) {
      this.streamLayout.layoutMode = TRTCStreamLayoutMode.Custom;
      if (this.seatLayout) {
        this.calcDisplayLayout();
      } else {
        this.centerLiveOwner();
      }
    } else {
      this.streamLayout.layoutMode = TRTCStreamLayoutMode.None;
      this.centerLiveOwner();
    }

    logger.log(`${this.logPrefix}setStreamLayout:`, JSON.stringify(this.streamLayout));
    mediaMixingManager.setStreamLayout(this.streamLayout);

    if (messageChannels.messagePortToCover) {
      messageChannels.messagePortToCover.postMessage({
        key: 'stream-layout',
        data: {
          roomId: this.roomId,
          roomOwner: this.roomOwner,
          regions: this.userSeatStreamRegions,
        }
      });
    } else {
      logger.error(`${this.logPrefix}postMessage stream-layout to cover window failed, no message port.`);
    }

    window.ipcRenderer.send('stream-layout', this.streamLayout);
  }

  private calcDisplayLayout(): void {
    if (!this.seatLayout) {
      logger.warn(`${this.logPrefix}calcDisplayLayout failed, no seatLayout.`);
      return;
    }

    // 1. calculate valid video content width and height
    let minX = this.seatLayout.canvasWidth;
    let minY = this.seatLayout.canvasHeight;
    let maxX = 0;
    let maxY = 0;
    for (let i = 0; i < this.seatLayout.regions.length; i++) {
      minX = Math.min(minX, this.seatLayout.regions[i].x);
      minY = Math.min(minY, this.seatLayout.regions[i].y);
      maxX = Math.max(maxX, this.seatLayout.regions[i].x + this.seatLayout.regions[i].width);
      maxY = Math.max(maxY, this.seatLayout.regions[i].y + this.seatLayout.regions[i].height);
    }
    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;

    // 2. calculate fitting scale rate and fitting area
    const scaleRate = Math.min(this.layoutArea.width / contentWidth, this.layoutArea.height / contentHeight);
    const fittingArea = {
      width: contentWidth * scaleRate,
      height: contentHeight * scaleRate,
      left: (this.layoutArea.width - contentWidth * scaleRate) / 2,
      top: (this.layoutArea.height - contentHeight * scaleRate) / 2,
      right: (this.layoutArea.width + contentWidth * scaleRate) / 2,
      bottom: (this.layoutArea.height + contentHeight * scaleRate) / 2,
    };

    // 3. transfer template rect to dispaying rect
    this.streamLayout.userList = [];
    this.userSeatStreamRegions = [];
    for (let i = 0; i < this.seatLayout.regions.length; i++) {
      const seatRegion = this.seatLayout.regions[i];
      const rect = {
        x: (seatRegion.x - minX) * scaleRate + fittingArea.left,
        y: (seatRegion.y - minY) * scaleRate + fittingArea.top,
        w: seatRegion.width * scaleRate,
        h: seatRegion.height * scaleRate,
      };
      const userStreamLayout = {
        userId: seatRegion.userId !== this.roomOwner ? seatRegion.userId : '',
        rect: {
          left: Math.round(rect.x),
          top: Math.round(rect.y),
          right: Math.round(rect.x + rect.w),
          bottom: Math.round(rect.y + rect.h),
        },
        zOrder: i,
        fillMode: (seatRegion.userId === this.roomOwner && this.layoutTemplateId === TUISeatLayoutTemplate.PortraitDynamic_1v6) ? TRTCVideoFillMode.TRTCVideoFillMode_Fit : TRTCVideoFillMode.TRTCVideoFillMode_Fill,
      };
      if (seatRegion.userId && (seatRegion.userId === this.roomOwner || seatRegion.userCameraStatus === TUIDeviceStatus.TUIDeviceStatusOpened)) {
        this.streamLayout.userList.push(userStreamLayout);
      }
      this.userSeatStreamRegions.push({
        ...userStreamLayout,
        ...seatRegion,
      });
    }
  }

  private centerLiveOwner() {
    const layoutWidth = this.layoutArea.width;
    const layoutHeight = this.layoutArea.height;

    const scaleRate = Math.min(layoutWidth / this.resWidth, layoutHeight / this.resHeight);
    const previewWidth = this.resWidth * scaleRate;
    const previewHeight = this.resHeight * scaleRate;
    const previewLeft = (layoutWidth - previewWidth) / 2;
    const previewTop = (layoutHeight - previewHeight) / 2;
    const previewRight = previewLeft + previewWidth;
    const previewBottom = previewTop + previewHeight;

    const userStream = {
      userId: '',
      rect: {
        left: Math.round(previewLeft),
        top: Math.round(previewTop),
        right: Math.round(previewRight),
        bottom: Math.round(previewBottom),
      },
      fillMode: TRTCVideoFillMode.TRTCVideoFillMode_Fit,
      zOrder: 0
    }
    this.streamLayout.userList = [userStream];
    this.userSeatStreamRegions = [{
      ...userStream,
      roomId: this.roomId,
      seatIndex: 0,
      isSeatLocked: false,
      userId: this.roomOwner,
      userName: this.roomOwner,
      userAvatar: '',
      userMicrophoneStatus: TUIDeviceStatus.TUIDeviceStatusOpened,
      userCameraStatus: TUIDeviceStatus.TUIDeviceStatusOpened,
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      zorder: 0,
    }]
  }

  private updateLayoutArea() {
    if (this.container) {
      const containerRect = this.container.getBoundingClientRect();
      this.layoutArea = {
        left: containerRect.left,
        top: containerRect.top,
        right: containerRect.right,
        bottom: containerRect.bottom,
        width: containerRect.width,
        height: containerRect.height,
      };
      window.ipcRenderer.send('stream-layout-area', this.layoutArea);
    } else {
      logger.warn(`${this.logPrefix}updateLayoutArea failed, no container.`);
    }
  }

  private updateResolutionSize() {
    const size = resolutionMap[this.resolution];
    if (this.resMode === TRTCVideoResolutionMode.TRTCVideoResolutionModeLandscape) {
      this.resWidth = size.width;
      this.resHeight = size.height;
    } else {
      this.resWidth = size.height;
      this.resHeight = size.width;
    }
  }

  private setResizeObserver() {
    logger.debug(`${this.logPrefix}setResizeObserver container:`, this.container, ' resizeObserver:', this.resizeObserver);
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    if (this.container) {
      this.resizeObserver = new ResizeObserver(this.onResize);
      this.resizeObserver.observe(this.container);
    } else {
      logger.warn(`${this.logPrefix}setResizeObserver failed, container is null.`);
    }
  }

  private onResize(entries: ResizeObserverEntry[]): void {
    logger.log(`${this.logPrefix}onResize entries:`, entries);
    for (const entry of entries) {
      if (entry.target === this.container) {
        logger.debug(`${this.logPrefix}onResize:`, this.container.getBoundingClientRect());
        this.updateLayoutArea();
        this.setStreamLayout();
        break;
      }
    }
  }
}

const streamLayoutService = new StreamLayoutService();

export default streamLayoutService;
