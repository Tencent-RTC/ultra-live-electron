<template>
  <div
    class="custom-icon-container"
    @click="handleIconClick"
  >
    <IconEditor class="custom-icon" />
  </div>
  <TUIDialog
    :title="t('Live Setting')"
    :visible="settingPanelVisible"
    :customClasses="['live-setting-dialog']"
    :cancelText="t('Cancel')"
    :confirmText="t('Confirm')"
    @close="handleClose"
    @confirm="handleConfirm"
    @cancel="handleClose"
  >
    <div class="setting-panel-content">
      <div class="setting-panel-content-item">
        <span class="setting-panel-content-item-label">{{ t('LiveName') }}</span>
        <TUIInput
          maxLength="100"
          :model-value="form.liveName"
          :placeholder="t('Please enter the live name')"
          :spellcheck="false"
          @update:modelValue="handleLiveNameInput"
        />
      </div>
      <div class="setting-panel-content-item setting-panel-content-item-cover">
        <span class="setting-panel-content-item-label">{{ t('Cover upload') }}</span>
        <LiveCoverUpload
          v-model="form.coverUrl"
          v-model:cover-type="coverType"
          :upload-enabled="uploadEnabled"
          :max-size-mb="maxFileSizeMB"
          :allowed-mime-types="allowedMimeTypes"
        />
      </div>
    </div>
  </TUIDialog>
</template>

<script lang="ts" setup>
import { computed, defineEmits, defineProps, ref } from 'vue';
import {
  IconEditor, TUIDialog, TUIInput, TUIToast, useUIKit
} from '@tencentcloud/uikit-base-component-vue3';
import {
  fetchUploadConfig,
  UPLOAD_ALLOWED_MIME_TYPES,
  UPLOAD_MAX_FILE_SIZE_MB,
  UploadConfig
} from '../../../api/upload';
import { LIVE_NAME_MAX_UTF8_BYTES } from '../../constants/tuiConstant';
import { getUtf8ByteLength } from '../../utils/utils';
import LiveCoverUpload from './LiveCoverUpload.vue';

type CoverType = 'landscape' | 'portrait';

type LiveSettingForm = {
  liveName: string;
  coverUrl: string;
};

const props = defineProps<{
  liveName?: string;
  coverUrl?: string;
  isShowingInChildWindow?: boolean;
}>();
const emit = defineEmits(['confirm']);
const { t } = useUIKit();
const settingPanelVisible = ref(false);
const coverType = ref<CoverType>('landscape');
const uploadConfig = ref<UploadConfig>({
  enabled: true,
  provider: 'none',
});
const liveNameMaxUtf8Bytes = LIVE_NAME_MAX_UTF8_BYTES;
const form = ref<LiveSettingForm>({
  liveName: props.liveName || '',
  coverUrl: props.coverUrl || '',
});

const maxFileSizeMB = UPLOAD_MAX_FILE_SIZE_MB;
const allowedMimeTypes = UPLOAD_ALLOWED_MIME_TYPES;
const uploadEnabled = computed(() => Boolean(uploadConfig.value.enabled));

function syncFormWithProps() {
  coverType.value = 'landscape';
  form.value = {
    liveName: props.liveName || '',
    coverUrl: props.coverUrl || '',
  };
}

async function ensureUploadConfig() {
  uploadConfig.value = await fetchUploadConfig();
}

const handleIconClick = async () => {
  if (props.isShowingInChildWindow) {
    emit('confirm', {
      liveName: props.liveName || '',
      coverUrl: props.coverUrl || '',
    });
    return;
  }
  syncFormWithProps();
  settingPanelVisible.value = true;
  await ensureUploadConfig();
};

const handleClose = () => {
  settingPanelVisible.value = false;
  syncFormWithProps();
};

const handleLiveNameInput = (value: string | number) => {
  form.value.liveName = String(value ?? '');
};

const handleConfirm = () => {
  const liveName = form.value.liveName;
  if (!liveName.trim()) {
    TUIToast.error({
      message: t('Please enter the live name'),
    });
    return;
  }
  if (getUtf8ByteLength(liveName) > liveNameMaxUtf8Bytes) {
    TUIToast.error({
      message: t('Live name is too long'),
    });
    return;
  }
  emit('confirm', {
    liveName,
    coverUrl: form.value.coverUrl.trim(),
  });
  settingPanelVisible.value = false;
};
</script>

<style lang="scss" scoped>
@import '../../assets/mac.scss';

.custom-icon-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  width: 16px;
  height: 16px;
  cursor: pointer;
  color: $text-color1;
  border-radius: 12px;
  position: relative;

  .custom-icon {
    @include icon-size-base(16px);
    background: transparent;
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
}

:deep(.live-setting-dialog) {
  .setting-panel-content {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .setting-panel-content-item {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .setting-panel-content-item-cover {
    align-items: flex-start;
  }

  .setting-panel-content-item-label {
    width: 80px;
    white-space: nowrap;
  }
}

</style>
