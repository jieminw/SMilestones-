<script setup lang="ts">
import { cx } from "@/lib/cx";

withDefaults(defineProps<{ name: string; who?: "a" | "b"; size?: number; ring?: boolean }>(), { who: "a", size: 36 });
</script>

<template>
  <span
    :title="name"
    :style="{ width: size + 'px', height: size + 'px', fontSize: size * 0.4 + 'px' }"
    :class="cx('inline-flex shrink-0 items-center justify-center rounded-[4px] font-mono font-medium text-white', who === 'a' ? 'bg-who-a' : 'bg-who-b', ring && 'ring-2 ring-surface')"
  >
    {{ name.trim().charAt(0).toUpperCase() }}
  </span>
</template>
