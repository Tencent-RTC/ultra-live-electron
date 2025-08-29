const { app, ipcMain } = require('electron');
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

app.whenReady().then(() => {
  TUILiveKitMain.open();
});

app.on('window-all-closed', () => {
  quitApplication();
});

app.on('activate', () => {
  TUILiveKitMain.open();
});