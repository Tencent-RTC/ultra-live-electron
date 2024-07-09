English | [简体中文](README.zh-CN.md)

# ultra-live-electron

This project is a desktop/laptop live streaming tool, based on [Tencent Real-Timing Communication(TRTC)](https://intl.cloud.tencent.com/products/trtc), allowing you to quickly start online live streaming.

## Prerequirement

- OS supported: Windows 10+.
- Device need: camera, microphone and speaker.

## Getting started

### Step 1: Create application
1. Go to the [Application management](https://console.trtc.io/app) page in the TRTC console, select **Create Application**, enter an application name such as `TUIKitDemo`, and click **Confirm**.
2. Click **Application Information** on the right of the application, note the `SDKAppID` and key:
   - `SDKAppID`: A number in parentheses after 'TUIKitDemo'.
   - `SDKSecretKey`: Click **Copy SDKSecretKey**.

### Step 2: Clone the code and run in development mode
1. Clone the repository
```
git clone https://github.com/Tencent-RTC/ultra-live-electron.git

cd ultra-live-electron
```

2. Open `src/config/basic-info-config.js` and fill in `SDKAppID` and `SDKSecretKey`.

3. Run in development mode
```
npm install

npm run start
```

### Step 3: Compiles and build for production
The built installation package is in the `release` directory.
```
npm run pack:win64
```

## Learn more about TUI-LiveKit-Electron and TRTC
1. [Our web site](https://trtc.io/)
2. [Online API document](https://trtc.io/document)
3. [Github for phone](https://github.com/Tencent-RTC/TUILiveKit)
