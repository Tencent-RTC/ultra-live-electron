const logger = console;

export function getUrlParam(key: string) {
  const url = window?.location.href.replace(/^[^?]*\?/, '');
  const regexp = new RegExp(`(^|&)${key}=([^&#]*)(&|$|)`, 'i');
  const paramMatch = url?.match(regexp);
  
  return paramMatch ? paramMatch[2] : null;
}

export async function isMainWindow() {
  if (location.hash.indexOf('tui-live-kit-main') !== -1) {
    true;
  } else {
    try {
      const windowType = await getWindowType();
      return windowType === 'main';
    } catch (err) {
      logger.warn('isMainWindow error:', err);
      return false;
    }
  }
}

export async function getWindowType(): Promise<string> {
  return await window.ipcRenderer.invoke("window-type");
}

export async function getAppPath() {
  if (!(window as any).APP_PATH) {
    console.log("[util]getAppPath from main process ...");
    const appPath = await window.ipcRenderer.invoke("app-path");
    if (appPath) {
      (window as any).APP_PATH = appPath;
      logger.log("[util]getAppPath from main process success");
    } else {
      logger.error("[util]getAppPath from main process success");
      const errorMessage = "query APP_PATH failed";
      logger.error("[util]getAppPath:", errorMessage);
      throw new Error(errorMessage);
    }
  }
  return (window as any).APP_PATH;
}
