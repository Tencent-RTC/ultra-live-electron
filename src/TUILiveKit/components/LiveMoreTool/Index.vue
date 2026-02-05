<template>
  <div class="tui-live-tool">
    <div class="tui-live-tool-title" :class="{'tui-title': !isCollapse}">
      <div>{{t("Live Tools")}}</div>
      <div class="tui-live-tool-switch" @click="switchLiveTool">
        <svg-icon class="svg-icon" :icon="isCollapse  ? ArrowDownRotateIcon : ArrowDownIcon"></svg-icon>
        <span>{{ isCollapse  ? t("Unfold") : t("Collapse") }}</span>
      </div>
    </div>
    <div v-show="!isCollapse " class="tui-live-tool-container">
      <TUILiveButton class="tui-toolbar-button" @click="handlerAudioEffect">
        <svg-icon :icon=AudioEffIcon :size="1.5"></svg-icon>
        <span class="tui-toolbar-button-desc">{{ t('Reverb Voice') }}</span>
      </TUILiveButton>
      <TUILiveButton class="tui-toolbar-button" @click="handlerAlterVoice">
        <svg-icon :icon=ChangeVoiceIcon :size="1.5"></svg-icon>
        <span class="tui-toolbar-button-desc">{{ t('Change Voice') }}</span>
      </TUILiveButton>
      <TUILiveButton class="tui-toolbar-button" @click="handlerAddBgm">
        <svg-icon :icon=BGMIcon :size="1.5"></svg-icon>
        <span class="tui-toolbar-button-desc">{{ t('BGM') }}</span>
      </TUILiveButton>
      <!-- <TUILiveButton class="tui-toolbar-button" @click="handlerPK" :disabled="isPKDisable">
        <svg-icon :icon=PKIcon :size="1.5"></svg-icon>
        <span class="tui-toolbar-button-desc">{{ t('PK') }}</span>
      </TUILiveButton> -->
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { storeToRefs } from 'pinia';
import TUILiveButton from '../../common/base/Button.vue';
import BGMIcon from '../../common/icons/BGMIcon.vue';
import PKIcon from '../../common/icons/PKIcon.vue';
import AudioEffIcon from '../../common/icons/AudioEffIcon.vue';
import ChangeVoiceIcon from '../../common/icons/ChangeVoiceIcon.vue';
import ArrowDownIcon from '../../common/icons/ArrowDownIcon.vue';
import ArrowDownRotateIcon from '../../common/icons/ArrowDownRotateIcon.vue';
import SvgIcon from '../../common/base/SvgIcon.vue';
import { useBasicStore } from '../../store/main/basic';
import { useRoomStore } from '../../store/main/room';
import { useI18n } from '../../locales';
import { TUIConnectionMode } from '../../types';

const {t} = useI18n();
const isCollapse  = ref(false);

const basicStore = useBasicStore();
const roomStore = useRoomStore();
const { isLiving } = storeToRefs(basicStore);
const { connectionMode } = storeToRefs(roomStore);

const isPKDisable = computed(() => {
  return !isLiving.value || connectionMode.value === TUIConnectionMode.CoGuest;
});

const switchLiveTool = () => {
  isCollapse.value = !isCollapse.value;
};

const handlerAddBgm = () => {
  window.ipcRenderer.send('open-child', {
    command: 'add-bgm',
  });
};

const handlerPK = () => {
  window.ipcRenderer.send('open-child', {
    command: 'co-host-connection',
    data: {
      layoutTemplate: roomStore.coHostLayoutTemplate,
      duration: roomStore.anchorBattleInfo.duration,
    }
  });
};

const handlerAudioEffect = () => {
  window.ipcRenderer.send('open-child', {
    command: 'reverb-voice',
  });
};

const handlerAlterVoice = () => {
  window.ipcRenderer.send('open-child', {
    command: 'change-voice',
  });
}
</script>

<style scoped lang="scss">
@import "../../assets/variable.scss";
.tui-live-tool {

  .tui-live-tool-title {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.6rem 1rem;
    font-size: 0.8rem;

    .tui-live-tool-switch {
      display: flex;
      align-items: center;
      color: var(--text-color-secondary);
      font-size: $font-live-config-tool-switch-size;
      cursor: pointer;

      .svg-icon {
        color: var(--text-color-secondary);
      }
    }
  }

  .tui-live-tool-container {
    display: flex;
    flex-wrap: wrap;
    padding: 0.3rem 1rem;
    color: var(--bg-color-operate);

    .tui-toolbar-button {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      gap: 0.25rem;
      width: 4rem;
      height: 3.5rem;
      padding: 0;
      border: none;

      background: none;
      word-wrap: break-word;
      white-space: normal;
      text-align: center;
      font-size: 0.75rem;

      .tui-toolbar-button-desc {
        line-height: 1rem;
        color: var(--text-color-secondary);
      }
    }
  }
}
</style>
