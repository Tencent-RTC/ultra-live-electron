<template>
  <div class="tui-live-user-profile">
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
              {{ editableData.avatarUrl || t("Not set") }}
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
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, reactive, defineEmits, defineExpose } from 'vue';
import { TUIButton, TUIToast, TOAST_TYPE, useUIKit } from '@tencentcloud/uikit-base-component-vue3';
import { useLoginState } from 'tuikit-atomicx-vue3-electron';
import CopyIcon from '../../../common/icons/CopyIcon.vue';
import EditIcon from '../../../common/icons/EditIcon.vue';
import logger from '../../../utils/logger';

const logPrefix = '[LiveUserProfile]';

const emit = defineEmits<{
  close: [];
  save: [];
  cancel: [];
}>();

const { t } = useUIKit();
const { loginUserInfo, setSelfInfo } = useLoginState();

const editingFields = ref({
  userName: false,
  avatarUrl: false,
});

const editableData = reactive({
  userId: '',
  userName: '',
  avatarUrl: '',
});

const originalData = ref({ ...editableData });

// Check if there are changes
const hasChanges = computed(() => {
  return editableData.userName !== originalData.value.userName ||
         editableData.avatarUrl !== originalData.value.avatarUrl;
});

// Initialize data from loginUserInfo
watch(
  () => loginUserInfo.value,
  (newVal) => {
    if (newVal) {
      editableData.userId = newVal.userId || '';
      editableData.userName = newVal.userName || '';
      editableData.avatarUrl = newVal.avatarUrl || '';
      originalData.value = { ...editableData };
    }
  },
  { immediate: true, deep: true }
);

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

const saveChanges = async () => {
  if (!hasChanges.value) {
    logger.warn(`${logPrefix} No changes to save`);
    emit('cancel');
    return;
  }

  try {
    logger.debug(`${logPrefix} Saving changes`, editableData);

    await setSelfInfo({
      userName: editableData.userName,
      avatarUrl: editableData.avatarUrl,
    });

    originalData.value = { ...editableData };

    TUIToast({
      message: t('Save successfully'),
      type: TOAST_TYPE.SUCCESS,
    });

    // Emit save event to parent
    emit('save');
  } catch (error) {
    logger.error(`${logPrefix} Save changes error:`, error);
    TUIToast({
      message: t('Save failed'),
      type: TOAST_TYPE.ERROR,
    });
  }
};

const onCancel = () => {
  logger.debug(`${logPrefix} Cancel changes`);
  // Reset to original data
  Object.assign(editableData, originalData.value);
  editingFields.value.userName = false;
  editingFields.value.avatarUrl = false;
  emit('cancel');
};

// Expose methods for parent component
defineExpose({
  saveChanges,
  onCancel,
  hasChanges,
});
</script>

<style lang="scss" scoped>
.tui-live-user-profile {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 400px;
  max-height: 400px;
  color: var(--text-color-primary);
  background-color: var(--bg-color-dialog);

  .tui-live-user-profile-content {
    flex: 1 1 auto;
    width: 100%;
    overflow-y: auto;
    overflow-x: hidden;
  }

  .avatar-display {
    display: flex;
    justify-content: center;

    .avatar-circle {
      position: relative;
      border-radius: 50%;
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

}
</style>

