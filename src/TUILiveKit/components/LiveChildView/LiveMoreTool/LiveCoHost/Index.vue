<template>
  <div class="live-co-host">
    <LiveChildHeader :title="title">
      <button v-if="!isInBattle && !isInConnection" class="tui-live-icon" @click="openCoHostSetting">
        <svg-icon :icon="LayoutSettingIcon"></svg-icon>
      </button>
    </LiveChildHeader>
    <LiveCoHostSetting
      :visible="isSettingVisible"
      :form="configForm"
      :confirmText="t('Confirm')"
      :cancelText="t('Cancel')"
      @update:visible="(val) => isSettingVisible = val"
      @on-confirm="confirmSetting"
      @on-cancel="cancelSetting"/>
    <div v-if="!isInConnection" class="live-co-host-tabs">
      <span class="live-co-host-tab" :class="{'is-active': activeTab === TabType.Battle}" @click="switchToBattle">{{ t('Co-host battle') }}</span>
      <span class="live-co-host-tab" :class="{'is-active': activeTab === TabType.Connection}" @click="switchToConnection">{{ t('Co-host connection') }}</span>
    </div>
    <div class="live-co-host-content">
      <LiveCoHostBattle v-show="activeTab === TabType.Battle" @on-load-more="fetchMoreLiveList" @on-refresh-list="fetchLiveList"/>
      <LiveCoHostConnection v-show="activeTab === TabType.Connection" @on-load-more="fetchMoreLiveList" @on-refresh-list="fetchLiveList"/>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, Ref, defineProps, onMounted, computed, watch } from 'vue';
import { storeToRefs } from 'pinia';
import LiveChildHeader from '../../LiveChildHeader.vue';
import SvgIcon from '../../../../common/base/SvgIcon.vue';
import LayoutSettingIcon from '../../../../common/icons/LayoutSettingIcon.vue';
import LiveCoHostSetting from './LiveCoHostSetting.vue';
import LiveCoHostBattle from './LiveCoHostBattle.vue';
import LiveCoHostConnection from './LiveCoHostConnection.vue';
import { useCurrentSourceStore } from '../../../../store/child/currentSource';
import { useI18n } from '../../../../locales';
import { TUICoHostLayoutTemplate } from '../../../../types';
import { debounce } from '../../../../utils/utils';
import logger from '../../../../utils/logger';

enum TabType {
  Battle = 1,
  Connection = 2,
}

type Props = {
  data?: any;
};

const props = defineProps<Props>();

const logPrefix = '[LiveCoHost]';

const { t } = useI18n();

const currentSourceStore = useCurrentSourceStore();
const { isInConnection, isInBattle } = storeToRefs(currentSourceStore);

const activeTab: Ref<TabType> = ref(TabType.Battle);
const isSettingVisible = ref(false);
const selectedTemplate = ref(TUICoHostLayoutTemplate.HostDynamicGrid);

const openCoHostSetting = () => {
  isSettingVisible.value = true;
};

const title = computed(() => {
  if (isInBattle.value) {
    return t('Co-host in battle ...');
  } else if (isInConnection.value) {
    return t('Co-host in connection ...');
  }
  return t('Anchor Co-host');
});

const configForm = ref({
  battleDuration: props?.data?.duration || 5 * 60,
  coHostLayoutTemplate: props?.data?.layoutTemplate || TUICoHostLayoutTemplate.HostDynamicGrid,
});

const switchToBattle = () => {
  activeTab.value = TabType.Battle;
};

const switchToConnection = () => {
  activeTab.value = TabType.Connection;
};

const fetchLiveList = () => {
  logger.debug(`${logPrefix}fetchLiveList`);
  window.mainWindowPortInChild?.postMessage({
    key: 'fetchLiveList',
    data: {},
  });
};

const fetchMoreLiveList = debounce(() => {
  logger.debug(`${logPrefix}fetchMoreLiveList`);
  window.mainWindowPortInChild?.postMessage({
    key: 'fetchMoreLiveList',
    data: {},
  });
}, 200);

const confirmSetting = (form: {
  battleDuration: number;
  coHostLayoutTemplate: TUICoHostLayoutTemplate;
}) => {
  logger.debug(`${logPrefix}handleLayoutTemplateChange:`, form);
  configForm.value = form;
  window.mainWindowPortInChild?.postMessage({
    key: 'setCoHostSetting',
    data: {
      layoutTemplate: configForm.value.coHostLayoutTemplate,
      duration: configForm.value.battleDuration,
    }
  });
};

const cancelSetting = () => {
  logger.debug(`${logPrefix}cancelSetting`);
};

watch([isInBattle, isInConnection], () => {
  if (isInBattle.value) {
    activeTab.value = TabType.Battle;
  } else if (isInConnection.value) {
    activeTab.value = TabType.Connection;
  }
}, {
  immediate: true
});

watch(
  () => props.data,
  (newVal) => {
    if (newVal) {
      configForm.value.battleDuration = newVal.duration;
      configForm.value.coHostLayoutTemplate = newVal.layoutTemplate;
      selectedTemplate.value = newVal.layoutTemplate;
    }
  },
  { immediate: true }
);

onMounted(() => {
  logger.log(`${logPrefix} onMounted`);
  fetchLiveList();
});
</script>


<style lang="scss">
@import "../../../../assets/global.scss";

.live-co-host {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 100%;
  color: var(--text-color-primary);
  background-color: var(--bg-color-dialog);

  .live-co-host-tabs {
    display: flex;
    justify-content: flex-start;
    align-items: center;
    height: 2.5rem;
    line-height: 2.5rem;
    border-bottom: 1px solid var(--border-color-secondary);
    padding: 0 1.5rem;
    gap: 1rem;

    .live-co-host-tab {
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

  .live-co-host-content {
    flex: 1 1 auto;
    width: 100%;
    height: calc(100% - 2.75rem - 2.5rem);
    padding-bottom: 0.5rem;
  }

  .tui-co-host-battle-content,
  .tui-co-host-connection-content {
    height: calc(100% - 2.75rem);
    padding: 0 1.5rem;
    overflow-y: auto;
  }

  .tui-co-host-list-title {
    line-height: 2.5rem;
    font-size: 0.875rem;
    color: var(--text-color-secondary);
  }

  .tui-co-host-list-refresh-icon {
    width: 0.875rem;
    height: auto;
    margin-left: 0.5rem;
    cursor: pointer;
    color: var(--text-color-link);
    vertical-align: middle;

    &:hover {
      color: var(--text-color-link-hover);
      transform: scale(1.1);
    }
  }

  .tui-co-host-list-item {
    height: 3rem;
    line-height: 3rem;
    display: flex;
    justify-content: space-between;
    gap: 0.75rem;
    align-items: center;
  }

  .tui-co-host-list-item-left {
    flex: 0 0 2.5rem;
    width: 2.5rem;
    height: 100%;
    display: flex;
    align-items: center;
  }

  .tui-co-host-list-item-avatar {
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 50%;
  }

  .tui-co-host-list-item-right {
    flex: 1 1 auto;
    width: auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-shadow: 0 1px 0 0 var(--stroke-color-secondary);
  }

  .tui-button-in-list {
    padding: 0.125rem 0.5rem;
    font-size: 0.75rem;
  }

  .tui-co-host-no-more-data {
    height: 6rem;
    padding: 1rem;
    line-height: 4rem;
    text-align: center;
    color: var(--text-color-secondary);
    font-size: 0.875rem;
  }

  .tui-co-host-footer {
    height: 3rem;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 1.75rem;
    padding: 0 1.5rem;
    background-color: var(--bg-color-dialog);
  }
}
</style>
