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
        <!-- <div class="tui-login-type-container">
        </div> -->
        <div class="tui-login-options">
          <mobile-phone-form v-if="loginType === LoginType.MobilePhone"
            :login-state="loginState"
            :verify-states="verifyStates"
            @update:phone-number="value => loginState.phoneNumber = value"
            @update:verify-code="value => loginState.verifyCode = value"
            @send-verify-code="sendVerifyCode" />
          <user-sig-form v-else-if="loginType === LoginType.UserSig"
            :login-state="loginState"
            :verify-states="verifyStates"
            @update:sdk-app-id="value => loginState.sdkAppId = value"
            @update:user-id="value => loginState.userId = value"
            @update:user-sig="value => loginState.userSig = value"
            />
          <div class="tui-login-option-license">
            <tui-checkbox class="tui-license-checkbox" v-model="loginState.isAgreed">
              {{ t('I have read and agree to the') }}
            </tui-checkbox>
            <div class="tui-login-license">
              <a :underline="false" target="_blank" rel="noopener noreferrer" :href="privacyGuide" class="verify-link">
                &nbsp;{{ t('Privacy Policy') }}
              </a>
            </div>
          </div>
          <button class="tui-login-button tui-button-ripple" :disabled="isLoggingIn" @click="handleLogin">
            <span class="button">{{ !isLoggingIn ? t('Log In') : t('Logging In')}}</span>
          </button>
          <div class="tui-login-switch">
            <p v-if="loginType === LoginType.MobilePhone">
              <span class="tui-login-trial-description">
                {{ t('Trial description') }}
              </span>
              <span class="tui-login-trial-link">
                <a :underline="false" target="_blank" href="https://cloud.tencent.com/document/product/647/17021">{{ t('Mobile App and Web Site') }}</a>
              </span>
            </p>
            <span class="tui-login-trial-switch" v-if="loginType === LoginType.UserSig" @click="toggleLoginMode">&gt;&gt;&gt;&nbsp;{{ t('Enter trial') }}</span>
            <span class="tui-login-trial-switch" v-if="loginType === LoginType.MobilePhone" @click="toggleLoginMode">&lt;&lt;&lt;&nbsp;{{ t('Exit trial') }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, Ref, computed, reactive, onMounted, onUnmounted } from 'vue';
import { getVerifyCode, verifyCodeLogin, TUIServerErrorCode } from '../../api/http';
import router from '../../router';
import { getWindowType } from '../../TUILiveKit/utils/envUtils';
import i18n from '../../TUILiveKit/locales/index';
import { useI18n } from '../../TUILiveKit/locales';
import { getBasicInfo } from '../../debug/basic-info-config.js';
import SvgIcon from '../../TUILiveKit/common/base/SvgIcon.vue';
import MaximizeIcon from '../../TUILiveKit/common/icons/MaximizeIcon.vue';
import MinimizeIcon from '../../TUILiveKit/common/icons/MinimizeIcon.vue';
import MiniIcon from '../../TUILiveKit/common/icons/MiniIcon.vue';
import CloseIcon from '../../TUILiveKit/common/icons/CloseIcon.vue';
import TuiCheckbox from '../../TUILiveKit/common/base/CheckBox.vue';
import TUIMessageBox from '../../TUILiveKit/common/base/MessageBox';
import MobilePhoneForm from './MobilePhoneForm.vue';
import UserSigForm from './UserSigForm.vue';
import { runtimeScene } from '../../TUILiveKit/constants/env';
import { MAX_SDK_APP_ID } from '../../TUILiveKit/constants/tuiConstant';
import { LoginType, LoginState, VerifyStates } from './types';
import { MSG_APPID } from './constant';
import logger from '../../TUILiveKit/utils/logger';

const privacyGuideEN = 'https://www.tencentcloud.com/document/product/301/17345?lang=en&pg=';
const privacyGuideCN = 'https://web.sdk.qcloud.com/document/Tencent-RTC-Privacy-Protection-Guidelines.html';
const privacyGuide = computed(() => (i18n.global.locale.value === 'zh-CN' ? privacyGuideCN : privacyGuideEN ));
const userAgreement = 'https://web.sdk.qcloud.com/document/Tencent-RTC-User-Agreement.html';

const loginState:LoginState = reactive({
  privacyGuide,
  userAgreement,
  mode: 'phone_number',
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

const loginType: Ref<LoginType> = ref(LoginType.UserSig);
const isLoggingIn = ref(false);

function toggleLoginMode() {
  if (loginType.value === LoginType.UserSig) {
    loginType.value = LoginType.MobilePhone;
  } else {
    loginType.value = LoginType.UserSig;
  }
}

function startCountDown() {
  verifyStates.countdown = 60;
  verifyStates.timer = window.setInterval(() => {
    verifyStates.countdown = verifyStates.countdown - 1;
    if (verifyStates.countdown <= 0) {
      clearInterval(verifyStates.timer);
    }
  }, 1000);
}

function sendVerifyCode() {
  if (loginType.value === LoginType.MobilePhone && !/^1[3|4|5|7|8|6|9][0-9]\d{8}$/.test(loginState.phoneNumber)) {
    TUIMessageBox({
      title: t('Note'),
      message: t('Please enter a valid phone number!'),
      confirmButtonText: t('Sure'),
    });
    return;
  }
  // eslint-disable-next-line no-undef
  const captcha = new TencentCaptcha(runtimeScene === 'oversea' ? MSG_APPID.oversea : MSG_APPID.home, (res: any) => {
    if (res.ret === 0) {
      const { appid, ticket, randstr } = res;
      doSendVerifyCode(appid, ticket, randstr);
    }
  });
  captcha.show();
}

async function doSendVerifyCode(appid: string, ticket: string, randstr: string) {
  const params = {
    areaCode: loginType.value === LoginType.MobilePhone ? '86' : '',
    phoneNumber: loginType.value === LoginType.MobilePhone ? loginState.phoneNumber.replace(/\D/g, '') : '',
    mailAddress: '',
    appId: appid,
    ticket,
    randstr,
  };
  try {
    const smsCaptchaData = await getVerifyCode(params);
    logger.log('[Login] get SMS code result:', smsCaptchaData);
    if(smsCaptchaData.data?.errorCode === 0){
      loginState.sessionId = smsCaptchaData.data.data.sessionId;
      startCountDown();
    }else {
      logger.error('[Login] get verify code failed: ', smsCaptchaData.data);
      throw new Error(smsCaptchaData.data?.errorMessage);
    }
  } catch (error) {
    logger.error('[Login] get verify code failed: ', error);
    TUIMessageBox({
      title: t('Note'),
      message: t('get SMS code failed!'),
      confirmButtonText: t('Sure'),
    });
  }
}

async function handleLogin() {
  isLoggingIn.value = true;
  if (validateLoginForm()) {
    if (loginType.value === LoginType.MobilePhone) {
      await doMobilePhoneLogin();
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
    const sdkAppId = Number(loginState.sdkAppId.trim());
    if (sdkAppId <= 0 || sdkAppId > MAX_SDK_APP_ID) {
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

  if (loginType.value === LoginType.MobilePhone) {
    if (loginState.phoneNumber.trim() === '') {
      TUIMessageBox({
        title: t('Note'),
        message: t('Please enter your phone number!'),
        confirmButtonText: t('Sure'),
      });
      result = false;
    }
    if (loginState.verifyCode.trim() === '') {
      TUIMessageBox({
        title: t('Note'),
        message: t('Please enter the verification code!'),
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
  if (!loginState.isAgreed) {
    TUIMessageBox({
      title: t('Note'),
      message: t('Please accept the privacy policy!'),
      confirmButtonText: t('Sure'),
    });
    result = false;
  }
  return result;
}

async function doMobilePhoneLogin() {
  const params = {
    areaCode: loginType.value === LoginType.MobilePhone ? '86' : '',
    phoneNumber: loginType.value === LoginType.MobilePhone ? loginState.phoneNumber.replace(/\D/g, '') : '',
    mailAddress: '',
    sessionId: loginState.sessionId,
    verifyCode: loginState.verifyCode.replace(/\D/g, ''),
  };
  logger.log('login params:', params);
  const loginResult = await verifyCodeLogin(params);
  logger.log('login result:', loginResult);
  switch (loginResult.data.errorCode) {
  case TUIServerErrorCode.SUCCESS:
    window.localStorage.setItem('TUILiveKit-userInfo', JSON.stringify({
      ...loginResult.data.data,
      userName: loginResult.data.data.name,
      avatarUrl: loginResult.data.data.avatar,
      loginType: loginType.value
    }));
    await gotoNextPage();
    break;
  case TUIServerErrorCode.VERIFY_CODE_ERROR:
    TUIMessageBox({
      title: t('Note'),
      message: t('Incorrect verification code, please check the code!'),
      confirmButtonText: t('Sure'),
    });
    break;
  case TUIServerErrorCode.VERIFY_CODE_EXPIRED:
    TUIMessageBox({
      title: t('Note'),
      message: t('The verification code has expired, please retrieve a new one!'),
      confirmButtonText: t('Sure'),
    });
    break;
  case TUIServerErrorCode.VERIFY_CODE_USED:
    TUIMessageBox({
      title: t('Note'),
      message: t('The verification code has been used, please retrieve a new one!'),
      confirmButtonText: t('Sure'),
    });
    break;
  default:
    TUIMessageBox({
      title: t('Note'),
      message: t('Login failed.'),
      confirmButtonText: t('Sure'),
    });
    break;
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

    script.onerror = () => {
      TUIMessageBox({
        title: t('Note'),
        message: t('Failed to load captcha script, please check your network connection!'),
        confirmButtonText: t('Sure'),
      });
    };
  }
});

onUnmounted(() => {
  if (verifyStates.timer) {
    clearInterval(verifyStates.timer);
    verifyStates.timer = 0;
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
    flex: 0 0 27rem;
    width: 27rem;
    border-radius: 1.25rem;
    margin: 0 3rem;
    padding: 2.5rem;
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
    color: $color-error;
    font-size: 0.75rem;
  }

  .tui-login-button {
    width: 100%;
    height: 3rem;
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

  .tui-login-switch {
    margin-top: 1rem;
    font-size: 0.75rem;

    .tui-login-trial-switch {
      color: $color-primary;
      cursor: pointer;
      transition: color 0.2s ease-in-out;

      &:hover {
        color: $font-color-login-trial-hover;
      }
    }
  }

  .tui-error-message {
    color: $color-error;
    font-size: 0.75rem;
    margin-top: 0.25rem 0;
    padding-left: 2rem;
    line-height: 1.4;
    animation: errorFadeIn 0.3s ease;
  }

  @keyframes errorFadeIn {
    from {
      opacity: 0;
      transform: translateY(-4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
}
</style>
