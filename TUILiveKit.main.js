const {
  app,
  BrowserWindow,
  systemPreferences,
  crashReporter,
  ipcMain,
  Menu,
  shell,
} = require('electron');
const { exec, spawn } = require('child_process');
const path = require('path');
const EventEmitter = require('events');

const logPrefix = '[TUILiveKit.main]';

let language = 'zh-CN';
let lastChildWindowCommand = '';

const basicInfo = {
  userInfo: null,
};

const windowMap = {
  main: null,
  child: null,
  mainCover: null,
  confirm: null,
};

const coverWindowRelativeBounds = {
  x: 0,
  y: 0,
  width: 0,
  height: 0,
};

const liveKitEmitter = new EventEmitter();
let isQuitting = false;

// ============== App Quit Race Condition Fix ==============
// Handles the race condition when user quickly closes the window before
// renderer-side listeners (app-request-quit / confirm dialog) are mounted.
//
// Solution: 1) Main process timeout fallback
//           2) Confirm window ready handshake
//           3) Quit request retry mechanism
const QUIT_TIMEOUT_MS = 5000; // Force quit if no response within 5 seconds
const QUIT_RETRY_INTERVAL_MS = 200; // Retry interval when confirm window not ready
let quitTimeoutTimer = null;
let quitRetryTimer = null;
let isConfirmWindowReady = false;
let pendingQuitRequest = false;

function clearQuitTimers() {
  if (quitTimeoutTimer) {
    clearTimeout(quitTimeoutTimer);
    quitTimeoutTimer = null;
  }
  if (quitRetryTimer) {
    clearInterval(quitRetryTimer);
    quitRetryTimer = null;
  }
}

/**
 * Shared handler for quit-confirmed from both V2 IPC router and direct IPC channel.
 * Clears timers, sets quit state, and closes all windows.
 */
function handleQuitConfirmed() {
  clearQuitTimers();
  pendingQuitRequest = false;
  isQuitting = true;
  if (windowMap.mainCover && !windowMap.mainCover.isDestroyed()) {
    windowMap.mainCover.close();
  }
  windowMap.mainCover = null;

  if (windowMap.confirm && !windowMap.confirm.isDestroyed()) {
    windowMap.confirm.close();
  }
  windowMap.confirm = null;

  if (windowMap.main && !windowMap.main.isDestroyed()) {
    windowMap.main.close();
  }

  if (windowMap.child && !windowMap.child.isDestroyed()) {
    windowMap.child.close();
  }
  windowMap.child = null;
}

/**
 * Shared handler for quit-cancel from both V2 IPC router and direct IPC channel.
 * Clears timers and resets quit state.
 */
function handleQuitCancel() {
  clearQuitTimers();
  pendingQuitRequest = false;
  isQuitting = false;
}

function forceQuitApp() {
  console.log(`${logPrefix} forceQuitApp: timeout reached, forcing quit`);
  clearQuitTimers();
  isQuitting = true;
  pendingQuitRequest = false;

  // Close all windows
  if (windowMap.mainCover && !windowMap.mainCover.isDestroyed()) {
    windowMap.mainCover.close();
  }
  windowMap.mainCover = null;

  if (windowMap.confirm && !windowMap.confirm.isDestroyed()) {
    windowMap.confirm.close();
  }
  windowMap.confirm = null;

  if (windowMap.main && !windowMap.main.isDestroyed()) {
    windowMap.main.close();
  }

  if (windowMap.child && !windowMap.child.isDestroyed()) {
    windowMap.child.close();
  }
  windowMap.child = null;
}

function sendQuitRequestToRenderer() {
  if (isWebContentsAlive(windowMap.main)) {
    console.log(`${logPrefix} sendQuitRequestToRenderer: sending app-request-quit`);
    sendToWindow(windowMap.main, 'app-request-quit');
  }
}

function initiateQuitSequence() {
  if (isQuitting) {
    return;
  }

  console.log(`${logPrefix} initiateQuitSequence: isConfirmWindowReady=${isConfirmWindowReady}`);

  // Start timeout fallback timer
  if (!quitTimeoutTimer) {
    quitTimeoutTimer = setTimeout(() => {
      console.log(`${logPrefix} quit timeout reached, no response from renderer`);
      forceQuitApp();
    }, QUIT_TIMEOUT_MS);
  }

  if (isConfirmWindowReady) {
    // Confirm window is ready, send quit request immediately
    sendQuitRequestToRenderer();
    pendingQuitRequest = false;
  } else {
    // Confirm window not ready yet, mark pending and start retry
    pendingQuitRequest = true;
    console.log(`${logPrefix} confirm window not ready, will retry when ready`);

    if (!quitRetryTimer) {
      quitRetryTimer = setInterval(() => {
        if (isConfirmWindowReady && pendingQuitRequest) {
          console.log(`${logPrefix} confirm window now ready, sending pending quit request`);
          clearInterval(quitRetryTimer);
          quitRetryTimer = null;
          sendQuitRequestToRenderer();
          pendingQuitRequest = false;
        }
      }, QUIT_RETRY_INTERVAL_MS);
    }
  }
}
// ============== End of App Quit Race Condition Fix ==============

function isWindowAlive(win) {
  return !!win && !win.isDestroyed();
}

function isWebContentsAlive(win) {
  return isWindowAlive(win) && !!win.webContents && !win.webContents.isDestroyed();
}

function sendToWindow(win, channel, ...args) {
  if (!isWebContentsAlive(win)) {
    return false;
  }
  win.webContents.send(channel, ...args);
  return true;
}

function postMessageToWindow(win, channel, message, transfer = []) {
  if (!isWebContentsAlive(win)) {
    return false;
  }
  win.webContents.postMessage(channel, message, transfer);
  return true;
}

/**
 * Get default window size for a given panel type.
 * Used by SHOW_CHILD_PANEL message handler when no explicit windowSize is provided.
 */
function getDefaultPanelSize(panelType) {
  const [mainW, mainH] = isWindowAlive(windowMap.main)
    ? windowMap.main.getSize()
    : [1200, 800];
  const sizeMap = {
    'Camera':              { width: 600, height: 400 },
    'Screen':              { width: mainW - 150, height: mainH - 80 },
    'Image':               { width: 600, height: 500 },
    'Rename':              { width: 480, height: 176 },
    'CoGuestConnection':   { width: 520, height: 560 },
    'CoHostConnection':    { width: 520, height: 560 },
    'Setting':             { width: 600, height: 560 },
    'AddBgm':              { width: 600, height: 560 },
    'ReverbVoice':         { width: 600, height: 560 },
    'ChangeVoice':         { width: 600, height: 560 },
    'PhoneMirror':         { width: 600, height: 560 },
    'OnlineVideo':         { width: 600, height: 360 },
    'VideoFile':           { width: 600, height: 360 },
    'UserProfile':         { width: 600, height: 460 },
    'LayoutConfig':        { width: 480, height: 320 },
    'LiveTitleSetting':    { width: 600, height: 560 },
  };
  return sizeMap[panelType] || { width: 600, height: 400 };
}

// ============== Main Process Action Handlers ==============
// Centralized handler registry for renderer-to-main-process actions.
// Messages with `to: 'electron-main'` are consumed here and NOT forwarded to any renderer window.
const mainProcessHandlers = {
  'minimizeWindow': (_payload, _from) => {
    if (isWindowAlive(windowMap.main)) {
      windowMap.main.minimize();
    }
  },
  'maximizeWindow': (payload, _from) => {
    if (isWindowAlive(windowMap.main)) {
      if (payload && payload.maximize) {
        windowMap.main.maximize();
      } else {
        windowMap.main.unmaximize();
      }
    }
  },
  'closeWindow': (_payload, _from) => {
    if (isWindowAlive(windowMap.main)) {
      windowMap.main.close();
    }
  },
  'setWindowSize': (payload, _from) => {
    const { target, width, height } = payload || {};
    const win = windowMap[target];
    if (isWindowAlive(win)) {
      win.setSize(width, height, true);
      win.setContentSize(width, height, true);
    }
  },
  'setCoverBounds': (payload, _from) => {
    const { top, left, width, height } = payload || {};
    coverWindowRelativeBounds.x = Math.round(left);
    coverWindowRelativeBounds.y = Math.round(top);
    coverWindowRelativeBounds.width = Math.round(width);
    coverWindowRelativeBounds.height = Math.round(height);

    const mainBounds = isWindowAlive(windowMap.main)
      ? windowMap.main.getContentBounds()
      : null;
    if (mainBounds && isWindowAlive(windowMap.mainCover)) {
      windowMap.mainCover.setBounds({
        x: coverWindowRelativeBounds.x + mainBounds.x,
        y: coverWindowRelativeBounds.y + mainBounds.y,
        width: coverWindowRelativeBounds.width,
        height: coverWindowRelativeBounds.height,
      });
    }
  },
  'showCoverWindow': (_payload, _from) => {
    if (isWindowAlive(windowMap.mainCover)) {
      windowMap.mainCover.show();
    }
  },
  'hideCoverWindow': (_payload, _from) => {
    if (isWindowAlive(windowMap.mainCover)) {
      windowMap.mainCover.hide();
    }
  },
  'setLanguage': (payload, _from) => {
    language = payload;
  },
  'showContextMenu': (_payload, from) => {
    const win = windowMap[from];
    if (!isWindowAlive(win)) return;
    const template = [
      {
        label: isZhCN() ? '排序' : 'Sort',
        submenu: [
          { 'label': isZhCN() ? '上移' : 'Move up', 'click': () => { sendToWindow(win, 'context-menu-command', 'move-up'); } },
          { 'label': isZhCN() ? '下移' : 'Move down', 'click': () => { sendToWindow(win, 'context-menu-command', 'move-down'); } },
          { 'label': isZhCN() ? '移至顶部' : 'Move to top', 'click': () => { sendToWindow(win, 'context-menu-command', 'move-top'); } },
          { 'label': isZhCN() ? '移至底部' : 'Move to bottom', 'click': () => { sendToWindow(win, 'context-menu-command', 'move-bottom'); } },
        ]
      },
      {
        label: isZhCN() ? '变换' : 'Transform',
        submenu: [
          { 'label': isZhCN() ? '顺时针旋转90度' : 'Rotate 90 degrees CW', 'click': () => { sendToWindow(win, 'context-menu-command', 'transform-clockwise-90'); } },
          { 'label': isZhCN() ? '逆时针旋转90度' : 'Rotate 90 degrees CCW', 'click': () => { sendToWindow(win, 'context-menu-command', 'transform-anti-clockwise-90'); } },
          { 'label': isZhCN() ? '水平旋转' : 'Flip horizontal', 'click': () => { sendToWindow(win, 'context-menu-command', 'transform-mirror-horizontal'); } },
        ]
      },
      { type: 'separator' },
      { label: isZhCN() ? '隐藏' : 'Hide', click: () => { sendToWindow(win, 'context-menu-command', 'hide'); } },
      { label: isZhCN() ? '编辑' : 'Edit', click: () => { sendToWindow(win, 'context-menu-command', 'edit'); } },
      { type: 'separator' },
      { label: isZhCN() ? '删除' : 'Remove', click: () => { sendToWindow(win, 'context-menu-command', 'remove'); } },
    ];
    const menu = Menu.buildFromTemplate(template);
    if (isWindowAlive(win)) {
      menu.popup({ window: win });
    }
  },
  'setIgnoreMouseEvents': (payload, from) => {
    const { ignore, options } = payload || {};
    const win = windowMap[from];
    if (isWindowAlive(win)) {
      win.setIgnoreMouseEvents(ignore, options);
    }
  },
  'appQuitConfirmed': (_payload, _from) => {
    handleQuitConfirmed();
  },
  'appQuitCancel': (_payload, _from) => {
    handleQuitCancel();
  },
  'hideChildPanel': (_payload, _from) => {
    if (isWindowAlive(windowMap.child)) {
      if (windowMap.child.isVisible() && _payload && _payload.panelType === lastChildWindowCommand) {
        lastChildWindowCommand = '';
        windowMap.child.hide();
      }
    }
  }
};

// 开启crash捕获
crashReporter.start({
  productName: 'tui-live-kit-electron',
  companyName: 'Tencent Cloud',
  submitURL: 'https://www.xxx.com',
  uploadToServer: false,
  ignoreSystemCrashHandler: false,
});

// 开启crash捕获
let crashFilePath = '';
let crashDumpsDir = '';
try {
  // electron 低版本
  crashFilePath = path.join(app.getPath('temp'), app.getName() + ' Crashes');
  console.log('————————crash path:', crashFilePath);

  // electron 高版本
  crashDumpsDir = app.getPath('crashDumps');
  console.log('————————crashDumpsDir:', crashDumpsDir);
} catch (e) {
  console.error('Get crash dump folder failed', e);
}

async function checkAndApplyDeviceAccessPrivilege() {
  if (process.platform === 'darwin' || process.platform === 'win32') {
    try {
      const cameraPrivilege = systemPreferences.getMediaAccessStatus('camera');
      console.log(
        `checkAndApplyDeviceAccessPrivilege before apply cameraPrivilege: ${cameraPrivilege}`
      );
      if (cameraPrivilege !== 'granted') {
        await systemPreferences.askForMediaAccess('camera');
      }

      const micPrivilege = systemPreferences.getMediaAccessStatus('microphone');
      console.log(
        `checkAndApplyDeviceAccessPrivilege before apply micPrivilege: ${micPrivilege}`
      );
      if (micPrivilege !== 'granted') {
        await systemPreferences.askForMediaAccess('microphone');
      }

      const screenPrivilege = systemPreferences.getMediaAccessStatus('screen');
      console.log(
        `checkAndApplyDeviceAccessPrivilege before apply screenPrivilege: ${screenPrivilege}`
      );
    } catch(err) {
      console.warn('checkAndApplyDeviceAccessPrivilege error:', err)
    }
  } else {
    // Electron API getMediaAccessStatus/askForMediaAccess does not support on Linux.
  }
}

function isZhCN() {
  return language === 'zh-CN';
}

function windowOpenHandler(details) {
  if (details.url) {
    if (details.url.startsWith('https:') || details.url.startsWith('http:')) {
      shell.openExternal(details.url);
    }
  }
  return { action: 'deny' };
}

async function createWindow(width = 1366, height = 668) {
  await checkAndApplyDeviceAccessPrivilege();

  windowMap.main = new BrowserWindow({
    width: 1200 || width,
    height: 750 || height,
    minWidth: 1200,
    minHeight: 650,
    frame: false,
    acceptFirstMouse: true,
    webPreferences: {
      preload: path.join(__dirname, 'TUILiveKit.preload.js'),
      nodeIntegration: true,
      contextIsolation: false,
      nodeIntegrationInWorker: true,
    },
  });
  windowMap.mainCover = new BrowserWindow({
    show: false,
    width: 10,
    height: 10,
    frame: false,
    transparent: true,
    resizable: false,
    acceptFirstMouse: true,
    parent: windowMap.main,
    webPreferences: {
      preload: path.join(__dirname, 'TUILiveKit.preload.js'),
      nodeIntegration: true,
      contextIsolation: false,
      nodeIntegrationInWorker: true,
    },
  });
  windowMap.child = new BrowserWindow({
    show: false,
    width: 600,
    height: 650,
    frame: false,
    acceptFirstMouse: true,
    skipTaskbar: true,
    resizable: false,
    parent: windowMap.main,
    webPreferences: {
      nodeIntegration: true,
      nodeIntegrationInWorker: true,
      contextIsolation: false,
      preload: path.join(__dirname, 'TUILiveKit.preload.js'),
    },
  });
  windowMap.confirm = new BrowserWindow({
    show: false,
    width: 480,
    // Match TUILiveKitMacV2 exitLiveDialog size (TUIDialog default width 480, height is content-adaptive).
    // Use a taller fixed height here to fit header/content/footer in confirm BrowserWindow.
    height: 220,
    frame: false,
    transparent: false,
    resizable: false,
    parent: windowMap.main,
    modal: true,
    webPreferences: {
      preload: path.join(__dirname, 'TUILiveKit.preload.js'),
      nodeIntegration: true,
      contextIsolation: false,
      nodeIntegrationInWorker: true,
    },
  });

  // Make all links open with the browser, not with current application
  windowMap.main.webContents.setWindowOpenHandler(windowOpenHandler);
  windowMap.child.webContents.setWindowOpenHandler(windowOpenHandler);
  windowMap.mainCover.webContents.setWindowOpenHandler(windowOpenHandler);
  windowMap.confirm.webContents.setWindowOpenHandler(windowOpenHandler);

  bindIPCEvent();
  bindMainWindowEvent();
  bindChildWindowEvent();
  bindCoverWindowEvent();
  bindConfirmWindowEvent();

  if (app.isPackaged) {
    windowMap.main.loadFile('dist/index.html');
    windowMap.child.loadFile('dist/index.html');
    windowMap.mainCover.loadFile('dist/index.html');
    windowMap.confirm.loadFile('dist/index.html');
  } else {
    windowMap.main.loadURL('http://localhost:8080');
    windowMap.child.loadURL('http://localhost:8080/#/tui-live-kit-child');
    windowMap.mainCover.loadURL('http://localhost:8080/#/tui-live-kit-cover');
    windowMap.confirm.loadURL('http://localhost:8080/#/tui-live-kit-confirm');
  }
}

function bindIPCEvent() {
  ipcMain.handle('app-path', () => {
    return app.getAppPath();
  });
  ipcMain.handle('get-language', () => {
    return language;
  });

  ipcMain.handle('window-type', (event) => {
    if (event.sender === windowMap.main?.webContents) {
      return 'main';
    } else if (event.sender === windowMap.child?.webContents) {
      return 'child';
    } else if (event.sender === windowMap.mainCover?.webContents) {
      return 'cover'
    } else if (event.sender === windowMap.confirm?.webContents) {
      return 'confirm';
    } else {
      return '';
    }
  });

  ipcMain.handle('window-id', (event) => {
    if (event.sender === windowMap.main?.webContents) {
      return  windowMap.main.getNativeWindowHandle();
    } else if (event.sender === windowMap.child?.webContents) {
      return  windowMap.child.getNativeWindowHandle();
    } else if (event.sender === windowMap.mainCover?.webContents) {
      return  windowMap.mainCover.getNativeWindowHandle();
    } else if (event.sender === windowMap.confirm?.webContents) {
      return  windowMap.confirm.getNativeWindowHandle();
    } else {
      return 0;
    }
  });

  // ============== New IPC Message Router for V2 ==============
  // Unified message routing for inter-window communication
  // This replaces MessageChannel mechanism with IPC-based communication
  ipcMain.on('window-message', (event, message) => {
    const { type, payload, to } = message;

    // Determine the source window
    let from = 'unknown';
    if (event.sender === windowMap.main?.webContents) {
      from = 'main';
    } else if (event.sender === windowMap.child?.webContents) {
      from = 'child';
    } else if (event.sender === windowMap.mainCover?.webContents) {
      from = 'cover';
    } else if (event.sender === windowMap.confirm?.webContents) {
      from = 'confirm';
    }

    const messageWithFrom = { ...message, from };
    console.log(`${logPrefix}window-message: type=${type}, from=${from}, to=${to}`);

    // Handle messages targeting Electron main process itself (not forwarded to any renderer)
    if (to === 'electron-main') {
      const handler = mainProcessHandlers[type];
      if (handler) {
        handler(payload, from);
      } else {
        console.warn(`${logPrefix}window-message: no handler for electron-main action: ${type}`);
      }
      return;
    }

    // Route message based on target
    if (to === 'broadcast') {
      // Broadcast to all other windows
      if (from !== 'main') {
        sendToWindow(windowMap.main, 'window-message', messageWithFrom);
      }
      if (from !== 'child') {
        sendToWindow(windowMap.child, 'window-message', messageWithFrom);
      }
      if (from !== 'cover') {
        sendToWindow(windowMap.mainCover, 'window-message', messageWithFrom);
      }
      if (from !== 'confirm') {
        sendToWindow(windowMap.confirm, 'window-message', messageWithFrom);
      }
    } else if (to === 'main') {
      sendToWindow(windowMap.main, 'window-message', messageWithFrom);
    } else if (to === 'child') {
      if (type === 'showChildPanel') {
        // SHOW_CHILD_PANEL: control window size/position + show, then forward message
        const { panelType, windowSize } = message.payload || {};
        const size = windowSize || getDefaultPanelSize(panelType);
        if (isWindowAlive(windowMap.child)) {
          windowMap.child.setSize(size.width, size.height, true);
          windowMap.child.setContentSize(size.width, size.height, true);
          windowMap.child.center();
          windowMap.child.show();
        }
        lastChildWindowCommand = panelType || '';
      }
      // For UPDATE_CHILD_DATA and all other types: just forward, no window manipulation
      sendToWindow(windowMap.child, 'window-message', messageWithFrom);
    } else if (to === 'cover') {
      sendToWindow(windowMap.mainCover, 'window-message', messageWithFrom);
    } else if (to === 'confirm') {
      if (type === 'showConfirmDialog') {
        if (isWindowAlive(windowMap.confirm)) {
          windowMap.confirm.center();
        }
      }
      sendToWindow(windowMap.confirm, 'window-message', messageWithFrom);
      if (type === 'showConfirmDialog') {
        // Confirm dialog is now visible and the user can interact with it.
        // Clear the force-quit timeout so the user has unlimited time to decide.
        clearQuitTimers();
        if (isWindowAlive(windowMap.confirm)) {
          windowMap.confirm.show();
        }
      } else if (type === 'closeConfirmDialog') {
        if (isWindowAlive(windowMap.confirm)) {
          windowMap.confirm.hide();
        }
      }
    } else {
      console.warn(`${logPrefix}window-message: unknown target: ${to}`);
    }
  });
  // ============== End of New IPC Message Router ==============

  ipcMain.on('on-minimize-window', () => {
    console.log(`${logPrefix}on-minimize-window event`);
    if (isWindowAlive(windowMap.main)) {
      windowMap.main.minimize();
    }
  });

  ipcMain.on('on-maximize-window', (evt, flag) => {
    console.log(`${logPrefix}on-maximize-window event:`, flag);
    if (isWindowAlive(windowMap.main)) {
      if (flag) {
        windowMap.main.maximize();
      } else {
        windowMap.main.unmaximize();
      }
    }
  });

  ipcMain.on('on-close-window', () => {
    console.log(`${logPrefix}on-close-window event`);
    // Delegate close behavior to the main window 'close' handler so that
    // the renderer can decide whether the application should actually quit.
    if (isWindowAlive(windowMap.main)) {
      windowMap.main.close();
    }
  });

  ipcMain.on('open-child', (event, args) => {
    console.log(`${logPrefix}on open-child`, args);
    if(lastChildWindowCommand === args.command) {
      if (isWindowAlive(windowMap.child)) {
        windowMap.child.show();
      }
      return;
    }
    lastChildWindowCommand = args.command;
    const [width, height] = isWindowAlive(windowMap.main)
      ? windowMap.main.getSize()
      : [1200, 800];
    switch (args.command) {
    case 'camera':
      if (isWindowAlive(windowMap.child)) {
        windowMap.child.setSize(600, 400, true);
        windowMap.child.setContentSize(600, 400, true);
      }
      break;
    case 'user-profile':
      if (isWindowAlive(windowMap.child)) {
        windowMap.child.setSize(600, 460, true);
        windowMap.child.setContentSize(600, 460, true);
      }
      break;
    case 'image':
      if (isWindowAlive(windowMap.child)) {
        windowMap.child.setSize(600, 500, true);
        windowMap.child.setContentSize(600, 500, true);
      }
      break;
    case 'screen':
      if (isWindowAlive(windowMap.child)) {
        windowMap.child.setSize(width - 150, height - 80, true);
        windowMap.child.setContentSize(width -150, height - 80, true);
      }
      break;
    case 'rename':
      if (isWindowAlive(windowMap.child)) {
        windowMap.child.setSize(480, 176, true);
        windowMap.child.setContentSize(480, 176, true);
      }
      break;
    case 'co-guest-connection':
    case 'co-host-connection':
      if (isWindowAlive(windowMap.child)) {
        windowMap.child.setSize(520, 560, true);
        windowMap.child.setContentSize(520, 560, true);
      }
      break;
    case 'add-bgm':
    case 'reverb-voice':
    case 'change-voice':
    case 'setting':
    case 'phone-mirror':
      if (isWindowAlive(windowMap.child)) {
        windowMap.child.setSize(600, 560, true);
        windowMap.child.setContentSize(600, 560, true);
      }
      break;
    case 'online-video':
    case 'video-file':
      if (isWindowAlive(windowMap.child)) {
        windowMap.child.setSize(600, 360, true);
        windowMap.child.setContentSize(600, 360, true);
      }
      break;
    default:
      break;
    }
    if (isWindowAlive(windowMap.child)) {
      windowMap.child.center();
      windowMap.child.show();
    }
    sendToWindow(windowMap.child, 'show', args);
  });

  ipcMain.on('close-child', () => {
    lastChildWindowCommand = '';
    if (isWindowAlive(windowMap.child)) {
      windowMap.child.hide();
    }
  });

  ipcMain.on('user-login', (event) => {
    if (event.sender === windowMap.main?.webContents) {
      sendToWindow(windowMap.child, 'user-login', { from: 'main', to: 'child' });
      sendToWindow(windowMap.mainCover, 'user-login', { from: 'main', to: 'cover' });
      sendToWindow(windowMap.confirm, 'user-login', { from: 'main', to: 'confirm' });
    } else if (event.sender === windowMap.child?.webContents) {
      sendToWindow(windowMap.main, 'user-login', { from: 'child', to: 'main' });
      sendToWindow(windowMap.mainCover, 'user-login', { from: 'child', to: 'cover' });
      sendToWindow(windowMap.confirm, 'user-login', { from: 'child', to: 'confirm' });
    } else if (event.sender === windowMap.mainCover?.webContents)  {
      sendToWindow(windowMap.main, 'user-login', { from: 'cover', to: 'main' });
      sendToWindow(windowMap.child, 'user-login', { from: 'cover', to: 'child' });
      sendToWindow(windowMap.confirm, 'user-login', { from: 'cover', to: 'confirm' });
    } else if (event.sender === windowMap.confirm?.webContents)  {
      sendToWindow(windowMap.main, 'user-login', { from: 'confirm', to: 'main' });
      sendToWindow(windowMap.child, 'user-login', { from: 'confirm', to: 'child' });
      sendToWindow(windowMap.mainCover, 'user-login', { from: 'confirm', to: 'cover' });
    } else {
      console.warn(`${logPrefix} unkonwn event source:`, event);
    }
  });

  ipcMain.on('user-logout', (event) => {
    if (event.sender === windowMap.main?.webContents) {
      sendToWindow(windowMap.child, 'user-logout', { from: 'main' });
    } else {
      sendToWindow(windowMap.main, 'user-logout', { from: 'child' });
    }
    if (isWindowAlive(windowMap.child)) {
      windowMap.child.hide();
    }
    if (isWindowAlive(windowMap.mainCover)) {
      windowMap.mainCover.hide();
    }
  });

  ipcMain.on('port-to-child', (event) => {
    const port = event.ports[0];
    console.log('port-to-child', port);
    postMessageToWindow(windowMap.child, 'port-to-child', null, [port]);
  });

  ipcMain.on('port-to-cover', (event) => {
    const port = event.ports[0];
    console.log('port-to-cover', port);
    postMessageToWindow(windowMap.mainCover, 'port-to-cover', null, [port]);
  });

  ipcMain.on('port-to-confirm', (event) => {
    const port = event.ports[0];
    console.log('port-to-confirm', port);
    postMessageToWindow(windowMap.confirm, 'port-to-confirm', null, [port]);
  });

  // Legacy 'set-language' channel removed — language updates now flow through
  // the V2 mainProcessHandlers['setLanguage'] via ipcBridge.sendToElectronMain().

  ipcMain.on('show-context-menu', (event) => {
    const template = [
      {
        label: isZhCN() ? '排序' : 'Sort',
        submenu: [
          { 'label': isZhCN() ? '上移' : 'Move up', 'click': () => { event.sender.send('context-menu-command', 'move-up'); } },
          { 'label': isZhCN() ? '下移' : 'Move down', 'click': () => { event.sender.send('context-menu-command', 'move-down'); } },
          { 'label': isZhCN() ? '移至顶部' : 'Move to top', 'click': () => {  event.sender.send('context-menu-command', 'move-top'); } },
          { 'label': isZhCN() ? '移至底部' : 'Move to bottom', 'click': () => {  event.sender.send('context-menu-command', 'move-bottom'); }},
        ]
      },
      {
        label: isZhCN() ? '变换' : 'Transform',
        submenu: [
          { 'label': isZhCN() ? '顺时针旋转90度' : 'Rotate 90 degrees CW', 'click': () => { event.sender.send('context-menu-command', 'transform-clockwise-90'); } },
          { 'label': isZhCN() ? '逆时针旋转90度' : 'Rotate 90 degrees CCW', 'click': () => { event.sender.send('context-menu-command', 'transform-anti-clockwise-90'); } },
          { 'label': isZhCN() ? '水平旋转' : 'Flip horizontal', 'click': () => {  event.sender.send('context-menu-command', 'transform-mirror-horizontal'); } },
          // { "label": isZhCN() ? "垂直旋转" : "Flip vertical", "click": () => {  event.sender.send("context-menu-command", "transform-mirror-vertical"); }},
          // { type: "separator" },
          // { "label": "还原", "click": () => {  event.sender.send("context-menu-command", "transform-reset"); }},
        ]
      },
      { type: 'separator' },
      { label: isZhCN() ? '隐藏' : 'Hide', click: () => {  event.sender.send('context-menu-command', 'hide'); } },
      // { label: "锁定", click: () => {  event.sender.send("context-menu-command", "lock"); } },
      { label: isZhCN() ? '编辑' : 'Edit', click: () => {  event.sender.send('context-menu-command', 'edit'); } },
      { type: 'separator' },
      { label: isZhCN() ? '删除' : 'Remove', click: () => {  event.sender.send('context-menu-command', 'remove'); } },
    ];
    const menu = Menu.buildFromTemplate(template);
    menu.popup({ window: BrowserWindow.fromWebContents(event.sender) });
  });

  ipcMain.on('start-use-driver-installer', (event, args) => {
    console.log(`${logPrefix}start-use-driver-installer:${args}`);
    let command = '';
    if (app.isPackaged) {
      command = path.join(process.execPath, '../usbscreendriver.exe');
    } else {
      command = path.join(app.getAppPath(), '/node_modules/electron/dist/usbscreendriver.exe');
    }
    command = '"' + command + '"' + ` --mode=${args}`;
    console.warn(`${logPrefix}start-use-driver-installer command:`, command);
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error: ${error.message}`);
        return;
      }
      if (stderr) {
        console.error(`Stderr: ${stderr}`);
        return;
      }
      console.log(`Output: ${stdout}`);
    });
  });

  ipcMain.on('set-ignore-mouse-events', (event, ignore, options) => {
    console.log(`${logPrefix}set-ignore-mouse-events`, ignore, options);
    const win = BrowserWindow.fromWebContents(event.sender);
    if (isWindowAlive(win)) {
      win.setIgnoreMouseEvents(ignore, options); // windowMap.mainCover
    }
  });

  ipcMain.on('stream-layout-area', (event, args) => {
    console.log('stream-layout-area', args);
    const { top, left, width, height } = args;
    coverWindowRelativeBounds.x = Math.round(left);
    coverWindowRelativeBounds.y = Math.round(top);
    coverWindowRelativeBounds.width = Math.round(width);
    coverWindowRelativeBounds.height = Math.round(height);

    if (isWindowAlive(windowMap.main)) {
      const mainBounds = windowMap.main.getContentBounds();
      console.log('stream-layout-area main window mainBounds', mainBounds, windowMap.main.getBounds());
      if (isWindowAlive(windowMap.mainCover)) {
        windowMap.mainCover.setBounds({
          x: coverWindowRelativeBounds.x + mainBounds.x,
          y: coverWindowRelativeBounds.y + mainBounds.y,
          width: coverWindowRelativeBounds.width,
          height: coverWindowRelativeBounds.height,
        });
      }
    }
    console.log('stream-layout-area finished');
  });

  ipcMain.on('stream-layout', (event, args) => {
    console.log('stream-layout', args);
    if (args?.layoutMode === 'Custom') {
      if (isWindowAlive(windowMap.main) && isWindowAlive(windowMap.mainCover)
        && windowMap.main.isVisible() && !windowMap.main.isMinimized() && !windowMap.mainCover.isVisible()) {
        windowMap.mainCover.show();
        if (lastChildWindowCommand === 'co-guest-connection' || lastChildWindowCommand === 'co-host-connection') {
          if (isWindowAlive(windowMap.child)) {
            windowMap.child.show();
          }
        }
      }
    } else {
      if (isWindowAlive(windowMap.mainCover)) {
        windowMap.mainCover.hide();
      }
    }
  });

  ipcMain.on('stop-living', (event, args) => {
    sendToWindow(windowMap.confirm, 'stop-living', args);
    if (isWindowAlive(windowMap.confirm)) {
      windowMap.confirm.show();
    }
  });
  ipcMain.on('stop-living-result', (event, args) => {
    if (isWindowAlive(windowMap.confirm)) {
      windowMap.confirm.hide();
    }
    sendToWindow(windowMap.main, 'stop-living-result', args);
  });

  ipcMain.on('app-quit-confirmed', () => {
    console.log(`${logPrefix}app-quit-confirmed`);
    handleQuitConfirmed();
  });

  ipcMain.on('app-quit-cancel', () => {
    console.log(`${logPrefix}app-quit-cancel`);
    handleQuitCancel();
  });

  // Confirm window ready handshake - called when confirm window's Vue component is mounted
  ipcMain.on('confirm-window-ready', () => {
    console.log(`${logPrefix}confirm-window-ready`);
    isConfirmWindowReady = true;

    // If there's a pending quit request, send it now
    if (pendingQuitRequest) {
      console.log(`${logPrefix}confirm-window-ready: sending pending quit request`);
      sendQuitRequestToRenderer();
      pendingQuitRequest = false;
      if (quitRetryTimer) {
        clearInterval(quitRetryTimer);
        quitRetryTimer = null;
      }
    }
  });
}

function unbindIPCMainEvent() {
  ipcMain.removeHandler('app-path');
  ipcMain.removeHandler('get-language');
  ipcMain.removeHandler('window-type');
  ipcMain.removeAllListeners('window-message'); // V2 IPC message router
  ipcMain.removeAllListeners('on-minimize-window');
  ipcMain.removeAllListeners('on-maximize-window');
  ipcMain.removeAllListeners('on-close-window');
  ipcMain.removeAllListeners('open-child');
  ipcMain.removeAllListeners('close-child');
  ipcMain.removeAllListeners('login');
  ipcMain.removeAllListeners('port-to-child');
  ipcMain.removeAllListeners('show-context-menu');
  ipcMain.removeAllListeners('start-use-driver-installer');
  ipcMain.removeAllListeners('app-quit-confirmed');
  ipcMain.removeAllListeners('app-quit-cancel');
  ipcMain.removeAllListeners('confirm-window-ready');
}

let initMainWindowTimer = null;
function initMainWindowPage() {
  if (initMainWindowTimer) {
    clearTimeout(initMainWindowTimer);
    initMainWindowTimer = null;
  }
  console.log(`${logPrefix}main window: initMainWindowPage`);
  if (basicInfo.userInfo) {
    sendToWindow(windowMap.main, 'window-type', 'main');
    setTimeout(() => {
      sendToWindow(windowMap.main, 'openTUILiveKit', basicInfo.userInfo);
    }, 3000);
  } else {
    initMainWindowTimer = setTimeout(() => {
      initMainWindowPage();
    }, 300);
  }
}

function bindMainWindowEvent() {
  windowMap.main?.webContents.on('did-fail-load', () => {
    console.log(`${logPrefix}main window: did-fail-load, reload soon...`);
    setTimeout(() => {
      if (isWindowAlive(windowMap.main)) {
        windowMap.main.reload();
      }
    }, 1000);
  });

  windowMap.main?.webContents.on('did-finish-load', () => {
    console.log(`${logPrefix}main window: did-finish-load`);
    sendToWindow(windowMap.main, 'app-path', app.getAppPath());
    sendToWindow(windowMap.main, 'crash-file-path',`${crashFilePath}|${crashDumpsDir}`);
    if (isWindowAlive(windowMap.main)) {
      sendToWindow(windowMap.main, 'native-window-handle', windowMap.main.getNativeWindowHandle());
    }
    initMainWindowPage();
  });

  windowMap.main?.on('close', (event) => {
    // Let renderer decide whether the app can quit (e.g. stop live before exit)
    console.log(`${logPrefix} windowMap.main close`);
    if (!isQuitting) {
      event.preventDefault();
      // Use the new quit sequence with timeout fallback and retry mechanism
      initiateQuitSequence();
    }
  });

  windowMap.main?.on('closed', () => {
    console.log(`${logPrefix}closed windowMap.main`);
    if (windowMap.child && !windowMap.child.isDestroyed()) {
      windowMap.child.close();
    }
    windowMap.child = null;

    if (windowMap.mainCover && !windowMap.mainCover.isDestroyed()) {
      windowMap.mainCover.close();
    }
    windowMap.mainCover = null;

    if (windowMap.confirm && !windowMap.confirm.isDestroyed()) {
      windowMap.confirm.close();
    }
    windowMap.confirm = null;

    if (initMainWindowTimer) {
      clearTimeout(initMainWindowTimer);
      initMainWindowTimer = null;
    }
    windowMap.main = null;

    unbindIPCMainEvent();
    liveKitEmitter.emit('closed');
  });

  windowMap.main.on('will-move', (event, newBounds) => {
    console.log('Main window will move', newBounds);
    const bounds = {
      x: coverWindowRelativeBounds.x + newBounds.x,
      y: coverWindowRelativeBounds.y + newBounds.y,
      width: coverWindowRelativeBounds.width,
      height: coverWindowRelativeBounds.height,
    };
    if (isWindowAlive(windowMap.mainCover)) {
      windowMap.mainCover.setBounds(bounds);
    }
  });

  windowMap.main.on('will-resize', (event, newBounds, details) => {
    console.log('Main window will resize', newBounds, details);
    const bounds = {
      x: coverWindowRelativeBounds.x + newBounds.x,
      y: coverWindowRelativeBounds.y + newBounds.y,
      width: coverWindowRelativeBounds.width,
      height: coverWindowRelativeBounds.height,
    };
    if (isWindowAlive(windowMap.mainCover)) {
      windowMap.mainCover.setBounds(bounds);
    }
  });
}

function bindChildWindowEvent() {
  windowMap.child?.webContents.on('did-fail-load', () => {
    console.log(`${logPrefix}child window: did-fail-load, reload soon...`);
    setTimeout(() => {
      if (isWindowAlive(windowMap.child)) {
        windowMap.child.reload();
      }
    }, 2000);
  });

  windowMap.child?.webContents.on('did-finish-load', function(){
    console.log(`${logPrefix}child window: did-finish-load`);
    sendToWindow(windowMap.child, 'app-path', app.getAppPath());
    if (isWindowAlive(windowMap.child)) {
      sendToWindow(windowMap.child, 'native-window-handle', windowMap.child.getNativeWindowHandle());
      sendToWindow(windowMap.child, 'window-type', 'child');
    }
    if (isWebContentsAlive(windowMap.child)) {
      windowMap.child.webContents.executeJavaScript('window.location.hash = \'/tui-live-kit-child\';');
    }
  });

  windowMap.child?.on('close', (event) => {
    // In quit flow, allow child window to close naturally.
    if (!isQuitting && isWindowAlive(windowMap.main) && isWindowAlive(windowMap.child)) {
      event.preventDefault();
      windowMap.child.hide();
    }
  });

  windowMap.child?.on('closed', () => {
    if (windowMap.child) {
      windowMap.child = null;
    }
  });

  windowMap.child?.on('will-move', () => {
    console.log('Child window will move');
    if (isWindowAlive(windowMap.mainCover) && windowMap.mainCover.isVisible()) {
      windowMap.mainCover.setIgnoreMouseEvents(false);
    }
  });

  windowMap.child?.on('moved', () => {
    console.log('Child window moved');
    if (isWindowAlive(windowMap.mainCover) && windowMap.mainCover.isVisible()) {
      windowMap.mainCover.setIgnoreMouseEvents(true, { forward: true });
    }
  });
}

function bindCoverWindowEvent() {
  windowMap.mainCover?.webContents.on('did-fail-load', () => {
    console.log(`${logPrefix}child window: did-fail-load, reload soon...`);
    setTimeout(() => {
      if (isWindowAlive(windowMap.mainCover)) {
        windowMap.mainCover.reload();
      }
    }, 2000);
  });

  windowMap.mainCover?.webContents.on('did-finish-load', function(){
    console.log(`${logPrefix}child window: did-finish-load`);
    sendToWindow(windowMap.mainCover, 'app-path', app.getAppPath());
    if (isWindowAlive(windowMap.mainCover)) {
      sendToWindow(windowMap.mainCover, 'native-window-handle', windowMap.mainCover.getNativeWindowHandle());
      sendToWindow(windowMap.mainCover, 'window-type', 'cover');
    }
    if (isWebContentsAlive(windowMap.mainCover)) {
      windowMap.mainCover.webContents.executeJavaScript('window.location.hash = \'/tui-live-kit-cover\';');
    }
  });

  windowMap.mainCover?.on('focus', () => {
    if (lastChildWindowCommand !== '') {
      if (isWindowAlive(windowMap.child)) {
        windowMap.child.show();
      }
    }
  });
}

function bindConfirmWindowEvent() {
  windowMap.confirm?.webContents.on('did-fail-load', () => {
    console.log(`${logPrefix}child window: did-fail-load, reload soon...`);
    setTimeout(() => {
      if (isWindowAlive(windowMap.confirm)) {
        windowMap.confirm.reload();
      }
    }, 2000);
  });

  windowMap.confirm?.webContents.on('did-finish-load', function(){
    console.log(`${logPrefix}child window: did-finish-load`);
    sendToWindow(windowMap.confirm, 'app-path', app.getAppPath());
    if (isWindowAlive(windowMap.confirm)) {
      sendToWindow(windowMap.confirm, 'native-window-handle', windowMap.confirm.getNativeWindowHandle());
      sendToWindow(windowMap.confirm, 'window-type', 'confirm');
    }
    if (isWebContentsAlive(windowMap.confirm)) {
      windowMap.confirm.webContents.executeJavaScript('window.location.hash = \'/tui-live-kit-confirm\';');
    }
  });
}

function openTUILiveKit() {
  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  const winWidth = width - 40;
  const winHeight = height - 40;

  if (!app.isPackaged) {
    console.log(`${logPrefix}Added Extension: installing vue-dev tool...`);
    const {
      default: installExtension,
      VUEJS_DEVTOOLS,
    } = require('electron-devtools-installer');
    installExtension(VUEJS_DEVTOOLS)
      .then((name) => {
        console.log(`${logPrefix}Added Extension:  ${name}`);
        createWindow(winWidth, winHeight);
      })
      .catch((err) => {
        console.error(`${logPrefix}Added Extension failed: `, err);
        createWindow(winWidth, winHeight);
      });
  } else {
    console.log(`${logPrefix}Packaged env, create window without dev-tool extension.`);
    createWindow(winWidth, winHeight);
  }
}

const TUILiveKitMain = {
  open: (args) => {
    if (!isWindowAlive(windowMap.main)) {
      if (args?.userInfo) {
        basicInfo.userInfo = args.userInfo;
      }
      openTUILiveKit();
    }
  },
  close: () => {
    if (isWindowAlive(windowMap.main)) {
      if (isWindowAlive(windowMap.child)) {
        windowMap.child.close();
      }
      windowMap.child = null;
      if (isWindowAlive(windowMap.mainCover)) {
        windowMap.mainCover.close();
      }
      windowMap.mainCover = null;
      windowMap.main.close();
      windowMap.main = null;
    }
  },
  init: (args) => {
    if (args?.userInfo) {
      basicInfo.userInfo = args.userInfo;
      initMainWindowPage();
    } else {
      console.error(`${logPrefix}init() invalid parameter`);
    }
  },
  on(eventName, listener) {
    liveKitEmitter.on(eventName, listener);
  },
  off(eventName, listener) {
    liveKitEmitter.off(eventName, listener);
  }
}

exports.TUILiveKitMain = TUILiveKitMain;
exports.default = TUILiveKitMain;
