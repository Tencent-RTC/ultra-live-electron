<template>
  <div class="tui-live-config">
    <div class="tui-config-title tui-title">
      <div @click="handleChangeSource" :class="[isShowSources ? 'is-active' : '', 'tui-config-title-header']">{{ t('Sources')}}</div>
      <div @click="handleChangeVideoEncode" :class="[isShowVideoEncode ? 'is-active' : '', 'tui-config-title-header']">{{ t('Video Encode')}}</div>
    </div>
    <div v-if="isShowSources && !isSourceExisted" class="tui-config-list">
      <span class="tui-config-notice">
        {{ t('Support diverse types of media sources')}}
      </span>
      <span v-for="item in mediaSourceMenuList" :key="item.text" class="btn-add-source" @click="item.fun()">
        <svg-icon :icon="item.icon" class="icon-container"></svg-icon>
        <i class=tui-menu-item-text>
          {{item.text}}
        </i>
      </span>
      <span class="btn-add-source">
        <live-image-source></live-image-source>
      </span>
    </div>
    <div v-if="isSourceExisted && !isShowVideoEncode" class="tui-media-source">
      <div class="tui-add-source-menu" @click="handleOpenAddMedia" v-click-outside="handleClickOutsideAdd" >
        <svg-icon :icon="AddIcon" class="icon-container tui-menu-item-text"></svg-icon>
        <span class=tui-menu-item-text>{{ t('Add') }}</span>
      </div>
      <div v-if="isShowAddMedia" class="tui-add-source-menu-popup">
        <template v-for="item in mediaSourceMenuList" :key="item.id">
          <span v-if="item.id !== 'Add Phone' || !isPhoneSourceExisted" class="tui-add-source-menu-item" @click="item.fun()">
            <svg-icon :icon="item.icon" class="icon-container"></svg-icon>
            <i class=tui-menu-item-text>
              {{item.text}}
            </i>
          </span>
        </template>
        <span class="tui-add-source-menu-item">
          <live-image-source></live-image-source>
        </span>
      </div>
      <div class="tui-media-source-list" ref="mediaSourceListRef">
        <div
          v-for="(item, index) in mediaList"
          :key="item.mediaSourceInfo.sourceId"
          @mousedown="handleStartDrag($event, item)"
          class="tui-media-source-item"
          :class="item.mediaSourceInfo.sourceId === selectedMediaKey.sourceId && item.mediaSourceInfo.sourceType === selectedMediaKey.sourceType ? 'selected' : ''"
          @click="handleSelectSource(item)">
          <div class="tui-media-source-content">
            <!-- <svg-icon :icon="CameraIcon" class="icon-container"></svg-icon> -->
            <div class="item-name">{{ item.aliasName }}</div>
            <div class="item-tools">
              <button :class="['item-icon', 'icon-up', index === 0 ? 'disabled' : '']" :disabled="index === 0" @click.stop.prevent="handleChangeMediaOrder(item, 1)">
                <svg-icon :icon="UpIcon" :size="1.5" class="icon-container"></svg-icon>
              </button>
              <button :class="['item-icon', 'icon-down', index === mediaList.length - 1 ? 'disabled' : '']" :disabled="index === mediaList.length - 1" @click.stop.prevent="handleChangeMediaOrder(item, -1)">
                <svg-icon :icon="DownIcon" :size="1.5" class="icon-container"></svg-icon>
              </button>
              <button class="item-icon icon-mute" @click.stop.prevent="handleMuteMediaSource(item)">
                <svg-icon :icon="!item.muted ? MediaSourceMute : MediaSourceUnmute" :size="1.5" class="icon-container"></svg-icon>
              </button>
              <button class="item-icon icon-more" @click.stop.prevent="handleMore(item)" v-click-outside="handleClickOutside">
                <svg-icon :icon="MoreIcon" :size="1.5" class="icon-container"></svg-icon>
              </button>
            </div>
          </div>
          <div v-show="visibleMorePopupId === item.mediaSourceInfo.sourceId" class="tui-edit-source-menu-popup">
            <!-- <span class="item-more-text">{{t('Rename')}}</span> -->
            <span class="edit-menu-item" @click.stop="handleRemoveSource(item)">{{t('Remove source')}}</span>
            <span v-if="item.mediaSourceInfo.sourceType === TRTCMediaSourceType.kImage" class="edit-menu-item">
              <live-image-source :data="item"></live-image-source>
            </span>
            <span v-else class="edit-menu-item" @click.stop="handleEditSource(item)">
              {{t('Edit source')}}
            </span>
          </div>
        </div>
      </div>
    </div>
    <div v-if="isShowVideoEncode" class="tui-video-encode">
      <div class="options-container">
        <span class="options-container-title">{{t('Background color')}}</span>
        <TUIColorPicker class="options-container-input" :currentColor="backgroundColor" @change="onChangeBgColor"></TUIColorPicker>
      </div>
      <div class="options-container">
        <span class="options-container-title">{{t('Video resolution')}}</span>
        <TUISelect
          :modelValue="mixingVideoEncodeParam.videoResolution"
          :teleported="false"
          :popper-append-to-body="false"
          @change="onChangeVideoResolution">
          <TUIOption
            v-for="item in videoResolutionOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </TUISelect>
      </div>
      <div class="options-container">
        <span class="options-container-title">{{t('Video FPS')}}</span>
        <TUISelect
          :modelValue="mixingVideoEncodeParam.videoFps"
          :teleported="false"
          :popper-append-to-body="false"
          @change="onChangeVideoFps">
          <TUIOption
            v-for="item in videoFpsOptions"
            :key="item"
            :label="item.toString()"
            :value="item"
          />
        </TUISelect>
      </div>
      <div class="options-container">
        <span class="options-container-title">{{t('Video Bitrate')}}</span>
        <TUISelect
          :modelValue="mixingVideoEncodeParam.videoBitrate"
          :teleported="false"
          :popper-append-to-body="false"
          @change="onChangeVideoBitrage">
          <TUIOption
            v-for="item in videoBitrateOptions"
            :key="item"
            :label="item.toString()"
            :value="item"
          />
        </TUISelect>
      </div>
      <div class="options-container">
        <span class="options-container-title">{{t('Color Space')}}</span>
        <TUISelect
          :modelValue="mixingVideoEncodeParam.colorSpace"
          :teleported="false"
          :popper-append-to-body="true"
          @change="onChangeColorSpace">
          <TUIOption
            v-for="item in videoColorSpaceOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </TUISelect>
      </div>
      <div class="options-container">
        <span class="options-container-title">{{t('Color Range')}}</span>
        <TUISelect
          :modelValue="mixingVideoEncodeParam.colorRange"
          :teleported="false"
          :popper-append-to-body="true"
          @change="onChangeColorRange">
          <TUIOption
            v-for="item in videoColorRangeOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </TUISelect>
      </div>
      <div class="options-container">
        <span class="options-container-title">{{t('Encode Gear')}}</span>
        <TUISelect
          :modelValue="mixingVideoEncodeParam.complexity"
          :teleported="false"
          :popper-append-to-body="true"
          @change="onChangeEncodeGear">
          <TUIOption
            v-for="item in encodeGearOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </TUISelect>
      </div>
      <div class="options-container" style="display: inline-flex;flex-direction:row;">
        <TUISwitch :model-value="isHevcEncodeEnabled" label="H265" @update:modelValue="toggleHevcMode"></TUISwitch>
      </div>
      <div class="options-container">
        <span class="options-container-title">{{t('Selected border color')}}</span>
        <TUIColorPicker class="options-container-input" :currentColor="selectedBorderColor" @change="onChangeBorderColor"></TUIColorPicker>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, Ref, shallowRef, defineEmits } from 'vue';
import { storeToRefs } from 'pinia';
import { TRTCMediaSourceType, TRTCVideoResolution, TRTCVideoColorRange, TRTCVideoColorSpace, TRTCVideoEncodeComplexity } from 'trtc-electron-sdk';
import { TUIMediaMixingError, TUIMediaSourceViewModel } from '../../types';
import SvgIcon from '../../common/base/SvgIcon.vue';
import TUISwitch from '../../common/base/Switch.vue';
import CameraIcon from '../../common/icons/CameraIcon.vue';
import AddShareScreenIcon from '../../common/icons/AddShareScreenIcon.vue';
import AddIcon from '../../common/icons/AddIcon.vue';
import UpIcon from '../../common/icons/UpIcon.vue';
import DownIcon from '../../common/icons/DownIcon.vue';
import MoreIcon from '../../common/icons/MoreIcon.vue';
import { useI18n } from '../../locales';
import vClickOutside from '../../utils/vClickOutside';
import TUIColorPicker from '../../common/base/ColorPicker.vue';
import TUISelect from '../../common/base/Select.vue';
import TUIOption from '../../common/base/Option.vue'
import MediaSourceMute from '../../common/icons/MediaSourceMute.vue';
import MediaSourceUnmute from '../../common/icons/MediaSourceUnmute.vue';
import { useMediaSourcesStore } from '../../store/main/mediaSources';
import LiveImageSource from '../LiveSource/LiveImageSource.vue';
import { generateUniqueId } from '../../utils/utils';
import onMediaMixingError from '../../hooks/useMediaMixingErrorHandler';
import { colorSpaceOptions, colorRangeOptions } from '../../constants/tuiConstant';
import logger from '../../utils/logger';

const logPrefix = '[LiveConfig]';

const emits = defineEmits(['edit-media-source']);

const mediaSourcesStore = useMediaSourcesStore();
const { backgroundColor, selectedBorderColor, selectedMediaKey, mixingVideoEncodeParam } = storeToRefs(mediaSourcesStore);

const { t } = useI18n();
const { isSourceExisted, isPhoneSourceExisted, mediaList, isHevcEncodeEnabled } = storeToRefs(mediaSourcesStore);
const isShowSources = ref(true);
const isShowVideoEncode = ref(false);
const isShowAddMedia = ref(false);
const visibleMorePopupId = ref('');
const mediaSourceListRef: Ref<HTMLElement|null> = ref(null);

const videoResolutionOptions = shallowRef([
  {
    label: '1280 X 720',
    value: TRTCVideoResolution.TRTCVideoResolution_1280_720
  },
  {
    label: '1920 X 1080',
    value: TRTCVideoResolution.TRTCVideoResolution_1920_1080
  },
  {
    label: '2560 X 1440',
    value: TRTCVideoResolution.TRTCVideoResolution_2560_1440
  },
]);
const videoFpsOptions = shallowRef([
  15,
  24,
  30,
  60
]);
const videoBitrateOptions = shallowRef([
  1000,
  2000,
  3000,
  4000,
  5000,
  6000,
  7000,
  8000,
  9000,
  10000,
]);
const videoColorSpaceOptions = shallowRef([...colorSpaceOptions]);
const videoColorRangeOptions = shallowRef([...colorRangeOptions]);
const encodeGearOptions = shallowRef([
  {
    label: t('Encode Gear - Low'),
    value: TRTCVideoEncodeComplexity.TRTCVideoEncodeComplexity_Fastest,
  },
  {
    label: t('Encode Gear - Midium'),
    value: TRTCVideoEncodeComplexity.TRTCVideoEncodeComplexity_Medium,
  },
  {
    label: t('Encode Gear - High'),
    value: TRTCVideoEncodeComplexity.TRTCVideoEncodeComplexity_Slowest,
  },
]);
const mediaSourceMenuList = shallowRef([
  {
    icon: CameraIcon,
    id: 'Add Camera',
    text: t('Add Camera'),
    fun: handleAddCamera
  },
  {
    icon: AddShareScreenIcon,
    id: 'Add Capture',
    text: t('Add Capture'),
    fun: handleAddShareScreen
  },
  // {
  //   icon: CameraIcon,
  //   id: 'Add Phone',
  //   text: t('Add Phone'),
  //   fun: handleAddPhoneMirror
  // }
]);

const handleOpenAddMedia = () => {
  isShowAddMedia.value = !isShowAddMedia.value;
};

const handleClickOutsideAdd = () => {
  isShowAddMedia.value = false;
};

const handleChangeVideoEncode = () => {
  isShowSources.value = false;
  isShowVideoEncode.value = true;
};

const handleChangeSource = () => {
  isShowSources.value = true;
  isShowVideoEncode.value = false;
};

function handleAddCamera() {
  isShowAddMedia.value = false;
  window.ipcRenderer.send('open-child', {
    'command': 'camera'
  });
}

function handleAddShareScreen() {
  isShowAddMedia.value = false;
  window.ipcRenderer.send('open-child', {
    'command': 'screen'
  });
}

async function handleAddPhoneMirror() {
  isShowAddMedia.value = false;
  const mediaSourceModel: TUIMediaSourceViewModel = {
    sourceName: 'Phone',
    aliasName: 'Phone',
    left: 0,
    top: 0,
    muted: false,
    mediaSourceInfo: {
      sourceId: `Phone${generateUniqueId()}`,
      sourceType: TRTCMediaSourceType.kPhoneMirror,
      zOrder: 1,
      rect: {
        left: 0,
        top: 0,
        right: 1080,
        bottom: 1920,
      }
    },
    mirrorParams: {
      connectType: 0,
      platformType: 0,
      deviceId: '',
      deviceName: '',
      placeholderImagePath: '',
      frameRate: 60,
      bitrateKbps: 8000,
    }
  }
  try {
    await mediaSourcesStore.addMediaSource(mediaSourceModel);
    await mediaSourcesStore.selectMediaSource(mediaSourceModel);
    window.ipcRenderer.send('open-child', {
      'command': 'phone-mirror',
      data: JSON.parse(JSON.stringify(mediaSourceModel))
    });
  } catch (error) {
    onMediaMixingError(error as TUIMediaMixingError);
  }
}

const handleChangeMediaOrder = (item: TUIMediaSourceViewModel, changeValue: number) => {
  mediaSourcesStore.changeMediaOrder(item, changeValue);
}

const handleMore = (item: TUIMediaSourceViewModel) => {
  visibleMorePopupId.value = item.mediaSourceInfo.sourceId;
  mediaSourcesStore.selectMediaSource(item);
}

const handleMuteMediaSource = (item: TUIMediaSourceViewModel) => {
  mediaSourcesStore.muteMediaSource(item, !item.muted);
}

const handleSelectSource = (item: TUIMediaSourceViewModel) => {
  logger.log(`${logPrefix}handleSelectSource:`, item);
  mediaSourcesStore.selectMediaSource(item);
}

const handleRemoveSource = async (item: TUIMediaSourceViewModel) => {
  logger.log(`${logPrefix}handleRemoveSource:`, item);
  try {
    await mediaSourcesStore.removeMediaSource(item);
  } catch (error) {
    onMediaMixingError(error as TUIMediaMixingError);
  }
  visibleMorePopupId.value = '';
}

const handleEditSource = (item: TUIMediaSourceViewModel) => {
  logger.log(`${logPrefix}handleEditSource:`, item);
  emits('edit-media-source', item);
  visibleMorePopupId.value = '';
}

const handleClickOutside = () => {
  visibleMorePopupId.value = '';
}

const mediaSouceInMoving: Ref<TUIMediaSourceViewModel | null> = ref(null);
const mediaSourceDivHeight: Ref<number|null> = ref(null);
const oldIndex: Ref<number|null> = ref(null);
const newIndex: Ref<number|null> = ref(null);
const handleStartDrag = (event: MouseEvent, item: TUIMediaSourceViewModel) => {
  logger.log(`${logPrefix}handleStartDrag:`, event, item);
  mediaSouceInMoving.value = item;
  mediaSourceDivHeight.value = (event.target as HTMLElement).offsetHeight;
  if (mediaSourceListRef.value) {
    const listBound = mediaSourceListRef.value.getBoundingClientRect();
    const mouseDistanceFromScrollTop = event.clientY - listBound.top + mediaSourceListRef.value.scrollTop;
    oldIndex.value = mouseDistanceFromScrollTop / mediaSourceDivHeight.value;
    oldIndex.value = Math.floor(oldIndex.value);
    logger.debug(`${logPrefix}handleStartDrag oldIndex:`, oldIndex.value);
    mediaSourceListRef.value.addEventListener('mousemove', handleDragging);
    mediaSourceListRef.value.addEventListener('mouseup', handleStopDrag);
  }
};

const handleDragging = (event: MouseEvent) => {
  logger.debug(`${logPrefix}handleDragging:`, event, event.target, event.currentTarget);
  if (mediaSourceListRef.value && mediaSourceDivHeight.value && mediaSouceInMoving.value) {
    const listBound = mediaSourceListRef.value.getBoundingClientRect();
    const mouseDistanceFromScrollTop = event.clientY - listBound.top + mediaSourceListRef.value.scrollTop;
    newIndex.value = mouseDistanceFromScrollTop / mediaSourceDivHeight.value;
    newIndex.value = Math.floor(newIndex.value);
    if (newIndex.value >= mediaList.value.length) {
      return;
    }

    if (oldIndex.value !== newIndex.value) {
      logger.debug(`${logPrefix}handleDragging oldIndex:`, oldIndex.value, 'newIndex:', newIndex.value);
      if (oldIndex.value !== null && newIndex.value !== null) {
        mediaSourcesStore.changeMediaOrder(mediaSouceInMoving.value, (oldIndex.value - newIndex.value));
        mediaSourcesStore.selectMediaSource(mediaSouceInMoving.value);
        oldIndex.value = newIndex.value;
      }
    }

    const mouseDistanceFromTop = event.clientY - listBound.top;
    if (mouseDistanceFromTop < mediaSourceDivHeight.value && mediaSourceListRef.value.scrollTop > 0) {
      mediaSourceListRef.value.scrollBy(0, -mediaSourceDivHeight.value);
    } else if (mouseDistanceFromTop > (listBound.height - mediaSourceDivHeight.value)
      && mediaSourceListRef.value.scrollTop + listBound.height < mediaSourceListRef.value.scrollHeight
    ) {
      mediaSourceListRef.value.scrollBy(0, mediaSourceDivHeight.value);
    }
  }
};

const handleStopDrag = (event: MouseEvent) => {
  logger.debug(`${logPrefix}handleStopDrag:`, event, event.target, event.currentTarget);
  if (mediaSourceListRef.value) {
    mediaSourceListRef.value.removeEventListener('mousemove', handleDragging);
    mediaSourceListRef.value.removeEventListener('mouseup', handleStopDrag);
  }
  mediaSouceInMoving.value = null;
  mediaSourceDivHeight.value = null;
  oldIndex.value = null;
  newIndex.value = null;
};

const toggleHevcMode = (value: boolean) => {
  mediaSourcesStore.updateHevcEncodeState(value);
}

const onChangeBgColor = (value: number) => {
  mediaSourcesStore.updateBackgroundColor(value);
}

const onChangeBorderColor = (value: number) => {
  mediaSourcesStore.updateSelectedBorderColor(value);
}

const onChangeVideoResolution = (resolution: TRTCVideoResolution) => {
  mediaSourcesStore.updateVideoResolution(resolution);
}

const onChangeVideoFps = (value: number) => {
  mediaSourcesStore.updateVideoFps(value);
};

const onChangeVideoBitrage = (value: number) => {
  mediaSourcesStore.updateVideobitrate(value);
};

const onChangeColorSpace = (value: number) => {
  mediaSourcesStore.updateMixingColorSpace(value as TRTCVideoColorSpace);
};

const onChangeColorRange = (value: number) => {
  mediaSourcesStore.updateMixingColorRange(value as TRTCVideoColorRange);
};

const onChangeEncodeGear = (value: number) => {
  mediaSourcesStore.updateMixingEncodeGear(value as TRTCVideoEncodeComplexity);
}
</script>

<style scoped lang="scss">
@import "../../assets/variable.scss";

.tui-live-config {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.tui-config-title {
  display: inline-flex;

  .tui-config-title-header {
    padding: 0 0.5rem;
    cursor: pointer;

    &.is-active {
      color: var(--text-color-link);
      border-bottom: 0.125rem solid var(--text-color-link);
    }
  }
}

.icon-container{
  padding-right: 0.25rem;
  color: var(--button-color-primary-default);

  &:hover {
    color: var(--button-color-primary-hover);
  }
}

.tui-menu-item-text{
  font-size: $font-live-config-menu-item-size;
  font-style: $font-live-config-menu-item-style;
  font-weight: $font-live-config-menu-item-weight;
  line-height: 1.375rem;
  color: var(--text-color-primary);
}

.tui-config-list{
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: calc(100% - 2rem);

  .tui-config-notice{
    font-style: $font-live-config-notice-style;
    font-weight: $font-live-config-notice-weiht;
    line-height: 1.375rem;
    color: var(--text-color-secondary);
  }

  .btn-add-source{
    display: flex;
    align-items: center;
    justify-content: center;
    width: 12.5rem;
    height: 2.5rem;
    margin: 1rem 0;
    cursor: pointer;
    background: var(--bg-color-input);
    border-radius: 6.25rem;
  }
}

.tui-media-source{
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: calc(100% - 2rem);
  overflow: auto;

  .tui-add-source-menu{
    display: flex;
    align-items: center;
    justify-content: center;
    width: 14.75rem;
    height: 2rem;
    margin: 1.5rem auto;
    color: var(--text-color-primary);
    cursor: pointer;
    background: var(--bg-color-input);
    border-radius: 6.25rem;
  }

  .tui-add-source-menu-popup{
    position: absolute;
    top: 3.75rem;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    background-color: var(--dropdown-color-default);
    border-radius: 0.25rem;
    box-shadow: 0 1px 5px var(--shadow-color),0 8px 12px var(--shadow-color),0 12px 26px var(--shadow-color);
  }

  .tui-add-source-menu-item{
    display: flex;
    align-items: center;
    justify-content: center;
    width: 15rem;
    height: 2.5rem;
    cursor: pointer;
    background-color: var(--dropdown-color-default);
    border-radius: 0.25rem;

    &:hover {
      background-color: var(--dropdown-color-hover);
    }
  }
}

.tui-media-source-list {
  flex: 1 1 auto;
  width: 100%;
  height: calc(100% - 7rem);
  padding: 0 1rem;
  overflow-y: auto;
}

.tui-media-source-item{
  position: relative;
  width: 100%;
  cursor: move;
  border-radius: 0.25rem;

  &:hover {
    background-color: var(--list-color-hover);
    .item-icon {
      background-color: var(--list-color-hover);
    }
  }

  &.selected {
    background-color: var(--list-color-focused);
    .item-icon {
      background-color: var(--list-color-focused);
    }
  }
}

.tui-media-source-content{
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  line-height: 2.5rem;

  .item-name{
    width: 8rem;
    padding-left: 0.5rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .item-tools{
    display: flex;
  }

  .item-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    cursor: pointer;
    background-color: var(--bg-color-operate);
    border: none;

    &.disabled{
      color: var(--button-color-primary-disabled);
      cursor: not-allowed;
      opacity: 0.5;

      span {
        cursor: inherit;
      }
    }

    &:focus-visible,
    &:focus {
      outline: none;
    }
  }
}

.tui-edit-source-menu-popup{
  position: absolute;
	top: 2.125rem;
  right: 0;
  z-index: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  width: 5.25rem;
  background-color: var(--dropdown-color-default);
  border-radius: 0.25rem;
  box-shadow: 0 1px 5px var(--shadow-color),0 8px 12px var(--shadow-color),0 12px 26px var(--shadow-color);

  .edit-menu-item{
    width: 100%;
    height:1.75rem;
    padding-left: 0.75rem;
    font-size: 0.75rem;
    font-style: normal;
    font-weight: 400;
    line-height: 1.375rem;
    cursor: pointer;

    &:hover {
      background-color: var(--dropdown-color-hover);
      border-radius: 0.25rem;
    }

    .tui-image-source {
      align-items: flex-start;
    }
  }
}

.tui-video-encode{
  height: calc(100% - 2rem);
  padding: 0 1rem;
  overflow: auto;

  .options-container{
    display: flex;
    flex-direction: column;
    padding-top: 0.625rem;
  }

  .options-container-title{
    font-size: 0.75rem;
    font-style: normal;
    font-weight: 400;
    line-height: 1.375rem;
  }

  .options-container-input{
    margin-top: 0.375rem;
  }
}
</style>
