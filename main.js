const { app, ipcMain } = require("electron");
const { TUILiveKitMain } = require("./TUILiveKit.main");

ipcMain.on("openTUILiveKit", (event, args) => {
  console.log(`[main.js]openTUILiveKit:`, args);
  TUILiveKitMain.init(args);
});

app.whenReady().then(() => {
  TUILiveKitMain.open();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
  process.exit(0);
});

app.on("activate", () => {
  TUILiveKitMain.open();
});