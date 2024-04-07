const {
  app,
  BrowserWindow,
  systemPreferences,
  crashReporter,
  ipcMain,
  // screen,
} = require("electron");
const path = require("path");

// 开启crash捕获
crashReporter.start({
  productName: "tui-live-kit-electron",
  companyName: "Tencent Cloud",
  submitURL: "https://www.xxx.com",
  uploadToServer: false,
  ignoreSystemCrashHandler: false,
});

// 开启crash捕获
let crashFilePath = "";
let crashDumpsDir = "";
try {
  // electron 低版本
  crashFilePath = path.join(app.getPath("temp"), app.getName() + " Crashes");
  console.log("————————crash path:", crashFilePath);

  // electron 高版本
  crashDumpsDir = app.getPath("crashDumps");
  console.log("————————crashDumpsDir:", crashDumpsDir);
} catch (e) {
  console.error("获取奔溃文件路径失败", e);
}

async function checkAndApplyDeviceAccessPrivilege() {
  if (process.platform === "darwin" || process.platform === 'win32') {
    try {
      const cameraPrivilege = systemPreferences.getMediaAccessStatus("camera");
      console.log(
        `checkAndApplyDeviceAccessPrivilege before apply cameraPrivilege: ${cameraPrivilege}`
      );
      if (cameraPrivilege !== "granted") {
        await systemPreferences.askForMediaAccess("camera");
      }
  
      const micPrivilege = systemPreferences.getMediaAccessStatus("microphone");
      console.log(
        `checkAndApplyDeviceAccessPrivilege before apply micPrivilege: ${micPrivilege}`
      );
      if (micPrivilege !== "granted") {
        await systemPreferences.askForMediaAccess("microphone");
      }
  
      const screenPrivilege = systemPreferences.getMediaAccessStatus("screen");
      console.log(
        `checkAndApplyDeviceAccessPrivilege before apply screenPrivilege: ${screenPrivilege}`
      );
    } catch(err) {
      console.warn("checkAndApplyDeviceAccessPrivilege error:", err)
    }
  } else {
    // Electron API getMediaAccessStatus/askForMediaAccess does not support on Linux.
  }
}

const windowMap = {
  main: null,
  child: null
}

async function createWindow(width = 1366, height = 668) {
  await checkAndApplyDeviceAccessPrivilege();

  windowMap.main = new BrowserWindow({
    width,
    height,
    minWidth: 1200,
    minHeight: 500,
    frame: false,
    acceptFirstMouse: true, // only mac
    webPreferences: {
      preload: path.join(__dirname, "electron.preload.js"),
      nodeIntegration: true,
      contextIsolation: false,
      nodeIntegrationInWorker: true,
    },
  });
  windowMap.child = new BrowserWindow({
    show: false,
    width: 600,
    height: 790,
    // parent: windowMap.main, // To do: 父子窗口在 Windows 和 Mac 上一致，暂时注释掉，后续确定不可行时，再删除。
    frame: false,
    acceptFirstMouse: true, // only mac
    skitTaskbar: true,
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      nodeIntegrationInWorker: true,
      contextIsolation: false,
      preload: path.join(__dirname, "electron.preload.js"),
    },
  });

  bindIPCEvent();
  bindMainWindowEvent();
  bindChildWindowEvent();  

  if (app.isPackaged) {
    windowMap.main.loadFile("dist/index.html");
    windowMap.child.loadFile("dist/index.html");
  } else {
    windowMap.child.loadURL("http://localhost:8080");
    windowMap.main.loadURL("http://localhost:8080");
  }
}

function bindIPCEvent() {
  ipcMain.handle("app-path", () => {
    return app.getAppPath();
  });

  ipcMain.handle("window-type", (event) => {
    if (event.sender === windowMap.main.webContents) {
      return 'main';
    } else if (event.sender === windowMap.child.webContents) {
      return 'child';
    } else {
      return '';
    }
  });
  
  ipcMain.on("on-minimize-window", () => {
    console.log("on-minimize-window event");
    windowMap.main.minimize();
  });

  ipcMain.on("on-maximize-window", (evt, flag) => {
    console.log("on-maximize-window event:", flag);
    if (flag) {
      windowMap.main.maximize();
    } else {
      windowMap.main.unmaximize();
    }
  });

  ipcMain.on("on-close-window", () => {
    console.log("on-close-window event");
    windowMap.child.close();
    windowMap.main.close();
  });

  ipcMain.on("open-child", (event, args) => {
    console.log("on open-child", args);
    windowMap.child.webContents.send("show", args);

    const [width, height] = windowMap.main.getSize();
    switch (args.command) {
    case 'camera':
      windowMap.child.setSize(600, 790, true);
      windowMap.child.setContentSize(600, 790, true);
      break;
    case 'image':
      windowMap.child.setSize(600, 500, true);
      windowMap.child.setContentSize(600, 500, true);
      break;
    case 'screen':
      windowMap.child.setSize(width - 150, height - 80, true);
      windowMap.child.setContentSize(width -150, height - 80, true);
      break;
    case 'voice-chat':
    case 'setting':
      windowMap.child.setSize(600, 560, true);
      windowMap.child.setContentSize(600, 560, true);
      break;
    default:
      break;
    }
    windowMap.child.center();
    windowMap.child.show();
  })

  ipcMain.on("close-child", () => {
    windowMap.child.hide();
  })

  ipcMain.on("login", (event) => {
    if (event.sender === windowMap.main.webContents) {
      windowMap.child.webContents.send("login", { from: 'main' });
    } else {
      windowMap.main.webContents.send("login", { from: 'child' });
    }
  })

  ipcMain.on("port-to-child", (event) => {
    const port = event.ports[0];
    console.log("port-to-child", port);
    windowMap.child.webContents.postMessage("port-to-child", null, [port]);
  })
}

function bindMainWindowEvent() {
  windowMap.main.webContents.on("did-fail-load", () => {
    console.log(`main window: did-fail-load, reload soon...`);
    setTimeout(() => {
      windowMap.main.reload();
    }, 1000);
  });

  windowMap.main.webContents.on("did-finish-load", () => {
    windowMap.main.webContents.send("app-path", app.getAppPath());
    windowMap.main.webContents.send("crash-file-path",`${crashFilePath}|${crashDumpsDir}`);
    windowMap.main.webContents.send("native-window-handle", windowMap.main.getNativeWindowHandle());
    windowMap.main.webContents.send("window-type", "main");
  });
}

function bindChildWindowEvent() {
  windowMap.child.webContents.on("did-fail-load", () => {
    console.log(`child window: did-fail-load, reload soon...`);
    setTimeout(() => {
      windowMap.child.reload();
    }, 2000);
  });

  windowMap.child.webContents.on('did-finish-load', function(){
    console.log('child did-finish-load');
    windowMap.child.webContents.send("app-path", app.getAppPath());
    windowMap.child.webContents.send("native-window-handle", windowMap.child.getNativeWindowHandle());
    windowMap.child.webContents.send("window-type", "child");
  });
}

app.whenReady().then(() => {
  const { screen } = require("electron");
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  const winWidth = width - 40;
  const winHeight = height - 40;

  if (!app.isPackaged) {
    console.log("Added Extension: installing vue-dev tool...");
    const {
      default: installExtension,
      VUEJS_DEVTOOLS,
    } = require("electron-devtools-installer");
    installExtension(VUEJS_DEVTOOLS)
      .then((name) => {
        console.log(`Added Extension:  ${name}`);
        createWindow(winWidth, winHeight);
      })
      .catch((err) => {
        console.error("Added Extension failed: ", err);
        createWindow(winWidth, winHeight);
      });
  } else {
    console.log("Packaged env, create window without dev-tool extension.");
    createWindow(winWidth, winHeight);
  }
});

// 当全部窗口关闭时退出。
app.on("window-all-closed", () => {
  // 在 macOS 上，除非用户用 Cmd + Q 确定地退出，
  // 否则绝大部分应用及其菜单栏会保持激活。
  if (process.platform !== "darwin") {
    app.quit();
  }
  process.exit(0);
});

app.on("activate", () => {
  // 在 macOS 上，当点击 dock 图标并且该应用没有打开的窗口时，
  // 绝大部分应用会重新创建一个窗口。
  if (windowMap.main === null) {
    createWindow();
  }
});

ipcMain.on('app-exit', () => {
  windowMap.child?.close();
  windowMap.main?.close();
  app.exit();
})