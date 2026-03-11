[English](README.md) | 简体中文

# ultra-live-electron

本工程是一个桌面端直播推流工具，基于[腾讯云实时音视频技术](https://cloud.tencent.com/document/product/647)，快速开启在线直播。

## 前置依赖

- 操作系统要求：Windows 10+、macOS（Intel / Apple Silicon）。
- 设备要求：需要有摄像头、扬声器、麦克风设备。
- 运行环境：Node.js 18.0.0+。

## 跑通代码

### 第一步：创建应用

1. 一键进入腾讯云实时音视频控制台的[应用管理](https://console.trtc.io/app)界面，选择创建应用，输入应用名称，例如 `TUIKitDemo`，单击 **创建**。
2. 点击对应应用条目后**应用信息**，记录 SDKAppID 和密钥：
   - `SDKAppID`：`TUIKitDemo` 后括号里的一串数字。
   - `SDKSecretKey`：点击 **复制SDKSecretKey** 即可。

### 第二步：克隆代码并以开发模式运行

1. 克隆代码
```bash
git clone https://github.com/Tencent-RTC/ultra-live-electron.git

cd ultra-live-electron
```

2. 登录准备
- 方式一：打开 `src/debug/basic-info-config.js` 文件，填入 `SDKAppID` 和 `SDKSecretKey`，启动时会自动登录。**注意：仅适合快速体验，不可用于生产环境。**
- 方式二：通过登录页面登录。
  - `账号登录`：此功能需要您在代码中配置自己的服务端登录地址，不推荐初次体验使用。您需要在 `src/views/Login/Index.vue` 文件中，配置您自己的服务端登录地址，方可使用（**此为生产环境最佳安全实践，需在服务端使用 `SDKAppID` 和 `SDKSecretKey` 生成用户签名 `userSig` 来登录**）。
  - `密钥登录`：使用 `SDKAppID` 和 `SDKSecretKey` 直接登录。**注意：仅适合快速体验，不可用于生产环境。**
  - `签名登录`：通过 `SDKAppID` 和用户签名 `userSig` 登录。用户签名可通过 [腾讯云控制台生成](https://console.cloud.tencent.com/trtc/usersigtool)。**注意：仅适合快速体验，不可用于生产环境。**

3. 安装依赖并启动应用（默认推荐）
```bash
npm install
npm run start
```

`npm run start` 默认**不包含** `upload-server`。
如果希望一条命令同时启动 upload-server，可执行 `npm run start:with-upload-server`。

### 第二步补充（可选）：对接 upload-server 实现封面上传

1. 准备环境文件
```bash
cp upload-server/.env.example upload-server/.env
```

2. 配置 `upload-server/.env`（二选一）
- `STORAGE_PROVIDER=cos`：配置 `COS_SECRET_ID`、`COS_SECRET_KEY`、`COS_BUCKET`、`COS_REGION`
- `STORAGE_PROVIDER=custom`：配置 `CUSTOM_UPLOAD_URL` 及相关字段

3. 安装并启动 upload-server
```bash
npm run upload-server:bootstrap
npm run upload-server:standalone
```

`upload-server` 是独立 Node 子项目。在全新环境（或 `upload-server/node_modules` 不存在）时，
必须至少先执行一次 `npm run upload-server:bootstrap`。

4. 验证服务可用性
- `http://127.0.0.1:3071/api/test`
- `http://127.0.0.1:3071/api/upload/config`

若 upload-server 不可用或 provider 未配置，界面会自动回退到手动输入封面 URL。

5. 配置渲染进程上传服务地址（`VUE_APP_UPLOAD_SERVER_BASE_URL`）

渲染进程默认请求 `http://127.0.0.1:3071`。
如果图片上传服务部署在远端，请设置 `VUE_APP_UPLOAD_SERVER_BASE_URL`：
`VUE_APP_UPLOAD_SERVER_BASE_URL` 建议配置为“协议 + 域名”（不带尾部斜杠、不带路径），
例如：`https://upload.example.com`。

- 本次启动临时生效：
```bash
VUE_APP_UPLOAD_SERVER_BASE_URL=https://your-upload-domain npm run start
```

- 本次构建临时生效：
```bash
VUE_APP_UPLOAD_SERVER_BASE_URL=https://your-upload-domain npm run build
```

- 推荐方式（按模式持久化）：
  - 在 `.env.outer` / `.env.oversea` 中增加 `VUE_APP_UPLOAD_SERVER_BASE_URL=...`
  - 启动或构建时使用 `--mode outer` / `--mode oversea`

### 第三步：构建安装包

构建好的安装包在 `release` 目录下。

Windows：
```bash
npm run pack:win64
```

Mac：
```bash
npm run pack:mac-x64
```

## 组件高级定制

组件高级定制可先参考 Web 端文档：

- [Web 端高级定制](https://cloud.tencent.com/document/product/647/125956)

Electron 端与 Web 端改造思路基本一致：

1. 先参考组件源码：
   - Electron atomic 源码：
     - [tuikit-atomicx-vue3-electron](https://github.com/Tencent-RTC/TUIKit_Vue3/tree/main/packages/tuikit-atomicx-vue3-electron)
   - Web 端参考源码：
     - [tuikit-atomicx-vue3](https://github.com/Tencent-RTC/TUIKit_Vue3/tree/main/packages/tuikit-atomicx-vue3)
2. 在业务工程中重写目标组件，避免直接修改 `node_modules`。
3. 将 state API 引用从相对路径改为 npm 包引用。

示例：

```ts
// before
import { useLiveAudienceState } from '../states/LiveAudienceState'

// after
import { useLiveAudienceState } from 'tuikit-atomicx-vue3-electron'
```

说明：
- 建议以 GitHub 源码为参考实现同款能力。
- 建议保持自定义组件的 props / events 契约兼容，降低后续升级成本。


## 更多资料
1. [直通官网](https://cloud.tencent.com/document/product/647/105438)
2. [在线体验](https://cloud.tencent.com/document/product/647/17021)
