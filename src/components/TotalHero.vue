<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useCouple } from "@/stores/app";
import { firstName, liveTx, potBalance, signed, walletTotal } from "@/domain/selectors";
import { fmt } from "@/domain/money";
import PiggyBank from "@/components/art/PiggyBank.vue";

/**
 * The headline: the total saved, counted up on load, then a ruled ledger of where it sits across your goals and a row
 * of figures for the month. Flat espresso, hairline rules, monospaced money. Everything is computed from the ledger.
 */
const { s } = useCouple();

const total = computed(() => walletTotal(s.value));
const goals = computed(() =>
  s.value.pots
    .filter((p) => p.status === "active" || p.status === "completed")
    .map((p) => ({ id: p.id, name: p.name, balance: potBalance(s.value, p.id) }))
    .sort((a, b) => b.balance - a.balance),
);

// ---------------------------------------------------------------- count up
const shown = ref(0);
let raf = 0;
function countUp(to: number) {
  cancelAnimationFrame(raf);
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return void (shown.value = to);
  const start = performance.now();
  const dur = 1300;
  const tick = (now: number) => {
    const t = Math.min((now - start) / dur, 1);
    shown.value = Math.round(to * (1 - Math.pow(1 - t, 4)));
    if (t < 1) raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
}
onMounted(() => countUp(total.value));
onBeforeUnmount(() => cancelAnimationFrame(raf));

// ---------------------------------------------------------------- the month
const monthKey = (iso: string) => iso.slice(0, 7);
const moves = computed(() => liveTx(s.value).filter((t) => t.kind !== "transfer_in" && t.kind !== "transfer_out"));
const monthDelta = (key: string) => moves.value.filter((t) => monthKey(t.occurred_on) === key).reduce((a, t) => a + signed(t), 0);
const thisMonth = computed(() => monthDelta(monthKey(new Date().toISOString())));
const prevMonth = computed(() => {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return monthDelta(monthKey(d.toISOString()));
});
const monthsSaving = computed(() => {
  const first = moves.value.map((t) => monthKey(t.occurred_on)).sort()[0];
  if (!first) return 1;
  const [fy, fm] = first.split("-").map(Number);
  const now = new Date();
  return Math.max((now.getFullYear() - fy) * 12 + (now.getMonth() + 1 - fm), 1);
});
const average = computed(() => Math.round(total.value / monthsSaving.value));

// who saved what
const paid = computed(() => {
  const by: Record<string, number> = {};
  for (const t of liveTx(s.value)) if (t.kind === "contribution") by[t.user_id] = (by[t.user_id] ?? 0) + t.amount;
  const [a, b] = s.value.profiles;
  const ca = by[a?.id] ?? 0;
  const cb = by[b?.id] ?? 0;
  const pa = Math.round((ca / (ca + cb || 1)) * 100);
  return { pa, pb: 100 - pa, na: firstName(a), nb: firstName(b) };
});
</script>

<template>
  <section class="relative flex flex-col overflow-hidden rounded-[6px] bg-navy text-[#eaf7f7] shadow-[var(--shadow-pop)]">
    <div class="flex flex-1 flex-col justify-between gap-8 px-8 pt-8 pb-0 md:px-10">
      <!-- the number -->
      <div class="flex items-start justify-between gap-6">
        <div class="min-w-0">
          <p class="font-mono text-[11px] tracking-[0.14em] text-[#eaf7f7]/55 uppercase">Total saved together</p>
          <div class="font-serif tabular mt-3 text-[clamp(60px,8vw,112px)] leading-[0.95] tracking-[-0.02em]">{{ fmt(shown) }}</div>
          <p class="mt-4 font-mono text-[12.5px] text-[#eaf7f7]/60">
            {{ goals.length }} goal{{ goals.length === 1 ? "" : "s" }}<span v-if="thisMonth > 0"> &nbsp;/&nbsp; <span class="text-[#b9e5b9]">+{{ fmt(thisMonth) }}</span> this month</span>
          </p>
        </div>
        <div class="hidden shrink-0 md:block"><PiggyBank :amount="fmt(total)" :size="220" /></div>
      </div>

      <!-- where it sits: a ruled ledger with dotted leaders -->
      <div v-if="goals.length">
        <p class="mb-2 font-mono text-[11px] tracking-[0.14em] text-[#eaf7f7]/45 uppercase">Held in</p>
        <ul class="border-t border-[#eaf7f7]/20">
          <li v-for="g in goals" :key="g.id">
            <RouterLink :to="`/pots/${g.id}`" class="group flex items-baseline gap-3 border-b border-[#eaf7f7]/12 py-2.5 text-[14.5px] transition-colors hover:bg-[#eaf7f7]/[0.05]">
              <span>{{ g.name }}</span>
              <span class="mb-1 flex-1 border-b border-dotted border-[#eaf7f7]/30" />
              <span class="tabular">{{ fmt(g.balance) }}</span>
            </RouterLink>
          </li>
        </ul>
      </div>
    </div>

    <!-- figures for the month: ruled cells along the bottom -->
    <div class="mt-8 grid grid-cols-3 border-t border-[#eaf7f7]/20">
      <div class="px-8 py-5 md:px-10">
        <p class="font-mono text-[10.5px] tracking-[0.14em] text-[#eaf7f7]/45 uppercase">This month</p>
        <p class="font-serif tabular mt-1.5 text-[30px] leading-none">{{ fmt(thisMonth) }}</p>
        <p class="mt-1.5 font-mono text-[11.5px] text-[#eaf7f7]/45">last: {{ fmt(prevMonth) }}</p>
      </div>
      <div class="border-l border-[#eaf7f7]/20 px-6 py-5">
        <p class="font-mono text-[10.5px] tracking-[0.14em] text-[#eaf7f7]/45 uppercase">Monthly average</p>
        <p class="font-serif tabular mt-1.5 text-[30px] leading-none">{{ fmt(average) }}</p>
        <p class="mt-1.5 font-mono text-[11.5px] text-[#eaf7f7]/45">over {{ monthsSaving }} mo</p>
      </div>
      <div class="border-l border-[#eaf7f7]/20 px-6 py-5">
        <p class="font-mono text-[10.5px] tracking-[0.14em] text-[#eaf7f7]/45 uppercase">Who saved it</p>
        <div class="mt-3 flex h-1.5 overflow-hidden"><div class="h-full bg-[#c9785c]" :style="{ width: paid.pa + '%' }" /><div class="h-full bg-[#9fb0c2]" :style="{ width: paid.pb + '%' }" /></div>
        <p class="mt-2.5 flex justify-between font-mono text-[11.5px] text-[#eaf7f7]/65"><span>{{ paid.na }} {{ paid.pa }}%</span><span>{{ paid.nb }} {{ paid.pb }}%</span></p>
      </div>
    </div>
  </section>
</template>
