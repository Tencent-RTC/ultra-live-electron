<template>
  <TUIDialog
    :custom-classes="['layout-dialog', customClasses || '']"
    :title="t('Layout Settings')"
    :visible="props.layoutSwitchVisible"
    :confirm-text="t('Confirm')"
    :cancel-text="t('Cancel')"
    @close="handleCancel"
    @confirm="handleConfirm"
    @cancel="handleCancel"
  >
    <div class="layout-label">
      {{ t('Audience Layout') }}
    </div>
    <div class="template-options">
      <div class="options-grid">
        <template
          v-for="template in layoutOptions"
          :key="template.id"
        >
          <div
            class="option-card"
            :class="{ active: selectedTemplate === template.templateId }"
            @click="selectTemplate(template.templateId)"
          >
            <div class="option-info">
              <component
                :is="template.icon"
                v-if="template.icon"
                class="option-icon"
              />
              <h4>{{ template.label }}</h4>
            </div>
          </div>
        </template>
      </div>
    </div>
  </TUIDialog>
</template>

<script lang="ts" setup>
import { ref, computed, watch } from 'vue';
import { TUIDialog, useUIKit } from '@tencentcloud/uikit-base-component-vue3';
import { TUISeatLayoutTemplate } from '../../../types';
import Dynamic1v6 from '../../../../icons/dynamic-1v6.vue';
import DynamicGrid9 from '../../../../icons/dynamic-grid9.vue';
import Fixed1v6 from '../../../../icons/fixed-1v6.vue';
import FixedGrid9 from '../../../../icons/fixed-grid9.vue';
import HorizontalFloat from '../../../../icons/horizontal-float.vue';
import { ipcBridge, IPCMessageType } from '../../../ipc';

type Props = {
  customClasses?: string;
  layoutSwitchVisible: boolean;
  currentLayoutTemplate: TUISeatLayoutTemplate | null;
}
const props = withDefaults(defineProps<Props>(), {
  layoutSwitchVisible: false,
  currentLayoutTemplate: null,
});

const emit = defineEmits<{
  (event: 'update:layoutSwitchVisible', value: boolean): void;
  (event: 'close'): void;
  (event: 'confirm', options: { template: TUISeatLayoutTemplate | null }): void;
}>();

const { t } = useUIKit();

const portraitLayoutOptions = computed(() => [
  {
    id: 'PortraitDynamic_Grid9',
    icon: DynamicGrid9,
    templateId: TUISeatLayoutTemplate.PortraitDynamic_Grid9,
    label: t('Dynamic Grid9 Layout'),
  },
  {
    id: 'PortraitFixed_1v6',
    icon: Fixed1v6,
    templateId: TUISeatLayoutTemplate.PortraitFixed_1v6,
    label: t('Fixed 1v6 Layout'),
  },
  {
    id: 'PortraitFixed_Grid9',
    icon: FixedGrid9,
    templateId: TUISeatLayoutTemplate.PortraitFixed_Grid9,
    label: t('Fixed Grid9 Layout'),
  },
  {
    id: 'PortraitDynamic_1v6',
    icon: Dynamic1v6,
    templateId: TUISeatLayoutTemplate.PortraitDynamic_1v6,
    label: t('Dynamic 1v6 Layout'),
  },
]);

const horizontalLayoutOptions = computed(() => [
  {
    id: 'LandscapeDynamic_1v3',
    icon: HorizontalFloat,
    templateId: TUISeatLayoutTemplate.LandscapeDynamic_1v3,
    label: t('Landscape Template'),
  },
]);

const layoutOptions = computed(() => {
  if (props.currentLayoutTemplate !== null && props.currentLayoutTemplate >= 200 && props.currentLayoutTemplate <= 599) {
    return horizontalLayoutOptions.value;
  }
  return portraitLayoutOptions.value;
});

const selectedTemplate = ref<TUISeatLayoutTemplate | null>(props.currentLayoutTemplate);

// Sync selectedTemplate when currentLayoutTemplate prop changes
watch(() => props.currentLayoutTemplate, (newVal) => {
  selectedTemplate.value = newVal;
});

// Reset selectedTemplate when dialog becomes visible
watch(() => props.layoutSwitchVisible, (visible) => {
  if (visible) {
    selectedTemplate.value = props.currentLayoutTemplate;
  }
});

function selectTemplate(template: TUISeatLayoutTemplate) {
  selectedTemplate.value = template;
}

async function handleConfirm() {
  if (selectedTemplate.value === props.currentLayoutTemplate) {
    emit('update:layoutSwitchVisible', false);
  } else {
    emit('confirm', { template: selectedTemplate.value });
    ipcBridge.sendToMain(IPCMessageType.UPDATE_LAYOUT_TEMPLATE, { template: selectedTemplate.value });
  }
  emit('close');
}

function handleCancel() {
  selectedTemplate.value = props.currentLayoutTemplate;
  emit('update:layoutSwitchVisible', false);
  emit('close');
}
</script>

<style lang="scss" scoped>
@import '../../../assets/mac.scss';

:deep(.layout-dialog) {
  padding: 24px;
  width: 480px;
  .tui-dialog-body {
    flex-wrap: wrap;
  }
  .tui-dialog-footer {
    padding-top: 32px;
  }
}

.layout-label {
  @include text-size-14;
  color: var(--text-color-primary, #ffffff);
  margin: 4px 0px 16px 0px;
}

.template-options {
  width: 100%;
  height: 100%;
  overflow: auto;

  .options-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    justify-content: flex-start;

    .option-card {
      box-sizing: border-box;
      padding: 12px 13px;
      width: 208px;
      background: #3a3a3a;
      border: 2px solid transparent;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s ease;
      text-align: center;

      &:hover {
        background: #4a4a4a;
        border-color: #5a5a5a;
      }

      &.active {
        border: 2px solid var(--text-color-link-hover, #2B6AD6);
        background: var(--list-color-focused, #243047);

        .option-info h4 {
          color: #ffffff;
        }
      }

      .option-info {
        display: flex;
        align-items: center;
        justify-content: flex-start;
        gap: 8px;
        .option-icon {
          width: 24px;
          height: 24px;
        }
        h4 {
          margin: 0;
          font-size: 14px;
          font-weight: 600;
          color: #ffffff;
          transition: color 0.2s ease;
        }
      }
    }
  }
}
</style>
