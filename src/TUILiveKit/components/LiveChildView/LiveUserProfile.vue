<template>
  <div class="tui-live-user-profile">
    <LiveChildHeader :title="t('User Profile')"></LiveChildHeader>

    <div class="tui-live-user-profile-content">
      <div class="profile-section">
        <div class="avatar-display">
          <div class="avatar-circle">
            <img
              v-if="editableData.avatarUrl"
              :src="editableData.avatarUrl"
              alt=""
              class="avatar-image"
            />
            <div v-else class="avatar-placeholder">
              <span>{{ getAvatarPlaceholder(editableData.userName) }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="profile-section">
        <div class="profile-item">
          <span class="profile-label">{{ t("User ID") }}</span>
          <span class="profile-value">
            {{ editableData.userId }}
          </span>
          <button
            class="copy-btn"
            @click="copyToClipboard(editableData.userId || '')"
            :title="t('Copy')"
          >
            <CopyIcon class="copy-icon" />
          </button>
        </div>
        <div class="profile-item" :class="{ 'editing': editingFields.userName }">
          <span class="profile-label">{{ t("User Name") }}</span>
          <div class="profile-value">
            <span v-if="!editingFields.userName" class="display-value">
              {{ editableData.userName || t("Not set") }}
            </span>
            <input
              v-else
              type="text"
              v-model="editableData.userName"
              :placeholder="t('Please enter username')"
              maxlength="20"
              ref="userNameInput"
              autofocus
              @blur="editingFields.userName = false"
              @keyup.enter="editingFields.userName = false"
            />
          </div>
          <button
            v-if="!editingFields.userName"
            class="edit-btn"
            @click="startEdit('userName')"
            :title="t('Edit')"
          >
            <EditIcon class="edit-icon" />
          </button>
        </div>
        <div class="profile-item" :class="{ 'editing': editingFields.avatarUrl }">
          <span class="profile-label">{{ t("Avatar URL") }}</span>
          <div class="profile-value">
            <span v-if="!editingFields.avatarUrl" class="display-value">
              <span class="display-value">{{ editableData.avatarUrl || t("Not set") }}</span>
            </span>
            <input
              v-else
              type="text"
              v-model="editableData.avatarUrl"
              :placeholder="t('Please enter avatar URL')"
              ref="avatarUrlInput"
              autofocus
              @blur="editingFields.avatarUrl = false"
              @keyup.enter="editingFields.avatarUrl = false"
            />
          </div>
          <button
            v-if="!editingFields.avatarUrl"
            class="edit-btn"
            @click="startEdit('avatarUrl')"
            :title="t('Edit')"
          >
            <EditIcon class="edit-icon" />
          </button>
        </div>
        <div class="profile-item">
          <span class="profile-label">{{ t("SDKAPPID") }}</span>
          <span class="profile-value">
            <span class="display-value">{{ editableData.sdkAppId }}</span>
          </span>
          <button
            class="copy-btn"
            @click="copyToClipboard(String(editableData.sdkAppId || ''))"
            :title="t('Copy')"
          >
            <CopyIcon class="copy-icon" />
          </button>
        </div>
        <div class="profile-item">
          <span class="profile-label">{{ t("User Signature") }}</span>
          <span class="profile-value">
            <span class="display-value signature-value">{{ editableData.userSig || t("Not set") }}</span>
          </span>
          <button
            class="copy-btn"
            @click="copyToClipboard(editableData.userSig || '')"
            :title="t('Copy')"
          >
            <CopyIcon class="copy-icon" />
          </button>
        </div>
      </div>
    </div>

    <div class="tui-live-user-profile-foot">
      <button
        class="tui-button-confirm"
        @click="saveChanges"
        :disabled="!isFormValid"
      >
        {{ t("Save") }}
      </button>
      <button class="tui-button-cancel" @click="onCancel">
        {{ t("Cancel") }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, defineProps, reactive, Ref } from 'vue';
import { TUIToast, TOAST_TYPE } from '@tencentcloud/uikit-base-component-vue3';
import LiveChildHeader from './LiveChildHeader.vue';
import CopyIcon from '../../common/icons/CopyIcon.vue';
import EditIcon from '../../common/icons/EditIcon.vue';
import { useCurrentSourceStore } from '../../store/child/currentSource';
import { useI18n } from '../../locales';
import logger from '../../utils/logger';

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
  return editableData.userId.trim().length > 0 &&
         editableData.userName.trim().length > 0 &&
         editableData.userSig.trim().length > 0 &&
         editableData.avatarUrl.trim().length > 0 &&
         editableData.sdkAppId > 0 && editableData.sdkAppId <= 4294967295;
});

const getAvatarPlaceholder = (name: string) => {
  if (!name) return '?';
  return name.charAt(0).toUpperCase();
};

const startEdit = (field: keyof typeof editingFields.value) => {
  editingFields.value[field] = true;
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

watch(() => props.data, (newData: Record<string, any>) => {
  if (newData && !isEditing.value) {
    Object.assign(editableData, newData);
    originalData.value = { ...newData as UserProfileData };
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

    .avatar-circle {
      position: relative;
      border-radius: 50%;
      border: 3px solid var(--stroke-color-primary);
      background-color: var(--bg-color-operate);
      transition: all 0.2s ease;
      cursor: pointer;
      overflow: hidden;
      width: 6rem;
      height: 6rem;

      &:hover {
        transform: scale(1.05);
        border-color: var(--button-color-primary-default);
      }
    }
  }

  .avatar-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .avatar-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, var(--button-color-primary-default), var(--button-color-primary-hover));
    color: white;
    font-size: 2rem;
    font-weight: bold;
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

        input {
          user-select: text;
          width: 100%;
          padding: 0.25rem 0.5rem;
          border: 1px solid var(--stroke-color-primary);
          border-radius: 0.25rem;
          background-color: var(--bg-color-operate);
          color: var(--text-color-primary);
          font-size: 0.875rem;
          transition: all 0.2s ease;
          line-height: 1.4;
          font-family: inherit;

          &:focus {
            outline: none;
            border-color: var(--button-color-primary-default);
            box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
          }

          &::placeholder {
            color: var(--text-color-secondary);
          }
        }
      }

      .edit-btn,
      .copy-btn {
        background: none;
        border: none;
        cursor: pointer;
        padding: 0.25rem;
        border-radius: 0.25rem;
        transition: all 0.2s;
        font-size: 1rem;
        margin-left: 0.5rem;
        opacity: 0.7;
        flex-shrink: 0;

        .edit-icon,
        .copy-icon {
          color: var(--text-color-primary);
          width: 1rem;
          height: 1rem;
        }

        &:hover {
          opacity: 1;
          background-color: var(--bg-color-operate);
        }
      }
    }
  }

  .tui-live-user-profile-foot {
    height: 3rem;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding: 0 1.5rem;
    background-color: var(--bg-color-dialog);
    border-top: 1px solid var(--border-color);
  }
}
</style>
