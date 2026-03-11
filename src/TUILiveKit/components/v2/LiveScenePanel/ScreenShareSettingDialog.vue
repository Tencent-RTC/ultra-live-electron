<template>
    <TUIDialog
      :visible="true"
      width="100%"
      :confirmText="confirmText"
      :cancelText="cancelText"
      @close="handleClose"
      @cancel="handleClose"
      @confirm="handleConfirm"
      :confirmDisabled="!selected"
      :title="title"
      :customClasses="dialogCustomClasses"
    >
      <div class="screen-share-content">
        <div class="screen-section">
          <span class="section-title">{{ t('Screen') }}</span>
          <ul class="screen-list">
            <ScreenWindowPreviewer
              v-for="item in screenList"
              :key="item.sourceId"
              :data="item"
              :class="{ selected: item.sourceId === selected?.sourceId }"
              @click="onSelect(item)"
            />
          </ul>
        </div>
        <div class="window-section">
          <span class="section-title">{{ t('Window') }}</span>
          <ul class="window-list">
            <ScreenWindowPreviewer
              v-for="item in windowList"
              :key="item.sourceId"
              :data="item"
              :class="{ selected: item.sourceId === selected?.sourceId }"
              @click="onSelect(item)"
            />
          </ul>
        </div>
      </div>
    </TUIDialog>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { TUIDialog, useUIKit } from '@tencentcloud/uikit-base-component-vue3';
import {
  TRTCMediaSourceType,
  TRTCScreenCaptureSourceInfo,
  TRTCScreenCaptureSourceType,
} from '@tencentcloud/tuiroom-engine-electron';
import type { MediaSource } from 'tuikit-atomicx-vue3-electron';
import { useRoomEngine } from 'tuikit-atomicx-vue3-electron';
import ScreenWindowPreviewer from './ScreenWindowPreviewer.vue';
import { useDialogClasses } from '../../../hooks/useDialogClasses';
import { APP_WINDOW_TITLE_PREFIXES } from '../../../utils/windowTitle';

const { t } = useUIKit();
const roomEngine = useRoomEngine();

const props = defineProps<{
  mediaSource: MediaSource | null;
  customClasses?: string;
}>();

const emits = defineEmits(['addScreenMaterial', 'updateScreenMaterial', 'close']);

const dialogCustomClasses = useDialogClasses('screen-share-setting-dialog', () => props.customClasses);

const screenList = ref<TRTCScreenCaptureSourceInfo[]>([]);
const windowList = ref<TRTCScreenCaptureSourceInfo[]>([]);
const selected = ref<TRTCScreenCaptureSourceInfo | null>(null);

const title = computed(() => {
  return props.mediaSource ? t('Update Screen Share') : t('Add Screen Share');
});

const confirmText = computed(() => {
  return props.mediaSource ? t('Update Screen Share') : t('Add Screen Share');
});

const cancelText = t('Cancel');

const onSelect = (item: TRTCScreenCaptureSourceInfo) => {
  selected.value = item;
};

function shouldExcludeWindowSource(
  source: TRTCScreenCaptureSourceInfo,
  appWindowTitleKeywords: string[]
): boolean {
  if (source.isMinimizeWindow) {
    return true;
  }
  const sourceWindowTitle = String(source.sourceName || '').trim().toLowerCase();
  if (!sourceWindowTitle) {
    return false;
  }
  return appWindowTitleKeywords.some((keyword) => sourceWindowTitle.startsWith(keyword));
}

function buildAppWindowTitleKeywords(): string[] {
  const currentTitle = String(window.document?.title || '').trim().toLowerCase();
  const titleWithoutVersion = currentTitle.replace(/\[[^\]]*]/g, '').trim();
  return Array.from(
    new Set([
      ...APP_WINDOW_TITLE_PREFIXES,
      currentTitle,
      titleWithoutVersion,
    ].filter((item) => item.length > 2))
  );
}

async function refreshScreenList() {
  const thumbWidth = 640;
  const thumbHeight = 360;
  const iconWidth = 48;
  const iconHeight = 48;
  const trtcCloud = roomEngine.instance?.getTRTCCloud();
  const appWindowTitleKeywords = buildAppWindowTitleKeywords();
  try {
    const screenCaptureList = await trtcCloud.getScreenCaptureSources(
      thumbWidth,
      thumbHeight,
      iconWidth,
      iconHeight
    );
    screenList.value = [];
    windowList.value = [];
    screenCaptureList.forEach((screen: TRTCScreenCaptureSourceInfo) => {
      if (screen.type === TRTCScreenCaptureSourceType.TRTCScreenCaptureSourceTypeWindow) {
        if (!shouldExcludeWindowSource(screen, appWindowTitleKeywords)) {
          windowList.value.push(screen);
        }
      } else {
        screenList.value.push(screen);
      }
    });
  } catch (err) {
    console.log('refreshScreenList failed');
  }
}

function selectCurrentMediaSource() {
  if (!props.mediaSource) {
    return;
  }
  const screenMatch = screenList.value.find(
    (item) => item.sourceId === props.mediaSource?.sourceId
  );
  if (screenMatch) {
    selected.value = screenMatch;
    return;
  }
  const windowMatch = windowList.value.find(
    (item) => item.sourceId === props.mediaSource?.sourceId
  );
  if (windowMatch) {
    selected.value = windowMatch;
    return;
  }
}

onMounted(async () => {
  await nextTick(async () => {
    await refreshScreenList();
    selectCurrentMediaSource();
  });
});

watch(
  () => props.mediaSource,
  async (mediaSource) => {
    if (mediaSource) {
      await refreshScreenList();
      selectCurrentMediaSource();
    } else {
      selected.value = null;
    }
  },
  { immediate: true }
);

const handleConfirm = () => {
  if (!selected.value) {
    return;
  }
  if (!props.mediaSource) {
    emits('addScreenMaterial', {
      sourceId: selected.value.sourceId,
      sourceType: TRTCMediaSourceType.kScreen,
      name: selected.value.sourceName,
      width: selected.value.width,
      height: selected.value.height,
      screenType: selected.value.type,
    });
  } else {
    emits('updateScreenMaterial', props.mediaSource, {
      sourceId: selected.value.sourceId,
      sourceType: TRTCMediaSourceType.kScreen,
      name: selected.value.sourceName,
      width: selected.value.width,
      height: selected.value.height,
      screenType: selected.value.type,
      rect: props.mediaSource.rect,
    });
  }
};

const handleClose = () => {
  emits('close');
};
</script>

<style lang="scss" scoped>
:deep(.screen-share-setting-dialog) {
  .tui-dialog-body {
    display: flex;
    flex-direction: column;
    padding: 10px 0;
    max-height: 600px;
    overflow: hidden;
  }
}

.screen-share-content {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 24px;
  overflow-y: auto;
  max-height: 500px;
  padding: 8px 0;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
}

.screen-section,
.window-section {
  display: flex;
  flex-direction: column;
  gap: 12px;

  .section-title {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-color-secondary);
  }
}

.screen-list,
.window-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

:deep(.screen-window-previewer) {
  cursor: pointer;
  transition: all 0.2s ease;

  &.selected {
    border-color: var(--button-color-primary-default);
    border-width: 2px;
    box-shadow: 0 0 0 2px rgba(var(--button-color-primary-default-rgb, 0, 122, 255), 0.2);
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
}
</style>
