<template>
    <div class="tui-image-source">
        <div class="tui-image-title" >
            <span>{{ t('Add Image') }}</span>
            <svg-icon :icon="CloseIcon" @click="handleCloseSetting"></svg-icon>
        </div>
        <div class="tui-image-middle">
            <input type="file" class="tui-file-input" @change="handleSaveFile" ref="fileInputRef">
            <button class="tui-file-trigger" @click="triggerFileSelect">{{ t('Choose Image') }}</button>
            <div class="tui-image-preview">
                <img v-if="url"  :src="url" @load="onImageLoad">
            </div>
        </div>
        <div class="tui-image-footer" >
            <button v-if="mode === TUIMediaSourceEditMode.Add" class="tui-button-confirm" :disabled="!file" @click="handleAddImage">{{ t('Add Image') }}</button>
            <button v-else class="tui-button-confirm" :disabled="!file || isSameImage" @click="handleEditImage">{{ t('Edit Image') }}</button>
            <button class="tui-button-cancel" @click="handleCloseSetting">{{ t('Cancel') }}</button>
        </div>
    </div>
</template>
<script setup lang="ts">
import { ref, Ref, defineProps, computed, watch } from 'vue';
import { TUIMediaSourceType } from '@tencentcloud/tuiroom-engine-electron/plugins/media-mixing-plugin';
import { useI18n } from '../../locales';
import SvgIcon from '../../common/base/SvgIcon.vue';
import CloseIcon from '../../common/icons/CloseIcon.vue';
import { useCurrentSourcesStore } from '../../store/currentSources';
import imageStorage from './imageStorage';
import { TUIMediaSourceEditMode } from './constant';

type TUIMediaSourceEditProps = {
  data?: Record<string, any>;
}

const logger = console;

const props = defineProps<TUIMediaSourceEditProps>();
const mode = computed(() => props.data?.mediaSourceInfo ? TUIMediaSourceEditMode.Edit : TUIMediaSourceEditMode.Add);

const sourcesStore = useCurrentSourcesStore();           
const { t } = useI18n();
const file: Ref<File|null> = ref(null)
const url: Ref<string> = ref('');
const width: Ref<number> = ref(0);
const height: Ref<number> = ref(0);
const fileInputRef = ref<HTMLInputElement|null>(null);

const isSameImage = computed(() => {
  return (file.value as any)?.path === props.data?.mediaSourceInfo?.sourceId ? true : false;
});

const triggerFileSelect = () => {
  if (fileInputRef.value) {
    fileInputRef.value.click();
  }
}

const handleSaveFile = (event: any) => {
  file.value = event.target.files[0];
  url.value = window.URL.createObjectURL(file.value as File);
  imageStorage.set((file.value as any)?.path, url.value);
}

const onImageLoad = (event: any) => {
  width.value = event.target.naturalWidth;
  height.value = event.target.naturalHeight;
}

const handleAddImage = () => {
  if (file.value && (file.value as any)?.path) {
    const imageInfo = {
      type: TUIMediaSourceType.kImage,
      name: file.value?.name, 
      id: (file.value as any).path, 
      width: width.value,
      height: height.value,
    }
    
    window.mainWindowPort?.postMessage({
      key: "addMediaSource",
      data: imageInfo,
    });
    window.ipcRenderer.send("close-child");
    resetCurrentView();
  } else {
    // To do: Message('Please choose an image')；
    logger.warn('Please choose an image');
  }
}

const handleEditImage = () => {
  if (!isSameImage.value && file.value && (file.value as any)?.path) {
    const newData = {
      type: TUIMediaSourceType.kImage,
      name: file.value?.name, 
      id: (file.value as any).path, 
      width: width.value,
      height: height.value,
      predata: JSON.parse(JSON.stringify(props.data)),
    };

    window.mainWindowPort?.postMessage({
      key: "updateMediaSource",
      data: newData,
    });

    window.ipcRenderer.send("close-child");
    resetCurrentView();
  } else {
    // To do: Message('Please choose a new image');
    logger.warn('Please choose a new image');
  }
}

const handleCloseSetting = () => {
  window.ipcRenderer.send("close-child");
  resetCurrentView();
}

const resetCurrentView = () => {
  sourcesStore.setCurrentViewName('');
  file.value = null;
  url.value = '';
}

watch(props, (val) => {
  logger.log(`[LiveImageSource]watch props.data`, val);
  if (val.data?.mediaSourceInfo) {
    if (imageStorage.has(val.data.mediaSourceInfo.sourceId as string)){
      url.value = imageStorage.get(val.data.mediaSourceInfo.sourceId as string) || val.data.mediaSourceInfo.sourceId as string;
    } else {
      url.value = val.data.mediaSourceInfo.sourceId as string;
    }
  }
}, {
  immediate: true
});
</script>

<style scoped lang="scss">
@import './style.scss';

.tui-image-source{
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    height: 100%;
}
.tui-image-title{
    height: 4rem;
    line-height: 2.5rem;
    border-bottom: 1px solid rgba(230, 236, 245, 0.80);
    font-weight: 500;
    padding: 0 1.5rem 0 1.375rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
}
.tui-image-footer{
    height: 4.375rem;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding: 0 1.5rem;
}
.tui-image-middle{
    display: flex;
    flex-direction: column;
    height: 80%;
}
.tui-file-input {
  display: none;
}
.tui-file-trigger {
  height: 1.5rem;
  width: 8rem;
  margin-left: 0.5rem;
}
.tui-image-preview{
    width: 100%;
    height: calc(100% - 1.5rem);

    img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
}
</style>./type-define./types./constant