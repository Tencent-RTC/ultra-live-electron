<template>
  <span class="svg-icon" :class="[customClass]" :style="customStyle" @click="handleClick">
    <component :is="icon" v-if="icon"></component>
    <slot></slot>
  </span>
</template>

<script setup lang="ts">
import { computed,defineProps, defineEmits } from 'vue';
import type { Component } from 'vue';

interface Props {
  size?: string | number,
  responseSize?: string | number,
  customClass?: string,
  icon?: Component,
}

const props = defineProps<Props>();
const emit = defineEmits(['click']);


const customStyle = computed(() => `width: ${props.size}rem;height: ${props.size}rem;`);

function handleClick(event: Event) {
  emit('click', event);
}
</script>

<style lang="scss" scoped>
.svg-icon {
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--text-color-primary);
  cursor: pointer;
}
</style>

  