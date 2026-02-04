import { ref, Ref, computed } from 'vue';
import { useLoginState, useRoomEngine, useLiveListState } from 'tuikit-atomicx-vue3-electron';
import { TUIToast, TOAST_TYPE, useUIKit, TUIMessageBox } from '@tencentcloud/uikit-base-component-vue3';
import TUIRoomEngine, { TUIRoomEvents } from '@tencentcloud/tuiroom-engine-electron';
import logger from '../utils/logger';

const logPrefix = '[useElectronLogin]';

// Constants
const MAX_LOGIN_RETRY_COUNT = 1;
const LOGIN_RETRY_INTERVAL = 2000; // ms

// Error classification types
export enum LoginErrorType {
  USER_SIG_EXPIRED = 'USER_SIG_EXPIRED',
  USER_SIG_MISMATCH = 'USER_SIG_MISMATCH',
  INVALID_PARAMETERS = 'INVALID_PARAMETERS',
  UNKNOWN = 'UNKNOWN',
}

export enum LoginErrorCode {
  ERR_SVR_ACCOUNT_USERSIG_EXPIRED             = 70001,
  ERR_SVR_ACCOUNT_USERSIG_EMPTY               = 70002,
  ERR_SVR_ACCOUNT_USERSIG_CHECK_FAILED        = 70003,
  ERR_SVR_ACCOUNT_USERSIG_CHECK_FAILED_EX     = 70005,
  ERR_SVR_ACCOUNT_USERSIG_MISMATCH_PUBLICKEY  = 70009,
  ERR_SVR_ACCOUNT_USERSIG_MISMATCH_ID         = 70013,
  ERR_SVR_ACCOUNT_USERSIG_MISMATCH_SDKAPPID   = 70014,
  ERR_SVR_ACCOUNT_USERSIG_PUBLICKEY_NOT_FOUND = 70016,
  ERR_SVR_ACCOUNT_SDKAPPID_NOT_FOUND          = 70020,
  ERR_SVR_ACCOUNT_INVALID_USERSIG             = 70052,
}

// Types
export interface LoginOptions {
  sdkAppId: number;
  userId: string;
  userSig: string;
  userName?: string;
  avatarUrl?: string;
}

export interface UseElectronLoginOptions {
  onLogout?: () => void;
  onLoginFailed?: () => void;
}

export interface UseElectronLoginReturn {
  // State
  isLoggingIn: Ref<boolean>;
  loginError: Ref<Error | null>;
  loginStatus: Ref<'idle' | 'logging' | 'success' | 'failed'>;

  // Methods
  loginWithRetry: (options: LoginOptions) => Promise<void>;
  setupEventListeners: () => void;
  cleanupEventListeners: () => void;
  handleLogout: () => Promise<void>;
}

/**
 * Electron login management hook with retry mechanism
 * @param options - Configuration options
 * @returns Login management functions and state
 */
export function useElectronLogin(options: UseElectronLoginOptions = {}): UseElectronLoginReturn {
  const { onLogout, onLoginFailed } = options;
  const { login, logout, setSelfInfo } = useLoginState();
  const { t } = useUIKit();
  const roomEngine = useRoomEngine();
  const { currentLive, endLive } = useLiveListState();

  // State
  const isLoggingIn = ref<boolean>(false);
  const loginError = ref<Error | null>(null);
  const loginStatus = ref<'idle' | 'logging' | 'success' | 'failed'>('idle');

  // Computed: Check if currently in live
  const isInLive = computed(() => !!currentLive.value?.liveId);

  // Event handler references for cleanup
  let kickedOffLineHandler: ((eventInfo: { roomId: string; message: string }) => void) | null = null;
  let userSigExpiredHandler: (() => void) | null = null;

  /**
   * Classify login error type based on error message
   * @param error - The error object
   * @returns Error type classification
   */
  function classifyLoginError(error: Error | null): LoginErrorType {
    if (!error || !error.message) {
      return LoginErrorType.UNKNOWN;
    }

    const errorMsg = error.message;
    const errorCode = (error as any).code as number;
    if ([
      LoginErrorCode.ERR_SVR_ACCOUNT_USERSIG_CHECK_FAILED,
      LoginErrorCode.ERR_SVR_ACCOUNT_USERSIG_CHECK_FAILED_EX,
      LoginErrorCode.ERR_SVR_ACCOUNT_USERSIG_EMPTY,
      LoginErrorCode.ERR_SVR_ACCOUNT_USERSIG_MISMATCH_PUBLICKEY,
      LoginErrorCode.ERR_SVR_ACCOUNT_USERSIG_MISMATCH_ID,
      LoginErrorCode.ERR_SVR_ACCOUNT_USERSIG_MISMATCH_SDKAPPID,
      LoginErrorCode.ERR_SVR_ACCOUNT_USERSIG_PUBLICKEY_NOT_FOUND,
      LoginErrorCode.ERR_SVR_ACCOUNT_SDKAPPID_NOT_FOUND,
      LoginErrorCode.ERR_SVR_ACCOUNT_INVALID_USERSIG,
    ].indexOf(errorCode) !== -1) {
      return LoginErrorType.USER_SIG_MISMATCH;
    }
    if (errorCode === LoginErrorCode.ERR_SVR_ACCOUNT_USERSIG_EXPIRED) {
      return LoginErrorType.USER_SIG_EXPIRED;
    }

    if (errorMsg.indexOf('Invaild parameters.') !== -1) {
      return LoginErrorType.INVALID_PARAMETERS;
    }

    return LoginErrorType.UNKNOWN;
  }

  /**
   * Get error message based on error type
   * @param errorType - The classified error type
   * @returns Localized error message
   */
  function getErrorMessage(errorType: LoginErrorType): string {
    const baseMessage = t('Login failed.');

    switch (errorType) {
    case LoginErrorType.USER_SIG_EXPIRED:
      return baseMessage + t('The UserSig in use is expired.');
    case LoginErrorType.USER_SIG_MISMATCH:
      return baseMessage + t('The UserSig does not match.');
    case LoginErrorType.INVALID_PARAMETERS:
      return baseMessage + t('Invalid login parameters.');
    case LoginErrorType.UNKNOWN:
    default:
      return '';
    }
  }

  /**
   * Handle login error with classification
   * @param error - The error object
   */
  function handleLoginError(error: Error | null) {
    if (!error) {
      logger.warn(`${logPrefix}handleLoginError: error is null`);
      return;
    }

    const errorType = classifyLoginError(error);
    const errorMessage = getErrorMessage(errorType);

    logger.error(`${logPrefix}handleLoginError:`, {
      errorType,
      errorMessage: error.message,
      classifiedMessage: errorMessage,
    });

    if (errorMessage) {
      TUIToast({
        type: TOAST_TYPE.ERROR,
        message: errorMessage,
      });
    }
  }

  /**
   * Login with retry mechanism
   * @param options - Login options
   */
  async function loginWithRetry(options: LoginOptions): Promise<void> {
    logger.log(`${logPrefix}loginWithRetry:`, options);

    isLoggingIn.value = true;
    loginStatus.value = 'logging';
    loginError.value = null;

    let retryCount = 0;
    let lastError: Error | null = null;

    while (retryCount < MAX_LOGIN_RETRY_COUNT) {
      try {
        logger.log(`${logPrefix}login attempt ${retryCount + 1}/${MAX_LOGIN_RETRY_COUNT}`);

        // Call useLoginState's login method
        await login({
          sdkAppId: options.sdkAppId,
          userId: options.userId,
          userSig: options.userSig,
        });

        // Login successful, exit retry loop
        logger.log(`${logPrefix}login successful after ${retryCount} retries`);
        loginStatus.value = 'success';
        isLoggingIn.value = false;

        // Set user info if provided
        if (options.userName || options.avatarUrl) {
          try {
            await setSelfInfo({
              userName: options.userName,
              avatarUrl: options.avatarUrl,
            });
          } catch (error) {
            logger.error(`${logPrefix}setSelfInfo error:`, error);
            // Don't throw error, login is already successful
          }
        }

        return;
      } catch (error) {
        lastError = error as Error;
        logger.error(`${logPrefix}login attempt ${retryCount + 1} failed:`, error);

        retryCount++;

        if (retryCount < MAX_LOGIN_RETRY_COUNT) {
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, LOGIN_RETRY_INTERVAL));
        }
      }
    }

    // All retries failed
    logger.error(`${logPrefix}login failed after ${MAX_LOGIN_RETRY_COUNT} attempts`);
    loginError.value = lastError;
    loginStatus.value = 'failed';
    isLoggingIn.value = false;

    // Handle login error with classification
    handleLoginError(lastError);

    // Trigger login failed callback
    onLoginFailed?.();

    // Throw error for caller to handle
    throw lastError;
  }

  /**
   * Handle kicked off line event
   * @param eventInfo - Event information
   */
  function handleKickedOffLine(eventInfo: { roomId: string; message: string }) {
    logger.log(`${logPrefix}handleKickedOffLine:`, eventInfo);

    TUIMessageBox.alert({
      title: t('Note'),
      message: t('You have been kicked off line.'),
      confirmText: t('Sure'),
    });

    // Reset login status
    loginStatus.value = 'idle';
    isLoggingIn.value = false;
    loginError.value = null;

    // Trigger logout callback
    onLogout?.();
  }

  /**
   * Handle userSig expired event
   */
  function handleUserSigExpired() {
    logger.log(`${logPrefix}handleUserSigExpired:`);

    TUIMessageBox.alert({
      title: t('Note'),
      message: t('The UserSig in use is expired. Please log in again.'),
      confirmText: t('Sure'),
    });

    // Reset login status
    loginStatus.value = 'idle';
    isLoggingIn.value = false;
    loginError.value = null;

    // Trigger logout callback
    onLogout?.();
  }

  /**
   * Setup event listeners
   */
  function setupEventListeners() {
    logger.log(`${logPrefix}setupEventListeners: setting up event listeners`);

    // Create handler references for cleanup
    kickedOffLineHandler = handleKickedOffLine;
    userSigExpiredHandler = handleUserSigExpired;

    // Check if TUIRoomEngine is already ready
    if (roomEngine.instance) {
      logger.log(`${logPrefix}TUIRoomEngine instance already available, registering event listeners immediately`);
      registerEventListeners();
    } else {
      // Wait for TUIRoomEngine to be ready
      TUIRoomEngine.once('ready', () => {
        logger.log(`${logPrefix}TUIRoomEngine ready, registering event listeners`);
        registerEventListeners();
      });
    }
  }

  /**
   * Register event listeners on roomEngine instance
   */
  function registerEventListeners() {
    if (!roomEngine.instance) {
      logger.error(`${logPrefix}registerEventListeners: roomEngine.instance is null`);
      return;
    }

    if (!kickedOffLineHandler || !userSigExpiredHandler) {
      logger.error(`${logPrefix}registerEventListeners: handlers are null`);
      return;
    }

    // Register event listeners
    roomEngine.instance.on(TUIRoomEvents.onKickedOffLine, kickedOffLineHandler);
    roomEngine.instance.on(TUIRoomEvents.onUserSigExpired, userSigExpiredHandler);

    logger.log(`${logPrefix}Event listeners registered successfully`);
  }

  /**
   * Cleanup event listeners
   */
  function cleanupEventListeners() {
    logger.log(`${logPrefix}cleanupEventListeners: cleaning up event listeners`);

    if (roomEngine.instance && kickedOffLineHandler && userSigExpiredHandler) {
      roomEngine.instance.off(TUIRoomEvents.onKickedOffLine, kickedOffLineHandler);
      roomEngine.instance.off(TUIRoomEvents.onUserSigExpired, userSigExpiredHandler);

      logger.log(`${logPrefix}Event listeners cleaned up successfully`);
    }

    // Clear handler references
    kickedOffLineHandler = null;
    userSigExpiredHandler = null;
  }

  /**
   * Handle logout with live status check
   */
  async function handleLogout() {
    logger.log(`${logPrefix}handleLogout: starting logout process`);

    try {
      // Check if currently in live
      if (isInLive.value) {
        logger.log(`${logPrefix}handleLogout: currently in live, ending live first`);
        try {
          await endLive();
          logger.log(`${logPrefix}handleLogout: live ended successfully`);
        } catch (error) {
          logger.error(`${logPrefix}handleLogout: end live failed:`, error);
          // Show error message but continue with logout
          TUIToast({
            type: TOAST_TYPE.ERROR,
            message: t('End live failed when log out'),
          });
          // Continue with logout even if end live failed
        }
      }

      // Cleanup event listeners
      cleanupEventListeners();

      // Clear login state
      await logout();

      // Clear localStorage
      window.localStorage.removeItem('TUILiveKit-userInfo');

      // Reset login status
      loginStatus.value = 'idle';
      isLoggingIn.value = false;
      loginError.value = null;

      // Send IPC event to notify main process
      if (window.ipcRenderer) {
        window.ipcRenderer.send('user-logout');
      }

      logger.log(`${logPrefix}handleLogout: logout completed successfully`);

      // Trigger logout callback
      onLogout?.();
    } catch (error) {
      logger.error(`${logPrefix}handleLogout error:`, error);
      throw error;
    }
  }

  return {
    isLoggingIn,
    loginError,
    loginStatus,
    loginWithRetry,
    setupEventListeners,
    cleanupEventListeners,
    handleLogout,
  };
}

