import TRTCCloud, { TRTCVideoPixelFormat, TRTCPluginType, TRTCPluginInfo, TRTCVideoProcessPluginOptions, } from 'trtc-electron-sdk';
import trtcCloud from './trtcCloud';
import { TRTCXmagicFactory, XmagicLicense, TRTCXmagicEffectProperty } from "./beauty";

const logger = console;

export enum TUIVideoEffectEvents {
  // Error event
  onError = 'onError',

  // Not support profile segmentation event
  onNotSupportSegmentation = 'onNotSupportSegmentation',
}

class TUIVideoEffectPlugin {
  private _logPrefix = '[TUIVideoEffectPlugin]';
  private _pluginId: string;
  private _deviceId: string;
  private _trtcVideoEffectPlugin: TRTCPluginInfo;
  constructor(pluginId: string, deviceId: string, trtcVideoEffectPlugin: TRTCPluginInfo) {
    this._pluginId = pluginId;
    this._deviceId = deviceId;
    this._trtcVideoEffectPlugin = trtcVideoEffectPlugin;
  }

  get deviceId(): string {
    return this._deviceId;
  }

  get id(): string {
    return this._pluginId;
  }

  enable(flag: boolean): void {
    logger.debug(`${this._logPrefix}enable:${flag} ${this._pluginId}`);
    if (flag) {
      this._trtcVideoEffectPlugin.enable();
    } else {
      this._trtcVideoEffectPlugin.disable();
    }
  }

  setParameter(param: string): void {
    logger.debug(`${this._logPrefix}setParameter:${this._pluginId}`);
    this._trtcVideoEffectPlugin.setParameter(param);
  }
}

class TUIVideoEffectPluginManager {
  private static sharedInstance: TUIVideoEffectPluginManager | null;
  private static logPrefix = '[TUIVideoEffectPluginManager]';
  private trtcPluginManager: TRTCCloud = trtcCloud;

  constructor() {
    if (!TUIVideoEffectPluginManager.sharedInstance) {
      this.trtcPluginManager = trtcCloud;
      TUIVideoEffectPluginManager.sharedInstance = this;
    }
    return TUIVideoEffectPluginManager.sharedInstance;
  }

  static getInstance(): TUIVideoEffectPluginManager {
    if (!TUIVideoEffectPluginManager.sharedInstance) {
      TUIVideoEffectPluginManager.sharedInstance = new TUIVideoEffectPluginManager();
    }
    return TUIVideoEffectPluginManager.sharedInstance;
  }

  setPluginParams(type: TRTCPluginType, options: TRTCVideoProcessPluginOptions ) {
    logger.debug(`${TUIVideoEffectPluginManager.logPrefix}setPluginParams:`, type, options);
    this.trtcPluginManager.setPluginParams(type, options);
  }

  addVideoPlugin(options: {id: string, deviceId: string, path: string}): TUIVideoEffectPlugin | null {
    logger.debug(`${TUIVideoEffectPluginManager.logPrefix}addVideoPlugin pluginId:${options.id} deviceId:${options.deviceId} path:${options.path}`);
    const trtcVideoEffectPlugin = this.trtcPluginManager?.addPlugin(options);
    if (trtcVideoEffectPlugin) {
      return new TUIVideoEffectPlugin(options.id, options.deviceId, trtcVideoEffectPlugin);
    }
    return null;
  }

  /**
   * Remove video effect plugin
   *
   * @param pluginId {string} - Plugin ID
   * @param deviceId {string} - Camera Device ID
   * @returns {void}
   */
  removeVideoPlugin(pluginId: string, deviceId: string):void {
    logger.debug(`${TUIVideoEffectPluginManager.logPrefix}removeVideoPlugin pluginId:${pluginId} deviceId:${deviceId}`);
    this.trtcPluginManager?.removePlugin(deviceId, pluginId);
  }

  setCallback(callback: (pluginId: string, errorCode: number, errorMessage: string) => void) : void {
    this.trtcPluginManager.setPluginCallback(callback);
  }
}

const videoEffectPluginManager: TUIVideoEffectPluginManager = TUIVideoEffectPluginManager.getInstance();

class TUIVideoEffectManager {
  private logPrefix = '[TUIVideoEffectManager]';
  private inited: boolean;
  private libPath: string;
  private initParam: Record<string, string>;
  private beautyPluginMap: Map<string, TUIVideoEffectPlugin>;

  static getInstance() {
    return new TUIVideoEffectManager();
  }

  constructor() {
    this.inited = false;
    this.libPath = '';
    this.initParam = {};
    this.beautyPluginMap = new Map();
  }

  async init() {
    if (!this.inited) {
      if (videoEffectPluginManager) {
        videoEffectPluginManager.setPluginParams(TRTCPluginType.TRTCPluginTypeVideoProcess, {
          pixelFormat: TRTCVideoPixelFormat.TRTCVideoPixelFormat_I420,
        });
        videoEffectPluginManager.setCallback((pluginId: string, errorCode: number, errorMessage: string) => {
          logger.log(`plugin event - pluginId : ${pluginId}, errorCode : ${errorCode}, errorMessage : ${errorMessage}`);
        });
        this.libPath = await TRTCXmagicFactory.getEffectPluginLibPath();
        this.initParam = await TRTCXmagicFactory.buildEffectInitParam(XmagicLicense);
        this.inited = true;
        logger.log(`${this.logPrefix}init success.`, this.libPath, this.initParam?.licenseURL);
      } else {
        logger.error(`${this.logPrefix} video effect plugin manager not inited`);
      }
    }
  }

  async startEffect(cameraId: string, beautyConfig: { beautyProperties: TRTCXmagicEffectProperty[] }) {
    logger.debug(`${this.logPrefix}startEffect ${cameraId}`, beautyConfig);
    if (!this.inited) {
      await this.init();
    }

    let plugin = this.beautyPluginMap.get(cameraId) || null;
    if (!plugin) {
      plugin = this.addPlugin(cameraId);
      if (!plugin) {
        logger.error(`${this.logPrefix}startEffect failed. Cannot create effect plugin.`);
        return;
      }
    }
    setTimeout(()=> {
      if (plugin) {
        plugin.setParameter(JSON.stringify({
          beautySetting: beautyConfig.beautyProperties
        }));
      }
    }, 3000);
  }

  stopEffect(cameraId: string) {
    logger.debug(`${this.logPrefix}stopEffect ${cameraId}`);
    const plugin = this.beautyPluginMap.get(cameraId);
    if (videoEffectPluginManager) {
      if (plugin) {
        videoEffectPluginManager.removeVideoPlugin(plugin.deviceId, plugin.id);
        this.beautyPluginMap.delete(cameraId);
      } else {
        logger.error(`${this.logPrefix}stopEffect failed. No effect plugin for camera:`, cameraId);
      }
    } else {
      logger.error(`${this.logPrefix} video effect plugin manager not inited`);
    }
  }

  muteEffect(cameraId: string, mute: boolean) {
    logger.debug(`${this.logPrefix}muteEffect ${cameraId}`, mute);
    const plugin = this.beautyPluginMap.get(cameraId);
    if (plugin) {
      plugin.enable(!mute);
    } else {
      logger.error(`${this.logPrefix}muteEffect failed. No effect plugin for camera:`, cameraId);
    }
  }

  updateEffect(cameraId: string, beautyConfig: { beautyProperties: TRTCXmagicEffectProperty[] }) {
    logger.debug(`${this.logPrefix}updateEffect ${cameraId}`, beautyConfig);
    const plugin = this.beautyPluginMap.get(cameraId);
    if (plugin) {
      plugin.setParameter(JSON.stringify({
        beautySetting: beautyConfig.beautyProperties
      }));
    } else {
      logger.error(`${this.logPrefix}updateEffect failed. No effect plugin for camera:`, cameraId);
    }
  }

  clear() {
    logger.debug(`${this.logPrefix}clear`);
    this.beautyPluginMap.forEach((plugin) => {
      if (videoEffectPluginManager) {
        videoEffectPluginManager.removeVideoPlugin(plugin.deviceId, plugin.id);
      } else {
        logger.error(`${this.logPrefix} video effect plugin manager not inited`);
      }
    });
    this.beautyPluginMap.clear();
  }

  private addPlugin(cameraId: string): TUIVideoEffectPlugin | null {
    const pluginId = `${cameraId}-${new Date().getTime()}`;
    if (videoEffectPluginManager) {
      const plugin: TUIVideoEffectPlugin | null = videoEffectPluginManager.addVideoPlugin({
        id: pluginId,
        deviceId: cameraId,
        path: this.libPath,
      });
      if (plugin) {
        this.beautyPluginMap.set(cameraId, plugin);
        plugin.enable(true);
        plugin.setParameter(JSON.stringify(this.initParam)); 
        logger.debug(`${this.logPrefix}addPlugin success for camera: ${cameraId}`);
        return plugin;
      } else {
        logger.error(`${this.logPrefix}addPlugin failed for camera: ${cameraId}`);
        return null;
      }
    } else {
      logger.error(`${this.logPrefix} video effect plugin manager not inited`);
      return null;
    }
  }

  private getPlugin(cameraId: string): TUIVideoEffectPlugin | null {
    return this.beautyPluginMap.get(cameraId) || null;
  }
}

const videoEffectManager = TUIVideoEffectManager.getInstance();

export default function useVideoEffectManager() {
  return videoEffectManager;
}
