<template>
  <div class="tui-login-option-input">
    <svg-icon class="tui-input-icon" :icon="AppIcon"></svg-icon>
    <input
      :value="props.loginState.sdkAppId"
      class="tui-login-input"
      :placeholder="t('SDKAPPID')" auto-complete="true"
      enterkeyhint="complete"
      @input="emit('update:sdkAppId', ($event.target  as HTMLInputElement)?.value)"
    >
  </div>
  <div class="tui-login-option-input">
    <svg-icon class="tui-input-icon" :icon="UserIcon"></svg-icon>
    <input
      :value="props.loginState.userId"
      class="tui-login-input"
      :placeholder="t('User ID')" auto-complete="true"
      enterkeyhint="complete"
      @input="emit('update:userId', ($event.target  as HTMLInputElement)?.value)"
    >
  </div>
  <div class="tui-login-option-input">
    <svg-icon class="tui-input-icon" :icon="VerifyIcon"></svg-icon>
    <input
      :value="props.loginState.sdkSecretKey"
      class="tui-login-input"
      :placeholder="t('SDK secret key')" auto-complete="true"
      enterkeyhint="complete"
      @input="emit('update:sdkSecretKey', ($event.target  as HTMLInputElement)?.value)"
    >
  </div>
  <div class="tui-warning-notice">
    <span>{{ t('SDK secret key login only used for quick test. Do not use in production environment.') }}</span>
  </div>
</template>
<script lang="ts" setup>
import { defineProps, defineEmits } from 'vue';
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
  'update:sdkSecretKey',
]);

const { t } = useI18n();
</script>
