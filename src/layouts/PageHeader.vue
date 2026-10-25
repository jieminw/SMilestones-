<script setup lang="ts">
import NotificationBell from "./NotificationBell.vue";

defineProps<{ title?: string; subtitle?: string }>();
</script>

<template>
  <header class="mb-7 flex flex-wrap items-end justify-between gap-4 md:mb-9 md:gap-6">
    <div class="min-w-0">
      <slot name="back" />
      <h1 class="font-serif text-[clamp(36px,6vw,54px)] leading-[1.05] text-ink"><slot name="title">{{ title }}</slot></h1>
      <p v-if="subtitle" class="mt-2 text-[16px] text-muted">{{ subtitle }}</p>
    </div>
    <div class="flex shrink-0 items-center gap-3">
      <slot name="actions" />
      <NotificationBell />
    </div>
  </header>
</template>
