<template>
  <div class="tui-slider" ref="sliderRef" @mousedown="onMouseDown">
    <div class="tui-slider-line" ref="liveRef"></div>
    <div class="tui-slider-thumb" ref="thumbRef" :style="{ left: pointPosition + '%' }" @mousedown="$event.stopPropagation()">
      <svg-icon :icon="PointIcon" ></svg-icon>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, Ref, defineEmits, defineProps, withDefaults, watch, onMounted, onBeforeUnmount } from 'vue';
import { Movable } from 'movable-resizable-js';
import PointIcon from '../icons/PointIcon.vue';
import SvgIcon from './SvgIcon.vue';
import logger from '../../utils/logger';

const logPrefix ='[TUISlider]';

interface Props{
  value: number,
}
const props = withDefaults(defineProps<Props>(), {
  value: 0,
});
const emit = defineEmits(['update:value']);
const pointPosition = ref(props.value * 100);


const sliderRef: Ref<HTMLElement|null> = ref(null);
const liveRef: Ref<HTMLElement|null> = ref(null);
const thumbRef: Ref<HTMLElement|null> = ref(null);
let movableThumb: Movable | null = null;

function onMouseDown(event: MouseEvent) {
  if (event.currentTarget) {
    let leftPercent = Math.round(100 * event.offsetX / (event.currentTarget as HTMLElement).offsetWidth);
    leftPercent = leftPercent >= 0 ? leftPercent : 0;
    leftPercent = leftPercent <= 100 ? leftPercent : 100;
    pointPosition.value = leftPercent;
    emit('update:value', pointPosition.value);
  } else {
    // do nothing
  }
}

function onMove(left: number, top: number) {
  if (sliderRef.value) {
    const containerWidth = sliderRef.value.offsetWidth || 0;
    let leftPercent = Math.round(left * 100 / containerWidth);
    leftPercent = leftPercent >= 0 ? leftPercent : 0;
    leftPercent = leftPercent <= 100 ? leftPercent : 100;
    pointPosition.value = leftPercent;
    setSliderProgress(pointPosition.value);
    emit('update:value', pointPosition.value);
  } else {
    logger.error(`${logPrefix}onMove(${left}, ${top}) no container error`);
  }
}

function setSliderProgress(progress: number){
  if(liveRef.value){
    liveRef.value.style.setProperty('--slider-filled-width',`${progress}%`)
  }
}

watch(props, (newVal: Props) => {
  pointPosition.value = newVal.value * 100;
  setSliderProgress(pointPosition.value);
}, {
  immediate: true,
});

onMounted(() => {
  if (thumbRef.value && sliderRef.value) {
    movableThumb = new Movable(thumbRef.value, document.body, {calcPositionOnly: true});
    const thumbLeft = Number(thumbRef.value.style.left.slice(0,thumbRef.value.style.left.length-1))
    setSliderProgress(thumbLeft);
    movableThumb.on('move', onMove);
  } else {
    logger.error(`${logPrefix}onMounted error`);
  }
});

onBeforeUnmount(() => {
  if (movableThumb) {
    movableThumb.off('move', onMove);
    movableThumb = null;
  }
});
</script>

<style lang="scss" scoped>
@import "../../assets/variable.scss";

.tui-slider {
  position: relative;
  width: 100%;
  height: 1rem;
  background-color: $color-tui-slider-backgriund;
  cursor: pointer;
}

.tui-slider-line {
  position: absolute;
  height: 0.125rem;
  top: 50%;
  transform: translateY(-50%);
  left: 0;
  right: 0;
  background-color: var(--slider-color-empty);

  &::after {
    content: '';
    position: absolute;
    left: 0;
    width: var(--slider-filled-width);
    height: 0.125rem;
    background-color: var(--slider-color-filled);
  }
}



.tui-slider-thumb {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%) scale(1.5);
  width: 0.5rem;
  height: 0.5rem;
  display: flex;
  justify-content: center;
  align-items: center;
  color: var(--slider-color-button);
  border: 1.5px solid var(--text-color-link);
  border-radius: 50%;
  cursor: pointer !important;
}
</style>
