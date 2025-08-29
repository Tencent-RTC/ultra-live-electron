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
      <div
        v-for="(toolButton, index) in liveToolButtonList"
        :key="index"
        class="tui-live-tool-button-container"
        :class="{'tui-live-tool-disable-button' : !toolButton.func}"
      >
        <div class="tui-live-tool-button" @click="toolButton.func">
          <div class="tui-live-tool-button-icon">
            <svg-icon :class="{'tui-live-tool-disable-button' : !toolButton.func}" :icon="toolButton.icon"></svg-icon>
          </div>
          <div class="tui-live-tool-button-desc">{{ t(`${toolButton.text}`) }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import BGMIcon from '../../common/icons/BGMIcon.vue';
import PKIcon from '../../common/icons/PKIcon.vue';
import AudioEffIcon from '../../common/icons/AudioEffIcon.vue';
import RecordIcon from '../../common/icons/RecordIcon.vue';
import ChangeVoiceIcon from '../../common/icons/ChangeVoiceIcon.vue';
import ArrowDownIcon from '../../common/icons/ArrowDownIcon.vue';
import ArrowDownRotateIcon from '../../common/icons/ArrowDownRotateIcon.vue';
import SvgIcon from '../../common/base/SvgIcon.vue';
import { useI18n } from '../../locales';

const {t} = useI18n();
const isCollapse  = ref(false);

const switchLiveTool = () => {
  isCollapse.value = !isCollapse.value;
};

const handlerAddBgm = () => {
  window.ipcRenderer.send('open-child', {
    command: 'add-bgm',
  });
};

const handlerPK = () => {
  window.ipcRenderer.send('open-pk');
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

const liveToolButtonList = [
  {
    icon: AudioEffIcon,
    text: 'Reverb Voice',
    func: handlerAudioEffect,
  },
  {
    icon: BGMIcon,
    text: 'BGM',
    func: handlerAddBgm,
  },
  {
    icon: PKIcon,
    text: 'PK',
    // func: handlerPK, // To do
  },
  {
    icon: RecordIcon,
    text: 'Record',
  },
  {
    icon: ChangeVoiceIcon,
    text: 'Change Voice',
    func:handlerAlterVoice,
  },
];
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

    .tui-live-tool-button-container {
      box-sizing: border-box;
      display: flex;
      justify-content: center;
      align-items: center;
      width: 4rem;
      height: 4rem;
      word-wrap: break-word;
      white-space: normal;
      cursor: pointer;

      .tui-live-tool-button {
        display: flex;
        flex-direction: column;
        justify-content: center;
        position: relative;
        align-items: center;
        height: 3.5rem;
        width: 100%;

        .tui-live-tool-button-icon {
          position: absolute;
          top: 0.5rem;
        }

        .tui-live-tool-button-desc {
          position: absolute;
          bottom: 0;
          width: 120%;
          text-align: center;
          color: var(--text-color-secondary);
        }
      }
    }

    .tui-live-tool-disable-button,
    .tui-live-tool-disable-button:hover{
      color: $font-live-config-tool-disable-button-hover-color;
      cursor: not-allowed;
    }
  }
}
</style>
