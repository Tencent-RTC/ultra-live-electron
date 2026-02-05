<template>
  <div class="tui-co-guest">
    <LiveChildHeader :title="t('CoGuest')">
      <button class="tui-live-icon" @click="openLayoutConfig">
        <svg-icon :icon="LayoutSettingIcon"></svg-icon>
      </button>
    </LiveChildHeader>
    <LayoutConfig
      :visible="isLayoutConfigVisible"
      :confirmText="t('Confirm')"
      :cancelText="t('Cancel')"
      :layoutTemplate="selectedTemplate"
      @update:visible="(val) => isLayoutConfigVisible = val"
      @update:layoutTemplate="handleLayoutTemplateChange"/>
    <div class="tui-co-guest-tabs">
      <span class="tui-co-guest-tab" :class="{'is-active': activeTab === TabType.ApplicationList}" @click="switchToApplicationList">{{ t('Application for live') }}</span>
      <span class="tui-co-guest-tab" :class="{'is-active': activeTab === TabType.SeatList}" @click="switchToSeatList">{{ t('Co-guest management') }}</span>
    </div>
    <div class="tui-co-guest-content">
      <ApplicationList v-show="activeTab === TabType.ApplicationList" @on-accept="onAccept" @on-reject="onReject"/>
      <SeatList v-show="activeTab === TabType.SeatList"/>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, Ref, watch, defineProps } from 'vue';
import LiveChildHeader from '../LiveChildHeader.vue';
import SvgIcon from '../../../common/base/SvgIcon.vue';
import LayoutSettingIcon from '../../../common/icons/LayoutSettingIcon.vue';
import LayoutConfig from './LayoutConfig.vue';
import ApplicationList from './ApplicationList.vue';
import SeatList from './SeatList.vue';
import { TUISeatLayoutTemplate } from '../../../types';
import { useI18n } from '../../../locales';
import logger from '../../../utils/logger';

enum TabType {
  ApplicationList = 1,
  SeatList = 2,
}

interface Props {
  data: any;
}
const props = defineProps<Props>();

const logPrefix = '[LiveCoGuest]';

const isLayoutConfigVisible = ref(false);

const { t } = useI18n();
const activeTab: Ref<TabType> = ref(TabType.ApplicationList);
const selectedTemplate = ref<TUISeatLayoutTemplate | null>(props.data.layoutTemplate || null);

const switchToApplicationList = () => {
  activeTab.value = TabType.ApplicationList;
};

const switchToSeatList = () => {
  activeTab.value = TabType.SeatList;
};

const openLayoutConfig = () => {
  logger.debug(`${logPrefix}openLayoutConfig`);
  isLayoutConfigVisible.value = true;
};

const enableDefaultLayoutTemplate = () => {
  if (selectedTemplate.value === null || selectedTemplate.value === TUISeatLayoutTemplate.None) {
    handleLayoutTemplateChange(TUISeatLayoutTemplate.PortraitDynamic_Grid9);
  }
};

const handleLayoutTemplateChange = (template: TUISeatLayoutTemplate) => {
  logger.debug(`${logPrefix}handleLayoutTemplateChange:`, template);
  selectedTemplate.value = template;
  window.mainWindowPortInChild?.postMessage({
    key: 'setCoGuestLayoutTemplate',
    data: {
      layoutTemplate: template
    }
  });
};

const onAccept = (user: any) => {
  logger.debug(`${logPrefix}onAccept:`, user);
  window.mainWindowPortInChild?.postMessage({
    key: 'handleUserApply',
    data: {
      user: JSON.stringify(user),
      agree: true
    }
  });

  enableDefaultLayoutTemplate();
};

const onReject = (user: any) => {
  logger.debug(`${logPrefix}onReject:`, user);
  window.mainWindowPortInChild?.postMessage({
    key: 'handleUserApply',
    data: {
      user: JSON.stringify(user),
      agree: false
    }
  });
};

watch (
  () => props.data.layoutTemplate,
  (newVal) => {
    logger.debug(`${logPrefix}props.data.layoutTemplate changed:`, newVal);
    selectedTemplate.value = newVal;
  },
  { immediate: true }
);
</script>

<style lang="scss">
@import "../../../assets/global.scss";

.tui-co-guest {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 100%;
  color: var(--text-color-primary);
  background-color: var(--bg-color-dialog);

  .tui-co-guest-tabs {
    display: flex;
    justify-content: flex-start;
    align-items: center;
    height: 2.5rem;
    line-height: 2.5rem;
    border-bottom: 1px solid var(--border-color-secondary);
    padding: 0 1.5rem;
    gap: 1rem;

    .tui-co-guest-tab {
      font-size: 1rem;
      font-weight: 500;
      color: var(--text-color-secondary);
      cursor: pointer;

      &:hover {
        color: var(--text-color-primary);
      }

      &.is-active {
        color: var(--text-color-link);
        box-shadow: inset 0 -0.125rem var(--text-color-link);

        &:hover {
          color: var(--text-color-link-hover);
          box-shadow: inset 0 -0.125rem var(--text-color-link-hover);
        }
      }
    }
  }

  .tui-co-guest-content {
    flex: 1 1 auto;
    width: 100%;
    height: calc(100% - 2.75rem - 2.5rem);
    padding-bottom: 0.5rem;
  }

  .tui-co-guest-apply-content,
  .tui-co-guest-seat-content {
    height: calc(100% - 2.75rem);
    padding: 0 1.5rem;
    overflow-y: auto;
  }

  .tui-co-guest-list-title {
    line-height: 2.5rem;
    font-size: 0.875rem;
    color: var(--text-color-secondary);
  }

  .tui-co-guest-list {
    height: 100%;
    display: flex;
    flex-direction: column;
    flex: 1;
    padding: 0.5rem 1.5rem;

    .tui-co-guest-item {
      height: 3rem;
      line-height: 3rem;
      display: flex;
      justify-content: space-between;
      gap: 0.75rem;
      align-items: center;
    }

    .tui-co-guest-item-left {
      flex: 0 0 2.5rem;
      width: 2.5rem;
      height: 100%;
      display: flex;
      align-items: center;
    }

    .tui-co-guest-avatar {
      width: 2.5rem;
      height: 2.5rem;
      border-radius: 50%;
    }

    .tui-co-guest-item-right {
      flex: 1 1 auto;
      width: auto;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: 0 1px 0 0 var(--stroke-color-secondary);
    }

    .tui-co-guest-actions {
      display: flex;
      gap: 0.375rem;

      .live-action {
        padding: 0.25rem 1rem;
      }

      .tui-co-guest-reject {
        color: $color-error;
        border-color: $color-error;
      }
    }

    .tui-co-guest-empty {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 4rem;
      flex: 1;
    }
  }
}
</style>
