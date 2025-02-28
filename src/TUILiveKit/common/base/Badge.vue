<template>
  <div :class="badgeClass">
    <slot></slot>
    <sup v-if="showBadge" class="tui-badge-count">{{ content }}</sup>
  </div>
</template>

<script lang="ts" setup>
import { computed, withDefaults, defineProps } from 'vue';

interface Props {
  type?: 'primary' | 'danger';
  value?: string | number;
  max?: number;
  hidden?: boolean;
  isDot?: boolean;
}
const props = withDefaults(defineProps<Props>(), {
  type: 'primary',
  value: '',
  max: 99,
  hidden: false,
  isDot: false,
});

const showBadge = computed(() => !props.hidden && (props.value || props.isDot));

const content = computed(() => {
  if (props.isDot) return '';
  if (typeof props.value === 'number' && typeof props.max === 'number') {
    return props.value > props.max ? `${props.max}+` : props.value;
  }
  return props.value;
});

const badgeClass = computed(() => ['tui-badge', `tui-badge-${props.type}`, props.isDot ? 'tui-badge-isDot' : '']);
</script>

<style lang="scss" scoped>
@import "../../assets/variable.scss";

.tui-badge { 
  position: relative; 
  display: inline-block; 

  .tui-badge-count { 
    position: absolute; top: 0; 
    right: 1.125rem; 
    display: inline-block;
    padding: 0.125rem 0.3125rem; 
    font-size: 0.625rem;
    color: $font-badge-color;
    transform: translateY(-50%) translateX(100%); 
    border-radius: 0.625rem; 
  } 
} 
.tui-badge-primary { 
  .tui-badge-count  { 
    background-color: $color-badge-background;
     }
  }
  .tui-badge-danger { 
    .tui-badge-count { 
      background-color: $color-badge-count-background;
    } 
  } 
  .tui-badge-isDot { 
    .tui-badge-count {
      top: 0; 
      height: 0.5rem;
      width: 0.5rem;
      padding: 0;
      border-radius: 50%;
    } 
  } 
</style>