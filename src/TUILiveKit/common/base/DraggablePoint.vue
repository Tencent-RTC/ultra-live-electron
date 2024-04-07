<template>    
    <div class="draggable-point" ref="draggablePoint"
      v-click-outside="handleClickOutside"
      @mousedown="onMouseDown"
      @mousemove="onMouseMove"
      @mouseup="onMouseUp">
        <div class="line" ref="lineRef"></div>
        <svg-icon class="point" :style="{ left: pointPosition + '%' }" :icon="PointIcon" ></svg-icon>
    </div>
</template>
<script setup lang="ts">
import { ref, Ref, defineEmits, defineProps, withDefaults, watch } from "vue";
import PointIcon from '../icons/PointIcon.vue';
import SvgIcon from './SvgIcon.vue';
import vClickOutside from '../../utils/vClickOutside';
const draggablePoint = ref(null);
const lineRef:Ref<HTMLDivElement|null> = ref(null);
const isMouseDown = ref(false);
const startPosition = ref(0);

interface Props{
  rate: number,
}
const props = withDefaults(defineProps<Props>(), {
  rate: 0,
});
const pointPosition = ref(props.rate * 100);

const emit = defineEmits(['update-drag-value']);

const onMouseDown = (event: MouseEvent) => {
  isMouseDown.value = true;
  startPosition.value = event.clientX;
};

const onMouseMove = (event: MouseEvent) => {
  if (!isMouseDown.value) return;
  if (lineRef.value) {
    const delta = event.clientX - startPosition.value;
    const lineWidth = lineRef.value.clientWidth;
    pointPosition.value = Math.max(0, Math.min(100, (lineWidth * (pointPosition.value/100) + delta)/lineWidth) * 100);
    startPosition.value = event.clientX;
    if(pointPosition.value > 100) {
      pointPosition.value = 100;
      return
    }
  }
};

const onMouseUp = () => {
  isMouseDown.value = false;
  const dragValue = pointPosition.value;
  emit('update-drag-value', dragValue)
};

const handleClickOutside = () => {
  if(isMouseDown.value) {
    isMouseDown.value = false;
  }
}

watch(() => props.rate, (val) => {
  if (val !== null && val !== undefined) {
    pointPosition.value = val * 100;
  }
});
</script>
<style scoped lang="scss">
.draggable-point {
  position: relative;
  height: 2px;
  background-color: lightgray;
  cursor: pointer;
}
.line {
  position: absolute;
  top: 50%;
  left: 0;
  width: 100%;
  height: 2px;
}
.point {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
}
</style>