<template>
  <TUIDialog
    v-model:visible="dialogVisible"
    :title="t('Layout Settings')"
    @close="cancel"
    @cancel="cancel"
    @confirm="confirm"
  >
    <div class="tui-co-guest-layout">
      <div class="layout-label">
        {{ t('Audience Layout') }}
      </div>
      <div class="template-options">
        <div class="options-grid">
          <template v-for="template in layoutOptions" :key="template.id">
            <div class="option-card" :class="{ active: selectedTemplate === template.templateId }"
              @click="selectTemplate(template.templateId)">
              <div class="option-info">
                <component :is="template.icon" v-if="template.icon" class="option-icon" />
                <h4>{{ template.label }}</h4>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
  </TUIDialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, defineProps, defineEmits } from 'vue';
import TUIDialog from '../../../common/base/Dialog/Index.vue';
import DynamicGrid9Icon from '../../../common/icons/StreamLayoutTemplate/DynamicGrid9Icon.vue';
import Fixed1v6Icon from '../../../common/icons/StreamLayoutTemplate/Fixed1v6Icon.vue';
import FixedGrid9Icon from '../../../common/icons/StreamLayoutTemplate/FixedGrid9Icon.vue';
import Dynamic1v6Icon from '../../../common/icons/StreamLayoutTemplate/Dynamic1v6Icon.vue';
import HorizontalFloatIcon from '../../../common/icons/StreamLayoutTemplate/HorizontalFloatIcon.vue';
import { useI18n } from '../../../locales';
import { TUISeatLayoutTemplate } from '../../../types';
import logger from '../../../utils/logger';

type Props = {
  visible: boolean;
  layoutTemplate: TUISeatLayoutTemplate | null;
};

const props = defineProps<Props>();
const dialogVisible = ref(props.visible);

const emit = defineEmits<{
  'update:visible': [visible: boolean];
  'update:layoutTemplate': [template: TUISeatLayoutTemplate];
}>();

const logPrefix = '[LiveLayoutConfig]';
const { t } = useI18n();

const portraitLayoutOptions = computed(() => [
  {
    id: 'PortraitDynamic_Grid9',
    icon: DynamicGrid9Icon,
    templateId: TUISeatLayoutTemplate.PortraitDynamic_Grid9,
    label: t('Dynamic Grid9 Layout'),
  },
  {
    id: 'PortraitFixed_1v6',
    icon: Fixed1v6Icon,
    templateId: TUISeatLayoutTemplate.PortraitFixed_1v6,
    label: t('Fixed 1v6 Layout'),
  },
  {
    id: 'PortraitFixed_Grid9',
    icon: FixedGrid9Icon,
    templateId: TUISeatLayoutTemplate.PortraitFixed_Grid9,
    label: t('Fixed Grid9 Layout'),
  },
  {
    id: 'PortraitDynamic_1v6',
    icon: Dynamic1v6Icon,
    templateId: TUISeatLayoutTemplate.PortraitDynamic_1v6,
    label: t('Dynamic 1v6 Layout'),
  },
]);

const horizontalLayoutOptions = computed(() => [
  {
    id: 'LandscapeDynamic_1v3',
    icon: HorizontalFloatIcon,
    templateId: TUISeatLayoutTemplate.LandscapeDynamic_1v3,
    label: t('Landscape Template'),
  },
]);

const layoutOptions = computed(() => {
  if (props.layoutTemplate && props.layoutTemplate >= 200 && props.layoutTemplate <= 599) {
    return horizontalLayoutOptions.value;
  }
  return portraitLayoutOptions.value;
});

const selectedTemplate = ref<TUISeatLayoutTemplate | null>(props.layoutTemplate ?? null);

function selectTemplate(template: TUISeatLayoutTemplate) {
  logger.debug(`${logPrefix}selectTemplate: `, template);
  selectedTemplate.value = template;
}

function confirm() {
  emit('update:layoutTemplate', selectedTemplate.value as TUISeatLayoutTemplate);
  emit('update:visible', false);
}

function cancel() {
  emit('update:visible', false);
}

watch(() => props.layoutTemplate, (newVal) => {
  if (newVal) {
    selectedTemplate.value = newVal;
  }
});

watch(() => props.visible, (newVal) => {
  dialogVisible.value = newVal;
});
</script>

<style lang="scss" scoped>
@import "../../../assets/global.scss";

.tui-co-guest-layout {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.5rem;
  font-size: $font-live-connection-layout-text-size;

  .template-options {
    width: 100%;
    height: 100%;
    overflow: auto;

    .options-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      justify-content: space-around;

      .option-card {
        box-sizing: border-box;
        padding: 0.5rem 0.75rem;
        width: 10rem;
        background: #3a3a3a;
        border: 0.125rem solid transparent;
        border-radius: 12px;
        cursor: pointer;
        transition: all 0.2s ease;
        text-align: center;

        &:hover {
          background: #4a4a4a;
          border-color: #5a5a5a;
        }

        &.active {
          border: 0.125rem solid var(--text-color-link-hover, #2B6AD6);
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
            width: 1.5rem;
            height: 1.5rem;
          }

          h4 {
            margin: 0;
            font-size: 0.875rem;
            font-weight: 600;
            color: #ffffff;
            transition: color 0.2s ease;
          }
        }
      }
    }
  }
}
</style>
