<script setup lang="ts">
import { cx, omitClass } from "@/lib/cx";

defineOptions({ inheritAttrs: false });
withDefaults(defineProps<{ tone?: "sand" | "warn" | "ok" | "bad" | "peach" }>(), { tone: "sand" });
</script>

<template>
  <div
    v-bind="omitClass($attrs)"
    :class="
      cx(
        'flex gap-3 rounded-[4px] border-l-[3px] bg-ink/[0.035] px-4 py-3 text-[13.5px] leading-relaxed text-ink/80',
        tone === 'sand' && 'border-ink/30',
        tone === 'warn' && 'border-warn',
        tone === 'ok' && 'border-ok',
        tone === 'bad' && 'border-bad',
        tone === 'peach' && 'border-terra',
        $attrs.class,
      )
    "
  >
    <span v-if="$slots.icon" class="mt-0.5 shrink-0"><slot name="icon" /></span>
    <div class="min-w-0"><slot /></div>
  </div>
</template>
