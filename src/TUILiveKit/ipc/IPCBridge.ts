/**
 * IPC Bridge for Renderer Process
 * Provides unified inter-window communication interface
 */
import {
  IPCMessage,
  IPCMessageType,
  IPCMessageHandler,
  WindowType,
  MessageTarget,
  MainProcessAction,
} from './types';
import logger from '../utils/logger';

const logPrefix = '[IPCBridge]';

/**
 * IPC channel names used for communication
 */
const IPC_CHANNELS = {
  /** Send message to main process for routing */
  SEND: 'window-message',
  /** Receive message from main process */
  RECEIVE: 'window-message',
  /** Get current window type */
  GET_WINDOW_TYPE: 'get-window-type',
} as const;

/**
 * IPCBridge class
 * Handles inter-window communication through main process
 */
class IPCBridge {
  /** Current window type */
  private windowType: WindowType | null = null;

  /** Message handlers map: type -> Set of handlers */
  private handlers: Map<IPCMessageType, Set<IPCMessageHandler>> = new Map();

  /** Global handlers that receive all messages */
  private globalHandlers: Set<IPCMessageHandler> = new Set();

  /** Flag to track if listener is set up */
  private isListenerSetup = false;

  /** Singleton instance */
  private static instance: IPCBridge | null = null;

  /**
   * Get singleton instance
   */
  public static getInstance(): IPCBridge {
    if (!IPCBridge.instance) {
      IPCBridge.instance = new IPCBridge();
    }
    return IPCBridge.instance;
  }

  /**
   * Private constructor for singleton pattern
   */
  private constructor() {
    this.setupListener();
  }

  /**
   * Initialize the bridge
   * Should be called after window is ready
   */
  public async init(): Promise<void> {
    if (!this.windowType) {
      await this.detectWindowType();
    }
    logger.log(`${logPrefix} initialized, windowType: ${this.windowType}`);
  }

  /**
   * Get current window type
   */
  public getWindowType(): WindowType | null {
    return this.windowType;
  }

  /**
   * Send message to specific window or broadcast
   * @param type Message type
   * @param payload Message payload
   * @param to Target window or 'broadcast'
   */
  public send<T = unknown>(options: {
    type: IPCMessageType;
    payload: T;
    to: MessageTarget;
  }): void {
    if (!window.ipcRenderer) {
      logger.error(`${logPrefix} ipcRenderer not available`);
      return;
    }

    const { type, payload, to } = options;
    const message: IPCMessage<T> = {
      type,
      payload,
      from: this.windowType || undefined,
      to,
      timestamp: Date.now(),
    };

    logger.log(`${logPrefix} send message:`, message.type, 'to:', to);
    window.ipcRenderer.send(IPC_CHANNELS.SEND, message);
  }

  /**
   * Send message to main window only
   * @param type Message type
   * @param payload Message payload
   */
  public sendToMain<T = unknown>(type: IPCMessageType, payload: T): void {
    if (this.windowType !== 'main') {
      this.send({type, payload, to: 'main'});
    }
  }

  /**
   * Send message to child window only
   * @param type Message type
   * @param payload Message payload
   */
  public sendToChild<T = unknown>(type: IPCMessageType, payload: T): void {
    if (this.windowType !== 'child') {
      this.send({type, payload, to: 'child'});
    }
  }

  /**
   * Send message to cover window only
   * @param type Message type
   * @param payload Message payload
   */
  public sendToCover<T = unknown>(type: IPCMessageType, payload: T): void {
    if (this.windowType !== 'cover') {
      this.send({type, payload, to: 'cover'});
    }
  }

  /**
   * Send message to confirm window only
   * @param type Message type
   * @param payload Message payload
   */
  public sendToConfirm<T = unknown>(type: IPCMessageType, payload: T): void {
    if (this.windowType !== 'confirm') {
      this.send({type, payload, to: 'confirm'});
    }
  }

  /**
   * Send message to Electron main process (not forwarded to any renderer window).
   * Main process will consume the message directly.
   * @param type Message type (IPCMessageType or MainProcessAction)
   * @param payload Message payload
   */
  public sendToElectronMain<T = unknown>(type: IPCMessageType | MainProcessAction, payload?: T): void {
    this.send({
      type: type as IPCMessageType,
      payload: (payload ?? {}) as T,
      to: 'electron-main',
    });
  }

  /**
   * Broadcast message to all other windows
   * @param type Message type
   * @param payload Message payload
   */
  public broadcast<T = unknown>(type: IPCMessageType, payload: T): void {
    this.send({ type, payload, to: 'broadcast' });
  }

  /**
   * Register handler for specific message type
   * @param type Message type to listen
   * @param handler Callback function
   */
  public on<T = unknown>(type: IPCMessageType, handler: IPCMessageHandler<T>): void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler as IPCMessageHandler);
    logger.log(`${logPrefix} registered handler for:`, type);
  }

  /**
   * Register handler for all messages
   * @param handler Callback function
   */
  public onAll(handler: IPCMessageHandler): void {
    this.globalHandlers.add(handler);
    logger.log(`${logPrefix} registered global handler`);
  }

  /**
   * Remove handler for specific message type
   * @param type Message type
   * @param handler Callback function to remove
   */
  public off<T = unknown>(type: IPCMessageType, handler: IPCMessageHandler<T>): void {
    const typeHandlers = this.handlers.get(type);
    if (typeHandlers) {
      typeHandlers.delete(handler as IPCMessageHandler);
      if (typeHandlers.size === 0) {
        this.handlers.delete(type);
      }
      logger.log(`${logPrefix} removed handler for:`, type);
    }
  }

  /**
   * Remove global handler
   * @param handler Callback function to remove
   */
  public offAll(handler: IPCMessageHandler): void {
    this.globalHandlers.delete(handler);
    logger.log(`${logPrefix} removed global handler`);
  }

  /**
   * Remove all handlers for specific message type
   * @param type Message type
   */
  public removeAllHandlers(type: IPCMessageType): void {
    this.handlers.delete(type);
    logger.log(`${logPrefix} removed all handlers for:`, type);
  }

  /**
   * Clear all handlers
   */
  public clearAllHandlers(): void {
    this.handlers.clear();
    this.globalHandlers.clear();
    logger.log(`${logPrefix} cleared all handlers`);
  }

  /**
   * Check if handler exists for specific type
   * @param type Message type
   */
  public hasHandler(type: IPCMessageType): boolean {
    const typeHandlers = this.handlers.get(type);
    return !!typeHandlers && typeHandlers.size > 0;
  }

  /**
   * Setup IPC listener for incoming messages
   */
  private setupListener(): void {
    if (this.isListenerSetup) {
      return;
    }

    if (!window.ipcRenderer) {
      logger.warn(`${logPrefix} ipcRenderer not available, will retry later`);
      setTimeout(() => this.setupListener(), 100);
      return;
    }

    window.ipcRenderer.on(
      IPC_CHANNELS.RECEIVE,
      (_event: Electron.IpcRendererEvent, message: IPCMessage) => {
        this.handleMessage(message);
      }
    );

    this.init();
    this.isListenerSetup = true;
    logger.log(`${logPrefix} listener setup completed`);
  }

  /**
   * Handle incoming message
   * @param message IPC message
   */
  private handleMessage(message: IPCMessage): void {
    logger.log(`${logPrefix} received message:`, message.type, 'from:', message.from);

    // Call global handlers first
    this.globalHandlers.forEach((handler) => {
      try {
        handler(message.payload, message.from);
      } catch (error) {
        logger.error(`${logPrefix} global handler error:`, error);
      }
    });

    // Call type-specific handlers
    const typeHandlers = this.handlers.get(message.type);
    if (typeHandlers) {
      typeHandlers.forEach((handler) => {
        try {
          handler(message.payload, message.from);
        } catch (error) {
          logger.error(`${logPrefix} handler error for ${message.type}:`, error);
        }
      });
    }
  }

  /**
   * Detect current window type from main process
   */
  private async detectWindowType(): Promise<void> {
    if (!window.ipcRenderer) {
      logger.error(`${logPrefix} ipcRenderer not available for detectWindowType`);
      return;
    }

    try {
      // Use existing 'window-type' IPC handler
      const type = await window.ipcRenderer.invoke('window-type');
      if (type === 'main' || type === 'child' || type === 'cover' || type === 'confirm') {
        this.windowType = type as WindowType;
      } else {
        logger.warn(`${logPrefix} unknown window type:`, type);
      }
    } catch (error) {
      logger.error(`${logPrefix} failed to detect window type:`, error);
    }
  }

  /**
   * Destroy the bridge instance
   * Should be called when the window is closing
   */
  public destroy(): void {
    this.clearAllHandlers();
    this.windowType = null;
    this.isListenerSetup = false;
    IPCBridge.instance = null;
    logger.log(`${logPrefix} destroyed`);
  }
}

/**
 * Export singleton instance
 */
export const ipcBridge = IPCBridge.getInstance();

/**
 * Export class for testing or custom instances
 */
export { IPCBridge };
