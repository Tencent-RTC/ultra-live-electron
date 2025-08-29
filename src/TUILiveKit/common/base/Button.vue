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
  type?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'text';
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
  'tui-button',
  `tui-button-${props.type}`,
  `tui-button-${props.size}`,
  { 'tui-button-round': props.round },
  { 'tui-button-loading': props.loading },
  { 'tui-button-disabled': props.disabled },
]);
</script>

<style lang="scss" scoped>
@import "../../assets/variable.scss";

.button-primary {
  --shadow-color: $color-button-shadow;
}
.tui-button {
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
    background: $color-button-hover-background;
    border: 1px solid $color-button-hover-border;
    outline: none;
  }
}
.tui-button-primary {
  background-color: $color-button-primary-background;
  border: 1px solid $color-button-primary-border;
  color: $font-button-primary-color;
  font-size:0.875rem;
  font-weight:500;
  line-height:1.375rem;
  &:hover {
    background-color: var(--shadow-color);
  }
}

.tui-button-large {
  padding:1.1875rem 3rem;
  font-size:1.25rem;
}
.tui-button-default {
  padding:0.3125rem 1.875rem;
  font-size:0.875rem;
}
.tui-button-round {
  border-radius:62499.9375rem;
}

.tui-button-disabled {
  cursor: not-allowed;
  opacity: 0.3;
}

.tui-button-icon {
  margin-right:0.3125rem;
  display: flex;
}

.tui-button-text {
  border: 0 solid $color-button-text-border;
  background-color: $color-button-text-background;
  color: $font-button-text-color;
  &:hover {
    border: 0 solid $color-button-text-hover-border;
    background-color: $color-button-text-hover-background;
    color: $font-button-text-hover-color;
  }
  &::after {
    border: none;
  }
}
</style>
