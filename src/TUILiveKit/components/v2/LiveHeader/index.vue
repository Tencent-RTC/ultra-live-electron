<template>
  <header class="live-header tui-window-header">
    <div class="left">
      <svg-icon class="logo-icon">
        <logo-icon></logo-icon>
      </svg-icon>
      <span class="title">LiveKit</span>
    </div>
    <div class="right">
      <div class="statistics">
        <div class="statistics-container" v-for="(item, index) in statisticsInfoList" :key="item.text">
          <span class="statistics-text">{{ item.text }}</span>
          <span class="statistics-value">{{ item.value }}</span>
          <i class="statistics-space" v-if="index < statisticsInfoList.length - 1"></i>
        </div>
      </div>
      <div class="header-right">
        <div
          v-if="loginUserInfo"
          class="user-info-content"
          @click="handleUserControl"
          v-click-outside="handleHideUserControl"
        >
          <Avatar :src="loginUserInfo?.avatarUrl" :size="24" />
          <div class="header-right-name">
            {{ loginUserInfo?.userName || loginUserInfo?.userId }}
          </div>
          <button class="tui-live-icon">
            <IconArrowStrokeSelectDown
              :class="[showUserControl ? 'up-icon' : 'down-icon']"
            />
          </button>
        </div>
        <div v-if="showUserControl" class="user-control-container">
          <div class="user-control-item-foot" @click="openProfile">{{ t('User Profile') }}</div>
          <div class="user-control-item-foot" @click="handleLogOut">{{ t('Logout') }}</div>
        </div>
      </div>
      <div class="window-tool">
        <button class="tui-live-icon" @click="onMinimize">
          <svg-icon :icon="MinimizeIcon"></svg-icon>
        </button>
        <button class="tui-live-icon" @click="onToggleMaximize">
          <svg-icon v-if="!isMaximized" :icon="MaximizeIcon"></svg-icon>
          <svg-icon v-else :icon="MiniIcon"></svg-icon>
        </button>
        <button class="tui-live-icon" @click="onClose">
          <svg-icon :icon="CloseIcon"></svg-icon>
        </button>
      </div>
    </div>
  </header>

  <!-- User Profile Dialog -->
  <UserProfileDialog
    v-model:visible="showProfileDialog"
    :userInfo="userProfileInfo"
    @save="onSaveProfileDialog"
    @close="onCancelProfileDialog"
  />
</template>

<script lang="ts" setup>
import { onMounted, onBeforeUnmount, ref, computed, type Ref } from 'vue';
import { useUIKit, TUIToast, TOAST_TYPE, IconArrowStrokeSelectDown } from '@tencentcloud/uikit-base-component-vue3';
import { useLoginState, Avatar } from 'tuikit-atomicx-vue3-electron';
import type { TRTCStatistics } from 'trtc-electron-sdk';
import SvgIcon from '../../../common/base/SvgIcon.vue';
import LogoIcon from '../../../common/icons/LogoIcon.vue';
import MaximizeIcon from '../../../common/icons/MaximizeIcon.vue';
import MinimizeIcon from '../../../common/icons/MinimizeIcon.vue';
import MiniIcon from '../../../common/icons/MiniIcon.vue';
import CloseIcon from '../../../common/icons/CloseIcon.vue';
import trtcCloud from '../../../utils/trtcCloud';
import vClickOutside from '../../../utils/vClickOutside';
import UserProfileDialog from './UserProfileDialog.vue';
import { ChildPanelType, ipcBridge, IPCMessageType, toPlainIpcPayload } from '../../../ipc';
import logger from '../../../utils/logger';

const logPrefix = '[LiveHeader]';

const props = defineProps({
  isShowingInChildWindow: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits<{
  logout: [];
}>();

const { t } = useUIKit();
const { loginUserInfo, setSelfInfo } = useLoginState();

// User control dropdown state
const showUserControl = ref(false);
const showProfileDialog = ref(false);

// Construct userInfo for UserProfileDialog
const userProfileInfo = computed(() => ({
  userId: loginUserInfo.value?.userId || '',
  userName: loginUserInfo.value?.userName || '',
  avatarUrl: loginUserInfo.value?.avatarUrl || '',
}));

// Performance statistics
const isMaximized: Ref<boolean> = ref(false);
const statistics = ref<TRTCStatistics>({
  appCpu: 0,
  downLoss: 0,
  localStatisticsArray: [],
  localStatisticsArraySize: 0,
  receivedBytes: 0,
  remoteStatisticsArray: [],
  remoteStatisticsArraySize: 0,
  rtt: 0,
  sentBytes: 0,
  systemCpu: 0,
  upLoss: 0,
  appMemoryUsageInMB: 0,
} as unknown as TRTCStatistics);

const frameRate = computed(() => {
  return statistics.value.localStatisticsArray?.[0]?.frameRate || 0;
});

const statisticsInfoList = computed(() => [
  {
    text: t('CPU'),
    value: statistics.value.appCpu + '%',
  },
  {
    text: t('RAM'),
    value: statistics.value.appMemoryUsageInMB + 'MB',
  },
  {
    text: t('Frame Rate'),
    value: String(frameRate.value || 0),
  }
]);

// Handle statistics update from TRTCCloud
function onStatistics(statis: TRTCStatistics) {
  statistics.value = statis;
}

// Window control functions
const onMinimize = () => {
  console.log('[LiveHeader]onMinimize');
  if (window.ipcRenderer) {
    window.ipcRenderer.send('on-minimize-window', null);
  }
};

const onToggleMaximize = () => {
  console.log('[LiveHeader]onToggleMaximize');
  isMaximized.value = !isMaximized.value;
  if (window.ipcRenderer) {
    window.ipcRenderer.send('on-maximize-window', isMaximized.value);
  }
};

const onClose = () => {
  console.log('[LiveHeader]onClose');
  if (window.ipcRenderer) {
    window.ipcRenderer.send('on-close-window', null);
  }
};

/**
 * Handle user control dropdown toggle
 */
function handleUserControl() {
  showUserControl.value = !showUserControl.value;
}

/**
 * Handle hide user control dropdown
 */
function handleHideUserControl() {
  showUserControl.value = false;
}

/**
 * Open user profile dialog
 */
function openProfile() {
  showUserControl.value = false;

  if (props.isShowingInChildWindow) {
    // If in child window, send IPC to main process to open profile dialog in a new child window
    ipcBridge.sendToChild(IPCMessageType.SHOW_CHILD_PANEL, {
      panelType: ChildPanelType.UserProfile,
      initialData: toPlainIpcPayload(userProfileInfo.value),
    });
  } else {
    // Otherwise, open profile dialog in current window
    showProfileDialog.value = true;
  }
}

/**
 * Handle profile dialog save event
 * Call setSelfInfo to persist changes and provide toast feedback
 */
async function onSaveProfileDialog(data: { userName: string; avatarUrl: string }) {
  try {
    logger.debug(`${logPrefix} Saving user profile`, data);
    await setSelfInfo({
      userName: data.userName,
      avatarUrl: data.avatarUrl,
    });

    TUIToast({
      message: t('Save successfully'),
      type: TOAST_TYPE.SUCCESS,
    });

    showProfileDialog.value = false;
  } catch (error) {
    logger.error(`${logPrefix} Save user profile error:`, error);
    TUIToast({
      message: t('Save failed'),
      type: TOAST_TYPE.ERROR,
    });
  }
}

/**
 * Handle profile dialog cancel event
 */
function onCancelProfileDialog() {
  showProfileDialog.value = false;
}

/**
 * Handle logout button click
 * Emit logout event to parent component
 */
function handleLogOut() {
  showUserControl.value = false;
  emit('logout');
}

onMounted(async () => {
  trtcCloud.on('onStatistics', onStatistics);
  ipcBridge.on(IPCMessageType.UPDATE_USER_PROFILE, onSaveProfileDialog);
});

onBeforeUnmount(() => {
  trtcCloud.off('onStatistics', onStatistics);
  ipcBridge.off(IPCMessageType.UPDATE_USER_PROFILE, onSaveProfileDialog);
});

</script>

<style lang="scss" scoped>
@import "../../../assets/variable.scss";
.live-header {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 2.75rem;
  line-height: 2.75rem;
  padding: 0 1rem;
  font-size: $font-live-header-size;
  user-select: none;
  -webkit-user-select: none;
  -webkit-app-region: drag;
  background-color: var(--bg-color-topbar);

  .left {
    margin-left: 8px;
    display: inline-flex;
    align-items: center;
    .tui-live-icon {
      margin-left: 0;
      margin-right: 0.25rem;
      font-size: $font-live-header-left-tui-live-icon-size;
    }
    .title {
      font-weight: $font-live-header-left-title-weight;
      font-size: $font-live-header-left-title-size;
      padding-left: 0.6rem;
      font-weight: bold;
    }
    .logo-icon {
      width: 1.625rem;
      height: 1.5rem;
    }
  }
  .header-left {
    display: flex;
    align-items: center;
    gap: 4px;

    &:hover {
      cursor: pointer;
    }

    .header-left-logo {
      width: 26px;
      height: 24px;
    }

    .header-left-title {
      font-size: 18px;
      font-weight: 600;
      color: var(--text-color-primary);
    }
  }

  .right {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .statistics {
    display: flex;
    position: relative;
    align-items: center;
    &-container {
      display: flex;
      align-items: center;
      position: relative;
      padding-right: 0.5rem;
    }
    &-text {
      font-style: normal;
      font-weight: 400;
      line-height: 1.25rem;
      color: var(--text-color-primary, #ffffff);
    }
    &-value {
      padding: 0 0.375rem;
      font-style: normal;
      font-weight: 400;
      line-height: 1.25rem;
      color: var(--text-color-primary, #ffffff);
    }
    &-space {
      position: absolute;
      right: 0;
      top: 50%;
      transform: translateY(-50%);
      display: inline-block;
      height: 0.75rem;
      width: 0.0625rem;
      background-color: var(--text-color-primary, #ffffff);
      margin-right: 0.5rem;
    }
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-right: 8px;
    position: relative;

    .user-info-content {
      display: flex;
      align-items: center;
      cursor: pointer;
      -webkit-app-region: no-drag;
      gap: 0.5rem;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      transition: background-color 0.2s ease;

      .header-right-name {
        max-width: 6.25rem;
        font-size: 0.75rem;
        font-weight: 400;
        color: var(--text-color-primary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .tui-live-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 1rem;
        height: 1rem;
        border: none;
        background: transparent;
        color: var(--text-color-primary);
        cursor: pointer;
        padding: 0;
        margin: 0;
        margin-left: 0.25rem;

        .down-icon {
          transition: transform 0.2s ease;
        }

        .up-icon {
          transition: transform 0.2s ease;
          transform: rotate(180deg);
        }
      }
    }

    .user-control-container {
      position: absolute;
      top: 2.5rem;
      right: 0;
      z-index: 999;
      font-weight: normal;

      width: auto;
      min-width: 6.25rem;
      height: auto;
      max-height: 10rem;
      overflow-y: auto;
      border-radius: 0.5rem;

      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;

      background-color: var(--dropdown-color-default);
      box-shadow: 0px 1px 5px var(--shadow-color),
                  0px 8px 12px var(--shadow-color),
                  0px 12px 26px var(--shadow-color);
      color: var(--text-color-primary);
      -webkit-app-region: no-drag;

      &::before {
        content: '';
        position: absolute;
        right: 1rem;
        top: -1.25rem;
        width: 0rem;
        border-top: 0.625rem solid transparent;
        border-right: 0.625rem solid transparent;
        border-bottom: 0.625rem solid var(--dropdown-color-default);
        border-left: 0.625rem solid transparent;
      }

      &::after {
        content: '';
        width: 100%;
        height: 1.25rem;
        position: absolute;
        left: 0rem;
        top: 1.25rem;
        background-color: transparent;
      }

      .user-control-item-foot {
        width: 100%;
        height: 100%;
        padding: 0 0.5rem 0 1rem;
        border-radius: 0.25rem;
        color: var(--text-color-primary);
        font-size: 0.875rem;
        text-align: left;
        cursor: pointer;
        z-index: 999;
        line-height: 2.5rem;
        min-height: 2.5rem;
        display: flex;
        align-items: center;

        &:first-child {
          border-radius: 0.25rem 0.25rem 0 0;
        }

        &:last-child {
          border-radius: 0 0 0.25rem 0.25rem;
        }
      }
    }

    .btn-start-live {
      margin-right: 20px;
    }
  }

  .window-tool {
    display: flex;
    align-items: center;
    align-self: flex-end;
    height: 3rem;
    -webkit-app-region: no-drag;

    .tui-live-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2rem;
      height: 2rem;
      border: none;
      background: transparent;
      color: var(--text-color-primary, #ffffff);
      cursor: pointer;
      padding: 0;
      margin: 0;

      &:hover {
        background-color: rgba(255, 255, 255, 0.1);
      }

      &:active {
        background-color: rgba(255, 255, 255, 0.2);
      }
    }
  }
}

</style>
