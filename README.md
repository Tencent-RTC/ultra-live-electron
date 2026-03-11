English | [简体中文](README.zh-CN.md)

# ultra-live-electron

This project is a desktop/laptop live streaming tool, based on [Tencent Real-Timing Communication(TRTC)](https://intl.cloud.tencent.com/products/trtc), allowing you to quickly start online live streaming.

## Prerequirement

- OS supported: Windows 10+, macOS (Intel / Apple Silicon).
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
```bash
git clone https://github.com/Tencent-RTC/ultra-live-electron.git

cd ultra-live-electron
```

2. Login preparation
- Option 1: Open `src/debug/basic-info-config.js` file, fill in your `SDKAppID` and `SDKSecretKey`. The system will automatically login upon startup. **Note: This option is only for quick testing. Don't use in production environments.**
- Option 2: Log in via the login page.
  - `Account Login`: This method requires you to configure your own server-side login URL in the code and is not recommended for initial experience. You need to configure your own server login URL in the `src/views/Login/Index.vue` file to use this method (**This is the best and most secure practice for production environments, where `userSig` is generated on your server using `SDKAppID` and `SDKSecretKey` for login**).
  - `SecretKey Login`: Use `SDKAppID` and `SDKSecretKey` to login directly. **Note: This option is only for quick testing. Don't use in production environments.**
  - `UserSig Login`: Login with `SDKAppID` and user signature `userSig`. The user signature can be generated via the [Tencent Cloud Console](https://console.trtc.io/usersig). **Note: This option is only for quick testing. Don't use in production environments.**

3. Install dependencies and start app (recommended default)
```bash
npm install
npm run start
```

`npm run start` does **not** start `upload-server` by default.
If you want one-command startup with upload-server, run `npm run start:with-upload-server`.

### Step 2.1 (Optional): Integrate upload-server for cover upload

1. Prepare environment file
```bash
cp upload-server/.env.example upload-server/.env
```

2. Configure one provider in `upload-server/.env`
- `STORAGE_PROVIDER=cos`: set `COS_SECRET_ID`, `COS_SECRET_KEY`, `COS_BUCKET`, `COS_REGION`
- `STORAGE_PROVIDER=custom`: set `CUSTOM_UPLOAD_URL` and related fields

3. Install and run upload-server
```bash
npm run upload-server:bootstrap
npm run upload-server:standalone
```

`upload-server` is an independent Node project. On a fresh environment, you must run
`npm run upload-server:bootstrap` at least once before starting it.

4. Verify service
- `http://127.0.0.1:3071/api/test`
- `http://127.0.0.1:3071/api/upload/config`

If upload-server is unavailable or provider is not configured, UI falls back to manual cover URL input.

5. Configure renderer upload API base URL (`VUE_APP_UPLOAD_SERVER_BASE_URL`)

By default, renderer requests `http://127.0.0.1:3071`.
If your upload service is deployed remotely, set `VUE_APP_UPLOAD_SERVER_BASE_URL`:
`VUE_APP_UPLOAD_SERVER_BASE_URL` should be protocol + domain only (without trailing slash or path),
for example: `https://upload.example.com`.

- One-time for local start:
```bash
VUE_APP_UPLOAD_SERVER_BASE_URL=https://your-upload-domain npm run start
```

- One-time for build:
```bash
VUE_APP_UPLOAD_SERVER_BASE_URL=https://your-upload-domain npm run build
```

- Persistent mode-based config (recommended):
  - Add `VUE_APP_UPLOAD_SERVER_BASE_URL=...` in `.env.outer` / `.env.oversea`
  - Use `--mode outer` / `--mode oversea` when running `serve` or `build`

### Step 3: Build installation package

The built package is in the `release` directory.

Windows:
```bash
npm run pack:win64
```

Mac:
```bash
npm run pack:mac-x64
```

## Advanced customization

For advanced component customization guidance, refer to the Web-side document first:

- [Web advanced customization](https://trtc.io/document/74036?product=live&menulabel=uikit&platform=vue)

Electron customization follows a similar approach:

1. Reference component source code:
   - Electron atomic source:
     - [tuikit-atomicx-vue3-electron](https://github.com/Tencent-RTC/TUIKit_Vue3/tree/main/packages/tuikit-atomicx-vue3-electron)
   - Web reference source:
     - [tuikit-atomicx-vue3](https://github.com/Tencent-RTC/TUIKit_Vue3/tree/main/packages/tuikit-atomicx-vue3)
2. Rewrite the target component in your own project instead of editing `node_modules` directly.
3. Migrate state API imports from local relative paths to npm package imports.

Example:

```ts
// before
import { useLiveAudienceState } from '../states/LiveAudienceState'

// after
import { useLiveAudienceState } from 'tuikit-atomicx-vue3-electron'
```

Note:
- use the GitHub source implementation as reference.
- Keep your custom component props/events contracts compatible to reduce upgrade cost.

```

## Learn more about TUI-LiveKit-Electron and TRTC
1. [Our web site](https://trtc.io/)
2. [Online API document](https://trtc.io/document)
