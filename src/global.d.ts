export {}

declare global {
  interface Window {
    nativeWindowHandle: Uint8Array;
    ipcRenderer: any;
    mainWindowPortInChild: MessagePort | null;
    mainWindowPortInCover: MessagePort | null;
    path: any;
    process: any;
    ROOT_PATH: string;
    PUBLIC_PATH: string;
    APP_PATH: string;
    TencentCaptcha: any;
  }
}
