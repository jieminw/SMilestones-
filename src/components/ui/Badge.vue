<script setup lang="ts">
import { cx, omitClass } from "@/lib/cx";

defineOptions({ inheritAttrs: false });
withDefaults(defineProps<{ tone?: "peach" | "navy" | "ok" | "warn" | "bad" | "sand" | "plain" }>(), { tone: "peach" });
</script>

<template>
  <span
    v-bind="omitClass($attrs)"
    :class="
      cx(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-[3px] border px-2 py-[3px] font-mono text-[10.5px] leading-none font-medium tracking-[0.06em] uppercase',
        tone === 'peach' && 'border-terra/40 text-terra-2',
        tone === 'navy' && 'border-ink bg-ink text-white',
        tone === 'ok' && 'border-ok/50 text-ok',
        tone === 'warn' && 'border-warn/50 text-warn',
        tone === 'bad' && 'border-bad/50 text-bad',
        tone === 'sand' && 'border-ink/20 text-muted',
        tone === 'plain' && 'border-ink/25 text-muted',
        $attrs.class,
      )
    "
  >
    <slot name="icon" />
    <slot />
  </span>
</template>
