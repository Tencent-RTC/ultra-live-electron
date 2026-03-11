<template>
  <div class="tui-live-user-profile">
    <LiveChildHeader :title="t('User Profile')"></LiveChildHeader>

    <div class="tui-live-user-profile-content">
      <div class="profile-section">
        <div class="avatar-display">
          <Avatar :src="editableData.avatarUrl" :size="64" alt="" />
        </div>
      </div>

      <div class="profile-section">
        <div class="profile-item">
          <span class="profile-label">{{ t("User ID") }}</span>
          <span class="profile-value">
            {{ editableData.userId }}
          </span>
          <TUIButton
            type="text"
            class="copy-btn"
            @click="copyToClipboard(editableData.userId || '')"
            :title="t('Copy')"
          >
            <CopyIcon class="copy-icon" />
          </TUIButton>
        </div>
        <div class="profile-item" :class="{ 'editing': editingFields.userName }">
          <span class="profile-label">{{ t("User Name") }}</span>
          <div class="profile-value">
            <span v-if="!editingFields.userName" class="display-value">
              {{ editableData.userName || t("Not set") }}
            </span>
            <TUIInput
              v-else
              class="profile-input"
              :class="{ 'is-invalid': showUserNameError }"
              v-model="editableData.userName"
              :placeholder="t('Please enter username')"
              :maxLength="20"
              :spellcheck="false"
              ref="userNameInput"
              autofocus
              @blur="finishEdit('userName')"
              @done="finishEdit('userName')"
            />
          </div>
          <TUIButton
            v-if="!editingFields.userName"
            type="text"
            class="edit-btn"
            @click="startEdit('userName')"
            :title="t('Edit')"
          >
            <EditIcon class="edit-icon" />
          </TUIButton>
        </div>
        <div class="profile-item" :class="{ 'editing': editingFields.avatarUrl }">
          <span class="profile-label">{{ t("Avatar URL") }}</span>
          <div class="profile-value">
            <span v-if="!editingFields.avatarUrl" class="display-value">
              {{ editableData.avatarUrl || t("Not set") }}
            </span>
            <TUIInput
              v-else
              class="profile-input"
              :class="{ 'is-invalid': showAvatarUrlError }"
              v-model="editableData.avatarUrl"
              :placeholder="t('Please enter avatar URL')"
              :spellcheck="false"
              ref="avatarUrlInput"
              autofocus
              @blur="finishEdit('avatarUrl')"
              @done="finishEdit('avatarUrl')"
            />
          </div>
          <TUIButton
            v-if="!editingFields.avatarUrl"
            type="text"
            class="edit-btn"
            @click="startEdit('avatarUrl')"
            :title="t('Edit')"
          >
            <EditIcon class="edit-icon" />
          </TUIButton>
        </div>
        <div class="profile-item">
          <span class="profile-label">{{ t("SDKAPPID") }}</span>
          <span class="profile-value">
            <span class="display-value">{{ editableData.sdkAppId }}</span>
          </span>
          <TUIButton
            type="text"
            class="copy-btn"
            @click="copyToClipboard(String(editableData.sdkAppId || ''))"
            :title="t('Copy')"
          >
            <CopyIcon class="copy-icon" />
          </TUIButton>
        </div>
        <div class="profile-item">
          <span class="profile-label">{{ t("User Signature") }}</span>
          <span class="profile-value">
            <span class="display-value signature-value">{{ editableData.userSig || t("Not set") }}</span>
          </span>
          <TUIButton
            type="text"
            class="copy-btn"
            @click="copyToClipboard(editableData.userSig || '')"
            :title="t('Copy')"
          >
            <CopyIcon class="copy-icon" />
          </TUIButton>
        </div>
      </div>
    </div>

    <div class="tui-live-user-profile-foot">
      <TUIButton @click="onCancel">
        {{ t("Cancel") }}
      </TUIButton>
      <TUIButton
        type="primary"
        @click="saveChanges"
        :disabled="!isFormValid"
      >
        {{ t("Save") }}
      </TUIButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, reactive } from 'vue';
import { TUIInput, TUIButton, TUIToast, TOAST_TYPE } from '@tencentcloud/uikit-base-component-vue3';
import { Avatar } from 'tuikit-atomicx-vue3-electron';
import LiveChildHeader from './LiveChildHeader.vue';
import CopyIcon from '../../common/icons/CopyIcon.vue';
import EditIcon from '../../common/icons/EditIcon.vue';
import { useCurrentSourceStore } from '../../store/child/currentSource';
import { useI18n } from '../../locales';
import logger from '../../utils/logger';
import { isHttpUrl } from '../../utils/url';

const logPrefix = '[LiveUserProfile]';

interface UserProfileData {
  userId: string;
  userName: string;
  avatarUrl: string;
  sdkAppId: number;
  userSig: string;
  isUserSigExpired: boolean;
  phone: string;
}

const props = defineProps({
  data: {
    type: Object,
    required: false,
    default: () => ({
      userId: '',
      userName: '',
      avatarUrl: '',
      sdkAppId: 0,
      userSig: '',
      phone: '',
      isUserSigExpired: false,
    }),
  },
  isLiving: {
    type: Boolean,
    required: false,
    default: false,
  },
});

const { t } = useI18n();
const currentSourceStore = useCurrentSourceStore();

const isEditing = ref(false);
const editingFields = ref({
  userName: false,
  avatarUrl: false,
});

const editableData = reactive<UserProfileData>({
  userId: props.data.userId || '',
  userName: props.data.userName || '',
  avatarUrl: props.data.avatarUrl || '',
  sdkAppId: props.data.sdkAppId || 0,
  userSig: props.data.userSig || '',
  isUserSigExpired: props.data.isUserSigExpired || false,
  phone: props.data.phone || '',
});

const originalData = ref<UserProfileData>({ ...editableData });

const isFormValid = computed(() => {
  const avatarUrl = editableData.avatarUrl.trim();

  return editableData.userId.trim().length > 0 &&
         editableData.userName.trim().length > 0 &&
         editableData.userSig.trim().length > 0 &&
         (avatarUrl.length === 0 || isHttpUrl(avatarUrl)) &&
         editableData.sdkAppId > 0 && editableData.sdkAppId <= 4294967295;
});

const showUserNameError = computed(() => editingFields.value.userName && editableData.userName.trim().length === 0);
const showAvatarUrlError = computed(() => {
  if (!editingFields.value.avatarUrl) {
    return false;
  }
  const avatarUrl = editableData.avatarUrl.trim();
  return avatarUrl.length > 0 && !isHttpUrl(avatarUrl);
});

const startEdit = (field: keyof typeof editingFields.value) => {
  isEditing.value = true;
  editingFields.value[field] = true;
};

const finishEdit = (field: keyof typeof editingFields.value) => {
  editingFields.value[field] = false;
  isEditing.value = Object.values(editingFields.value).some(Boolean);
};

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    TUIToast({
      message: t('Copy successfully'),
      type: TOAST_TYPE.SUCCESS,
    });
  } catch (error) {
    TUIToast({
      message: t('Copy failed'),
      type: TOAST_TYPE.ERROR,
    });
  }
};

const saveChanges = () => {
  if (!isFormValid.value) {
    logger.warn(`${logPrefix} Form validation failed`);
    return;
  }

  logger.debug(`${logPrefix} Saving changes`, editableData);

  originalData.value = { ...editableData };
  isEditing.value = false;

  window.mainWindowPortInChild?.postMessage({
    key: 'updateUserProfile',
    data: { ...editableData },
  });

  resetCurrentView();
  window.ipcRenderer.send('close-child');
};

const onCancel = () => {
  logger.debug(`${logPrefix} Close dialog`);
  resetCurrentView();
  window.ipcRenderer.send('close-child');
};

const resetCurrentView = () => {
  currentSourceStore.setCurrentViewName('');
};

watch(() => props.data, (newData: Partial<UserProfileData>) => {
  if (newData && !isEditing.value) {
    Object.assign(editableData, newData);
    originalData.value = { ...editableData };
  }
}, { deep: true, immediate: true });
</script>

<style lang="scss" scoped>
@import "../../assets/global.scss";

.tui-live-user-profile {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  color: var(--text-color-primary);
  background-color: var(--bg-color-operate);

  .tui-live-user-profile-content {
    flex: 1 1 auto;
    width: 100%;
    height: calc(100% - 2.75rem - 2.5rem);
    padding: 0.5rem 1.5rem;
    overflow-y: auto;
    overflow-x: hidden;
  }

  .avatar-display {
    display: flex;
    justify-content: center;
    margin-bottom: 2rem;
    margin-top: 1rem;
  }

  .profile-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 1rem;

    .profile-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem;
      margin-bottom: 0.5rem;
      background-color: var(--bg-color-bubble-reciprocal);
      border: 1px solid var(--stroke-color-primary);
      border-radius: 0.375rem;
      font-size: 0.875rem;
      transition: all 0.2s;
      position: relative;

      &:last-child {
        margin-bottom: 0;
      }

      &:hover {
        border-color: var(--stroke-color-secondary);
      }

      .profile-label {
        color: var(--text-color-secondary);
        min-width: 5rem;
        flex-shrink: 0;
        font-weight: 500;
      }

      .profile-value {
        color: var(--text-color-primary);
        font-weight: 400;
        flex: 1;
        margin-left: 1rem;
        display: flex;
        align-items: center;
        overflow: hidden;
        min-height: 1.375rem;

        .display-value {
          color: var(--text-color-primary);
          font-size: 0.875rem;
          line-height: 1.4;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          flex: 1;
          min-width: 0;
          word-break: break-all;

          &.signature-value {
            letter-spacing: 0.05em;
            font-family: monospace;
          }
        }

        .profile-input {
          width: 100%;
        }
      }

      .edit-btn,
      .copy-btn {
        min-width: 1.5rem;
        padding: 0;
        margin-left: 0.25rem;
        flex-shrink: 0;

        .edit-icon,
        .copy-icon {
          color: var(--text-color-primary);
          width: 1rem;
          height: 1rem;
        }

      }
    }
  }

  .tui-live-user-profile-foot {
    height: 3rem;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.75rem;
    padding: 0 1.5rem;
    background-color: var(--bg-color-dialog);
    border-top: 1px solid var(--border-color);
  }

  :deep(.profile-input .tui-input__native-input) {
    font-size: 0.875rem;
  }

  :deep(.profile-input.is-invalid .tui-input__native-input) {
    border-color: var(--text-color-error);
  }
}
</style>
