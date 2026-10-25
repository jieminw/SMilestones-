<script setup lang="ts">
import { cx } from "@/lib/cx";

defineProps<{ wide?: boolean }>();
</script>

<template>
  <div :class="cx('mx-auto w-full px-4 py-6 md:px-10 md:py-9', wide ? 'max-w-[1320px]' : 'max-w-[1180px]')">
    <slot />
  </div>
</template>
