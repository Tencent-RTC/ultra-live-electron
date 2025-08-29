<template>
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
  <div class="tui-login-option-input" >
    <svg-icon class="tui-input-icon" :icon="VerifyIcon"></svg-icon>
    <input
      :value="props.loginState.password"
      class="tui-login-input"
      :placeholder="t('Password')"
      enterkeyhint="complete"
      @input="emit('update:password', ($event.target as HTMLInputElement)?.value)"
    >
  </div>
  <div class="tui-warning-notice">
    <span>{{ t('Need configure your login server URL in src/views/Login/Index.vue file.') }}</span>
  </div>
</template>

<script lang="ts" setup>
import { defineProps, defineEmits } from 'vue';
import { useI18n } from '../../TUILiveKit/locales';
import { LoginState } from './types';
import SvgIcon from '../../TUILiveKit/common/base/SvgIcon.vue';
import UserIcon from '../../TUILiveKit/common/icons/UserIcon.vue';
import VerifyIcon from '../../TUILiveKit/common/icons/VerifyIcon.vue';

type Props = {
  loginState: LoginState;
}

const props = defineProps<Props>();

const emit = defineEmits([
  'update:userId',
  'update:password',
]);

const { t } = useI18n();
</script>
