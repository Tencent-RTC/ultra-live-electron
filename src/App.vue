<template>
  <router-view />
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import packageConfig from '../package.json';
import { useAppRequestQuit } from './TUILiveKit/hooks/useAppRequestQuit';
import { setStableWindowTitle } from './TUILiveKit/utils/windowTitle';

useAppRequestQuit();

onMounted(() => {
  const appVersion = packageConfig.version.replace('-build', '.');
  void setStableWindowTitle(appVersion);
});
</script>

<style lang="scss">
@import "./TUILiveKit/assets/variable.scss";
@import "./TUILiveKit/assets/global.scss";

html,
body,
#app {
  height: 100%;
  margin: 0;
  padding: 0;
  background-color: $color-black;
  color: $font-app-color;
}

#app {
  font-family: $font-app-external-family;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  overflow: hidden;
}
</style>
