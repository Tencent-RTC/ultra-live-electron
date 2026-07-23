<template>
  <!--
    Beauty template / 美颜套餐. Pure single-pick: each tile is a preset that
    expands (in the store) into multiple Beauty effects. No strength slider.
  -->
  <div class="beauty-template-tab">
    <PickGrid :items="items" @pick="onPick" />
  </div>
</template>

<script setup lang="ts">
import PickGrid from './PickGrid.vue';

/* eslint-disable @typescript-eslint/no-explicit-any */

defineProps<{
  /** details[] from effectConstant.beautyTemplate. */
  items: Array<Record<string, any>>;
}>();

const emit = defineEmits<{
  /** Pick a template, or `null` to clear (原图 tile / re-click). */
  (e: 'pick', detail: Record<string, any> | null): void;
}>();

const onPick = (detail: Record<string, any> | null) => emit('pick', detail);
</script>

<style lang="scss" scoped>
.beauty-template-tab {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}
</style>
