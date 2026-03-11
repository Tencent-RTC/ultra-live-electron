<template>
  <div
    class="custom-icon-container"
    :class="{ 'disabled': disabled }"
    @click="handleSwitchLayout"
  >
    <IconLayoutTemplate class="custom-icon" />
    <span class="custom-text setting-text">{{ t('Layout Settings') }}</span>
  </div>
  <LayoutConfigPanelDialog
    :layoutSwitchVisible="layoutSwitchVisible"
    :currentLayoutTemplate="currentLayoutTemplate"
    @update:layoutSwitchVisible="updateLayoutSwitchVisible"
    @confirm="handleLayoutConfirm"
  />
</template>

<script lang="ts" setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { useUIKit, TUIToast, TOAST_TYPE, IconLayoutTemplate } from '@tencentcloud/uikit-base-component-vue3';
import { useCoHostState, CoHostStatus, useLiveListState, TUIErrorCode } from 'tuikit-atomicx-vue3-electron';
import LayoutConfigPanelDialog from './LayoutConfigPanel/LayoutConfigPanelDialog.vue';
import { TUISeatLayoutTemplate } from '../../types';
import { ChildPanelType, ipcBridge, IPCMessageType } from '../../ipc';

const props = defineProps({
  isShowingInChildWindow: {
    type: Boolean,
    default: false
  }
});

const { t } = useUIKit();
const { coHostStatus } = useCoHostState();
const { currentLive, updateLiveInfo } = useLiveListState();
const disabled = computed(() => coHostStatus.value === CoHostStatus.Connected);
const currentLayoutTemplate = computed<TUISeatLayoutTemplate | null>(() => currentLive.value?.layoutTemplate ?? null);

const layoutSwitchVisible = ref(false);

watch(disabled, () => {
  if (disabled.value) {
    layoutSwitchVisible.value = false;
    if (props.isShowingInChildWindow) {
      ipcBridge.sendToElectronMain(IPCMessageType.HIDE_CHILD_PANEL, {
        panelType: ChildPanelType.LayoutConfig,
      });
    }
  }
});

watch(
  currentLayoutTemplate,
  (newVal) => {
    if (props.isShowingInChildWindow) {
      ipcBridge.sendToChild(IPCMessageType.UPDATE_CHILD_DATA, {
        panelType: ChildPanelType.LayoutConfig,
        data: {
          layoutSwitchVisible: true,
          currentLayoutTemplate: newVal ?? null,
        },
      });
    }
  }
);

const handleSwitchLayout = () => {
  if (disabled.value) {
    TUIToast({ type: TOAST_TYPE.ERROR, message: t('Layout switching is not available during co-hosting') });
    return;
  }
  if (props.isShowingInChildWindow) {
    ipcBridge.sendToChild(IPCMessageType.SHOW_CHILD_PANEL, {
      panelType: ChildPanelType.LayoutConfig,
      initialData: {
        layoutSwitchVisible: true,
        currentLayoutTemplate: currentLayoutTemplate.value ?? null,
      },
    });
  } else {
    layoutSwitchVisible.value = true;
  }
};

async function handleLayoutConfirm(options: { template: TUISeatLayoutTemplate | null} ) {
  const { template } = options;
  if (template && currentLive.value?.layoutTemplate !== template) {
    try {
      await updateLiveInfo({ layoutTemplate: template });
      layoutSwitchVisible.value = false;
    } catch (error: any) {
      let errorMessage = t('Layout switch failed');
      if (error.code === TUIErrorCode.ERR_FREQ_LIMIT) {
        errorMessage = t('Operation too frequent, please try again later');
      }
      TUIToast({ type: TOAST_TYPE.ERROR, message: errorMessage });
    }
  } else {
    layoutSwitchVisible.value = false;
  }
}

function updateLayoutSwitchVisible(value: boolean) {
  layoutSwitchVisible.value = value;
}

onMounted(() => {
  ipcBridge.on(IPCMessageType.UPDATE_LAYOUT_TEMPLATE, handleLayoutConfirm);
});

onBeforeUnmount(() => {
  ipcBridge.off(IPCMessageType.UPDATE_LAYOUT_TEMPLATE, handleLayoutConfirm);
});
</script>

<style lang="scss" scoped>
@import '../../assets/mac.scss';

.custom-icon-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-width: 56px;
  width: auto;
  height: 56px;
  cursor: pointer;
  color: $text-color1;
  border-radius: 12px;
  position: relative;

  .custom-icon {
    @include icon-size-24;
    background: transparent;
  }
  .custom-text {
    @include text-size-12;
  }

  &:not(.disabled):hover {
    box-shadow: 0 0 10px 0 var(--bg-color-mask);
    .custom-icon {
      color: $icon-hover-color;
    }
    .custom-text {
      color: $icon-hover-color;
    }
  }
  &.disabled {
    cursor: not-allowed;
    opacity: 0.5;
    color: $text-color3;
    .custom-icon {
      color: $text-color3;
      cursor: not-allowed;
    }
    .custom-text {
      color: $text-color3;
    }
  }
}
</style>
