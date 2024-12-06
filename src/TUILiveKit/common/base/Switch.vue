<template>
  <span class="switch" :class="{ 'is-checked': isChecked }" @click="toggleSwitch">
    <span class="switch-label">{{ props.label }}</span>
    <span class="switch-core"></span>
  </span>
</template>

<script lang="ts" setup>
import { ref, watch, defineProps, defineEmits } from 'vue';
interface Props {
  modelValue: boolean;
  label?: string;
}

const props = defineProps<Props>();

const isChecked = ref(props.modelValue);

const emit = defineEmits(['update:modelValue']);

function toggleSwitch() {
  emit('update:modelValue', !isChecked.value);
}

watch(
  () => props.modelValue,
  (val) => {
    isChecked.value = val;
  },
);
</script>

<style lang="scss" scoped>
@import "../../assets/variable.scss";

.switch {
  display: inline-flex;
  align-items: center;
  padding: 0 0.25rem;
  width: fit-content;
  height: 1.25rem;
  background-color: $color-switch-background;
  border-radius: 1.25rem;
  cursor: pointer;
  transition: background-color 0.3s;  
}

.switch.is-checked {
  flex-direction: row-reverse;
  background-color: $color-switch-is-checked-background;
}

.switch-label {
  margin: 0 0.25rem;
}

.switch-core {
  width: 1rem;
  height: 1rem;
  border-radius: 50%;
  box-shadow: 0 1px 5px $color-switch-core-box-shadow;
  background-color: $color-switch-core-background;
  transition: transform 0.3s !important;
}
</style>
