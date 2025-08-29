<template>
  <div class="tui-phone-mirror-source">
    <div class="tui-child-win-title tui-window-header">
      <span>{{ t('Add Phone') }}</span>
      <button class="tui-icon" @click="handleCloseWindow">
        <svg-icon :icon="CloseIcon" class="tui-secondary-icon"></svg-icon>
      </button>
    </div>
    <div class="tui-child-win-middle">
      <div class="form-line">
        <div class="form-label">
          <label>{{ t("Connect Type:") }}</label>
        </div>
        <div class="form-input">
          <TUISelect :model-value="mirrorParamsRef.connectType" :popper-append-to-body="false" @change="onSelectConnectType">
            <TUIOption v-for="item in connectTypeOptions" :key="item.id" :label="item.label" :value="item.id" />
          </TUISelect>
        </div>
      </div>
      <div class="form-line">
        <div class="form-label">
          <label>{{ t("Platfirn Type:") }}</label>
        </div>
        <div class="form-input">
          <TUISelect :model-value="mirrorParamsRef.platformType" :popper-append-to-body="false" @change="onSelectPlatformType">
            <TUIOption v-for="item in platformTypeOptions" :key="item.id" :label="item.label" :value="item.id" />
          </TUISelect>
        </div>
      </div>
      <div class="form-line">
        <div class="form-label">
          <label>{{ t("Frame Rate:") }}</label>
        </div>
        <div class="form-input">
          <TUISelect v-model="mirrorParamsRef.frameRate" :popper-append-to-body="false">
            <TUIOption v-for="item in mirrorFPSOptions" :key="item" :label="item.toString()" :value="item" />
          </TUISelect>
        </div>
      </div>
      <div class="form-line">
        <div class="form-label">
          <label>{{ t("Bitrate:") }}</label>
        </div>
        <div class="form-input">
          <TUISelect v-model="mirrorParamsRef.bitrateKbps" :popper-append-to-body="false">
            <TUIOption v-for="item in mirrorBitrateOptions" :key="item.value" :label="item.label" :value="item.value" />
          </TUISelect>
        </div>
      </div>
      <div class="form-line">
        <div class="form-label">
          <label>{{ t("Phone Device:") }}</label>
        </div>
        <div class="form-input">
          <TUISelect :model-value="mirrorParamsRef.deviceId" :popper-append-to-body="false"
            @change="onSelectPhoneDevice">
            <TUIOption v-for="item in phoneDeviceOptions" :key="item.deviceId" :label="item.deviceName"
              :value="item.deviceId" />
          </TUISelect>
        </div>
      </div>
    </div>
    <div class="tui-child-win-footer">
      <button class="tui-button-confirm" :disabled="!mirrorParamsRef.deviceId" @click="handleEditPhoneMirror">{{
        t('Sure') }}</button>
      <button class="tui-button-cancel" @click="handleCloseWindow">{{ t('Cancel') }}</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Ref, ref, shallowRef, defineProps, computed, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { TRTCMediaSourceType, TRTCPhoneMirrorParam } from 'trtc-electron-sdk';
import { TUIMediaSourceViewModel } from '../../types';
import { useI18n } from '../../locales';
import SvgIcon from '../../common/base/SvgIcon.vue';
import CloseIcon from '../../common/icons/CloseIcon.vue';
import TUISelect from '../../common/base/Select.vue';
import TUIOption from '../../common/base/Option.vue';
import { useCurrentSourceStore } from '../../store/child/currentSource';
import logger from '../../utils/logger';

type TUIMediaSourceEditProps = {
  data?: Record<string, any>;
}

const logPrefix = '[LivePhoneMirror]';

const props = defineProps<TUIMediaSourceEditProps>();
const mirrorParamsRef: Ref<TRTCPhoneMirrorParam> = ref<TRTCPhoneMirrorParam>({
  platformType: 0,
  connectType: 0,
  frameRate: 30,
  bitrateKbps: 5000,
  deviceId: '',
  deviceName: '',
  placeholderImagePath: '',
});

const { t } = useI18n();
const currentSourceStore = useCurrentSourceStore();
const { phoneDeviceList } = storeToRefs(currentSourceStore);

const phoneDeviceOptions = computed(() => phoneDeviceList.value.filter(item => item.platformType === mirrorParamsRef.value.platformType && item.connectType === mirrorParamsRef.value.connectType));

const connectTypeOptions = shallowRef([
  {
    id: 0,
    label: 'USB'
  },
  // {
  //   id: 1,
  //   label: 'WIFI'
  // },
]);

const platformTypeOptions = shallowRef([
  {
    id: 0,
    label: 'Android'
  },
  {
    id: 1,
    label: 'iOS'
  },
]);

const mirrorFPSOptions = shallowRef([
  30,
  60,
]);

const mirrorBitrateOptions = shallowRef([
  {
    label: '5M',
    value: 5000,
  },
  {
    label: '8M',
    value: 8000,
  },
  {
    label: '12M',
    value: 12000,
  },
  {
    label: '16M',
    value: 16000,
  },
  {
    label: '20M',
    value: 20000,
  },
]);

const onSelectConnectType = (val: number) => {
  logger.log(`${logPrefix}onSelectConnectType:${val}`);
  if (mirrorParamsRef.value.connectType !== val) {
    mirrorParamsRef.value.connectType = val;
    mirrorParamsRef.value.deviceId = '';
    mirrorParamsRef.value.deviceName = '';
    mirrorParamsRef.value.placeholderImagePath = '';
  }
}

const onSelectPlatformType = (val: number) => {
  logger.log(`${logPrefix}onSelectPlatformType:${val}`);
  if (mirrorParamsRef.value.platformType !== val) {
    mirrorParamsRef.value.platformType = val;
    mirrorParamsRef.value.deviceId = '';
    mirrorParamsRef.value.deviceName = '';
    mirrorParamsRef.value.placeholderImagePath = '';
  }
}

const onSelectPhoneDevice = (val: string) => {
  logger.log(`${logPrefix}onSelectPhoneDevice:${val}`);
  const selected = phoneDeviceList.value.filter(item => item.deviceId === val);
  if (selected[0]) {
    mirrorParamsRef.value.deviceId = val;
    mirrorParamsRef.value.deviceName = selected[0].deviceName;
    mirrorParamsRef.value.placeholderImagePath = selected[0].placeholderImagePath;
  } else {
    logger.error(`${logPrefix}onSelectPhoneDevice device ID not existed:${val}`);
  }
}

const handleCloseWindow = () => {
  window.ipcRenderer.send('close-child');
  resetCurrentView();
}

const handleEditPhoneMirror = () => {
  logger.debug(`${logPrefix}handleEditPhoneMirror`);
  if (mirrorParamsRef.value.deviceId) {
    const newData = {
      type: TRTCMediaSourceType.kPhoneMirror,
      ...mirrorParamsRef.value,
      predata: JSON.parse(JSON.stringify(props.data))
    };

    window.mainWindowPortInChild?.postMessage({
      key: 'updateMediaSource',
      data: newData,
    })

    window.ipcRenderer.send('close-child');
    resetCurrentView();
  }
}

const resetCurrentView = () => {
  currentSourceStore.setCurrentViewName('');
}

watch(props, async (val) => {
  logger.log(`${logPrefix}watch props.data`, val);
  if (val.data?.mediaSourceInfo) {
    const { mediaSourceInfo, mirrorParams } = val.data as TUIMediaSourceViewModel;
    if (mediaSourceInfo.sourceType === TRTCMediaSourceType.kPhoneMirror) {
      mirrorParamsRef.value.platformType = mirrorParams?.platformType || 0;
      mirrorParamsRef.value.connectType = mirrorParams?.connectType || 0;
      mirrorParamsRef.value.frameRate = mirrorParams?.frameRate || 30;
      mirrorParamsRef.value.bitrateKbps = mirrorParams?.bitrateKbps || 5000;
      mirrorParamsRef.value.deviceId = mirrorParams?.deviceId || '';
      mirrorParamsRef.value.deviceName = mirrorParams?.deviceName || '';
      mirrorParamsRef.value.placeholderImagePath = mirrorParams?.placeholderImagePath || '';
    } else {
      logger.warn(`${logPrefix}watch props.data error. Invalid data:`, val);
    }
  }
}, {
  immediate: true
});
</script>

<style scoped lang="scss">
@import "../../assets/global.scss";

.tui-phone-mirror-source {
  height: 100%;
  color: $font-live-screen-share-source-color;
}

.tui-child-win-title {
  font-weight: $font-live-screen-share-title-weight;
  padding: 0 1.5rem 0 1.375rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.tui-child-win-middle {
  height: calc(100% - 5.75rem);
  min-width: 12.5rem;
  padding: 0.5rem 1.5rem;
  overflow: auto;
  background-color: var(--bg-color-dialog);

  .form-line {
    display: flex;
    margin: 0.5rem 0;
  }

  .form-label {
    flex: 0 0 7rem;
    padding-right: 0.5rem;
    font-size: 0.875rem;
    line-height: 2.625rem;
    text-align: right;
  }

  .form-input {
    flex: 1 1 auto;
    width: auto;
  }
}

.tui-child-win-footer {
  height: 3rem;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0 1.5rem;
  ;
  background-color: var(--bg-color-dialog);
  // border-top: 1px solid var(--stroke-color-primary);
}
</style>
