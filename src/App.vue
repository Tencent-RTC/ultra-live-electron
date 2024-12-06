<template>
  <router-view />
</template>

<script setup lang="ts"></script>

<style lang="scss">
@import "./TUILiveKit/assets/variable.scss";
@import "./TUILiveKit/assets/global.scss";

html,
body,
#app {
  height: 100%;
  margin: 0;
  padding: 0;
  background-color: $color-app-external-background;
  color: $font-app-external-color;
}

#app {
  font-family: $font-app-external-family;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  overflow: hidden;
}
</style>
