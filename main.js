const { app, ipcMain, globalShortcut, Menu } = require('electron');
const { TUILiveKitMain } = require('./TUILiveKit.main');

function quitApplication() {
  console.log('quit application');
  if (process.platform !== 'darwin') {
    app.quit();
  }
  process.exit(0);
}

ipcMain.on('openTUILiveKit', (event, args) => {
  console.log('[main.js]openTUILiveKit:', args);
  TUILiveKitMain.init(args);
  TUILiveKitMain.on('closed', quitApplication);
});

function registerDisableRefreshShortcuts() {
  const shortcuts = [
    'CommandOrControl+R',
    'CommandOrControl+Shift+R',
    'F5',
  ];
  shortcuts.forEach((shortcut) => {
    const ok = globalShortcut.register(shortcut, () => {
      console.log(`[main.js]blocked refresh shortcut: ${shortcut}`);
    });
    if (!ok) {
      console.warn(`[main.js]failed to register shortcut: ${shortcut}`);
    }
  });
}

function setupApplicationMenuWithoutReload() {
  const template = [];

  if (process.platform === 'darwin') {
    template.push({
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    });
  }

  template.push(
    { role: 'editMenu' },
    {
      label: 'View',
      submenu: [
        // Intentionally keep zoom/fullscreen/devtools, but remove reload/forceReload.
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'toggleDevTools' },
        { role: 'togglefullscreen' },
      ],
    },
    { role: 'windowMenu' }
  );

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(() => {
  registerDisableRefreshShortcuts();
  setupApplicationMenuWithoutReload();
  TUILiveKitMain.open();
});

app.on('window-all-closed', () => {
  quitApplication();
});

app.on('activate', () => {
  TUILiveKitMain.open();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
