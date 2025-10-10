<template>
    <div class="input-container">
        <input  class="input" type="color" v-model="colorValue" @input="onInputColor">
        <div :style="{ backgroundColor: colorValue }"></div>
        <span class="text">{{colorValue}}</span>
   </div>
</template>
<script setup lang="ts">
import { ref, Ref, defineProps, defineEmits } from 'vue';
interface Props {
    currentColor: string
}

const emits = defineEmits(['change']);

const props = defineProps<Props>();
const colorValue: Ref<string> = ref(props.currentColor);

function onInputColor() {
  emits('change', colorValue.value);
}
</script>

<style lang="scss" scoped>
@import "../../assets/variable.scss";

.input-container{
    display: flex;
    align-items: center;
    background-color: $color-picker-input-container-background;
    border-radius: 0.375rem;
}

.input{
    width: 10rem;
    padding: 0;
    cursor: pointer;
    background: $color-picker-input-background;
    border: none;
    outline: none;
}

.text{
    padding-left: 0.125rem;
    font-size: $font-picker-text-size;
    font-style: normal;
    font-weight: $font-picker-text-weight;
    line-height: 1.25rem;
    color: $font-picker-text-color;
}
</style>