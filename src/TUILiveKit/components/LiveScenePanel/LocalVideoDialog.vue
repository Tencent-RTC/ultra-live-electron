<template>
  <TUIDialog
    :visible="true"
    width="100%"
    :confirmText="confirmText"
    :cancelText="t('Cancel')"
    @close="handleClose"
    @cancel="handleClose"
    @confirm="handleConfirm"
    :confirmDisabled="!filePath || isSubmitting"
    :title="title"
    :customClasses="dialogCustomClasses"
  >
    <div class="local-video-setting">
      <div class="item-setting">
        <span class="title">{{ t('Video File') }}</span>
        <div class="file-select-row">
          <input
            class="file-path-input"
            type="text"
            :value="filePath"
            :placeholder="t('Please select a video file')"
            readonly
          />
          <button class="browse-btn" @click="handleBrowse">{{ t('Browse') }}</button>
        </div>
      </div>
      <div class="item-setting">
        <span class="title">{{ t('Volume') }}</span>
        <div class="volume-row">
          <TUISlider
            v-model="playoutVolume"
            class="volume-slider"
            :min="0"
            :max="100"
          />
          <span class="volume-value">{{ playoutVolume }}</span>
        </div>
      </div>
    </div>
  </TUIDialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { TUIDialog, TUISlider, TUIToast, TOAST_TYPE, useUIKit } from '@tencentcloud/uikit-base-component-vue3';
import type { MediaSource } from 'tuikit-atomicx-vue3-electron';
import { useDialogClasses } from '../../hooks/useDialogClasses';

// In Electron, the File interface is augmented with a `path` property exposing
// the absolute local file path. Mirrors the `ElectronFile` interface defined in
// the shared types package, but kept inline here to avoid coupling this child-window
// component to the shared types module.
type ElectronFile = File & { path: string };

const { t } = useUIKit();

const props = defineProps<{
  mediaSource?: MediaSource | null;
  customClasses?: string;
}>();

const emits = defineEmits<{
  addLocalVideoMaterial: [payload: { filePath: string; fileName: string; playoutVolume: number }];
  updateLocalVideoMaterial: [oldMediaSource: MediaSource, payload: { filePath: string; fileName: string; playoutVolume: number }];
  close: [];
}>();

const dialogCustomClasses = useDialogClasses('local-video-dialog', () => props.customClasses);

const isEditMode = computed(() => !!props.mediaSource);

const title = computed(() => isEditMode.value ? t('Local Video Settings') : t('Add Local Video'));
const confirmText = computed(() => isEditMode.value ? t('Update') : t('Add Local Video'));

// NOTE: These refs intentionally capture props.mediaSource only at setup.
// ChildView mounts this dialog with `v-if`, so a fresh instance is created
// per open/edit cycle and there is no need to watch props.mediaSource.
const filePath = ref(props.mediaSource?.sourceId || '');
const fileName = ref(props.mediaSource?.name || '');
const playoutVolume = ref(props.mediaSource?.localVideo?.playoutVolume ?? 100);

/**
 * Submit-in-flight guard.
 *
 * In the child-window flow `handleConfirm` emits and ChildView immediately sends
 * `close-child`, so the dialog is typically unmounted/hidden within a frame. This
 * guard matters only for the race window where a user double-clicks faster than
 * the IPC roundtrip completes; without it two emits produce two IPC messages and
 * the main window ends up calling addMediaSource twice.
 *
 * No reset is exposed here because ChildView uses `:key="panelOpenSeq"` on this
 * dialog, so every reopen creates a brand new instance with isSubmitting=false.
 */
const isSubmitting = ref(false);

const SUPPORTED_VIDEO_EXTENSIONS = ['mov', 'mp4', 'mkv'];
const VIDEO_ACCEPT = SUPPORTED_VIDEO_EXTENSIONS.map(ext => `.${ext}`).join(',');

function isValidVideoFile(name: string): boolean {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  return SUPPORTED_VIDEO_EXTENSIONS.includes(ext);
}

function handleBrowse() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = VIDEO_ACCEPT;
  // Use { once: true } so the listener is automatically removed after the first
  // change event, releasing the closure and letting the detached <input> be GC'd.
  input.addEventListener('change', (e) => {
    const file = (e.target as HTMLInputElement)?.files?.[0];
    if (!file) return;

    if (!isValidVideoFile(file.name)) {
      TUIToast({
        type: TOAST_TYPE.WARNING,
        message: t('Unsupported video format, please select MOV, MP4 or MKV file'),
      });
      return;
    }

    const localPath = (file as ElectronFile).path;
    if (!localPath) {
      // Defensive guard: in current Electron config (nodeIntegration: true /
      // contextIsolation: false) the `path` property is always populated, but
      // we surface a user-visible toast here so the UI never silently fails
      // if future Electron upgrades or webPreferences changes break the flow.
      console.warn('[LocalVideoDialog] Failed to get file path');
      TUIToast({
        type: TOAST_TYPE.ERROR,
        message: t('Failed to get file path, please try again'),
      });
      return;
    }

    filePath.value = localPath;
    fileName.value = file.name || '';
  }, { once: true });
  input.click();
}

function handleConfirm() {
  if (!filePath.value || isSubmitting.value) return;
  isSubmitting.value = true;
  const payload = {
    filePath: filePath.value,
    fileName: fileName.value,
    playoutVolume: playoutVolume.value,
  };
  if (isEditMode.value && props.mediaSource) {
    emits('updateLocalVideoMaterial', props.mediaSource, payload);
  } else {
    emits('addLocalVideoMaterial', payload);
  }
}

function handleClose() {
  emits('close');
}
</script>

<style lang="scss" scoped>
:deep(.local-video-dialog) {
  .tui-dialog-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    padding: 10px 0;
    min-height: 0;
  }

  .tui-dialog-header,
  .tui-dialog-footer {
    flex-shrink: 0;
  }
}

.local-video-setting {
  width: 100%;
  max-width: 560px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-top: 16px;

  .item-setting {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;

    .title {
      font-size: 14px;
      color: var(--text-color-secondary);
      margin-bottom: 12px;
    }
  }

  .file-select-row {
    display: flex;
    width: 100%;
    gap: 8px;

    .file-path-input {
      flex: 1;
      height: 36px;
      padding: 0 12px;
      border: 1px solid var(--stroke-color-primary);
      border-radius: 8px;
      background: transparent;
      color: var(--text-color-primary);
      font-size: 14px;
      outline: none;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;

      &::placeholder {
        color: var(--text-color-secondary);
        opacity: 0.5;
      }
    }

    .browse-btn {
      height: 36px;
      padding: 0 16px;
      border: 1px solid var(--stroke-color-primary);
      border-radius: 8px;
      background: transparent;
      color: var(--text-color-primary);
      font-size: 14px;
      cursor: pointer;
      white-space: nowrap;
      transition: background-color 0.2s ease;

      &:hover {
        background-color: rgba(255, 255, 255, 0.1);
      }
    }
  }

  .volume-row {
    display: flex;
    width: 100%;
    align-items: center;
    gap: 12px;

    .volume-slider {
      flex: 1;
    }

    .volume-value {
      min-width: 32px;
      text-align: right;
      font-size: 14px;
      color: var(--text-color-primary);
    }
  }
}
</style>
