English | [简体中文](README.zh-CN.md)

# ultra-live-electron

This project is a desktop/laptop live streaming tool, based on [Tencent Real-Timing Communication(TRTC)](https://intl.cloud.tencent.com/products/trtc), allowing you to quickly start online live streaming.

## Prerequirement

- OS supported: Windows 10+.
- Devices: camera, microphone and speaker.
- Running tool: Node.js 18.0.0+.

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

2. Login Preparation
- Option 1: Open `src/debug/basic-info-config.js` file, fill in your `SDKAppID` and `SDKSecretKey`. The system will automatically login upon startup. **​​Note: This option is only for quick testing. Don't use in production environments​​.**
- Option 2: Log in via the login page.
  - `Account Login`: This method requires you to configure your own server-side login URL in the code and is not recommended for initial experience. You need to configure your own server login URL in the `src/views/Login/Index.vue` file to use this method (**​​This is the best and most secure practice for production environments, where `userSig` is generated on your server using `SDKAppID` and `SDKSecretKey` for login​**​).
  - `SecretKey Login`: Use `SDKAppID` and `SDKSecretKey` to login directly. **​​Note: This option is only for quick testing. Don't use in production environments​​.**
  - `UserSig Login`: Login with `SDKAppID` and user signature `userSig`. The user signature can be generated via the [Tencent Cloud Console](https://console.trtc.io/usersig). **​​Note: This option is only for quick testing. Don't use in production environments​​.**

3. Run in development mode
```
npm install

npm run start
```

3. Login to explore and experience

To help you quickly experience, we provide 3 login methods. For first-time experience, we recommend using the `SecretKey Login` method.

- `SecretKey Login`: Use `SDKAppID` and `SDKSecretKey` to login directly. The fastest way to get started.
- `UserSig Login`: Login with `SDKAppID` and user signature `userSig`. The user signature can be generated via the [Tencent Cloud Console](https://console.trtc.io/usersig).
- `Password Login`: This method requires you to configure your own server-side login URL in the code and is not recommended for initial experience. You need to configure your own server login URL in the `src/views/Login/Index.vue` file to use this method (**​​This is the best and most secure practice for production environments, where `userSig` is generated on your server using `SDKAppID` and `SDKSecretKey` for login​**​).


### Step 3: Compiles and build for production
The built installation package is in the `release` directory.
```
npm run pack:win64
```

## Learn more about TUI-LiveKit-Electron and TRTC
1. [Our web site](https://trtc.io/)
2. [Online API document](https://trtc.io/document)
