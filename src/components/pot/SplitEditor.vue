<script lang="ts">
import type { SplitMode } from "@/domain/types";
import type { Cents } from "@/domain/money";

export interface SplitValue {
  mode: SplitMode;
  shares: Record<string, Cents>;
}
</script>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { Info } from "lucide-vue-next";
import type { Profile } from "@/domain/types";
import { fmt, parseMoney } from "@/domain/money";
import { sharePct, splitShares } from "@/domain/split";
import { firstName } from "@/domain/selectors";
import Avatar from "@/components/ui/Avatar.vue";
import MoneyInput from "@/components/ui/MoneyInput.vue";
import Notice from "@/components/ui/Notice.vue";
import Segmented from "@/components/ui/Segmented.vue";

/** "How should you split it?" — Equal / By income / Custom (Figma 14). */
const props = defineProps<{ target: Cents; profiles: Profile[]; meId: string }>();
const model = defineModel<SplitValue>({ required: true });

const a = computed(() => props.profiles[0]);
const b = computed(() => props.profiles[1]);
const raw = ref<Record<string, string>>({});
const incomesKnown = computed(() => !!(a.value?.monthly_income && b.value?.monthly_income));

// Recompute automatic modes whenever the target changes.
watch(
  [() => props.target, () => model.value.mode, a, b, () => model.value.shares],
  () => {
    if (model.value.mode === "custom" || !a.value || !b.value) return;
    const [sa, sb] = splitShares(model.value.mode, props.target, a.value.monthly_income, b.value.monthly_income);
    if (model.value.shares[a.value.id] !== sa || model.value.shares[b.value.id] !== sb) model.value = { mode: model.value.mode, shares: { [a.value.id]: sa, [b.value.id]: sb } };
  },
  { immediate: true },
);

const total = computed(() => (a.value ? (model.value.shares[a.value.id] ?? 0) + (model.value.shares[b.value?.id] ?? 0) : 0));
const diff = computed(() => total.value - props.target);
const pcts = computed(() => (a.value && b.value ? sharePct(model.value.shares[a.value.id] ?? 0, model.value.shares[b.value.id] ?? 0) : [50, 50]));

const mode = computed<SplitMode>({
  get: () => model.value.mode,
  set(m) {
    if (!a.value || !b.value) return;
    if (m === "custom") {
      raw.value = { [a.value.id]: String((model.value.shares[a.value.id] ?? 0) / 100), [b.value.id]: String((model.value.shares[b.value.id] ?? 0) / 100) };
      model.value = { mode: m, shares: model.value.shares };
    } else {
      const [sa, sb] = splitShares(m, props.target, a.value.monthly_income, b.value.monthly_income);
      model.value = { mode: m, shares: { [a.value.id]: sa, [b.value.id]: sb } };
    }
  },
});

function setRaw(id: string, v: string) {
  raw.value = { ...raw.value, [id]: v };
  model.value = { mode: "custom", shares: { ...model.value.shares, [id]: parseMoney(v) ?? 0 } };
}
</script>

<template>
  <div v-if="a && b">
    <Segmented
      v-model="mode"
      class="w-full"
      :options="[
        { value: 'equal', label: 'Equal' },
        { value: 'income', label: 'By income' },
        { value: 'custom', label: 'Custom' },
      ]"
    />
    <Notice v-if="model.mode === 'income' && !incomesKnown" tone="warn" class="mt-3">
      <template #icon><Info :size="15" /></template>
      Add both incomes in Settings to split by income. Using an equal split until then.
    </Notice>
    <div class="mt-4 h-2 overflow-hidden rounded-full bg-sand">
      <div class="h-full bg-terra transition-[width]" :style="{ width: pcts[0] + '%' }" />
    </div>
    <div class="mt-4 grid grid-cols-2 gap-4">
      <div v-for="(p, i) in [a, b]" :key="p.id" class="rounded-2xl border border-line bg-white/50 p-4">
        <div class="flex items-center gap-2.5">
          <Avatar :name="p.display_name" :who="i === 0 ? 'a' : 'b'" :size="30" />
          <span class="truncate font-medium whitespace-nowrap">{{ firstName(p) }}{{ p.id === meId ? " (you)" : "" }}</span>
          <span class="ml-auto text-xs text-muted">{{ pcts[i] }}%</span>
        </div>
        <MoneyInput v-if="model.mode === 'custom'" class="mt-3" :model-value="raw[p.id] ?? ''" suffix="/ month" @update:model-value="setRaw(p.id, $event)" />
        <div v-else class="tabular mt-3 text-2xl font-semibold">
          {{ fmt(model.shares[p.id] ?? 0) }}
          <span class="text-sm font-normal text-muted"> / month</span>
        </div>
      </div>
    </div>
    <div class="mt-4 flex items-center justify-between border-t border-line pt-4 text-sm">
      <span class="font-medium">Combined</span>
      <span class="tabular">
        <span class="text-lg font-semibold">{{ fmt(total) }}</span> / month
        <span v-if="diff > 0" class="ml-2 text-terra">+{{ fmt(diff) }} buffer</span>
      </span>
    </div>
    <Notice v-if="diff < 0" tone="warn" class="mt-3">
      That's {{ fmt(-diff) }}/month short of the {{ fmt(target) }} you need, so you'd finish late. You can still propose it.
    </Notice>
  </div>
</template>
