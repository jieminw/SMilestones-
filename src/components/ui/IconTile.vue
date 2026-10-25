<script setup lang="ts">
import { cx } from "@/lib/cx";

withDefaults(defineProps<{ tone?: "navy" | "peach" | "sand"; size?: number }>(), { tone: "navy", size: 44 });
</script>

<template>
  <span
    :style="{ width: size + 'px', height: size + 'px' }"
    :class="cx('inline-flex shrink-0 items-center justify-center rounded-[4px]', tone === 'navy' && 'bg-ink text-white', tone === 'peach' && 'border border-terra/40 text-terra-2', tone === 'sand' && 'border border-ink/20 text-ink')"
  >
    <slot />
  </span>
</template>
