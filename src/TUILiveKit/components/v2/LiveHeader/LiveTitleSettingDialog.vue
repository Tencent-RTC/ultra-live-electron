<template>
  <div class="live-title-setting-dialog-root">
    <div class="live-title-setting-dialog">
      <div class="dialog-header">
        <div class="dialog-title">{{ t('Live Setting') }}</div>
        <button
          class="dialog-close-btn"
          type="button"
          :title="t('Close')"
          :aria-label="t('Close')"
          @click="handleCancel"
        >
          <IconClose :size="16" />
        </button>
      </div>
      <div class="dialog-body">
        <div class="dialog-item">
          <span class="dialog-item-label">{{ t('LiveName') }}</span>
          <TUIInput
            maxLength="100"
            class="dialog-item-input"
            :model-value="localLiveName"
            :placeholder="t('Please enter the live name')"
            :spellcheck="false"
            @update:modelValue="handleLiveNameInput"
          />
        </div>
        <div class="dialog-item dialog-item-cover">
          <span class="dialog-item-label">{{ t('Cover upload') }}</span>
          <div class="dialog-item-content">
            <LiveCoverUpload
              v-model="localCoverUrl"
              v-model:cover-type="coverType"
              :upload-enabled="uploadEnabled"
              :max-size-mb="maxFileSizeMB"
              :allowed-mime-types="allowedMimeTypes"
            />
          </div>
        </div>
        <div v-if="liveNameError" class="dialog-error">
          {{ liveNameError }}
        </div>
      </div>
      <div class="dialog-footer">
        <TUIButton color="gray" @click="handleCancel">
          {{ t('Cancel') }}
        </TUIButton>
        <TUIButton type="primary" @click="handleConfirm">
          {{ t('Confirm') }}
        </TUIButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { IconClose, TUIButton, TUIInput, useUIKit } from '@tencentcloud/uikit-base-component-vue3';
import { ipcBridge, IPCMessageType } from '../../../ipc';
import type { ApplyLiveTitlePayload, LiveTitleSettingInitialData } from '../../../ipc';
import {
  fetchUploadConfig,
  UPLOAD_ALLOWED_MIME_TYPES,
  UPLOAD_MAX_FILE_SIZE_MB,
  UploadConfig,
} from '../../../../api/upload';
import { LIVE_NAME_MAX_UTF8_BYTES } from '../../../constants/tuiConstant';
import { getUtf8ByteLength } from '../../../utils/utils';
import LiveCoverUpload from '../LiveCoverUpload.vue';

type CoverType = 'landscape' | 'portrait';

const props = defineProps<{
  data?: LiveTitleSettingInitialData;
}>();

const emit = defineEmits<{
  close: [];
}>();

const { t } = useUIKit();
const localLiveName = ref('');
const localCoverUrl = ref('');
const liveNameError = ref('');
const coverType = ref<CoverType>('landscape');
const uploadConfig = ref<UploadConfig>({
  enabled: false,
  provider: 'none',
});

const dialogId = computed(() => props.data?.dialogId || '');
const maxUtf8Bytes = computed(() => props.data?.maxLength || LIVE_NAME_MAX_UTF8_BYTES);
const maxFileSizeMB = UPLOAD_MAX_FILE_SIZE_MB;
const allowedMimeTypes = UPLOAD_ALLOWED_MIME_TYPES;
const uploadEnabled = computed(() => Boolean(uploadConfig.value.enabled));

async function ensureUploadConfig() {
  uploadConfig.value = await fetchUploadConfig();
}

watch(
  () => props.data,
  (data) => {
    localLiveName.value = data?.liveName || '';
    localCoverUrl.value = data?.coverUrl || '';
    coverType.value = 'landscape';
    liveNameError.value = '';
  },
  { immediate: true },
);

onMounted(async () => {
  await ensureUploadConfig();
});

watch(localLiveName, () => {
  if (liveNameError.value) {
    liveNameError.value = '';
  }
});

function handleLiveNameInput(value: string | number) {
  localLiveName.value = String(value ?? '');
}

function validateLiveName(value: string) {
  if (!value.trim()) {
    return t('Please enter the live name');
  }
  if (getUtf8ByteLength(value) > maxUtf8Bytes.value) {
    return t('Live name is too long');
  }
  return '';
}

function emitAction(payload: ApplyLiveTitlePayload) {
  ipcBridge.sendToMain(IPCMessageType.APPLY_LIVE_TITLE, payload);
  emit('close');
}

function handleCancel() {
  if (!dialogId.value) {
    emit('close');
    return;
  }
  emitAction({
    dialogId: dialogId.value,
    action: 'cancel',
  });
}

function handleConfirm() {
  const value = localLiveName.value;
  const error = validateLiveName(value);
  if (error) {
    liveNameError.value = error;
    return;
  }
  if (!dialogId.value) {
    emit('close');
    return;
  }
  emitAction({
    dialogId: dialogId.value,
    action: 'confirm',
    liveName: value,
    coverUrl: localCoverUrl.value.trim(),
  });
}
</script>

<style scoped lang="scss">
.live-title-setting-dialog-root {
  width: 100%;
  height: 100%;
  background: var(--bg-color-dialog);
}

.live-title-setting-dialog {
  width: 100%;
  height: 100%;
  padding: 24px;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.dialog-title {
  font-size: 18px;
  font-weight: 600;
  line-height: 24px;
  color: var(--text-color-primary, #fff);
}

.dialog-close-btn {
  width: 32px;
  height: 32px;
  border: none;
  outline: none;
  color: var(--text-color-primary, #fff);
  background: transparent;
  cursor: pointer;
}

.dialog-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-right: 4px;
}

.dialog-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.dialog-item + .dialog-item {
  margin-top: 12px;
}

.dialog-item-label {
  width: 80px;
  white-space: nowrap;
  color: var(--text-color-primary, #fff);
  line-height: 32px;
}

.dialog-item-input {
  flex: 1;
}

.dialog-item-content {
  flex: 1;
  min-width: 0;
}

.dialog-item-cover .dialog-item-label {
  padding-top: 2px;
  line-height: 22px;
}

.dialog-error {
  margin-top: 8px;
  margin-left: 88px;
  color: var(--text-color-error, #f86272);
  font-size: 12px;
  line-height: 16px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
