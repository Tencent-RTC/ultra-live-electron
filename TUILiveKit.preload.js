const logPrefix = "[TUILiveKit.preload]";
console.log(`${logPrefix} node version: ${process.versions.node}`);
console.log(`${logPrefix} chrome version: ${process.versions.chrome}`);
console.log(`${logPrefix} electron version: ${process.versions.electron}`);
console.log(`${logPrefix} process.cwd(): ${process.cwd()}`);
console.log(`${logPrefix} __dirname: ${__dirname}`);
console.log(`${logPrefix} env.NODE_ENV: ${process.env.NODE_ENV}`);

const { ipcRenderer } = require("electron");
const path = require("path");

// 打印来自主进程的奔溃 dump 文件存放目录
ipcRenderer.on("crash-file-path", (event, args) => {
  console.warn(`${logPrefix} crash-file-path:`, args);
});

ipcRenderer.on("native-window-handle", (event, args) => {
  console.log(`${logPrefix} native window id:`, args);
  window.nativeWindowHandle = args;
});

ipcRenderer.on('login', (event, { from }) => {
  console.log(`${logPrefix} login from:${from} window`);
  if (from === 'main') {
    if (window.location.hash.indexOf('tui-live-kit-child') === -1) {
      window.location.hash = 'tui-live-kit-child';
    }
  } else {
    // from === 'child'
    if (window.location.hash.indexOf('tui-live-kit-main') === -1) {
      window.location.hash = 'tui-live-kit-main';
    }
  }
});

ipcRenderer.on('port-to-child', (event) => {
  window.mainWindowPort = event.ports[0];
  console.log(`${logPrefix} port-to-child window:`, window.mainWindowPort);
});

window.ipcRenderer = ipcRenderer;

window.path = path;
window.ROOT_PATH = path.join(__dirname, "../");
window.PUBLIC_PATH = path.join(__dirname);
ipcRenderer.on("app-path", (event, appPath) => {
  console.warn("APP_PATH:", appPath);
  window.APP_PATH = appPath;
});
