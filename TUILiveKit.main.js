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
    height: 650 || height,
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
    width: 360,
    height: 180,
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

  ipcMain.handle('window-type', (event) => {
    if (event.sender === windowMap.main?.webContents) {
      return 'main';
    } else if (event.sender === windowMap.child?.webContents) {
      return 'child';
    } else if (event.sender === windowMap.mainCover?.webContents) {
      return 'cover'
    } else {
      return '';
    }
  });

  ipcMain.on('on-minimize-window', () => {
    console.log(`${logPrefix}on-minimize-window event`);
    windowMap.main?.minimize();
  });

  ipcMain.on('on-maximize-window', (evt, flag) => {
    console.log(`${logPrefix}on-maximize-window event:`, flag);
    if (flag) {
      windowMap.main?.maximize();
    } else {
      windowMap.main?.unmaximize();
    }
  });

  ipcMain.on('on-close-window', () => {
    console.log(`${logPrefix}on-close-window event`);
    windowMap.mainCover?.close();
    windowMap.mainCover = null;
    windowMap.confirm?.close();
    windowMap.confirm = null;
    windowMap.main?.close();
    windowMap.main = null;
    windowMap.child?.close();
    windowMap.child = null;
  });

  ipcMain.on('open-child', (event, args) => {
    console.log(`${logPrefix}on open-child`, args);
    if(lastChildWindowCommand === args.command) {
      windowMap.child?.show();
      return;
    }
    lastChildWindowCommand = args.command;
    const [width, height] = windowMap.main?.getSize();
    switch (args.command) {
    case 'camera':
      windowMap.child?.setSize(600, 650, true);
      windowMap.child?.setContentSize(600, 650, true);
      break;
    case 'image':
      windowMap.child?.setSize(600, 500, true);
      windowMap.child?.setContentSize(600, 500, true);
      break;
    case 'screen':
      windowMap.child?.setSize(width - 150, height - 80, true);
      windowMap.child?.setContentSize(width -150, height - 80, true);
      break;
    case 'connection':
    case 'add-bgm':
    case 'reverb-voice':
    case 'change-voice':
    case 'setting':
    case 'phone-mirror':
      windowMap.child?.setSize(600, 560, true);
      windowMap.child?.setContentSize(600, 560, true);
      break;
    case 'online-video':
    case 'video-file':
      windowMap.child?.setSize(600, 360, true);
      windowMap.child?.setContentSize(600, 360, true);
      break;
    default:
      break;
    }
    windowMap.child?.center();
    windowMap.child?.show();
    windowMap.child?.webContents.send('show', args);
  });

  ipcMain.on('close-child', () => {
    lastChildWindowCommand = '';
    windowMap.child?.hide();
  });

  ipcMain.on('user-login', (event) => {
    if (event.sender === windowMap.main?.webContents) {
      windowMap.child?.webContents.send('user-login', { from: 'main', to: 'child' });
      windowMap.mainCover?.webContents.send('user-login', { from: 'main', to: 'cover' });
      windowMap.confirm?.webContents.send('user-login', { from: 'main', to: 'confirm' });
    } else if (event.sender === windowMap.child?.webContents) {
      windowMap.main?.webContents.send('user-login', { from: 'child', to: 'main' });
      windowMap.mainCover?.webContents.send('user-login', { from: 'child', to: 'cover' });
      windowMap.confirm?.webContents.send('user-login', { from: 'child', to: 'confirm' });
    } else if (event.sender === windowMap.mainCover?.webContents)  {
      windowMap.main?.webContents.send('user-login', { from: 'cover', to: 'main' });
      windowMap.child?.webContents.send('user-login', { from: 'cover', to: 'child' });
      windowMap.confirm?.webContents.send('user-login', { from: 'cover', to: 'confirm' });
    } else if (event.sender === windowMap.confirm?.webContents)  {
      windowMap.main?.webContents.send('user-login', { from: 'confirm', to: 'main' });
      windowMap.child?.webContents.send('user-login', { from: 'confirm', to: 'child' });
      windowMap.mainCover?.webContents.send('user-login', { from: 'confirm', to: 'cover' });
    } else {
      console.warn(`${logPrefix} unkonwn event source:`, event);
    }
  });

  ipcMain.on('user-logout', (event) => {
    if (event.sender === windowMap.main?.webContents) {
      windowMap.child?.webContents.send('user-logout', { from: 'main' });
    } else {
      windowMap.main?.webContents.send('user-logout', { from: 'child' });
    }
    windowMap.child?.hide();
    windowMap.mainCover?.hide();
  });

  ipcMain.on('port-to-child', (event) => {
    const port = event.ports[0];
    console.log('port-to-child', port);
    windowMap.child?.webContents.postMessage('port-to-child', null, [port]);
  });

  ipcMain.on('port-to-cover', (event) => {
    const port = event.ports[0];
    console.log('port-to-cover', port);
    windowMap.mainCover?.webContents.postMessage('port-to-cover', null, [port]);
  });

  ipcMain.on('set-language', (event, args) => {
    console.log(`${logPrefix}set-language`, args);
    language = args;
  });

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
    const win = BrowserWindow.fromWebContents(event.sender)
    win.setIgnoreMouseEvents(ignore, options); // windowMap.mainCover
  });

  ipcMain.on('stream-layout-area', (event, args) => {
    console.log('stream-layout-area', args);
    const { top, left, width, height } = args;
    coverWindowRelativeBounds.x = Math.round(left);
    coverWindowRelativeBounds.y = Math.round(top);
    coverWindowRelativeBounds.width = Math.round(width);
    coverWindowRelativeBounds.height = Math.round(height);

    const mainBounds = windowMap.main.getContentBounds();
    console.log('stream-layout-area main window mainBounds', mainBounds, windowMap.main.getBounds());
    windowMap.mainCover?.setBounds({
      x: coverWindowRelativeBounds.x + mainBounds.x,
      y: coverWindowRelativeBounds.y + mainBounds.y,
      width: coverWindowRelativeBounds.width,
      height: coverWindowRelativeBounds.height,
    });
    console.log('stream-layout-area finished');
  });

  ipcMain.on('stream-layout', (event, args) => {
    console.log('stream-layout', args);
    if (args?.layoutMode === 'Custom') {
      if (windowMap.main.isVisible() && !windowMap.mainCover.isVisible()) {
        windowMap.mainCover?.show();
        if (lastChildWindowCommand === 'connection') {
          windowMap.child.show();
        }
      }
    } else {
      windowMap.mainCover?.hide();
    }
  });

  ipcMain.on('stop-living', (event, args) => {
    windowMap.confirm?.webContents.send('stop-living', args);
    windowMap.confirm?.show();
  });
  ipcMain.on('stop-living-result', (event, args) => {
    windowMap.confirm?.hide();
    windowMap.main?.webContents.send('stop-living-result', args);
  });
}

function unbindIPCMainEvent() {
  ipcMain.removeHandler('app-path');
  ipcMain.removeHandler('window-type');
  ipcMain.removeAllListeners('on-minimize-window');
  ipcMain.removeAllListeners('on-maximize-window');
  ipcMain.removeAllListeners('on-close-window');
  ipcMain.removeAllListeners('open-child');
  ipcMain.removeAllListeners('close-child');
  ipcMain.removeAllListeners('login');
  ipcMain.removeAllListeners('port-to-child');
  ipcMain.removeAllListeners('set-language');
  ipcMain.removeAllListeners('show-context-menu');
  ipcMain.removeAllListeners('start-use-driver-installer');
}

let initMainWindowTimer = null;
function initMainWindowPage() {
  if (initMainWindowTimer) {
    clearTimeout(initMainWindowTimer);
    initMainWindowTimer = null;
  }
  console.log(`${logPrefix}main window: initMainWindowPage`);
  if (basicInfo.userInfo) {
    windowMap.main?.webContents.send('window-type', 'main');
    setTimeout(() => {
      windowMap.main?.webContents.send('openTUILiveKit', basicInfo.userInfo);
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
      windowMap.main?.reload();
    }, 1000);
  });

  windowMap.main?.webContents.on('did-finish-load', () => {
    console.log(`${logPrefix}main window: did-finish-load`);
    windowMap.main?.webContents.send('app-path', app.getAppPath());
    windowMap.main?.webContents.send('crash-file-path',`${crashFilePath}|${crashDumpsDir}`);
    windowMap.main?.webContents.send('native-window-handle', windowMap.main?.getNativeWindowHandle());
    initMainWindowPage();
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
    windowMap.mainCover?.setBounds(bounds);
  });

  windowMap.main.on('will-resize', (event, newBounds, details) => {
    console.log('Main window will resize', newBounds, details);
    const bounds = {
      x: coverWindowRelativeBounds.x + newBounds.x,
      y: coverWindowRelativeBounds.y + newBounds.y,
      width: coverWindowRelativeBounds.width,
      height: coverWindowRelativeBounds.height,
    };
    windowMap.mainCover?.setBounds(bounds);
  });
}

function bindChildWindowEvent() {
  windowMap.child?.webContents.on('did-fail-load', () => {
    console.log(`${logPrefix}child window: did-fail-load, reload soon...`);
    setTimeout(() => {
      windowMap.child?.reload();
    }, 2000);
  });

  windowMap.child?.webContents.on('did-finish-load', function(){
    console.log(`${logPrefix}child window: did-finish-load`);
    windowMap.child?.webContents.executeJavaScript('window.location.hash = \'/tui-live-kit-child\';');
    windowMap.child?.webContents.send('app-path', app.getAppPath());
    windowMap.child?.webContents.send('native-window-handle', windowMap.child?.getNativeWindowHandle());
    windowMap.child?.webContents.send('window-type', 'child');
  });

  windowMap.child?.on('close', (event) => {
    if (windowMap.main) {
      event.preventDefault();
      windowMap.child?.hide();
    }
  });

  windowMap.child?.on('closed', () => {
    if (windowMap.child) {
      windowMap.child = null;
    }
  });

  windowMap.child?.on('will-move', () => {
    console.log('Child window will move');
    if (windowMap.mainCover?.isVisible()) {
      windowMap.mainCover?.setIgnoreMouseEvents(false);
    }
  });

  windowMap.child?.on('moved', () => {
    console.log('Child window moved');
    if (windowMap.mainCover?.isVisible()) {
      windowMap.mainCover?.setIgnoreMouseEvents(true, { forward: true });
    }
  });
}

function bindCoverWindowEvent() {
  windowMap.mainCover?.webContents.on('did-fail-load', () => {
    console.log(`${logPrefix}child window: did-fail-load, reload soon...`);
    setTimeout(() => {
      windowMap.mainCover?.reload();
    }, 2000);
  });

  windowMap.mainCover?.webContents.on('did-finish-load', function(){
    console.log(`${logPrefix}child window: did-finish-load`);
    windowMap.mainCover?.webContents.executeJavaScript('window.location.hash = \'/tui-live-kit-cover\';');
    windowMap.mainCover?.webContents.send('app-path', app.getAppPath());
    windowMap.mainCover?.webContents.send('native-window-handle', windowMap.mainCover?.getNativeWindowHandle());
    windowMap.mainCover?.webContents.send('window-type', 'cover');
  });

  windowMap.mainCover?.on('focus', () => {
    if (lastChildWindowCommand !== '') {
      windowMap.child?.show();
    }
  });
}

function bindConfirmWindowEvent() {
  windowMap.confirm?.webContents.on('did-fail-load', () => {
    console.log(`${logPrefix}child window: did-fail-load, reload soon...`);
    setTimeout(() => {
      windowMap.mainCover?.reload();
    }, 2000);
  });

  windowMap.confirm?.webContents.on('did-finish-load', function(){
    console.log(`${logPrefix}child window: did-finish-load`);
    windowMap.confirm?.webContents.executeJavaScript('window.location.hash = \'/tui-live-kit-confirm\';');
    windowMap.confirm?.webContents.send('app-path', app.getAppPath());
    windowMap.confirm?.webContents.send('native-window-handle', windowMap.confirm?.getNativeWindowHandle());
    windowMap.confirm?.webContents.send('window-type', 'confirm');
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
    if (windowMap.main === null) {
      if (args?.userInfo) {
        basicInfo.userInfo = args.userInfo;
      }
      openTUILiveKit();
    }
  },
  close: () => {
    if (windowMap.main) {
      windowMap.child?.close();
      windowMap.child = null;
      windowMap.mainCover?.close();
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
