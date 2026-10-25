<script setup lang="ts">
import { cx, omitClass } from "@/lib/cx";

defineOptions({ inheritAttrs: false });
</script>

<template>
  <div v-bind="omitClass($attrs)" :class="cx('mb-3 flex items-center justify-between gap-4', $attrs.class)">
    <h2 class="text-[17px] font-semibold text-ink"><slot /></h2>
    <slot name="action" />
  </div>
</template>
