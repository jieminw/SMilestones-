<script setup lang="ts">
withDefaults(defineProps<{ size?: number }>(), { size: 32 });
</script>

<template>
  <svg viewBox="0 0 32 32" :width="size" :height="size" aria-hidden="true">
    <rect width="32" height="32" rx="9" fill="#06363c" />
    <path d="M7 16.5 L16 9 L25 16.5" stroke="#e8f6f6" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M10 15 V24 H22 V15" stroke="#e8f6f6" stroke-width="2.4" fill="none" stroke-linejoin="round" />
    <circle cx="16" cy="19.5" r="3.4" fill="#d8bf9b" />
  </svg>
</template>
