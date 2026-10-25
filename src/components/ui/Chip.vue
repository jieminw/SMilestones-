<script setup lang="ts">
import { cx } from "@/lib/cx";

defineProps<{ active?: boolean }>();
</script>

<template>
  <button
    type="button"
    :aria-pressed="active"
    :class="cx('inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-[4px] border px-3.5 text-[13.5px] font-medium transition-colors', active ? 'border-ink bg-ink text-white' : 'border-ink/25 bg-transparent text-ink hover:border-ink')"
  >
    <slot />
  </button>
</template>
