<template>
  <UIKitProvider theme="dark">
    <TUILiveKitChild2 />
  </UIKitProvider>
</template>

<script setup lang="ts">
import { UIKitProvider } from '@tencentcloud/uikit-base-component-vue3';
import TUILiveKitChild2 from '../TUILiveKit/ChildView2.vue';
</script>

<style>
html, body, #app {
  width: 100%;
  height: 100%;
  margin: 0;
  text-align: initial;
}
</style>
