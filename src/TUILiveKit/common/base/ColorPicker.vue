<template>
    <div class="input-container">
        <input  class="input" type="color" v-model="colorValue" @input="onInputColor">
        <div :style="{ backgroundColor: colorValue }"></div>
        <span class="text">{{colorValue}}</span>
   </div>
</template>
<script setup lang="ts">
import { ref, Ref, defineProps } from 'vue';
import { useMediaSourcesStore } from '../../store/mediaSources';
const mediaSourcesStore = useMediaSourcesStore();
interface Props {
    currentColor: number
}
const props = defineProps<Props>();
const colorValue: Ref<string> = ref(`#${props.currentColor.toString(16)}`);

function onInputColor() {
  mediaSourcesStore.updateBackgroundColor(parseInt(colorValue.value.substring(1), 16));
}
</script>

<style lang="scss" scoped>
@import "../../assets/variable.scss";

.input-container{
    display: flex;
    align-items: center;
    background-color: $color-picker-input-container-background;
    border-radius: 0.375rem;
    width: 14.625rem;
}
.input{
    border: none;
    outline: none;
    background: $color-picker-input-background;
}
.text{
    color: $font-picker-text-color;
    font-size: $font-picker-text-size;
    font-style: normal;
    font-weight: $font-picker-text-weight;
    line-height: 1.25rem;
    padding-left: 0.125rem;
}
</style>