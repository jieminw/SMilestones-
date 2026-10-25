<script setup lang="ts" generic="T extends string">
import { cx, omitClass } from "@/lib/cx";

defineOptions({ inheritAttrs: false });
defineProps<{ options: { value: T; label: string }[] }>();
const model = defineModel<T>({ required: true });
</script>

<template>
  <div v-bind="omitClass($attrs)" role="tablist" :class="cx('inline-flex rounded-[4px] border border-ink/30', $attrs.class)">
    <button
      v-for="o in options"
      :key="o.value"
      type="button"
      role="tab"
      :aria-selected="o.value === model"
      :class="cx('h-9 flex-1 cursor-pointer border-r border-ink/30 px-4 text-[13.5px] font-medium whitespace-nowrap transition-colors first:rounded-l-[3px] last:rounded-r-[3px] last:border-r-0', o.value === model ? 'bg-ink text-white' : 'text-ink hover:bg-ink/6')"
      @click="model = o.value"
    >
      {{ o.label }}
    </button>
  </div>
</template>
