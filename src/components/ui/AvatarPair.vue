<script setup lang="ts">
import Avatar from "./Avatar.vue";

withDefaults(defineProps<{ a: string; b?: string; size?: number }>(), { size: 36 });
</script>

<template>
  <span class="inline-flex">
    <Avatar :name="a" who="a" :size="size" ring />
    <span v-if="b" :style="{ marginLeft: -size * 0.3 + 'px' }">
      <Avatar :name="b" who="b" :size="size" ring />
    </span>
  </span>
</template>
