<template>
  <div
    class="custom-icon-container"
    :class="{ disabled: disabled }"
    @click="handleCoGuest"
  >
    <span
      v-if="applicants.length > 0"
      class="unread-count"
    >{{ applicants.length }}</span>
    <IconCoGuest class="custom-icon" />
    <span class="custom-text co-guest-text">{{ t('CoGuest') }}</span>
  </div>
  <TUIDialog
    :title="t('CoGuest')"
    :visible="coGuestPanelVisible"
    :custom-classes="['co-guest-dialog']"
    @close="coGuestPanelVisible = false"
    @confirm="coGuestPanelVisible = false"
    @cancel="coGuestPanelVisible = false"
  >
    <CoGuestPanel class="co-guest-panel" />
    <template #footer>
      <div />
    </template>
  </TUIDialog>
</template>

<script lang="ts" setup>
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue';
import { useUIKit, TUIDialog, TUIToast, TOAST_TYPE, IconCoGuest } from '@tencentcloud/uikit-base-component-vue3';
import { CoGuestPanel, CoHostStatus, useCoGuestState, useCoHostState, useLiveListState, useLiveSeatState, useLoginState } from 'tuikit-atomicx-vue3-electron';
import { ipcBridge, IPCMessageType, toPlainIpcPayload, ChildPanelType } from '../../ipc';
import { ERROR_MESSAGE } from './CoGuestPanel/constants';

const props = defineProps({
  isShowingInChildWindow: {
    type: Boolean,
    default: false
  }
});

const { t } = useUIKit();
const {
  connected,
  applicants,
  acceptApplication,
  rejectApplication
} = useCoGuestState();
const { currentLive } = useLiveListState();
const { coHostStatus } = useCoHostState();
const { loginUserInfo } = useLoginState();
const { kickUserOutOfSeat } = useLiveSeatState();
const disabled = computed(() => !currentLive.value?.liveId || coHostStatus.value !== CoHostStatus.Disconnected);

const coGuestPanelVisible = ref(false);
const isCoGuestChildWindowOpen = ref(false);

const sendCoGuestPanelData = () => {
  if (props.isShowingInChildWindow && isCoGuestChildWindowOpen.value) {
    ipcBridge.sendToChild(IPCMessageType.UPDATE_CHILD_DATA, {
      panelType: ChildPanelType.CoGuestConnection,
      data: {
        connected: toPlainIpcPayload(connected.value),
        applicants: toPlainIpcPayload(applicants.value),
        loginUserInfo: toPlainIpcPayload(loginUserInfo.value),
      },
    });
  }
};

const handleCoGuest = () => {
  if (disabled.value) {
    const message = !currentLive.value?.liveId
      ? t('Cannot use co-guest before live starts')
      : t('Cannot enable audience co-hosting while co-hosting with other hosts');
    TUIToast({ type: TOAST_TYPE.ERROR, message });
    return;
  }

  if (props.isShowingInChildWindow) {
    isCoGuestChildWindowOpen.value = true;
    ipcBridge.sendToChild(IPCMessageType.SHOW_CHILD_PANEL, {
      panelType: ChildPanelType.CoGuestConnection,
      initialData: {
        connected: toPlainIpcPayload(connected.value),
        applicants: toPlainIpcPayload(applicants.value),
        loginUserInfo: toPlainIpcPayload(loginUserInfo.value),
      },
    });
  } else {
    coGuestPanelVisible.value = true;
  }
};

watch(disabled, () => {
  if (disabled.value) {
    coGuestPanelVisible.value = false;
    if (props.isShowingInChildWindow) {
      ipcBridge.sendToElectronMain(IPCMessageType.HIDE_CHILD_PANEL, {
        panelType: ChildPanelType.CoGuestConnection,
      });
    }
    isCoGuestChildWindowOpen.value = false;
  }
});

watch([applicants, connected], () => {
  sendCoGuestPanelData();
});

const onAcceptCoGuest = async (payload: { userId: string }) => {
  try {
    await acceptApplication({userId: payload.userId});
  } catch (error: any) {
    console.warn('[CoGuestButton] onAcceptCoGuest error', error);
    const message = t(ERROR_MESSAGE[error.code as keyof typeof ERROR_MESSAGE] || 'Accept co-guest request failed');
    TUIToast.error({ message });
  }
};

const onRejectCoGuest = async (payload: { userId: string }) => {
  try {
    await rejectApplication({userId: payload.userId});
  } catch (error) {
    console.warn('[CoGuestButton] onRejectCoGuest error', error);
    TUIToast.error({
      message: t('Reject co-guest request failed'),
    });
  }
};

const onKickOffSeat = async (payload: { userId: string }) => {
  try {
    await kickUserOutOfSeat({userId: payload.userId});
  } catch (error) {
    console.warn('[CoGuestButton] onKickOffSeat error', error);
    TUIToast.error({
      message: t('Disconnect co-guest failed'),
    });
  }
};

onMounted(() => {
  ipcBridge.on(IPCMessageType.ACCEPT_CO_GUEST, onAcceptCoGuest);
  ipcBridge.on(IPCMessageType.REJECT_CO_GUEST, onRejectCoGuest);
  ipcBridge.on(IPCMessageType.KICK_OFF_SEAT, onKickOffSeat);
});

onBeforeUnmount(() => {
  ipcBridge.off(IPCMessageType.ACCEPT_CO_GUEST, onAcceptCoGuest);
  ipcBridge.off(IPCMessageType.REJECT_CO_GUEST, onRejectCoGuest);
  ipcBridge.off(IPCMessageType.KICK_OFF_SEAT, onKickOffSeat);
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

  .unread-count {
    position: absolute;
    top: 0;
    right: 0;
    background-color: var(--text-color-error);
    border-radius: 50%;
    width: 16px;
    height: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
  }

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
      cursor: not-allowed;
    }
    .custom-text {
      color: $text-color3;
    }
  }
}

.co-guest-panel {
  height: 560px;
}

:deep(.co-guest-dialog) {
  width: 520px;
}
</style>
