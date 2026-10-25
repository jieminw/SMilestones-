<script setup lang="ts">
import { cx, inputCls } from "@/lib/cx";

defineProps<{ id?: string; placeholder?: string; invalid?: boolean; suffix?: string; autofocus?: boolean }>();
const model = defineModel<string>({ required: true });
</script>

<template>
  <div class="relative">
    <span class="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[15px] text-muted">$</span>
    <input
      :id="id"
      inputmode="decimal"
      :autofocus="autofocus"
      :aria-invalid="invalid"
      :class="cx(inputCls, 'tabular pl-7', suffix && 'pr-20')"
      :placeholder="placeholder ?? '0'"
      :value="model"
      @input="model = ($event.target as HTMLInputElement).value.replace(/[^\d.,]/g, '')"
    />
    <span v-if="suffix" class="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-[13px] text-muted">{{ suffix }}</span>
  </div>
</template>
