<template>
  <TUIDialog
    :visible="true"
    width="480px"
    :title="title"
    :confirmText="t('MusicPanel.Add')"
    :cancelText="t('MusicPanel.Cancel')"
    :confirmDisabled="!canConfirm"
    :customClasses="dialogCustomClasses"
    @close="handleClose"
    @cancel="handleClose"
    @confirm="handleConfirm"
  >
    <div class="add-music-setting">
      <div class="tabs">
        <button
          class="tab-btn"
          :class="{ active: mode === 'local' }"
          @click="mode = 'local'"
        >
          {{ t('MusicPanel.LocalFile') }}
        </button>
        <button
          class="tab-btn"
          :class="{ active: mode === 'network' }"
          @click="mode = 'network'"
        >
          {{ t('MusicPanel.NetworkURL') }}
        </button>
      </div>

      <div v-if="mode === 'local'" class="item-setting">
        <span class="title">{{ t('MusicPanel.MusicFile') }}</span>
        <div class="item-input-row">
          <input
            class="file-path-input"
            type="text"
            :value="filePath"
            :placeholder="t('MusicPanel.SelectLocalMusicPlaceholder')"
            readonly
          />
          <button class="browse-btn" @click="handleBrowse">{{ t('MusicPanel.Browse') }}</button>
        </div>
        <div class="hint">{{ t('MusicPanel.SupportedFormatsHint') }}</div>
      </div>

      <div v-else class="item-setting">
        <span class="title">{{ t('MusicPanel.MusicURL') }}</span>
        <div class="item-input-row">
          <input
            v-model="networkUrl"
            class="file-path-input"
            type="text"
            placeholder="https://example.com/song.mp3"
          />
        </div>
        <div class="hint">{{ t('MusicPanel.NetworkURLHint') }}</div>
      </div>

      <div class="item-setting">
        <span class="title">{{ t('MusicPanel.DisplayNameOptional') }}</span>
        <div class="item-input-row">
          <input
            v-model="displayName"
            class="file-path-input"
            type="text"
            :placeholder="defaultName || t('MusicPanel.Untitled')"
          />
        </div>
      </div>
    </div>
  </TUIDialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { TUIDialog, TUIToast, TOAST_TYPE, useUIKit } from '@tencentcloud/uikit-base-component-vue3';
import { useDialogClasses } from '../../hooks/useDialogClasses';

type ElectronFile = File & { path: string };

const props = defineProps<{
  customClasses?: string;
}>();

const emits = defineEmits<{
  add: [payload: { url: string; name: string }];
  close: [];
}>();

const { t } = useUIKit();

const dialogCustomClasses = useDialogClasses('add-music-dialog', () => props.customClasses);

const title = computed(() => t('MusicPanel.AddTitle'));

const mode = ref<'local' | 'network'>('local');
const filePath = ref('');
const localFileName = ref('');
const networkUrl = ref('');
const displayName = ref('');

const SUPPORTED_EXTENSIONS = ['mp3', 'aac', 'm4a', 'wav'];
const AUDIO_ACCEPT = SUPPORTED_EXTENSIONS.map(ext => `.${ext}`).join(',');

function isValidAudioFile(name: string): boolean {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  return SUPPORTED_EXTENSIONS.includes(ext);
}

// Validate a network URL: must be http(s) and end with a supported audio
// extension. Query string and fragment are stripped before extension check.
function isValidAudioURL(input: string): boolean {
  const trimmed = (input ?? '').trim();
  if (!/^https?:\/\/.+/i.test(trimmed)) return false;
  try {
    const u = new URL(trimmed);
    const pathname = u.pathname || '';
    const ext = pathname.split('.').pop()?.toLowerCase() || '';
    return SUPPORTED_EXTENSIONS.includes(ext);
  } catch {
    return false;
  }
}

function handleBrowse() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = AUDIO_ACCEPT;
  input.addEventListener('change', (e) => {
    const file = (e.target as HTMLInputElement)?.files?.[0];
    if (!file) return;

    if (!isValidAudioFile(file.name)) {
      TUIToast({
        type: TOAST_TYPE.WARNING,
        message: t('MusicPanel.UnsupportedAudioFormat').replace('{formats}', SUPPORTED_EXTENSIONS.join('/')),
      });
      return;
    }

    const localPath = (file as ElectronFile).path;
    if (!localPath) {
      console.warn('[AddMusicDialog] Failed to get file path');
      TUIToast({
        type: TOAST_TYPE.ERROR,
        message: t('MusicPanel.GetFilePathFailed'),
      });
      return;
    }

    filePath.value = localPath;
    localFileName.value = file.name || '';
  }, { once: true });
  input.click();
}

const defaultName = computed(() => {
  if (mode.value === 'local') return localFileName.value;
  if (networkUrl.value) {
    try {
      const u = new URL(networkUrl.value);
      const parts = u.pathname.split('/');
      return decodeURIComponent(parts[parts.length - 1] || '');
    } catch {
      return '';
    }
  }
  return '';
});

const canConfirm = computed(() => {
  if (mode.value === 'local') return !!filePath.value;
  return isValidAudioURL(networkUrl.value);
});

function handleConfirm() {
  const url = mode.value === 'local' ? filePath.value : networkUrl.value.trim();
  const name = displayName.value.trim() || defaultName.value || '';
  if (!url) return;
  emits('add', { url, name });
}

function handleClose() {
  emits('close');
}
</script>

<style lang="scss" scoped>
$mp-primary: #1c66e5;
$mp-primary-strong: #1557c4;
$mp-primary-light: #3b7ff0;
$mp-border: rgba(28, 102, 229, 0.26);
$mp-input-bg: rgba(255, 255, 255, 0.04);
$mp-text: #f3f4f6;
$mp-text-secondary: #9ca3af;
$mp-text-tertiary: #6b7280;

:deep(.add-music-dialog) {
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

.add-music-setting {
  width: 100%;
  max-width: 560px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-top: 16px;
}

.tabs {
  display: flex;
  gap: 8px;
}

.tab-btn {
  padding: 6px 14px;
  border: 1px solid $mp-border;
  border-radius: 8px;
  background: transparent;
  color: $mp-text-secondary;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.15s ease;

  &:hover {
    color: $mp-text;
    border-color: $mp-primary;
  }

  &.active {
    background: linear-gradient(135deg, #3b7ff0 0%, #1c66e5 100%);
    color: #fff;
    border-color: transparent;
    box-shadow: 0 4px 12px rgba(28, 102, 229, 0.4);
  }
}

.item-setting {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  width: 100%;

  .title {
    font-size: 13px;
    color: $mp-text-secondary;
    margin-bottom: 10px;
  }

  .hint {
    font-size: 11px;
    color: $mp-text-tertiary;
    margin-top: 6px;
  }
}

.item-input-row {
  display: flex;
  width: 100%;
  gap: 8px;
}

.file-path-input {
  flex: 1;
  width: 100%;
  box-sizing: border-box;
  height: 36px;
  flex-shrink: 0;
  padding: 0 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  background: $mp-input-bg;
  color: $mp-text;
  font-size: 13px;
  outline: none;
  transition: border-color 0.15s ease;

  &::placeholder {
    color: $mp-text-tertiary;
  }

  &:focus {
    border-color: $mp-primary;
    box-shadow: 0 0 0 3px rgba(28, 102, 229, 0.18);
  }

  &[readonly] {
    cursor: default;
  }
}

.browse-btn {
  padding: 0 16px;
  height: 36px;
  border: 1px solid $mp-border;
  border-radius: 8px;
  background: transparent;
  color: $mp-text;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.15s ease;

  &:hover {
    background: rgba(28, 102, 229, 0.14);
    border-color: $mp-primary;
  }
}
</style>
