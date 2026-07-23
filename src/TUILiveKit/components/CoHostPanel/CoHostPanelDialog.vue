<template>
  <TUIDialog
    :visible="true"
    width="100%"
    :title="title"
    :customClasses="dialogCustomClasses"
    @close="handleClose"
    @cancel="handleClose"
    @confirm="handleClose"
  >
    <template #header>
      <div class="dialog-header">
        <span class="dialog-title">{{ title }}</span>
        <div class="icon-buttons">
          <IconLiveSetting
            v-if="!inPk && !inConnection"
            class="icon-button"
            size="20"
            @click="settingVisible = true"
          />
          <IconClose class="icon-button" @click="handleClose" />
        </div>
      </div>
    </template>
    <div class="panel-content">
      <div v-if="!inConnection && !inPk" class="panel-header">
        <div class="tabs">
          <span
            :class="['tab-item', { active: activeTab === 'battleTab' }]"
            @click="activeTab = 'battleTab'"
          >
            {{ t('Host Battle') }}
          </span>
          <span
            :class="['tab-item', { active: activeTab === 'coHostTab' }]"
            @click="activeTab = 'coHostTab'"
          >
            {{ t('Host Connection') }}
          </span>
        </div>
      </div>
      <div class="panel-body">
        <div v-show="activeTab === 'battleTab'" class="battle-content">
          <BattlePanelDialog :data="props.data" @action="forwardAction" />
        </div>
        <div v-show="activeTab === 'coHostTab'" class="coHost-content">
          <ConnectionPanelDialog
            :data="props.data"
            :currentLiveOrientation="currentLiveOrientation"
            @action="forwardAction"
          />
        </div>
      </div>
    </div>
    <template #footer>
      <div />
    </template>
    <ConfigSettingPanelDialog
      v-model:visible="settingVisible"
      :form="props.data.configForm"
      :currentLiveOrientation="currentLiveOrientation"
      @action="forwardAction"
    />
  </TUIDialog>
</template>

<script setup lang="ts">
/**
 * Top-level child-window container for CoHost / Battle panels.
 *
 * Mirrors the kit `CoHostPanel.vue` layout (header + tabs + body + settings)
 * but consumes a frozen snapshot via props instead of resolving state hooks
 * inside the child renderer process. Every action surfaced by the inner
 * Battle / Connection / Config sub-panels bubbles up via `emit('action')` and
 * is then forwarded to the main window over IPC by ChildView.vue.
 */
import { computed, ref, watch } from 'vue';
import {
  TUIDialog,
  useUIKit,
  IconClose,
  IconLiveSetting,
} from '@tencentcloud/uikit-base-component-vue3';
import { CoHostStatus, LiveOrientation } from 'tuikit-atomicx-vue3-electron';
import BattlePanelDialog from './BattlePanelDialog.vue';
import ConnectionPanelDialog from './ConnectionPanelDialog.vue';
import ConfigSettingPanelDialog from './ConfigSettingPanelDialog.vue';
import { useDialogClasses } from '../../hooks/useDialogClasses';
import type { CoHostActionPayload, CoHostPanelSnapshot } from '../../ipc';

const { t } = useUIKit();

const props = defineProps<{
  customClasses?: string;
  data: CoHostPanelSnapshot;
}>();

const emit = defineEmits<{
  close: [];
  action: [payload: CoHostActionPayload];
}>();

const dialogCustomClasses = useDialogClasses('co-host-panel-dialog', () => props.customClasses);

const activeTab = ref<'battleTab' | 'coHostTab'>('coHostTab');
const settingVisible = ref(false);

const inConnection = computed(() => props.data.coHostStatus === CoHostStatus.Connected);
const inPk = computed(
  () => props.data.battleUsers.some(u => u.userId === props.data.loginUserInfo?.userId),
);

// Derive the current live orientation from the snapshot's
// `currentLive.layoutTemplate`. Layout template ids in [200, 599] denote a
// landscape live; everything else is portrait. This matches the main window
// helper in `CoHostButton.vue` and the kit's `CoHostPanel.vue` so all three
// derive the same `LiveOrientation` from the same source of truth.
const currentLiveOrientation = computed<LiveOrientation>(() => {
  const layout = props.data.currentLive?.layoutTemplate;
  if (typeof layout === 'number' && layout >= 200 && layout <= 599) {
    return LiveOrientation.Landscape;
  }
  return LiveOrientation.Portrait;
});

const title = computed(() => {
  if (inPk.value) return t('Anchor battling...');
  if (inConnection.value) return t('Anchor connecting...');
  return t('CoHost');
});

// Auto-switch tabs to follow connection / pk state, mirroring the kit version.
watch(
  inConnection,
  (newVal) => {
    if (newVal && !inPk.value) {
      activeTab.value = 'coHostTab';
    }
  },
  { immediate: true },
);
// `immediate: true` is required here (unlike the Mac kit CoHostPanel.vue).
// In Windows child-window mode this dialog is unmounted when the user closes
// it (ChildView sets currentPanel = None) and freshly remounted on the next
// open. If the live is already in PK at that point, `inPk` is true from the
// very first render with no false->true transition, so a non-immediate watcher
// would never fire and `activeTab` would stay at its default 'coHostTab',
// wrongly showing the connection list instead of the battle list. Running the
// watcher immediately makes the initial tab follow the current PK state.
watch(
  inPk,
  (newVal, oldVal) => {
    if (newVal) {
      activeTab.value = 'battleTab';
      return;
    }
    if (oldVal === true) {
      activeTab.value = 'coHostTab';
    }
  },
  { immediate: true },
);

function forwardAction(payload: CoHostActionPayload) {
  emit('action', payload);
}

function handleClose() {
  emit('close');
}
</script>

<style lang="scss" scoped>
:deep(.co-host-panel-dialog) {
  width: 100% !important;
  height: 100% !important;
  max-height: 100% !important;
  min-height: 0 !important;
  border-radius: 0;
  padding: 0 20px 20px 20px !important;
  display: flex;
  flex-direction: column;

  > .tui-dialog-header {
    padding-right: 0;
    flex-shrink: 0;
  }

  > .tui-dialog-body {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  > .tui-dialog-footer {
    display: none;
  }
}

.dialog-header {
  display: flex;
  align-items: center;
  padding: 0;
  width: 100%;
  justify-content: space-between;

  .dialog-title {
    font-size: 16px;
    line-height: 24px;
    font-weight: 600;
    color: var(--text-color-primary);
  }

  .icon-buttons {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .icon-button {
    cursor: pointer;
  }
}

.panel-content {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 200px;

  .panel-header {
    display: flex;
    align-items: center;
    flex-shrink: 0;

    .tabs {
      display: flex;
      gap: 24px;
      flex-grow: 1;

      .tab-item {
        background: none;
        border: none;
        color: var(--text-color-secondary);
        font-size: 16px;
        padding: 12px 0;
        cursor: pointer;
        position: relative;
        transition: color 0.3s ease;
        user-select: none;

        &.active {
          color: var(--text-color-link);
          font-weight: 500;

          &::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 3px;
            background-color: var(--text-color-link);
            border-radius: 1.5px;
          }
        }
      }
    }
  }

  .panel-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: auto;
    min-height: 0;

    &::-webkit-scrollbar {
      width: 4px;
    }

    &::-webkit-scrollbar-thumb {
      background: #414756;
      border-radius: 2px;
    }
  }
}

.battle-content,
.coHost-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  height: 100%;
  overflow: hidden;
  flex: 1;
  min-height: 0;
}
</style>
