<template>
  <label class="switch" :class="{ 'is-checked': isChecked }">
    <input v-model="isChecked" type="checkbox" class="switch-input" @change="toggleSwitch" />
    <span class="switch-core"></span>
  </label>
</template>

<script lang="ts" setup>
import { ref, watch, defineProps, defineEmits } from 'vue';
interface Props {
  modelValue: boolean;
}

const props = defineProps<Props>();

const isChecked = ref(props.modelValue);

const emit = defineEmits(['update:modelValue']);

function toggleSwitch() {
  emit('update:modelValue', isChecked.value);
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
  position: relative;
  display: inline-block;
  width: 40px;
  height: 20px;
  background-color: $color-switch-background;
  border-radius: 20px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.switch.is-checked {
  background-color: $color-switch-is-checked-background;
}

.switch-input {
  position: absolute;
  left: 0;
  top: 0;
  opacity: 0;
  width: 0;
  height: 0;
}

.switch-core {
  position: absolute;
  left: 2px;
  top: 2px;
  width: 40%;
  height: 80%;
  background-color: $color-switch-core-background;
  border-radius: 50%;
  box-shadow: 0 1px 5px $color-switch-core-box-shadow;
  transition: transform 0.3s !important;
}

.switch.is-checked .switch-core {
  transform: translateX(20px);
}
</style>
