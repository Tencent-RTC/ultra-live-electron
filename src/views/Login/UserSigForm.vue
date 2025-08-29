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
      :value="props.loginState.userSig"
      class="tui-login-input"
      :placeholder="t('User signature')" auto-complete="true"
      enterkeyhint="complete"
      @input="emit('update:userSig', ($event.target  as HTMLInputElement)?.value)"
    >
    <span class="tui-generate-usersig">
      <a target="_blank" href="https://console.cloud.tencent.com/trtc/usersigtool">{{ t("Generate UserSig") }}</a>
    </span>
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
  'update:userSig',
]);

const { t } = useI18n();
</script>
