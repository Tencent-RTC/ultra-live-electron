<template>
    <div class="tui-beauty-container">
      <div class="tui-beauty-container-title">
        <div v-for="(item) in beautyList" :key="item.type">
          <span :class="[item.type === currentBeautyType ? 'tui-beauty-container-choose' : 'tui-beauty-container-text']" @click="handleChooseBeauty(item)">{{ item.text }}</span>
          <div v-if="item.type === currentBeautyType" class="tui-beauty-container-options">
            <div v-for="(value, key) in item.info" :key="key" class="beauty-property" @click="handleChooseBeautyOptions(value)">
              <div v-if="currentBeautyType === BeautyType.FINEBEAUTY && currentBeautyOptions === value" class="tui-beauty-container-drag">
                <span class="tui-beauty-container-drag-text">{{value?.label}}</span>
                <draggable-point class="drag-container" :rate="currentRate" @update-drag-value="onUpdateBeautyValue" ></draggable-point>
                <span class="tui-beauty-container-drag-text">{{currentBeauty}}</span>
              </div>
            <span v-if="currentBeautyType === BeautyType.ONECLICKBEAUTY" :class="[currentBeautyOptions === value ? 'tui-beauty-container-options-detail-choose' : 'tui-beauty-container-options-detail']">{{value.label}}</span>
            <span v-else class="tui-beauty-container-options-info">
              <svg-icon  v-if="currentBeautyType === BeautyType.FINEBEAUTY" :class="[currentBeautyOptions === value && 'tui-beauty-icon']" :icon=value.icon></svg-icon>
              <img :class="[currentBeautyOptions === value ? 'tui-beauty-container-options-back-choose' : 'tui-beauty-container-options-back']" v-if="currentBeautyType === BeautyType.VIRTUALBACGROUND" :src=value?.imgPath alt="">
              <span>{{value?.label}}</span>
            </span>
            </div>
          </div>
        </div>
      </div>
    </div>
</template>
<script setup lang="ts">
import { onBeforeMount, onBeforeUnmount, ref, Ref, computed } from "vue";
import { useI18n } from '../locales';
import SvgIcon from '../common/base/SvgIcon.vue';
import DraggablePoint from '../common/base/DraggablePoint.vue';
import { useCurrentSourcesStore } from '../store/currentSources';
import { BeautyType } from '../constants/render';
import {
  TUIBeautyProperty,
  TUISimpleBeautyConstant,
  TUIBasicBeautyConstant,
  TUIFaceBeautyConstant,
  TUIBeautyCategory,
  getTUISegmentationBeautyConstant
} from "../utils/beauty";

const sourcesStore = useCurrentSourcesStore();
let TUISegmentationConstant: any = {};
const { t } = useI18n();
const currentBeautyType: Ref<BeautyType> = ref(BeautyType.FINEBEAUTY);
const currentBeautyOptions = ref();

const options = ref({
  category: TUIBeautyCategory.Beauty,
  effKey: '',
  effValue: '',
  resPath: '',
  bgPath: '',
})

const currentRate = computed (() => Number(options.value.effValue))
const currentBeauty = computed(()=> Number(options.value.effValue)*100)

const beautyList = ref([
  // {
  //   text: t('One Click Beauty'),
  //   info: TUISimpleBeautyConstant,
  //   type: BeautyType.ONECLICKBEAUTY
  // },
  {
    text: t('Fine Beauty'),
    info: Object.assign({}, TUIBasicBeautyConstant, TUIFaceBeautyConstant),  
    type: BeautyType.FINEBEAUTY
  },
  // {
  //   text: t('Filters'),
  //   info: {},
  //   type: BeautyType.FILTER        
  // },
  // {
  //   text: t('Head ornament'),
  //   info: {},
  //   type: BeautyType.HEADORNAMENT
  // },
  // {
  //   text: t('Frame'),
  //   info: {},
  //   type: BeautyType.FRAME
  // },
  {
    text: t('Virtual background'),
    info: TUISegmentationConstant,
    type: BeautyType.VIRTUALBACGROUND,
  }
])

const handleChooseBeauty = (item: any) => {
  currentBeautyType.value = item.type;
}

const handleChooseBeautyOptions = (value: any) => {
  const { effKey, effValue, resPath, bgPath} = value;
  currentBeautyOptions.value = value;
  if(currentBeautyType.value === BeautyType.FINEBEAUTY) {
    options.value.category = TUIBeautyCategory.Beauty,
    options.value.effKey = effKey,
    options.value.effValue = effValue
  }
  if(currentBeautyType.value === BeautyType.VIRTUALBACGROUND) {
    options.value.category = TUIBeautyCategory.Segmentation,
    options.value.effKey = effKey,
    options.value.resPath = resPath,
    options.value.bgPath = bgPath
  }
  sourcesStore.setCurrentBeautySetting(options.value)
}

const onUpdateBeautyValue = (event: number) => {
  const val = (Math.round(event) / 100).toString();
  for(let index = 0;index < beautyList.value.length; index++){
    if(beautyList.value[index].type === BeautyType.FINEBEAUTY) { 
      Object.values(beautyList.value[index].info).forEach((value: unknown) => {
        if((value as TUIBeautyProperty).effKey === currentBeautyOptions.value.effKey) {
          (value as TUIBeautyProperty).effValue = val;
        }
      });
    }
  }
  options.value.effValue = val;
  sourcesStore.setCurrentBeautySetting(options.value);
}

onBeforeMount(async() => {
  TUISegmentationConstant = await getTUISegmentationBeautyConstant();
  for(let index = 0;index < beautyList.value.length; index++){
    if(beautyList.value[index].type === BeautyType.VIRTUALBACGROUND) {
      beautyList.value[index].info = TUISegmentationConstant;
    }   
  }
})

onBeforeUnmount(() => {
  currentBeautyType.value = BeautyType.FINEBEAUTY;
})

</script>



<style scoped lang="scss">
.tui-beauty-container{
    margin: 0.75rem 0;
    width:34.5rem;
    height:10.75rem;
    border-radius: 0.5rem;
    border: 1px solid #E4E8EE;
    &-title{
      display: flex;
      justify-content: space-around;
      width: 34.5rem;
      height: 2.75rem;
      background-color: rgba(240, 243, 250, 0.40);
      align-items: center;
      position: relative;
    }
    &-text{
      color: #8F9AB2;
      font-family: PingFang SC;
      font-size: 0.75rem;
      font-style: normal;
      font-weight: 500;
      line-height: 1.25rem;
    }
    &-choose{
      color: #1C66E5;
      font-family: PingFang SC;
      font-size: 0.75rem;
      font-style: normal;
      font-weight: 500;
      line-height: 1.25rem; /* 166.667% */
    }
    &-options{
      position: absolute;
      top: 3.75rem;
      left: 2.5rem;
      display: flex;
      width: 34.5rem;
      padding-top: 1.5rem;
      flex-wrap: wrap;
      height: 6rem;
      overflow-y: scroll;
      &-detail{
        padding: 0.625rem;
        border-radius: 0.5rem;
        border: 1.125px solid #E4EAF7;
        margin-right: 1.25rem;
        color:#8F9AB2;
        font-family: PingFang SC;
        font-size: 0.75rem;
        font-style: normal;
        font-weight: 500;
        line-height: 1.25rem;
        &-choose{
          color:#1C66E5;
          padding: 0.625rem;
          border-radius: 0.5rem;
          border: 1.125px solid #1C66E5;
          margin-right: 1.25rem;
          font-family: PingFang SC;
          font-size: 0.875rem;
          font-style: normal;
          font-weight: 500;
          line-height: 1.375rem;
        }
      }
      &-info{
        display: flex;
        flex-direction: column;
        align-items: center;
        margin-right: 1.25rem;
        color:#8F9AB2;
        font-family: PingFang SC;
        font-size: 0.75rem;
        font-style: normal;
        font-weight: 500;
        line-height: 1.25rem;
      }
      &-back{
        height: 3rem;
        width: 6rem;
        border-radius: 0.5rem;
        &-choose{
          height: 3rem;
          width: 6rem;
          border: 2.5px solid #1C66E5;
          border-radius: 0.5rem;
        }
      }
    }
    &-drag{
      display: flex;
      align-items: center;
      position: absolute;
      top: 0.285rem;
      left: 50%;
      right: 50%;
      width: 14.75rem;
      transform: translate(-50%,-50%);

      &-text{
        color: #4F586B;
        font-family: PingFang SC;
        font-size: 0.75rem;
        font-style: normal;
        font-weight: 400;
        line-height: 1.375rem;
        padding-left: 0.375rem;
      }
    }
.drag-container{
  width: 10rem;
}
.tui-beauty-icon{
  border: 1px solid #1C66E5;
  border-radius: 0.5rem;
}
}
</style>