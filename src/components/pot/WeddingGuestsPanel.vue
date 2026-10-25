<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { Info, Plus, Trash2 } from "lucide-vue-next";
import type { WeddingMeta } from "@/domain/types";
import { angbaoSummary } from "@/domain/wedding";
import { fmt, parseMoney, type Cents } from "@/domain/money";
import { inputCls } from "@/lib/cx";
import Button from "@/components/ui/Button.vue";
import Field from "@/components/ui/Field.vue";
import MoneyInput from "@/components/ui/MoneyInput.vue";
import Notice from "@/components/ui/Notice.vue";

/**
 * "Guests & ang bao". Net banquet cost = tables × price − expected ang bao. The starting figures are
 * examples only. Ang bao arrives after the dinner, so the cash needed beforehand is shown separately.
 */
const props = defineProps<{
  /** Whole budget in cents, before any ang bao offset (all vendors, including the banquet). */
  budget: Cents;
  /** Show a Save button (used on a live pot, where the form isn't submitted elsewhere). */
  saveable?: boolean;
  saving?: boolean;
  /** Show the "use as banquet budget" shortcut (used while setting a pot up). */
  banquetShortcut?: boolean;
}>();
const emit = defineEmits<{ save: []; banquet: [gross: Cents] }>();
const model = defineModel<WeddingMeta>({ required: true });

const dollarsStr = (c: Cents) => String(c / 100);
const price = ref(dollarsStr(model.value.price_per_table));
const avg = ref(dollarsStr(model.value.avg_angbao));
const groups = ref((model.value.categories ?? []).map((c) => ({ name: c.name, guests: c.guests, avg: dollarsStr(c.avg) })));
const weighted = ref(groups.value.length > 0);

watch(
  [() => model.value.tables, () => model.value.guests_per_table, price, avg, groups, weighted],
  () => {
    model.value = {
      tables: Math.max(Math.round(Number(model.value.tables) || 0), 0),
      guests_per_table: Math.max(Math.round(Number(model.value.guests_per_table) || 0), 0),
      price_per_table: parseMoney(price.value) ?? 0,
      avg_angbao: parseMoney(avg.value) ?? 0,
      categories: weighted.value ? groups.value.map((g) => ({ name: g.name, guests: Math.max(Math.round(Number(g.guests) || 0), 0), avg: parseMoney(g.avg) ?? 0 })) : [],
    };
  },
  { deep: true },
);

const sum = computed(() => angbaoSummary(model.value));
const offset = computed(() => Math.min(sum.value.offset, props.budget));
const net = computed(() => Math.max(props.budget - offset.value, 0));

function toggleWeighted() {
  weighted.value = !weighted.value;
  if (weighted.value && !groups.value.length) {
    const g = sum.value.guests;
    groups.value = [
      { name: "Family", guests: Math.round(g * 0.4), avg: "150" },
      { name: "Friends and colleagues", guests: g - Math.round(g * 0.4), avg: "100" },
    ];
  }
}
</script>

<template>
  <div>
    <div class="grid grid-cols-2 gap-4">
      <Field v-slot="{ id }" label="Tables"><input :id="id" v-model.number="model.tables" type="number" min="0" max="500" :class="inputCls" /></Field>
      <Field v-slot="{ id }" label="Price per table"><MoneyInput :id="id" v-model="price" /></Field>
      <Field v-slot="{ id }" label="Guests per table"><input :id="id" v-model.number="model.guests_per_table" type="number" min="1" max="30" :class="inputCls" /></Field>
      <Field v-if="!weighted" v-slot="{ id }" label="Average ang bao per guest"><MoneyInput :id="id" v-model="avg" /></Field>
    </div>

    <div v-if="weighted" class="mt-4">
      <div class="mb-1 text-[11px] font-medium tracking-[0.12em] text-muted uppercase">Guest groups</div>
      <div v-for="(g, i) in groups" :key="i" class="mb-2 grid grid-cols-[minmax(0,1fr)_84px_120px_32px] items-center gap-2">
        <input v-model="g.name" aria-label="Group name" :class="inputCls" placeholder="Group" />
        <input v-model.number="g.guests" aria-label="Guests" type="number" min="0" :class="inputCls" />
        <MoneyInput v-model="g.avg" suffix="avg" />
        <button type="button" aria-label="Remove group" class="flex size-8 cursor-pointer items-center justify-center text-faint hover:text-bad" @click="groups.splice(i, 1)"><Trash2 :size="15" /></button>
      </div>
      <Button variant="ghost" size="sm" @click="groups.push({ name: '', guests: 0, avg: '100' })"><Plus :size="14" /> Add group</Button>
    </div>
    <button type="button" class="mt-3 cursor-pointer text-[13px] font-medium text-terra hover:underline" @click="toggleWeighted">
      {{ weighted ? "Use one average instead" : "Estimate by guest group instead" }}
    </button>

    <dl class="mt-5 grid grid-cols-[1fr_auto] gap-x-6 gap-y-2 border-t border-line pt-4 text-sm">
      <dt class="text-muted">Banquet ({{ model.tables }} tables, {{ sum.guests }} guests)</dt>
      <dd class="tabular text-right">{{ fmt(sum.banquetGross) }}</dd>
      <dt class="text-muted">Expected ang bao</dt>
      <dd class="tabular text-right text-ok">−{{ fmt(sum.expectedAngbao) }}</dd>
      <dt class="font-medium">Net banquet cost</dt>
      <dd class="tabular text-right font-semibold">{{ fmt(sum.banquetNet) }}</dd>
    </dl>

    <div class="mt-4 grid grid-cols-2 gap-3 text-sm">
      <div class="rounded-lg bg-surface-2 p-3.5">
        <div class="text-[11px] font-medium tracking-[0.12em] text-muted uppercase">Cash needed before the wedding</div>
        <div class="font-serif tabular mt-1 text-[22px]">{{ fmt(budget) }}</div>
      </div>
      <div class="rounded-lg bg-surface-2 p-3.5">
        <div class="text-[11px] font-medium tracking-[0.12em] text-muted uppercase">Savings target after ang bao</div>
        <div class="font-serif tabular mt-1 text-[22px]">{{ fmt(net) }}</div>
      </div>
    </div>

    <Notice class="mt-4">
      <template #icon><Info :size="15" /></template>
      Ang bao arrives on the day, after deposits and vendors are paid. The monthly target uses the lower figure, but keep enough cash for the full budget until the dinner. The starting numbers are examples; use your own.
    </Notice>

    <div v-if="banquetShortcut || saveable" class="mt-4 flex gap-3">
      <Button v-if="banquetShortcut" variant="secondary" size="sm" @click="emit('banquet', sum.banquetGross)">Set Banquet budget to {{ fmt(sum.banquetGross) }}</Button>
      <Button v-if="saveable" size="sm" class="ml-auto" :loading="saving" @click="emit('save')">Save guest plan</Button>
    </div>
  </div>
</template>
