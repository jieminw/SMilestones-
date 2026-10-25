<script setup lang="ts">
import { computed } from "vue";
import { Check, Lock, Plus, Trash2 } from "lucide-vue-next";
import { fmt, parseMoney, type Cents } from "@/domain/money";
import { fmtDay, todayISO } from "@/domain/dates";
import { cx } from "@/lib/cx";
import LedgerField from "@/components/LedgerField.vue";
import Notice from "@/components/ui/Notice.vue";
import { buildStages, cashPlan, usesAngbao, venueLineName } from "@/domain/weddingBudget";
import { plan, resetPlan } from "@/stores/weddingPlan";

/**
 * The wedding milestones, shown on the wedding pot's page next to "Log contribution". The pot's balance is what the couple
 * have saved: a milestone opens once the one before it is funded. Milestones are added and edited on the pot's
 * setup page; here the costs and vendors of the plan can still be adjusted.
 */
const props = defineProps<{ saved: Cents }>();

const cents = (v: string): Cents => parseMoney(v) ?? 0;

const venue = computed(() => plan.value.lines.find((l) => l.id === "venue"));
const committed = computed(() => plan.value.lines.reduce((a, l) => a + (cents(l.quote) || cents(l.budget)), 0));
// A hotel banquet is mostly paid after the dinner, out of ang bao, so only the cash before it is saved for.
const cash = computed(() => (usesAngbao(plan.value.form) ? cashPlan(plan.value.form, venue.value ? cents(venue.value.quote) || cents(venue.value.budget) : 0, committed.value) : null));

const stages = computed(() => buildStages(plan.value.form, plan.value.lines, props.saved, plan.value.extras));
const target = computed(() => stages.value[stages.value.length - 1]?.to ?? 0);
const current = computed(() => stages.value.findIndex((s) => !s.funded));
const allFunded = computed(() => current.value === -1);
const daysToGo = computed(() => (plan.value.dates.banquet ? Math.ceil((new Date(plan.value.dates.banquet + "T00:00:00").getTime() - new Date(todayISO() + "T00:00:00").getTime()) / 86_400_000) : null));
const monthlySave = computed(() => {
  const left = Math.max(target.value - props.saved, 0);
  const months = Math.floor(Math.max((daysToGo.value ?? 0) / 30.4, 0));
  return months >= 1 ? Math.ceil(left / months) : left;
});
const pctOf = (c: Cents) => (target.value ? Math.min((c / target.value) * 100, 100) : 0);

const tick = (id: string, i: number) => {
  const k = `${id}:${i}`;
  plan.value.done[k] = !plan.value.done[k];
};
const ticked = (id: string, i: number) => !!plan.value.done[`${id}:${i}`];
const taskCount = (id: string, n: number) => Array.from({ length: n }, (_, i) => ticked(id, i)).filter(Boolean).length;

function addLine() {
  plan.value.lines.push({ id: `c${Date.now()}`, name: "", vendor: "", budget: "", quote: "", paid: "" });
}
function removeLine(id: string) {
  plan.value.lines = plan.value.lines.filter((l) => l.id !== id);
}

function startOver() {
  if (!window.confirm("Clear this wedding plan and start again? Your dates, costs and ticked items will be removed.")) return;
  resetPlan();
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- the savings track: one bar, a marker for each milestone -->
    <section class="rounded-[6px] bg-surface px-6 py-6 shadow-[var(--shadow-card)]">
      <div class="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div>
          <p class="font-mono text-[11px] tracking-[0.14em] text-terra uppercase">Wedding milestones</p>
          <p class="mt-2 text-[14px] text-muted">
            <template v-if="allFunded">Every milestone is funded.</template>
            <template v-else>{{ fmt(stages[current].to - saved) }} more opens {{ current + 1 < stages.length ? "milestone " + (current + 2) : "the big day" }}.</template>
          </p>
        </div>
        <div class="text-right">
          <p class="font-mono text-[10.5px] tracking-[0.12em] text-faint uppercase">To fund everything</p>
          <p class="font-serif tabular mt-1 text-[26px] leading-none">{{ fmt(target) }}</p>
          <p v-if="plan.dates.banquet && !allFunded" class="mt-2 text-[13px] text-muted">about {{ fmt(monthlySave) }} a month until {{ fmtDay(plan.dates.banquet) }}</p>
        </div>
      </div>
      <div class="relative mt-7 mb-3 h-2 bg-ink/10">
        <div class="absolute inset-y-0 left-0 bg-ink transition-[width] duration-700" :style="{ width: pctOf(saved) + '%' }" />
        <div v-for="(s, i) in stages" :key="s.def.id" class="absolute top-1/2 -translate-x-1/2 -translate-y-1/2" :style="{ left: pctOf(s.to) + '%' }">
          <span :class="cx('flex size-6 items-center justify-center rounded-full border-2 font-mono text-[10px]', s.funded ? 'border-ink bg-ink text-white' : s.unlocked ? 'border-terra bg-surface text-terra' : 'border-ink/25 bg-surface text-faint')">
            <Check v-if="s.funded" :size="12" /><template v-else>{{ i + 1 }}</template>
          </span>
        </div>
      </div>
    </section>

    <!-- hotel banquets: what is paid before the dinner, and what ang bao is counted on to cover -->
    <section v-if="cash" class="grid grid-cols-[minmax(0,1fr)_260px] overflow-hidden rounded-[6px] bg-surface shadow-[var(--shadow-card)]">
      <div class="px-6 py-5">
        <p class="font-mono text-[11px] tracking-[0.14em] text-terra uppercase">Cash plan · hotel banquet</p>
        <p class="mt-2 text-[14px] leading-relaxed text-muted">A hotel wants a deposit now and the rest after the dinner. Guests' ang bao can pay that rest, so only the cash before the dinner is saved for.</p>
        <dl class="mt-4 text-[14px]">
          <div class="flex items-baseline gap-3 border-b border-line py-2"><dt>Total cost</dt><span class="mb-1 flex-1 border-b border-dotted border-faint/60" /><dd class="tabular">{{ fmt(committed) }}</dd></div>
          <div class="flex items-baseline gap-3 border-b border-line py-2"><dt>Paid after the dinner, from ang bao</dt><span class="mb-1 flex-1 border-b border-dotted border-faint/60" /><dd class="tabular">−{{ fmt(cash.balanceAfter) }}</dd></div>
          <div class="flex items-baseline gap-3 py-2 font-medium"><dt>Cash needed before the banquet</dt><span class="mb-1 flex-1 border-b border-dotted border-faint/60" /><dd class="tabular">{{ fmt(cash.upfront) }}</dd></div>
        </dl>
      </div>
      <div class="flex flex-col justify-center bg-[#06363c] px-6 py-6 text-[#eaf7f7]">
        <p class="font-mono text-[10.5px] tracking-[0.14em] text-[#eaf7f7]/60 uppercase">Fork out before the banquet</p>
        <p class="font-serif tabular mt-2 text-[40px] leading-none">{{ fmt(cash.upfront) }}</p>
      </div>
    </section>

    <!-- the milestones -->
    <section>
      <div class="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-3">
        <h2 class="font-serif text-[30px] leading-none">Milestones</h2>
        <div class="flex flex-wrap items-center gap-2">
          <RouterLink to="/pots/new?kind=wedding" class="inline-flex items-center gap-1.5 rounded-[4px] border border-ink/30 px-3.5 py-2 text-[13px] font-medium hover:bg-ink/[0.05]">Edit the plan or add milestones</RouterLink>
        </div>
      </div>

      <ol>
        <li v-for="(s, i) in stages" :key="s.def.id" class="grid grid-cols-[44px_minmax(0,1fr)] gap-x-4">
          <div class="flex flex-col items-center">
            <span :class="cx('flex size-10 shrink-0 items-center justify-center rounded-full border-2 font-mono text-[13px]', s.funded ? 'border-ink bg-ink text-white' : s.unlocked ? 'border-terra bg-surface text-terra' : 'border-ink/20 bg-surface text-faint')">
              <Check v-if="s.funded" :size="17" /><Lock v-else-if="!s.unlocked" :size="15" /><template v-else>{{ i + 1 }}</template>
            </span>
            <span class="w-px flex-1 bg-line" />
          </div>

          <div :class="cx('mb-6 rounded-[6px] px-6 py-5', s.unlocked ? 'bg-surface shadow-[var(--shadow-card)]' : 'border border-dashed border-ink/20')">
            <div class="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
              <div :class="cx('min-w-0 flex-1', !s.unlocked && 'opacity-55')">
                <p class="font-mono text-[10.5px] tracking-[0.12em] text-muted uppercase">Milestone {{ i + 1 }}</p>
                <h3 class="font-serif mt-1 text-[28px] leading-none">{{ s.def.title }}</h3>
                <p class="mt-2 text-[13.5px] text-muted">{{ s.def.blurb }}</p>
              </div>
              <div class="text-right">
                <p class="font-serif tabular text-[28px] leading-none">{{ fmt(s.cost) }}</p>
                <p :class="cx('mt-1.5 font-mono text-[11px] tracking-[0.06em] uppercase', s.funded ? 'text-ok' : s.unlocked ? 'text-terra' : 'text-faint')">
                  {{ s.funded ? "Funded" : s.unlocked ? "Open now" : `Opens at ${fmt(s.from)} saved` }}
                </p>
              </div>
            </div>

            <p v-if="!s.unlocked && s.lines.length" class="mt-4 text-[13px] text-faint">Includes {{ s.lines.map((l) => l.name || "your own item").join(", ") }}. Save {{ fmt(s.from - saved) }} more to open this.</p>
            <p v-else-if="!s.unlocked" class="mt-4 text-[13px] text-faint">Save {{ fmt(s.from - saved) }} more to open this.</p>

            <template v-else>
              <div class="mt-5">
                <div class="h-1.5 bg-ink/10"><div :class="cx('h-full transition-[width] duration-700', s.funded ? 'bg-ink' : 'bg-terra')" :style="{ width: s.progress * 100 + '%' }" /></div>
                <p class="mt-2 font-mono text-[12px] text-muted">{{ fmt(Math.min(Math.max(saved - s.from, 0), s.cost)) }} of {{ fmt(s.cost) }} saved for this step</p>
              </div>

              <ul v-if="s.def.tasks.length" class="mt-4 flex flex-col">
                <li v-for="(task, ti) in s.def.tasks" :key="ti">
                  <button type="button" :aria-pressed="ticked(s.def.id, ti)" class="flex w-full cursor-pointer items-start gap-3 rounded-[4px] px-2 py-2 text-left hover:bg-ink/[0.04]" @click="tick(s.def.id, ti)">
                    <span :class="cx('mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-[3px] border transition-colors', ticked(s.def.id, ti) ? 'border-ink bg-ink text-white' : 'border-faint')"><Check v-if="ticked(s.def.id, ti)" :size="13" /></span>
                    <span :class="cx('text-[14.5px] leading-snug', ticked(s.def.id, ti) && 'text-muted line-through')">{{ task }}</span>
                  </button>
                </li>
              </ul>
              <p v-if="s.def.tasks.length" class="mt-1 px-2 font-mono text-[11.5px] text-faint">{{ taskCount(s.def.id, s.def.tasks.length) }} of {{ s.def.tasks.length }} done</p>

              <details v-if="s.lines.length" class="group mt-4 border-t border-line pt-3">
                <summary class="flex cursor-pointer list-none items-center justify-between text-[13.5px] font-medium">
                  <span>Costs in this milestone</span><span class="text-muted group-open:hidden">Show</span><span class="hidden text-muted group-open:inline">Hide</span>
                </summary>
                <ul class="mt-3">
                  <li v-for="l in s.lines" :key="l.id" class="border-b border-line py-3 last:border-b-0">
                    <div class="flex items-center justify-between gap-3">
                      <input v-if="l.id.startsWith('c')" v-model="l.name" placeholder="Name this cost" aria-label="Cost name" class="min-w-0 flex-1 border-0 bg-transparent p-0 text-[15px] font-medium outline-none placeholder:text-faint" />
                      <p v-else class="text-[15px] font-medium">{{ l.id === "venue" ? venueLineName(plan.form.style) : l.name }}</p>
                      <button v-if="l.id !== 'venue'" type="button" :aria-label="`Remove ${l.name || 'cost'}`" class="flex size-7 cursor-pointer items-center justify-center text-faint hover:text-bad" @click="removeLine(l.id)"><Trash2 :size="14" /></button>
                    </div>
                    <div class="keep-grid mt-1 grid grid-cols-2 divide-x divide-line border-y border-line">
                      <LedgerField v-model="l.budget" money label="Cost" placeholder="–" />
                      <LedgerField v-model="l.vendor" label="Vendor" placeholder="Not chosen" />
                    </div>
                    <p v-if="l.id === 'venue' && cash" class="mt-1.5 text-[12.5px] text-muted">Only the {{ plan.form.depositPct }}% deposit, {{ fmt(cash.deposit) }}, is saved for here. The balance of {{ fmt(cash.balanceAfter) }} is paid after the dinner, from ang bao.</p>
                  </li>
                </ul>
                <button v-if="s.def.custom" type="button" class="mt-2 inline-flex cursor-pointer items-center gap-1.5 text-[13px] font-medium text-terra hover:underline" @click="addLine"><Plus :size="14" /> Add your own cost</button>
              </details>
            </template>
          </div>
        </li>

        <!-- the finish -->
        <li class="grid grid-cols-[44px_minmax(0,1fr)] gap-x-4">
          <div class="flex flex-col items-center">
            <span :class="cx('flex size-10 items-center justify-center rounded-full border-2', allFunded ? 'border-terra bg-terra text-white' : 'border-ink/20 bg-surface text-faint')"><Check v-if="allFunded" :size="17" /><Lock v-else :size="15" /></span>
          </div>
          <div :class="cx('rounded-[6px] px-6 py-5', allFunded ? 'bg-surface shadow-[var(--shadow-card)]' : 'border border-dashed border-ink/20')">
            <p class="font-mono text-[10.5px] tracking-[0.12em] text-muted uppercase">The finish</p>
            <h3 :class="cx('font-serif mt-1 text-[28px] leading-none', !allFunded && 'opacity-55')">The big day</h3>
            <p class="mt-2 text-[13.5px] leading-relaxed text-muted">
              {{ allFunded ? "Everything you save for is funded." : "Opens when every milestone above is funded." }}
              {{ cash ? `After the dinner, the banquet balance of ${fmt(cash.balanceAfter)} is paid from the ang bao you collect.` : "" }}
            </p>
          </div>
        </li>
      </ol>

      <div class="mt-4 flex items-center justify-between gap-3">
        <Notice class="flex-1">Figures are your own estimates. This plan is stored in this browser only and is not shared with your partner yet.</Notice>
        <button type="button" class="shrink-0 cursor-pointer text-[13px] text-muted underline-offset-4 hover:text-bad hover:underline" @click="startOver">Start over</button>
      </div>
    </section>
  </div>
</template>
