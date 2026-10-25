<script setup lang="ts">
import { cx } from "@/lib/cx";

/**
 * A figure written into a ledger: small mono label over a large borderless number, divided from its neighbours by a
 * hairline. No box; the cell warms and gets a terracotta underline while you type.
 */
const props = defineProps<{ label: string; money?: boolean; number?: boolean; placeholder?: string; invalid?: boolean; suffix?: string }>();
const model = defineModel<string | number>({ required: true });

function onInput(e: Event) {
  const v = (e.target as HTMLInputElement).value;
  model.value = props.money ? v.replace(/[^\d.,]/g, "") : props.number ? Number(v.replace(/\D/g, "")) : v;
}
</script>

<template>
  <label
    :class="cx(
      'group relative flex min-w-0 cursor-text flex-col gap-1 px-4 py-3 transition-colors hover:bg-ink/[0.03] focus-within:bg-ink/[0.05]',
      'after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:origin-left after:scale-x-0 after:bg-terra after:transition-transform focus-within:after:scale-x-100',
      invalid && 'after:scale-x-100 after:bg-bad',
    )"
  >
    <span class="font-mono text-[10px] tracking-[0.12em] text-faint uppercase">{{ label }}</span>
    <span class="flex items-baseline gap-1">
      <span v-if="money" class="font-mono text-[15px] text-faint">$</span>
      <input
        :inputmode="money || number ? 'decimal' : undefined"
        :placeholder="placeholder ?? (money ? '0' : '')"
        :value="model"
        :class="cx('w-full min-w-0 border-0 bg-transparent p-0 text-ink outline-none placeholder:text-faint/70', money || number ? 'font-serif tabular text-[26px] leading-none' : 'text-[15px] leading-[26px]')"
        @input="onInput"
      />
      <span v-if="suffix" class="shrink-0 font-mono text-[12px] text-muted">{{ suffix }}</span>
    </span>
  </label>
</template>
