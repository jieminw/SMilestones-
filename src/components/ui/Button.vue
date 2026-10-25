<script setup lang="ts">
import { cx, omitClass } from "@/lib/cx";

defineOptions({ inheritAttrs: false });
withDefaults(defineProps<{ variant?: "primary" | "navy" | "secondary" | "ghost" | "danger" | "link"; size?: "sm" | "md" | "lg"; loading?: boolean; disabled?: boolean }>(), {
  variant: "primary",
  size: "md",
});
</script>

<template>
  <button
    v-bind="omitClass($attrs)"
    :disabled="disabled || loading"
    :class="
      cx(
        'inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-[4px] font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-45',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terra',
        size === 'sm' && 'h-9 px-4 text-[13.5px]',
        size === 'md' && 'h-11 px-6 text-[14.5px]',
        size === 'lg' && 'h-13 px-8 text-[15.5px]',
        (variant === 'primary' || variant === 'navy') && 'bg-ink text-white hover:bg-navy-2',
        variant === 'secondary' && 'border border-ink/40 bg-transparent text-ink hover:bg-ink hover:text-white',
        variant === 'danger' && 'bg-bad text-white hover:brightness-110',
        variant === 'ghost' && 'text-ink hover:bg-ink/6',
        variant === 'link' && 'h-auto px-0 text-terra underline-offset-4 hover:underline',
        $attrs.class,
      )
    "
  >
    <span v-if="loading" class="size-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
    <slot />
  </button>
</template>
