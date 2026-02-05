<template>
  <button
    :class="buttonClassList"
    :style="customStyle"
    :disabled="props.disabled"
    @click="handleClick"
  >
    <span v-if="$slots.icon" class="button-icon">
      <slot name="icon"></slot>
    </span>
    <slot></slot>
  </button>
</template>

<script setup lang="ts">
import { computed, StyleValue, withDefaults, defineProps, defineEmits } from 'vue';

interface Props {
  size?: 'large' | 'default';
  type?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'text';
  customStyle?: StyleValue;
  loading?: boolean;
  disabled?: boolean;
  round?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  size: undefined,
  type: undefined,
  customStyle: () => ({}),
  loading: false,
  disabled: false,
  round: true,
});

const emit = defineEmits(['click']);

function handleClick(event: MouseEvent) {
  if (!props.disabled) {
    emit('click', event);
  }
}

const buttonClassList = computed(() => [
  'tui-live-button',
  `tui-live-button-${props.type || 'default'}`,
  `tui-live-button-${props.size}`,
  { 'tui-live-button-round': props.round },
  { 'tui-live-button-loading': props.loading },
  { 'tui-live-button-disabled': props.disabled },
]);
</script>

<style lang="scss" scoped>
@import "../../assets/variable.scss";

.button-primary {
  --shadow-color: $color-button-shadow;
}
.tui-live-button {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  text-align: center;
  cursor: pointer;
  transition: background-color 0.2s ease-in-out;
  border: 1px solid $color-button-border;
  font-weight:400;
  line-height:1.375rem;
  white-space: nowrap;
  background-color: $color-button-background;
  outline: none;
  color: $font-button-color;
  &:hover {
    opacity: 0.8;
  }
}
.tui-live-button-primary {
  padding:0.25rem 1.75rem;
  font-size:0.875rem;
  background-color: $color-button-primary-background;
  border: 1px solid $color-button-primary-border;
  color: $font-button-primary-color;
  font-size:0.875rem;
  font-weight:500;
  line-height:1.375rem;
  &:hover {
    opacity: 0.8;
  }
}

.tui-live-button-large {
  padding:1.1875rem 3rem;
  font-size:1.25rem;
}
.tui-live-button-default {
  padding:0.25rem 1.75rem;
  font-size:0.875rem;
}
.tui-live-button-round {
  border-radius:62499.9375rem;
}

.tui-live-button-disabled {
  cursor: not-allowed;
  opacity: 0.3;
}

.tui-live-button-icon {
  margin-right:0.3125rem;
  display: flex;
}

.tui-live-button-text {
  border: 0 solid $color-button-text-border;
  background-color: $color-button-text-background;
  color: $font-button-text-color;
  &:hover {
    opacity: 0.8;
  }
  &::after {
    border: none;
  }
}
</style>
