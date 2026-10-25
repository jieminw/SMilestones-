<script setup lang="ts">
defineProps<{ title: string }>();
</script>

<template>
  <div class="flex flex-col items-center px-6 py-10 text-center">
    <div v-if="$slots.icon" class="mb-4 text-faint"><slot name="icon" /></div>
    <h3 class="font-semibold text-ink">{{ title }}</h3>
    <p v-if="$slots.default" class="mt-1.5 max-w-sm text-sm text-muted"><slot /></p>
    <div v-if="$slots.action" class="mt-5"><slot name="action" /></div>
  </div>
</template>
