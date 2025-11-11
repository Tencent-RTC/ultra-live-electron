<template>
    <div class="tui-setting">
      <LiveChildHeader :title="t('Setting')"></LiveChildHeader>
      <div class="setting-body">
        <div class="setting-tabs">
          <div
            v-for="(item, index) in settingTabsTitleList"
            :key="index"
            :class="['tabs-title', `${activeSettingTab === item.value ? 'active' : ''}`]"
            @click="handleUpdateActiveTab(item.value)"
          >
            {{ item.label }}
          </div>
        </div>
        <div class="divide-line"></div>
        <div class="setting-content">
          <audio-setting-tab
            v-if="activeSettingTab === 'audio'"
            :mode="SettingMode.Detail"
          ></audio-setting-tab>
        </div>
      </div>
    </div>
</template>
<script setup lang="ts">
import { ref } from 'vue';
import { computed } from 'vue';
import { useI18n } from '../../locales';
import LiveChildHeader from './LiveChildHeader.vue';
import AudioSettingTab from '../../common/AudioSettingTab.vue';
import { SettingMode } from '../../constants/render';

const { t } = useI18n();

const settingTabsTitleList = computed(() => [
  { label: t('Audio settings'), value: 'audio' },
]);

const activeSettingTab = ref('audio');

function handleUpdateActiveTab(tabTitle: string) {
  activeSettingTab.value = tabTitle;
}
</script>
<style lang="scss" scoped>
@import '../../assets/global.scss';

.tui-setting{
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow-y: auto;
    &-title{
        font-weight: 500;
        padding: 0 1.5rem 0 1.375rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
    }
}
.setting-body {
    height: calc(100% - 2.75rem);
    display: flex;
    background-color: var(--bg-color-dialog);
    .setting-tabs {
      width: 10.625rem;
      background-color: var(--bg-color-dialog);
      padding-top: 0.4375rem;
      border-bottom-left-radius: 10px;

      .tabs-title {
        width: 100%;
        height: 2.25rem;
        padding-left: 2rem;
        font-weight: $font-live-setting-body-tab-title-weight;
        font-size: $font-live-setting-body-tab-title-size;
        color: var(--text-color-primary);
        background-color: var(--tab-color-unselected);
        border-radius: 0.25rem;
        margin-left: 0.25rem;
        line-height:2.25rem;
        position: relative;
        cursor: pointer;
        &.active {
          background-color: var(--tab-color-selected);
          color: var(--text-color-link);
          font-weight: $font-live-setting-body-tab-title-active-weight;
        }
      }
    }
    .divide-line {
      width: 1px;
      height: 100%;
      background: $color-live-setting-divide-line-background;
    }
    .setting-content {
      flex-grow: 1;
      padding:1rem 1.875rem;
      width:27.875rem;
      .setting-tab {
        width: 100%;
      }
    }
  }
</style>
