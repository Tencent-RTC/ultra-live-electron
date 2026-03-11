<template>
  <div class="tui-live-user-profile">
    <div class="tui-live-user-profile-content">
      <div class="profile-avatar">
        <Avatar :src="avatarUrl" :size="64" alt="" />
      </div>

      <div class="profile-list">
        <div class="profile-row">
          <span class="profile-label">{{ t('User ID') }}</span>
          <div class="profile-field profile-field--with-action">
            <TUIInput
              size="medium"
              class="field-input field-input--readonly"
              :model-value="userId || '-'"
              :readonly="true"
              :spellcheck="false"
            />
            <TUIButton
              type="text"
              class="action-btn"
              :title="t('Copy')"
              @click="copyToClipboard(userId || '')"
            >
              <CopyIcon class="action-icon" />
            </TUIButton>
          </div>
        </div>

        <div class="profile-row">
          <span class="profile-label">{{ t('User Name') }}</span>
          <div class="profile-field">
            <TUIInput
              size="medium"
              class="field-input"
              :class="{ 'is-invalid': userNameError }"
              :model-value="userName"
              :placeholder="t('Please enter username')"
              :maxLength="20"
              :spellcheck="false"
              @update:modelValue="(value: string | number) => emit('update:userName', String(value))"
            />
            <p class="field-tip field-tip--error" :class="{ 'field-tip--hidden': !userNameError }">
              {{ t('Please enter username') }}
            </p>
          </div>
        </div>

        <div class="profile-row">
          <span class="profile-label">{{ t('Avatar URL') }}</span>
          <div class="profile-field">
            <TUIInput
              size="medium"
              class="field-input"
              :class="{ 'is-invalid': avatarUrlError }"
              :model-value="avatarUrl"
              :placeholder="t('Please enter avatar URL (optional)')"
              :spellcheck="false"
              @update:modelValue="(value: string | number) => emit('update:avatarUrl', String(value))"
            />
            <p class="field-tip field-tip--error" :class="{ 'field-tip--hidden': !avatarUrlError }">
              {{ t('Please enter a valid avatar URL') }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { TUIToast, TOAST_TYPE, TUIInput, TUIButton, useUIKit } from '@tencentcloud/uikit-base-component-vue3';
import { Avatar } from 'tuikit-atomicx-vue3-electron';
import CopyIcon from '../../../common/icons/CopyIcon.vue';

export interface UserProfileInfo {
  userId: string;
  userName: string;
  avatarUrl: string;
}

withDefaults(defineProps<{
  userId: string;
  userName: string;
  avatarUrl: string;
  userNameError?: boolean;
  avatarUrlError?: boolean;
}>(), {
  userNameError: false,
  avatarUrlError: false,
});

const emit = defineEmits<{
  'update:userName': [value: string];
  'update:avatarUrl': [value: string];
}>();

const { t } = useUIKit();

const copyToClipboard = async (text: string) => {
  if (!text) {
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    TUIToast({
      message: t('Copy successful'),
      type: TOAST_TYPE.SUCCESS,
    });
  } catch (error) {
    TUIToast({
      message: t('Copy failed'),
      type: TOAST_TYPE.ERROR,
    });
  }
};
</script>

<style lang="scss" scoped>
.tui-live-user-profile {
  width: 100%;
  color: var(--text-color-primary);
  background-color: var(--bg-color-dialog);

  .tui-live-user-profile-content {
    width: 100%;
    overflow: hidden auto;
  }

  .profile-avatar {
    display: flex;
    justify-content: center;
    margin-bottom: 1rem;
  }

  .profile-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .profile-row {
    display: flex;
    align-items: flex-start;

    .profile-label {
      width: 5rem;
      flex-shrink: 0;
      margin-top: 0.375rem;
      color: var(--text-color-secondary);
      font-size: 0.875rem;
      line-height: 1.25rem;
    }
  }

  .profile-field {
    min-width: 0;
    flex: 1;
  }

  .profile-field--with-action {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .field-tip {
    margin: 0.25rem 0 0;
    min-height: 1.125rem;
    font-size: 0.75rem;
    line-height: 1.125rem;
  }

  .field-tip--error {
    color: var(--text-color-error);
  }

  .field-tip--hidden {
    visibility: hidden;
  }

  .action-btn {
    min-width: 1.5rem;
    padding: 0;
  }

  .action-icon {
    width: 1rem;
    height: 1rem;
    color: var(--text-color-primary);
  }

  :deep(.field-input .tui-input__native-input) {
    font-size: 0.875rem;
  }

  :deep(.field-input .tui-input__native-input::placeholder) {
    color: var(--text-color-tertiary);
  }

  :deep(.field-input--readonly .tui-input__native-input) {
    color: var(--text-color-secondary);
    background-color: var(--bg-color-operate);
    border-color: var(--stroke-color-primary);
  }

  :deep(.field-input.is-invalid .tui-input__native-input) {
    border-color: var(--text-color-error);
  }
}
</style>
