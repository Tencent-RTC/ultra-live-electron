import TRTCCloud, { TRTCVideoPixelFormat, TRTCPluginType, TRTCPluginInfo, TRTCVideoProcessPluginOptions, } from 'trtc-electron-sdk';
import trtcCloud from './trtcCloud';
import { TRTCXmagicFactory, XmagicLicense, TRTCXmagicEffectProperty, hasEffectiveBeautyProperties } from './beauty';
import logger from '../utils/logger';

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
      // Guard: a set with NO effective beauty means "no beauty". Creating a
      // plugin here would only add an effect-less native plugin (extra native
      // resource + a redundant frame-processing hop). We must check for
      // effective beauty rather than array length: on a camera switch the
      // snapshot is non-empty even with zero beauty because getProperties()
      // emits explicit { effValue: 0, resPath: '' } clears for every unselected
      // point-makeup part. Those clears only matter for resetting an EXISTING
      // plugin; with no plugin there is nothing to reset, so skip creation and
      // rely on the caller-side cache — a later effective apply creates it.
      if (!hasEffectiveBeautyProperties(beautyConfig.beautyProperties)) {
        logger.debug(`${this.logPrefix}startEffect skipped: no effective beauty and no existing plugin for camera: ${cameraId}`);
        return;
      }
      plugin = this.addPlugin(cameraId);
      if (!plugin) {
        logger.error(`${this.logPrefix}startEffect failed. Cannot create effect plugin.`);
        return;
      }
    }
    // Apply immediately. The native plugin caches beautySetting received before
    // its xmagic instance finishes creating (CacheOrUpdateBeautySetting →
    // HandleCachedBeautySetting on CreateXmagic), so no client-side delay is
    // needed. A previous 3s setTimeout here captured a (possibly stale) full
    // snapshot and, once incremental updateEffect() calls were introduced, could
    // fire late and overwrite a newer delta — applying synchronously keeps the
    // native apply order strictly FIFO and correct.
    plugin.setParameter(JSON.stringify({
      beautySetting: beautyConfig.beautyProperties,
    }));
  }

  stopEffect(cameraId: string) {
    logger.debug(`${this.logPrefix}stopEffect ${cameraId}`);
    const plugin = this.beautyPluginMap.get(cameraId);
    if (videoEffectPluginManager) {
      if (plugin) {
        videoEffectPluginManager.removeVideoPlugin(plugin.deviceId, plugin.id);
        this.beautyPluginMap.delete(cameraId);
      } else {
        logger.log(`${this.logPrefix}stopEffect failed. No effect plugin for camera:`, cameraId);
      }
    } else {
      logger.error(`${this.logPrefix} video effect plugin manager not inited`);
    }
  }

  /**
   * Gracefully tear down the effect for a camera that is ABOUT TO BE REMOVED.
   *
   * Root cause this addresses: liteav's capture/mixer keeps the LAST
   * post-plugin frame for a cameraDeviceId (used for fast device reuse). That
   * cached frame is beautified. When the same deviceId is quickly re-added,
   * liteav flushes this stale cached frame out for the first few frames before
   * the fresh capture arrives, so preview/publish briefly shows the PREVIOUS
   * beauty effect. liteav itself cannot be modified, so instead of clearing
   * that cache we make it clean: disable the effect (native ProcessVideoFrame
   * then drops this plugin and copies the raw frame) WHILE the camera is still
   * capturing, wait a few frames so a clean frame reaches the mixer, then
   * remove the plugin.
   *
   * IMPORTANT: callers MUST `await` this BEFORE stopping/removing the camera
   * source (e.g. removeMediaSource). Once the source is gone no clean frame can
   * refresh liteav's per-device cache and the flush would be a no-op.
   *
   * @param cameraId Camera device id (== plugin key).
   * @param flushMs  Time to keep the camera capturing clean frames. 150ms
   *                 comfortably covers the async native `setEnabled` dispatch
   *                 plus several frames at 15~30fps.
   */
  async stopEffectWithCleanFlush(cameraId: string, flushMs = 150): Promise<void> {
    logger.debug(`${this.logPrefix}stopEffectWithCleanFlush ${cameraId}`);
    const plugin = this.beautyPluginMap.get(cameraId);
    if (!plugin) {
      logger.debug(`${this.logPrefix}stopEffectWithCleanFlush: no plugin for camera:`, cameraId);
      return;
    }
    // Switch the still-running source to passthrough so it emits clean frames.
    plugin.enable(false);
    // Let a couple of clean frames flow to the mixer and refresh liteav's
    // per-device cached last frame before the source is stopped.
    await new Promise<void>((resolve) => setTimeout(resolve, flushMs));
    this.stopEffect(cameraId);
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

  /** Whether a beauty plugin has already been created for this camera. */
  hasPlugin(cameraId: string): boolean {
    return this.beautyPluginMap.has(cameraId);
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

  /**
   * Reset the manager so the NEXT startEffect re-runs init().
   *
   * Root cause this addresses: init() calls
   * `setPluginParams(TRTCPluginTypeVideoProcess, { pixelFormat: I420 })`, the
   * GLOBAL liteav pipeline switch that makes captured frames flow into the
   * video-process plugin. It is guarded by `this.inited` and, since both this
   * manager and trtcCloud are module-level singletons, only ever runs once per
   * app lifetime. On logout liteav exits the room / stops the mixer and drops
   * that global pipeline config, but `inited` stays true — so after re-login
   * startEffect skips init(), setPluginParams is never re-sent, the plugin is
   * created but no frame is routed to it (no `onProcessVideoFrame` /
   * `CreateXmagic`) and beauty silently fails.
   *
   * Clearing leftover plugins and flipping `inited` back to false forces the
   * next startEffect to re-apply setPluginParams / setCallback, restoring the
   * pipeline for the new session. setPluginParams is idempotent, so re-running
   * init() has no side effect beyond one extra global config write.
   */
  resetForRelogin() {
    logger.debug(`${this.logPrefix}resetForRelogin`);
    this.clear();
    this.inited = false;
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
