<template>
  <div class="tui-login-option-input">
    <svg-icon class="tui-input-icon" :icon="AppIcon"></svg-icon>
    <input
      :value="props.loginState.sdkAppId"
      class="tui-login-input"
      :placeholder="t('Enter SDKAPPID')"
      @input="handleSdkAppIdInput"
      @blur="validateSdkAppId"
      @focus="clearSdkAppIdError"
    >
  </div>
  <div v-if="sdkAppIdError" class="tui-error-message">{{ sdkAppIdError }}</div>
  <div class="tui-login-option-input">
    <svg-icon class="tui-input-icon" :icon="UserIcon"></svg-icon>
    <input
      :value="props.loginState.userId"
      class="tui-login-input"
      :placeholder="t('Enter user ID')"
      spellcheck="false"
      @input="handleUserIdInput"
      @blur="validateUserId"
      @focus="clearUserIdError"
    >
  </div>
  <div v-if="userIdError" class="tui-error-message">{{ userIdError }}</div>
  <div class="tui-login-option-input">
    <svg-icon class="tui-input-icon" :icon="VerifyIcon"></svg-icon>
    <input
      :value="props.loginState.userSig"
      class="tui-login-input"
      :placeholder="t('User signature')"
      spellcheck="false"
      @input="handleUserSigInput"
      @blur="validateUserSig"
      @focus="clearUserSigError"
    >
    <span class="tui-generate-usersig">
      <a target="_blank" href="https://console.cloud.tencent.com/trtc/usersigtool">{{ t("Generate UserSig") }}</a>
    </span>
  </div>
  <div v-if="userSigError" class="tui-error-message">{{ userSigError }}</div>
</template>
<script lang="ts" setup>
import { defineProps, defineEmits, defineExpose, ref, watch } from 'vue';
import { useI18n } from '../../TUILiveKit/locales';
import { LoginState, VerifyStates } from './types';
import SvgIcon from '../../TUILiveKit/common/base/SvgIcon.vue';
import AppIcon from '../../TUILiveKit/common/icons/AppIcon.vue';
import UserIcon from '../../TUILiveKit/common/icons/UserIcon.vue';
import VerifyIcon from '../../TUILiveKit/common/icons/VerifyIcon.vue';

type Props = {
  loginState: LoginState;
  verifyStates: VerifyStates;
}

const props = defineProps<Props>();

const emit = defineEmits([
  'update:sdkAppId',
  'update:userId',
  'update:userSig',
]);

const { t } = useI18n();

const sdkAppIdError = ref('');
const userIdError = ref('');
const userSigError = ref('');

const MAX_SDK_APP_ID = 2**32 - 1; // 4294967295

const handleSdkAppIdInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const value = target.value;

  const numericValue = value.replace(/\D/g, '');

  if (value !== numericValue) {
    target.value = numericValue;
  }

  emit('update:sdkAppId', numericValue);

  if (numericValue) {
    validateSdkAppIdValue(numericValue);
  } else {
    sdkAppIdError.value = '';
  }
};

const handleUserIdInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const value = target.value;

  emit('update:userId', value);

  if (value) {
    validateUserIdValue(value);
  } else {
    userIdError.value = '';
  }
};

const handleUserSigInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const value = target.value;

  emit('update:userSig', value);

  if (value) {
    validateUserSigValue(value);
  } else {
    userSigError.value = '';
  }
};

const validateSdkAppId = () => {
  const value = props.loginState.sdkAppId;
  validateSdkAppIdValue(value);
};

const validateSdkAppIdValue = (value: string) => {
  if (!value) {
    sdkAppIdError.value = t('SDKAPPID is required');
    return false;
  }

  const numValue = Number(value);
  if (isNaN(numValue)) {
    sdkAppIdError.value = t('SDKAPPID must be a number');
    return false;
  }

  if (numValue < 1 || numValue > MAX_SDK_APP_ID) {
    sdkAppIdError.value = t('SDKAPPID must be between 1 and {max}');
    return false;
  }

  sdkAppIdError.value = '';
  return true;
};

const validateUserId = () => {
  const value = props.loginState.userId;
  validateUserIdValue(value);
};

const validateUserIdValue = (value: string) => {
  if (!value || value.trim() === '') {
    userIdError.value = t('User ID is required');
    return false;
  }

  userIdError.value = '';
  return true;
};

const validateUserSig = () => {
  const value = props.loginState.userSig;
  validateUserSigValue(value);
};

const validateUserSigValue = (value: string) => {
  if (!value || value.trim() === '') {
    userSigError.value = t('User signature is required');
    return false;
  }

  userSigError.value = '';
  return true;
};

const clearSdkAppIdError = () => {
  sdkAppIdError.value = '';
};

const clearUserIdError = () => {
  userIdError.value = '';
};

const clearUserSigError = () => {
  userSigError.value = '';
};

// 监听表单值变化，自动清除错误
watch(() => props.loginState.sdkAppId, (newValue) => {
  if (newValue && sdkAppIdError.value) {
    validateSdkAppIdValue(newValue);
  }
});

watch(() => props.loginState.userId, (newValue) => {
  if (newValue && userIdError.value) {
    validateUserIdValue(newValue);
  }
});

watch(() => props.loginState.userSig, (newValue) => {
  if (newValue && userSigError.value) {
    validateUserSigValue(newValue);
  }
});

// 暴露校验方法给父组件
defineExpose({
  validateForm: () => {
    const sdkAppIdValid = validateSdkAppIdValue(props.loginState.sdkAppId);
    const userIdValid = validateUserIdValue(props.loginState.userId);
    const userSigValid = validateUserSigValue(props.loginState.userSig);

    return sdkAppIdValid && userIdValid && userSigValid;
  }
});
</script>

<style lang="scss" scoped>
.tui-error-message {
  color: #f23c5b;
  font-size: 0.75rem;
  margin-top: 0.25rem;
  padding-left: 2rem;
  line-height: 1.4;
  animation: errorFadeIn 0.3s ease;
}
</style>
