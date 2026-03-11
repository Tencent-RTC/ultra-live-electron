<template>
  <UIKitProvider theme="dark">
    <TUILiveKitConfirmView />
  </UIKitProvider>
</template>

<script setup lang="ts">
import { UIKitProvider } from '@tencentcloud/uikit-base-component-vue3';
import TUILiveKitConfirmView from '../TUILiveKit/ConfirmView2.vue';
</script>

<style>
html, body, #app {
  background: transparent;
}
</style>
