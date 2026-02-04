<template>
  <router-view />
</template>

<script setup lang="ts">
import { useAppRequestQuit } from './TUILiveKit/hooks/useAppRequestQuit';

useAppRequestQuit();
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
