<template>
  <div class="tui-login-page">
    <div class="tui-login-header">
      <div class="window-tool tui-window-header">
        <button class="tui-live-icon" @click="onMinimize">
          <svg-icon :icon=MinimizeIcon></svg-icon>
        </button>
        <button class="tui-live-icon" @click="onToggleMaximize">
          <svg-icon v-if="!isMaximized" :icon=MaximizeIcon></svg-icon>
          <svg-icon v-else :icon=MiniIcon></svg-icon>
        </button>
        <button class="tui-live-icon" @click="onClose">
          <svg-icon :icon=CloseIcon ></svg-icon>
        </button>
      </div>
    </div>
    <div class="tui-login-body">
      <div class="tui-login-logo">
      </div>
      <div class="tui-login-form">
        <div class="tui-login-form-title">
          <span>{{t('Live Streaming Assistant')}}</span>
        </div>
        <div class="tui-login-type-container">
          <span :class="{active:loginType===LoginType.UserAccount}" @click="onChangeLoginType(LoginType.UserAccount)">{{ t('Account Login')}}</span>
          <span :class="{active:loginType===LoginType.SDKSecretKey}" @click="onChangeLoginType(LoginType.SDKSecretKey)">{{ t('SDK SecretKey Login')}}</span>
          <span :class="{active:loginType===LoginType.UserSig}" @click="onChangeLoginType(LoginType.UserSig)">{{ t('UserSig Login')}}</span>
        </div>
        <div class="tui-login-options">
          <secret-key-form v-if="loginType === LoginType.SDKSecretKey"
            :login-state="loginState"
            :verify-states="verifyStates"
            @update:sdk-app-id="value => loginState.sdkAppId = value"
            @update:user-id="value => loginState.userId = value"
            @update:sdk-secret-key="value => loginState.sdkSecretKey = value"
            />
          <user-sig-form v-else-if="loginType === LoginType.UserSig"
            :login-state="loginState"
            :verify-states="verifyStates"
            @update:sdk-app-id="value => loginState.sdkAppId = value"
            @update:user-id="value => loginState.userId = value"
            @update:user-sig="value => loginState.userSig = value"
          />
          <password-form v-else-if="loginType === LoginType.UserAccount"
            :login-state="loginState"
            @update:user-id="value => loginState.userId = value"
            @update:password="value => loginState.password = value"
           />
          <button class="tui-login-button tui-button-ripple" :disabled="isLoggingIn" @click="handleLogin">
            <span class="button">{{ !isLoggingIn ? t('Log In') : t('Logging In')}}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, Ref, reactive, onMounted } from 'vue';
import router from '../../router';
import { getWindowType } from '../../TUILiveKit/utils/envUtils';
import { useI18n } from '../../TUILiveKit/locales';
import { getBasicInfo } from '../../debug/basic-info-config.js';
import SvgIcon from '../../TUILiveKit/common/base/SvgIcon.vue';
import MaximizeIcon from '../../TUILiveKit/common/icons/MaximizeIcon.vue';
import MinimizeIcon from '../../TUILiveKit/common/icons/MinimizeIcon.vue';
import MiniIcon from '../../TUILiveKit/common/icons/MiniIcon.vue';
import CloseIcon from '../../TUILiveKit/common/icons/CloseIcon.vue';
import TUIMessageBox from '../../TUILiveKit/common/base/MessageBox';
import SecretKeyForm from './SecretKeyForm.vue';
import UserSigForm from './UserSigForm.vue';
import PasswordForm from './PasswordForm.vue';
import logger from '../../TUILiveKit/utils/logger';
import { LoginType, LoginState, VerifyStates } from './types';

const serverURL = ''; // ********** Please config your login server URL *********

const loginState:LoginState = reactive({
  privacyGuide: '',
  userAgreement: '',
  mode: '',
  isAgreed: false,
  phoneNumber: '',
  mailAddress: '',
  verifyCode: '',
  sessionId: '',
  sdkAppId: '',
  userId: '',
  userSig: '',
  sdkSecretKey: '',
  password: '',
});

const verifyStates:VerifyStates = reactive({
  countdown: 0,
  timer: 0,
});

const { t } = useI18n();

const loginType: Ref<LoginType> = ref(LoginType.UserAccount);
const isLoggingIn = ref(false);

const onChangeLoginType = (type: LoginType) => {
  loginType.value = type;
}

async function handleLogin() {
  isLoggingIn.value = true;
  if (validateLoginForm()) {
    if (loginType.value === LoginType.UserAccount) {
      await doPasswordLogin();
    } else if (loginType.value === LoginType.UserSig) {
      doUserSigLogin();
    } else if (loginType.value === LoginType.SDKSecretKey) {
      doSDKSecretKeyLogin();
    } else {
      TUIMessageBox({
        title: t('Note'),
        message: t('Unknown login type!'),
        confirmButtonText: t('Sure'),
      });
    }
  }
  isLoggingIn.value = false;
}

function validateLoginForm(): boolean {
  let result = true;
  if (loginType.value === LoginType.UserSig || loginType.value === LoginType.SDKSecretKey) {
    if (loginState.sdkAppId.trim() === '') {
      TUIMessageBox({
        title: t('Note'),
        message: t('Please enter valid SDKAPPID number.'),
        confirmButtonText: t('Sure'),
      });
      result = false;
    }
    if (loginState.userId.trim() === '') {
      TUIMessageBox({
        title: t('Note'),
        message: t('Please enter your user ID!'),
        confirmButtonText: t('Sure'),
      });
      result = false;
    }
  }

  if (loginType.value === LoginType.UserAccount) {
    if (loginState.userId.trim() === '') {
      TUIMessageBox({
        title: t('Note'),
        message: t('Please enter your user ID!'),
        confirmButtonText: t('Sure'),
      });
      result = false;
    }
    if (loginState.password.trim() === '') {
      TUIMessageBox({
        title: t('Note'),
        message: t('Please enter your password!'),
        confirmButtonText: t('Sure'),
      });
      result = false;
    }
  } else if (loginType.value === LoginType.UserSig) {
    if (loginState.userSig.trim() === '') {
      TUIMessageBox({
        title: t('Note'),
        message: t('Please enter your user signature!'),
        confirmButtonText: t('Sure'),
      });
      result = false;
    }
  } else if (loginType.value === LoginType.SDKSecretKey) {
    if (loginState.sdkSecretKey.trim() === '') {
      TUIMessageBox({
        title: t('Note'),
        message: t('Please enter your SDK secret key!'),
        confirmButtonText: t('Sure'),
      });
      result = false;
    }
  }
  return result;
}

async function doPasswordLogin() {
  const param = new URLSearchParams({
    userId: loginState.userId.trim(),
    password: loginState.password
  });
  const loginURL =  `${serverURL}?${param.toString()}`

  try {
    const response = await fetch(loginURL);
    if (response.ok) {
      const jsonResponse= response.json() as any;
      window.localStorage.setItem('TUILiveKit-userInfo', JSON.stringify({
        sdkAppId: jsonResponse.sdkAppId,
        userId: jsonResponse.userId,
        userName: jsonResponse.userName,
        userSig: jsonResponse.userSig,
        avatarUrl: jsonResponse.avatarUrl,
        loginType: loginType.value
      }));
      await gotoNextPage();
    } else {
      logger.warn('Login failed:', response);
      TUIMessageBox({
        title: t('Note'),
        message: t('Login failed.'),
        confirmButtonText: t('Sure'),
      });
    }
  } catch (error) {
    logger.warn('Login failed:', error);
    TUIMessageBox({
      title: t('Note'),
      message: t('Login failed.'),
      confirmButtonText: t('Sure'),
    });
  }
}

async function doUserSigLogin() {
  window.localStorage.setItem('TUILiveKit-userInfo', JSON.stringify({
    sdkAppId: Number(loginState.sdkAppId),
    userId: loginState.userId.trim(),
    userName: '',
    userSig: loginState.userSig.trim(),
    avatarUrl: '',
    loginType: loginType.value
  }));
  await gotoNextPage();
}

async function doSDKSecretKeyLogin() {
  const { sdkAppId, userId, userSig, userName, avatarUrl }
    = getBasicInfo(loginState.userId.trim(), Number(loginState.sdkAppId.trim()), loginState.sdkSecretKey.trim());
  window.localStorage.setItem('TUILiveKit-userInfo', JSON.stringify({
    sdkAppId,
    userId,
    userName,
    userSig,
    avatarUrl,
    loginType: loginType.value
  }));
  await gotoNextPage();
}

async function gotoNextPage() {
  const winType = await getWindowType();
  logger.log(`Login success, go to ${winType} window page`);
  switch (winType) {
  case 'main':
    router.push({ name: 'loading' });
    break;
  case 'child':
    router.push({ name: 'tui-live-kit-child' });
    break;
  case 'cover':
    router.push({ name: 'tui-live-kit-cover' });
    break;
  default:
    logger.warn('login success, unkonwn window source:', winType);
    break;
  }
  window.ipcRenderer.send('user-login');
}

onMounted(() => {
  const scripts = document.getElementsByTagName('script');
  const existed = Array.from(scripts).some(script => script.src.indexOf('TCaptcha.js') !== -1);

  if (!existed) {
    logger.log('[Login] add script TCaptcha');
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://turing.captcha.qcloud.com/TCaptcha.js';
    document.getElementsByTagName('head')[0].appendChild(script);
  }
});

const isMaximized: Ref<boolean> = ref(false);
function onMinimize() {
  logger.log('[LiveHeader]onMinimize');
  window.ipcRenderer.send('on-minimize-window', null);
}

function onToggleMaximize() {
  logger.log('[LiveHeader]onToggleMaximize');
  isMaximized.value = !isMaximized.value;
  window.ipcRenderer.send('on-maximize-window', isMaximized.value);
}

function onClose() {
  logger.log('[LiveHeader]onClose');
  window.ipcRenderer.send('on-close-window', null);
}
</script>

<style lang="scss">
@import '../../TUILiveKit/assets/variable.scss';

.tui-login-page {
  --font-size-primary: 1rem;
  --font-size-secondary: 0.75rem;
  height: 100%;

  .tui-input-icon {
    flex: 0 0 1.25rem;
    width: 1.25rem;
    height: 1.25rem;
  }

  .tui-login-header {
    height: 2.75rem;
    .window-tool{
      display: flex;
      align-items: center;
      justify-content: flex-end;
      align-self: flex-end;
      width:100%;
      padding: 0.5rem;
    }
  }

  .tui-login-body {
    display: flex;
    justify-content: center;
    align-items: center;
    height: calc(100% - 2.75rem);
  }

  .tui-login-logo {
    flex: 1 1 auto;
    height: 100%;
    background-image: url(../../assets/login-back.png);
    background-position: center;
    background-size: cover;
    background-repeat: no-repeat;
  }

  .tui-login-form {
    flex: 0 0 28rem;
    width: 28rem;
    border-radius: 1.25rem;
    margin: 0 3rem;
    padding: 2.5rem 2rem;
    background-image: linear-gradient(230deg, rgba(61, 119, 255, 0.53), rgba(61, 143, 255, 0) 50%);
  }

  .tui-login-form-title {
    font-size: 1.5rem;
    font-weight: bold;
  }

  .tui-login-type-container {
    display: inline-flex;
    margin-top: 1rem;
    font-size: var(--font-size-primary);

    span {
      margin-right: 1rem;
      cursor: pointer;

      &:last-child {
        margin-right: 0;
      }
    }
    .active:after{
      content: '';
      width: 100%;
      height: 0.125rem;
      background:#006EFF;
      border-radius: 0.0625rem;
      display: block;
      margin-top: 0.3125rem;
    }
  }

  .tui-login-option-input {
    position: relative;
    display: flex;
    align-items: center;

    margin-top: 2rem;
    padding: 0 1rem;

    border-radius: 0.5rem;
    background-color: #292d38;
    font-size: var(--font-size-primary);

    input {
      -webkit-appearance: none;
      flex: 1 1 auto;
      width: auto;
      line-height: 3.125rem;
      border: 1px solid #292D38;
      background-color: #292d38;
      color: #b3b8c8;
      font-size: var(--font-size-primary);
      outline: none;
    }

    .tui-msg-control,
    .tui-generate-usersig {
      flex: 0 0 6rem;
      width: 6rem;
      text-align: right;
    }

    .tui-msg-send {
      cursor: pointer;
      color: #1c66e5;
    }
    .tui-msg-sent {
      color: #cccccc;
    }
  }

  .tui-login-option-license {
    display: flex;
    align-items: center;
    margin: 1rem 0;
    font-size: var(--font-size-secondary);

    .tui-license-checkbox,
    .tui-login-license {
      height: 1rem;
      line-height: 1rem;
    }
  }

  .tui-warning-notice {
    margin-top: 1rem;
    color: $color-error;
    font-size: 0.75rem;
  }

  .tui-login-button {
    width: 100%;
    height: 3rem;
    margin-top: 1rem;
    border: 1px solid $color-primary;
    border-radius: 0.5rem;
    background-color: $color-primary;
    cursor: pointer;
    color: #D5E0F2;
  }

  .tui-button-ripple {
    background-position: center;
    transition: background 500ms ease-in-out;

    &:hover {
      background-position: center;
      background-color: $color-anchor-hover;
      background-image: radial-gradient(circle, transparent 1%, $color-anchor-hover 1%);
      background-size: 15000%;
    }

    &:active {
      background-color: $color-anchor-active;
      background-size: 100%;
      transition: background 0s;
    }
  }
}
</style>
