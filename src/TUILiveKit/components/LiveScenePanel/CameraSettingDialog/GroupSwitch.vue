<template>
  <!--
    Pure-CSS switch toggle used in every beauty tab header to enable / disable
    the entire group. Using a checkbox under the hood keeps the keyboard /
    accessibility story simple without pulling in another base UI primitive.
  -->
  <label class="group-switch" :class="{ 'is-on': modelValue }">
    <input
      type="checkbox"
      class="switch-input"
      :checked="modelValue"
      @change="onToggle"
    />
    <span class="switch-track">
      <span class="switch-thumb" />
    </span>
  </label>
</template>

<script setup lang="ts">
defineProps<{ modelValue: boolean }>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
}>();

const onToggle = (event: Event) => {
  const target = event.target as HTMLInputElement | null;
  emit('update:modelValue', !!target?.checked);
};
</script>

<style lang="scss" scoped>
.group-switch {
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  user-select: none;
}

.switch-input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
  pointer-events: none;
}

.switch-track {
  position: relative;
  width: 32px;
  height: 18px;
  background-color: var(--stroke-color-primary, #4a4a4a);
  border-radius: 9px;
  transition: background-color 0.18s ease;
}

.switch-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 14px;
  height: 14px;
  background-color: #fff;
  border-radius: 50%;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
  transition: transform 0.18s ease;
}

.is-on .switch-track {
  background-color: var(--text-color-link, #1c66e5);
}

.is-on .switch-thumb {
  transform: translateX(14px);
}
</style>
