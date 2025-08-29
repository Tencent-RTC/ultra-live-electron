<template>
  <div class="tui-checkbox">
    <input
      v-model="checked"
      type="checkbox"
      @change="handleValueChange"
    />
    <span @click="handleCheckBoxClick">
      <slot></slot>
    </span>
  </div>
</template>

<script setup lang="ts">
import { ref, Ref, withDefaults, defineProps, defineEmits } from 'vue';
  interface Props {
    modelValue: boolean;
  }

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
});

const emit = defineEmits(['update:modelValue']);

const checked: Ref<boolean> = ref(props.modelValue);
function handleCheckBoxClick() {
  checked.value = !checked.value;
  emit('update:modelValue', checked.value);
}

function handleValueChange(event: any) {
  checked.value = event.target.checked;
  emit('update:modelValue', event.target.checked);
}
</script>

<style lang="scss" scoped>
@import "../../assets/variable.scss";

  .tui-checkbox {
    position: relative;
    display: inline-block;
    cursor: pointer;
  }

  input {
    color: $font-checkbox-input-color;
    border: 1px solid $color-checkbox-input-border;
    border-radius:0.25rem;
    vertical-align: middle;
    cursor: pointer;
  }

  input:focus {
    border-color: $color-checkbox-input-focus-border;
    outline: 0;
  }

  input:disabled {
    background-color: $color-checkbox-input-disabled-background;
  }
</style>
