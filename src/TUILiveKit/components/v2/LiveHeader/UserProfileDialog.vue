<template>
  <TUIDialog
    :custom-classes="dialogCustomClasses"
    :visible="visible"
    :title="t('User Profile')"
    :width="'520px'"
    :showClose="true"
    :cancelText="t('Cancel')"
    :confirmText="t('Save')"
    :confirmDisabled="!canSubmit"
    @update:visible="(val: boolean) => emit('update:visible', val)"
    @confirm="handleConfirm"
    @cancel="handleCancel"
    @close="handleCancel"
  >
    <LiveUserProfile
      :userId="editableData.userId"
      v-model:userName="editableData.userName"
      v-model:avatarUrl="editableData.avatarUrl"
      :userNameError="showUserNameError"
      :avatarUrlError="showAvatarUrlError"
    />
  </TUIDialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { TUIDialog, useUIKit } from '@tencentcloud/uikit-base-component-vue3';
import LiveUserProfile from '../LiveUserProfile/index.vue';
import type { UserProfileInfo } from '../LiveUserProfile/index.vue';
import { ipcBridge, IPCMessageType } from '../../../ipc';
import { isHttpUrl } from '../../../utils/url';
import { useDialogClasses } from '../../../hooks/useDialogClasses';

const props = defineProps<{
  visible: boolean;
  userInfo: UserProfileInfo;
  customClasses?: string;
}>();

const emit = defineEmits<{
  'update:visible': [value: boolean];
  save: [data: { userName: string; avatarUrl: string }];
  close: [];
}>();

const { t } = useUIKit();

const editableData = reactive({
  userId: '',
  userName: '',
  avatarUrl: '',
});

const originalData = ref({
  userId: '',
  userName: '',
  avatarUrl: '',
});

const dialogCustomClasses = useDialogClasses('user-profile-dialog', () => props.customClasses);

const normalizedUserName = computed(() => editableData.userName.trim());
const normalizedAvatarUrl = computed(() => editableData.avatarUrl.trim());

const isUserNameValid = computed(() => normalizedUserName.value.length > 0 && normalizedUserName.value.length <= 20);
const isAvatarUrlValid = computed(() => {
  if (!normalizedAvatarUrl.value) {
    return true;
  }
  return isHttpUrl(normalizedAvatarUrl.value);
});

const hasChanges = computed(() => {
  return normalizedUserName.value !== originalData.value.userName.trim()
    || normalizedAvatarUrl.value !== originalData.value.avatarUrl.trim();
});

const canSubmit = computed(() => hasChanges.value && isUserNameValid.value && isAvatarUrlValid.value);
const showUserNameError = computed(() => normalizedUserName.value.length === 0);
const showAvatarUrlError = computed(() => normalizedAvatarUrl.value.length > 0 && !isAvatarUrlValid.value);

watch(
  () => props.userInfo,
  (newVal) => {
    if (!newVal) {
      return;
    }
    editableData.userId = newVal.userId || '';
    editableData.userName = newVal.userName || '';
    editableData.avatarUrl = newVal.avatarUrl || '';
    originalData.value = { ...editableData };
  },
  { immediate: true, deep: true }
);

function handleConfirm() {
  if (!canSubmit.value) {
    return;
  }

  const payload = {
    userName: normalizedUserName.value,
    avatarUrl: normalizedAvatarUrl.value,
  };

  emit('save', payload);
  ipcBridge.sendToMain(IPCMessageType.UPDATE_USER_PROFILE, payload);
  emit('close');
}

function handleCancel() {
  Object.assign(editableData, originalData.value);
  emit('update:visible', false);
  emit('close');
}
</script>

<style lang="scss" scoped>
:deep(.user-profile-dialog .tui-dialog-body) {
  overflow-x: hidden;
  overflow-y: auto;
  -ms-overflow-style: none;
  scrollbar-width: none;
}

:deep(.user-profile-dialog .tui-dialog-body::-webkit-scrollbar) {
  width: 0;
  height: 0;
  display: none;
}
</style>
