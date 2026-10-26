<script setup lang="ts">
import { cx, omitClass } from "@/lib/cx";

defineOptions({ inheritAttrs: false });
withDefaults(defineProps<{ as?: string }>(), { as: "div" });
</script>

<template>
  <component :is="as" v-bind="omitClass($attrs)" :class="cx('rounded-[var(--radius-card)] bg-navy shadow-[var(--shadow-card)]', $attrs.class)">
    <slot />
  </component>
</template>
