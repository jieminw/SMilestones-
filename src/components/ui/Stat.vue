<script setup lang="ts">
defineProps<{ label: string; value: string | number; sub?: string }>();
</script>

<template>
  <div>
    <div class="text-[13px] text-muted">{{ label }}</div>
    <div class="tabular mt-1 text-2xl font-semibold text-ink">{{ value }}</div>
    <div v-if="sub" class="mt-0.5 text-[13px] text-faint">{{ sub }}</div>
  </div>
</template>
