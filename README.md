English | [简体中文](README.zh-CN.md)

# ultra-live-electron

This project is a desktop/laptop live streaming tool, based on [Tencent Real-Timing Communication(TRTC)](https://intl.cloud.tencent.com/products/trtc), allowing you to quickly start online live streaming.

## Prerequirement

- OS supported: Windows 10+.
- Devices: camera, microphone and speaker.

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

2. Run in development mode
```
npm install

npm run start
```

3. Login to explore and experience

There are 3 login types provided. For first and quick start, you can login with `SDKAppID` and `SDKSecretKey`.

- `SecretKey Login`: used for quick start, login with `SDKAppID` and `SDKSecretKey`.
- `UserSig Login`: used for quick start, login with `SDKAppID` and `userSig`, which can be generated from [Tencent Cloud Console](https://console.cloud.tencent.com/trtc/usersigtool).
- `Password Login`: Not fully implemented, you need to add you login REST API URL in `src/views/Login/Index.vue` to complete it. **This is the best and security way for production, that generates `userSig` with `SDKAppID` and `SDKSecretKey` on your server side.**


### Step 3: Compiles and build for production
The built installation package is in the `release` directory.
```
npm run pack:win64
```

## Learn more about TUI-LiveKit-Electron and TRTC
1. [Our web site](https://trtc.io/)
2. [Online API document](https://trtc.io/document)
