<template>
    <span class="tui-image-source" @click="triggerFileSelect">
      <input type="file" class="tui-file-input" @change="handleSaveFile" ref="fileInputRef" accept=".jpg,.jpeg,.png,.bmp,.gif">
      <span class="tui-image-container" v-if="mode === TUIMediaSourceEditMode.Add">
        <svg-icon :icon="CameraIcon" class="icon-container"></svg-icon>
        <i class="text">{{ t('Add Image') }}</i>
      </span>
      <span v-else>{{ t('Edit source') }}</span>
    </span>
</template>
<script setup lang="ts">
import { ref, Ref, defineProps, defineExpose, computed, watch } from 'vue';
import { TRTCMediaSourceType } from 'trtc-electron-sdk';
import { useI18n } from '../../locales';
import CameraIcon from '../../common/icons/CameraIcon.vue';
import SvgIcon from '../../common/base/SvgIcon.vue';
import { useCurrentSourceStore } from '../../store/child/currentSource';
import imageStorage from './imageStorage';
import { TUIMediaSourceEditMode } from './constant';
import { addMediaSource, updateMediaSource } from '../../communication';

type TUIMediaSourceEditProps = {
  data?: Record<string, any>;
}

const logger = console;

const props = defineProps<TUIMediaSourceEditProps>();
const mode = computed(() => props.data?.mediaSourceInfo ? TUIMediaSourceEditMode.Edit : TUIMediaSourceEditMode.Add);

const currentSourceStore = useCurrentSourceStore();
const { t } = useI18n();
const file: Ref<File|null> = ref(null)
const url: Ref<string> = ref('');
const width: Ref<number> = ref(0);
const height: Ref<number> = ref(0);
const fileInputRef = ref<HTMLInputElement|null>(null);
const isSameImage = computed(() => {
  return (file.value as any)?.path === props.data?.mediaSourceInfo?.sourceId ? true : false;
});


const calcImageSize = (imageFile: File): Promise<{
  width: number;
  height: number;
}> => {
  return new Promise((resolve, reject) => {
    const fileReader = new FileReader();
    fileReader.onload = (fileOnloadEvent: any) => {
      let image = new Image();
      image.onload = (imageOnloadEvent: any) => {
        const img = imageOnloadEvent.target as HTMLImageElement;
        resolve({
          width: img.width,
          height: img.height,
        });
        image.src = '';
        image.onerror = null;
        image.onload = null;
        image = null;
      };
      image.onerror = (imageOnerrorEvent: any) => {
        console.error(
          "[LiveStudio]calcImageSize image load error:",
          imageOnerrorEvent
        );
        if (image) {
          image.src = '';
          image.onerror = null;
          image.onload = null;
          image = null;
        }
        reject();
      };
      image.src = fileOnloadEvent.target.result as string;
    };
    fileReader.onerror = (fileOnerrorEvent: any) => {
      console.error(
        "[LiveStudio]calcImageSize file read error:",
        fileOnerrorEvent
      );
      reject();
    };
    fileReader.readAsDataURL(imageFile as any);
  });
};


const handleSaveFile = async(event: any) => {
  if (!event.target.files[0]) {
    // click cancel or no file selected
    return;
  }
  file.value = event.target.files[0];
  url.value = window.URL.createObjectURL(file.value as File);
  if(mode.value === TUIMediaSourceEditMode.Add && file.value && (file.value as any)?.path){
    const imageInfo = {
      type: TRTCMediaSourceType.kImage,
      name: file.value?.name,
      id: (file.value as any).path,
      width: width.value,
      height: height.value,
    }
    try {
      const { width, height } = await calcImageSize(file.value as any);
      imageInfo.width = width;
      imageInfo.height = height;
    } catch (error) {
      console.error("Error calculating image size:", error);
    }
    addMediaSource(imageInfo);
    resetCurrentView();
  }else if(mode.value === TUIMediaSourceEditMode.Edit && !isSameImage.value && file.value && (file.value as any)?.path){
    const newData = {
      type: TRTCMediaSourceType.kImage,
      name: file.value?.name,
      id: (file.value as any).path,
      width: width.value,
      height: height.value,
      predata: JSON.parse(JSON.stringify(props.data)),
    };
    try {
      const { width, height } = await calcImageSize(file.value as any);
      newData.width = width;
      newData.height = height;
    } catch (error) {
      console.error("Error calculating image size:", error);
    }
    updateMediaSource(newData);
    resetCurrentView();
  }else {
    // To do: Message('Please choose an image')；
    logger.warn('Please choose an image');
  }
}

const triggerFileSelect = () => {
  if (fileInputRef.value) {
    fileInputRef.value.click();
  }
}

const resetCurrentView = () => {
  currentSourceStore.setCurrentViewName('');
  file.value = null;
  url.value = '';
}

defineExpose({
  triggerFileSelect,
});

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
@import '../../assets/global.scss';

.tui-image-source{
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
}
.tui-file-input {
  display: none;
}
.tui-image-container {
  display: flex
}
.icon-container{
  padding-right: 0.25rem;
  cursor: pointer;
}
.text {
  color: var(--text-color-primary);
  font-size: $font-live-image-source-text-size;
  font-style: $font-live-image-source-text-style;
  font-weight: $font-live-image-source-text-weight;
  line-height: 1.375rem;
}
</style>
