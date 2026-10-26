<script setup lang="ts">
import { ref } from "vue";
import { ChevronDown, Info } from "lucide-vue-next";
import type { BtoPlan } from "@/domain/bto";
import { fmt } from "@/domain/money";
import { fmtMonth } from "@/domain/dates";
import { cx } from "@/lib/cx";

const STAGE_HELP: Record<string, string> = {
  book: "Paid in cash when you select your flat. HDB deducts it from the downpayment due at lease signing.",
  lease: "Downpayment portion, stamp duty and legal fees. These can be paid from your CPF Ordinary Account.",
  keys: "The rest of the 25% downpayment, after any EHG grant. The HDB loan covers the other 75%.",
};

/** The upfront plan, stage by stage. One source: domain/bto.ts → buildBtoPlan(). */
const props = defineProps<{ plan: BtoPlan; compact?: boolean }>();
const open = ref<string | null>(props.compact ? null : "lease");
</script>

<template>
  <div class="flex flex-col gap-2.5">
    <div v-for="(st, i) in plan.stages" :key="st.key" class="overflow-hidden rounded-2xl border border-line bg-white/5">
      <button type="button" class="flex w-full cursor-pointer items-center gap-4 px-4 py-3.5 text-left hover:bg-surface-2/60" @click="open = open === st.key ? null : st.key">
        <span class="flex size-8 shrink-0 items-center justify-center rounded-full bg-peach font-serif text-sm text-terra-2">{{ i + 1 }}</span>
        <span class="min-w-0 flex-1">
          <span class="block font-semibold">{{ st.name }}</span>
          <span class="block text-[13px] text-muted">Due {{ fmtMonth(st.due) }}</span>
        </span>
        <span class="text-right">
          <span class="tabular block font-semibold">{{ fmt(st.cash) }} cash</span>
          <span v-if="st.cpfUsed" class="tabular block text-xs text-muted">+ {{ fmt(st.cpfUsed) }} from CPF</span>
          <span v-else class="block text-xs text-muted">of {{ fmt(st.total) }}</span>
        </span>
        <ChevronDown :size="18" :class="cx('text-faint transition-transform', open === st.key && 'rotate-180')" />
      </button>
      <div v-if="open === st.key" class="border-t border-line bg-surface px-4 py-3.5">
        <ul class="flex flex-col gap-2 text-sm">
          <li v-for="l in st.lines" :key="l.label" class="flex justify-between gap-4">
            <span>
              {{ l.label }}
              <span v-if="l.note" class="block text-xs text-faint">{{ l.note }}</span>
            </span>
            <span class="tabular font-medium">{{ fmt(l.cents) }}</span>
          </li>
          <li v-if="st.cpfUsed" class="flex justify-between gap-4 text-ok">
            <span>Paid from CPF OA</span>
            <span class="tabular font-medium">−{{ fmt(st.cpfUsed) }}</span>
          </li>
        </ul>
        <p class="mt-3 flex gap-2 text-xs leading-relaxed text-muted">
          <Info :size="14" class="mt-0.5 shrink-0" />
          {{ STAGE_HELP[st.key] }}
        </p>
      </div>
    </div>
  </div>
</template>
