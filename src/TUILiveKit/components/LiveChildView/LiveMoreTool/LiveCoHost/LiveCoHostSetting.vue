<template>
  <TUIDialog
    v-model:visible="dialogVisible"
    :title="t('Host battle settings')"
    @close="cancel"
    @cancel="cancel"
    @confirm="confirm"
  >
    <div class="tui-co-host-setting">
      <div class="setting-item">
        <div class="setting-item-label">
          {{ t('Co-host Layout') }}
        </div>
        <div class="template-options">
          <div class="options-grid">
            <template v-for="template in coHostLayoutOptions" :key="template.id">
              <div class="option-card" :class="{ active: templateForm.coHostLayoutTemplate === template.templateId }"
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
      <div class="setting-item">
        <div class="setting-item-label">
          {{ t('Battle duration') }}
        </div>
        <div class="setting-item-value">
          <div class="layout-template-options">
            <template v-for="item in minutes" :key="item">
              <label
                class="layout-template-option"
              >
                <input
                  :value="item.value"
                  type="radio"
                  name="coHostLayoutTemplate"
                  class="layout-template-radio"
                  :checked="item.value === form.battleDuration"
                  @input="handleDurationChange"
                >
                <span class="layout-template-label">{{ item.label }}</span>
              </label>
            </template>
          </div>
        </div>
      </div>
    </div>
  </TUIDialog>
</template>

<script setup lang="ts">
import { ref, computed, defineProps, defineEmits, watch } from 'vue';
import TUIDialog from '../../../../common/base/Dialog/Index.vue';
import DynamicGrid9Icon from '../../../../common/icons/StreamLayoutTemplate/DynamicGrid9Icon.vue';
import Dynamic1v6Icon from '../../../../common/icons/StreamLayoutTemplate/Dynamic1v6Icon.vue';
import { useI18n } from '../../../../locales';
import { TUICoHostLayoutTemplate } from '../../../../types';
import logger from '../../../../utils/logger';

const logPrefix = '[LiveCoHostSetting]';

const { t } = useI18n();

const props = defineProps<{
  visible: boolean;
  form: {
    coHostLayoutTemplate: TUICoHostLayoutTemplate;
    battleDuration: number;
  }
}>();

const emit = defineEmits<{
  'update:visible': [visible: boolean];
  'on-confirm': [{
    coHostLayoutTemplate: TUICoHostLayoutTemplate;
    battleDuration: number;
  }];
  'on-cancel': [];
}>();

const dialogVisible = ref(props.visible);
const minutes = [
  { label: t('Number minutes', { number: 1 }), value: 1 * 60 },
  { label: t('Number minutes', { number: 2 }), value: 2 * 60 },
  { label: t('Number minutes', { number: 3 }), value: 3 * 60 },
  { label: t('Number minutes', { number: 5 }), value: 5 * 60 },
];

const templateForm = ref({
  coHostLayoutTemplate: props.form.coHostLayoutTemplate,
  battleDuration: props.form.battleDuration,
});

const coHostLayoutOptions = computed(() => [
  {
    id: 'HostDynamic_Grid9',
    icon: DynamicGrid9Icon,
    templateId: TUICoHostLayoutTemplate.HostDynamicGrid,
    label: t('Dynamic Grid9 Layout'),
  },
  {
    id: 'HostDynamic_1v6',
    icon: Dynamic1v6Icon,
    templateId: TUICoHostLayoutTemplate.HostDynamic1v6,
    label: t('Dynamic 1v6 Layout'),
  },
]);

function selectTemplate(templateId: TUICoHostLayoutTemplate) {
  logger.debug(`${logPrefix} selectTemplate: `, templateId);
  templateForm.value.coHostLayoutTemplate = templateId;
}

function confirm() {
  logger.debug(`${logPrefix} confirm: `);
  emit('update:visible', false);
  emit('on-confirm', { ...templateForm.value });
}

function cancel() {
  logger.debug(`${logPrefix} cancel`);
  emit('update:visible', false);
  emit('on-cancel');
}

function handleDurationChange(event: any) {
  templateForm.value.battleDuration = Number(event.target.value);
}

watch(() => props.visible, (newVal) => {
  dialogVisible.value = newVal;
});
</script>

<style lang="scss" scoped>
@import "../../../../assets/global.scss";

.tui-co-host-setting {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.5rem;
  font-size: $font-live-connection-layout-text-size;

  .setting-item {
    display: flex;
    align-items: center;
    flex-direction: column;
    justify-content: flex-start;
    gap: 6px;
    margin-bottom: 20px;
    .setting-item-label {
      width: 100%;
      color: var(--text-color-secondary);
      font-size: 14px;
      font-weight: 400;
      line-height: 24px;
    }
    .setting-item-value {
      display: flex;
      width: 100%;
    }
  }

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

  .layout-template-options {
    display: flex;
    flex-direction: row;
    gap: 1.5rem;
  }

  .layout-template-option {
    display: flex;
    align-items: center;
    border: 0.125 solid var(--border-color);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    background: var(--background-color-primary);
    gap: 8px;

    &:hover {
      border-color: var(--primary-color);
      background: var(--background-color-hover);
    }

    &.active {
      border-color: var(--primary-color);
      background: var(--primary-color-light);

      .layout-template-label {
        color: var(--primary-color);
        font-weight: 500;
      }

      .layout-template-count {
        color: var(--primary-color);
      }
    }
  }
  .layout-template-radio {
    width: 1rem;
    height: 1rem;
    margin: 0;
    accent-color: var(--primary-color);
    cursor: pointer;
  }
  .layout-template-label {
    flex: 1;
    font-size: 0.875rem;
    color: var(--text-color-primary);
    font-weight: 500;
    cursor: pointer;
  }
}
</style>
