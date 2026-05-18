<template>
  <UIKitProvider theme="dark">
    <TUILiveKitChild />
  </UIKitProvider>
</template>

<script setup lang="ts">
import { UIKitProvider } from '@tencentcloud/uikit-base-component-vue3';
import TUILiveKitChild from '../TUILiveKit/ChildView.vue';
</script>

<style>
html, body, #app {
  width: 100%;
  height: 100%;
  margin: 0;
  text-align: initial;
}
</style>
