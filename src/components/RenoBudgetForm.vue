<script setup lang="ts">
import { computed, ref } from "vue";
import { ArrowLeft, ArrowRight, Check } from "lucide-vue-next";
import { fmt } from "@/domain/money";
import { buildRenoLines, FINISH_LABEL, HOME_LABEL, itemEstimate, RENO_CATALOG, renoItemsFor, renoTotal, SQM, worksTotal, type Finish, type Home, type RenoDates, type RenoForm, type Rooms } from "@/domain/renoBudget";
import type { Line } from "@/domain/weddingBudget";
import { todayISO } from "@/domain/dates";
import { renoDirectory, renoGuide } from "@/stores/guide";
import { PAGE_OF } from "@/data/renoGuide";
import { cx, inputCls } from "@/lib/cx";

/**
 * The renovation planning form, a few short steps. It works on a copy, so nothing changes until "Save the plan", and
 * "Discard" throws the copy away. Saving again later keeps the quotes and payments already recorded.
 */
const props = defineProps<{ modelValue: RenoForm; dates: RenoDates; lines: Line[]; editing: boolean; noDiscard?: boolean; seeded?: boolean }>();
const emit = defineEmits<{ save: [form: RenoForm, dates: RenoDates]; discard: [] }>();

const startAmounts = (): Record<string, string> =>
  Object.fromEntries(
    RENO_CATALOG.map((i) => {
      const have = props.lines.find((l) => l.id === i.id)?.budget.trim();
      return [i.id, have || String(itemEstimate(i, props.modelValue))];
    }),
  );
const draft = ref<RenoForm>({ ...props.modelValue, items: [...props.modelValue.items], amounts: startAmounts() });
const dates = ref<RenoDates>({ ...props.dates });

type StepId = "home" | "size" | "dates" | "costs" | "review";
const STEPS: { id: StepId; label: string }[] = [
  { id: "home", label: "Your home" },
  { id: "size", label: "Size and finish" },
  { id: "dates", label: "Dates" },
  { id: "costs", label: "Costs" },
  { id: "review", label: "Review" },
];
const at = ref(0);
const current = computed(() => STEPS[at.value].id);
const last = computed(() => at.value >= STEPS.length - 1);
const go = (i: number) => (at.value = Math.max(0, Math.min(i, STEPS.length - 1)));

const HOMES: { id: Home; body: string }[] = [
  { id: "bto", body: "Waterproofed bathrooms and little to hack out. The usual starting point for a new couple." },
  { id: "resale", body: "Often needs hacking and rewiring. Guides put the cost 20% to 40% higher." },
];
const FINISHES: { id: Finish; body: string }[] = [
  { id: "basic", body: "Practical choices, standard materials, minimal carpentry." },
  { id: "mid", body: "A balanced finish with built-in carpentry throughout." },
  { id: "premium", body: "Designer-led, custom carpentry and better materials." },
];

/** When the flat, home or finish changes, estimates still on a starting figure follow it. Ones the couple typed stay. */
function change(patch: Partial<Pick<RenoForm, "home" | "rooms" | "finish">>) {
  const before = { home: draft.value.home, rooms: draft.value.rooms, finish: draft.value.finish };
  const after = { ...before, ...patch };
  const amounts = (draft.value.amounts ??= {});
  for (const i of RENO_CATALOG) if (amounts[i.id] === String(itemEstimate(i, before))) amounts[i.id] = String(itemEstimate(i, after));
  Object.assign(draft.value, patch);
}

const works = computed(() => worksTotal(draft.value) * 100);
const built = computed(() => buildRenoLines(draft.value, props.lines));
const total = computed(() => renoTotal(built.value));
const available = computed(() => renoItemsFor(draft.value.home));
function toggle(id: string) {
  const i = draft.value.items.indexOf(id);
  if (i >= 0) draft.value.items.splice(i, 1);
  else draft.value.items.push(id);
}
const money = (n: number) => fmt(n * 100);
</script>

<template>
  <section class="rounded-[6px] bg-surface shadow-[var(--shadow-card)]">
    <!-- progress -->
    <ol class="keep-grid grid border-b border-line" :style="{ gridTemplateColumns: `repeat(${STEPS.length}, minmax(0, 1fr))` }">
      <li v-for="(s, i) in STEPS" :key="s.id" class="min-w-0">
        <button type="button" :disabled="i > at" :class="cx('flex w-full cursor-pointer flex-col gap-1 border-b-2 px-3 py-3 text-left transition-colors disabled:cursor-default', i === at ? 'border-ink' : 'border-transparent', i > at && 'opacity-45')" @click="go(i)">
          <span class="flex items-center gap-1.5 font-mono text-[10.5px] tracking-[0.1em] text-muted uppercase"><Check v-if="i < at" :size="12" class="text-terra" /><span v-else>{{ String(i + 1).padStart(2, "0") }}</span></span>
          <span class="hidden truncate text-[13px] font-medium md:block">{{ s.label }}</span>
        </button>
      </li>
    </ol>

    <p v-if="seeded" class="border-b border-line bg-[#d99573]/15 px-6 py-2.5 text-[13px] text-ink md:px-8">Started from your answers in the guide: home, size, finish and dates. Change anything you like.</p>
    <div class="px-6 py-7 md:px-8">
      <!-- home -->
      <div v-if="current === 'home'">
        <h2 class="font-serif text-[34px] leading-none">What kind of home?</h2>
        <p class="mt-3 max-w-[52ch] text-[14.5px] leading-relaxed text-muted">A new BTO flat and a resale flat cost very different amounts to renovate.</p>
        <div class="mt-6 flex flex-col gap-3">
          <button v-for="h in HOMES" :key="h.id" type="button" :aria-pressed="draft.home === h.id"
            :class="cx('flex cursor-pointer items-start gap-4 rounded-[4px] border px-5 py-4 text-left transition-colors', draft.home === h.id ? 'border-ink bg-ink/[0.05]' : 'border-line hover:border-ink/50')" @click="change({ home: h.id })">
            <span :class="cx('mt-1 flex size-4 shrink-0 items-center justify-center rounded-full border', draft.home === h.id ? 'border-ink' : 'border-faint')"><span v-if="draft.home === h.id" class="size-2 rounded-full bg-ink" /></span>
            <span><span class="block text-[16px] font-medium">{{ HOME_LABEL[h.id] }}</span><span class="mt-1 block text-[13.5px] leading-relaxed text-muted">{{ h.body }}</span></span>
          </button>
        </div>
        <button type="button" class="mt-4 cursor-pointer text-[13.5px] font-medium text-terra hover:underline" @click="renoGuide.show(PAGE_OF.costs)">See what it costs in the guide <ArrowRight :size="13" class="inline" /></button>
      </div>

      <!-- size and finish -->
      <div v-else-if="current === 'size'">
        <h2 class="font-serif text-[34px] leading-none">How big, and how fine?</h2>
        <p class="mt-3 max-w-[52ch] text-[14.5px] leading-relaxed text-muted">Size and finish set the starting estimate for every cost. You can change any figure on the costs step.</p>
        <p class="mt-6 font-mono text-[10.5px] tracking-[0.12em] text-muted uppercase">Flat type</p>
        <div class="mt-2 flex flex-wrap gap-2">
          <button v-for="n in ([3, 4, 5] as Rooms[])" :key="n" type="button" :aria-pressed="draft.rooms === n" :class="cx('cursor-pointer rounded-[4px] border px-5 py-2.5 text-[14px] font-medium transition-colors', draft.rooms === n ? 'border-ink bg-ink text-white' : 'border-line hover:border-ink/50')" @click="change({ rooms: n })">{{ n }}-room <span :class="draft.rooms === n ? 'text-white/60' : 'text-faint'">about {{ SQM[n] }} sqm</span></button>
        </div>
        <p class="mt-6 font-mono text-[10.5px] tracking-[0.12em] text-muted uppercase">Finish</p>
        <div class="mt-2 flex flex-col gap-3">
          <button v-for="f in FINISHES" :key="f.id" type="button" :aria-pressed="draft.finish === f.id"
            :class="cx('flex cursor-pointer items-start gap-4 rounded-[4px] border px-5 py-3.5 text-left transition-colors', draft.finish === f.id ? 'border-ink bg-ink/[0.05]' : 'border-line hover:border-ink/50')" @click="change({ finish: f.id })">
            <span :class="cx('mt-1 flex size-4 shrink-0 items-center justify-center rounded-full border', draft.finish === f.id ? 'border-ink' : 'border-faint')"><span v-if="draft.finish === f.id" class="size-2 rounded-full bg-ink" /></span>
            <span><span class="block text-[15.5px] font-medium">{{ FINISH_LABEL[f.id] }}</span><span class="mt-0.5 block text-[13.5px] leading-relaxed text-muted">{{ f.body }}</span></span>
          </button>
        </div>
        <div class="mt-6 flex items-baseline justify-between border-y border-ink/30 py-4">
          <span class="text-[14px] text-muted">Starting estimate for the works</span>
          <span class="font-serif tabular text-[30px] leading-none">{{ fmt(works) }}</span>
        </div>
      </div>

      <!-- dates -->
      <div v-else-if="current === 'dates'">
        <h2 class="font-serif text-[34px] leading-none">When do you get the keys?</h2>
        <p class="mt-3 max-w-[52ch] text-[14.5px] leading-relaxed text-muted">Leave a date blank and add it later. Most couples need two to three months of works after the keys.</p>
        <div class="mt-6 grid max-w-[560px] grid-cols-2 gap-5">
          <label class="flex flex-col gap-1.5"><span class="font-mono text-[10.5px] tracking-[0.12em] text-muted uppercase">Key collection</span><input v-model="dates.keys" type="date" :class="inputCls" /></label>
          <label class="flex flex-col gap-1.5"><span class="font-mono text-[10.5px] tracking-[0.12em] text-muted uppercase">Move in</span><input v-model="dates.movein" type="date" :min="dates.keys || todayISO()" :class="inputCls" /></label>
        </div>
      </div>

      <!-- costs -->
      <div v-else-if="current === 'costs'">
        <h2 class="font-serif text-[34px] leading-none">What will you spend on?</h2>
        <p class="mt-3 max-w-[56ch] text-[14.5px] leading-relaxed text-muted">The amounts are only estimates. Tap one to change it now, or edit it later once you have quotes. The works figures leave out furniture and appliances, which are separate lines.</p>
        <button type="button" class="mt-3 cursor-pointer text-[13.5px] font-medium text-terra hover:underline" @click="renoDirectory.show('firm')">Browse design firms and contractors <ArrowRight :size="13" class="inline" /></button>
        <ul class="mt-4 border-t border-line">
          <li v-for="i in available" :key="i.id" class="flex items-center gap-3 border-b border-line">
            <button type="button" :aria-pressed="draft.items.includes(i.id)" class="flex min-w-0 flex-1 cursor-pointer items-center gap-4 px-1 py-3 text-left transition-colors hover:bg-ink/[0.03]" @click="toggle(i.id)">
              <span :class="cx('flex size-5 shrink-0 items-center justify-center rounded-[3px] border transition-colors', draft.items.includes(i.id) ? 'border-ink bg-ink text-white' : 'border-faint')"><Check v-if="draft.items.includes(i.id)" :size="13" /></span>
              <span class="min-w-0 flex-1"><span class="block text-[15px] font-medium">{{ i.name }}</span><span class="block text-[12.5px] text-muted">{{ i.hint }}</span></span>
            </button>
            <label :class="cx('flex w-32 shrink-0 cursor-text flex-col gap-0.5 border-b border-ink/30 pb-1 transition-colors focus-within:border-terra', !draft.items.includes(i.id) && 'opacity-40')">
              <span class="font-mono text-[9.5px] tracking-[0.12em] text-faint uppercase">Estimate</span>
              <span class="flex items-baseline gap-1">
                <span class="font-mono text-[14px] text-faint">$</span>
                <input inputmode="decimal" :aria-label="`Estimated cost of ${i.name}`" :disabled="!draft.items.includes(i.id)" :value="draft.amounts?.[i.id] ?? ''" placeholder="0" class="tabular w-full min-w-0 border-0 bg-transparent p-0 text-right font-serif text-[20px] leading-none outline-none placeholder:text-faint/70" @input="(draft.amounts ??= {})[i.id] = ($event.target as HTMLInputElement).value.replace(/[^\d.,]/g, '')" />
              </span>
            </label>
          </li>
        </ul>
        <div class="mt-4 flex items-baseline justify-between border-b border-ink/30 pb-3">
          <span class="text-[14.5px] text-muted">Total of the lines you ticked</span>
          <span class="font-serif tabular text-[30px] leading-none">{{ fmt(total) }}</span>
        </div>
      </div>

      <!-- review -->
      <div v-else>
        <h2 class="font-serif text-[34px] leading-none">Check your plan</h2>
        <p class="mt-3 max-w-[52ch] text-[14.5px] leading-relaxed text-muted">Nothing is final. You can edit this form again, and your quotes and payments are kept.</p>
        <dl class="mt-6 grid grid-cols-2 divide-x divide-y divide-line border border-line sm:grid-cols-4 sm:divide-y-0">
          <div class="px-4 py-3"><dt class="font-mono text-[10px] tracking-[0.12em] text-faint uppercase">Home</dt><dd class="mt-1 text-[15px] font-medium">{{ HOME_LABEL[draft.home] }}</dd></div>
          <div class="px-4 py-3"><dt class="font-mono text-[10px] tracking-[0.12em] text-faint uppercase">Flat</dt><dd class="mt-1 text-[15px] font-medium">{{ draft.rooms }}-room</dd></div>
          <div class="px-4 py-3"><dt class="font-mono text-[10px] tracking-[0.12em] text-faint uppercase">Finish</dt><dd class="mt-1 text-[15px] font-medium">{{ FINISH_LABEL[draft.finish] }}</dd></div>
          <div class="px-4 py-3"><dt class="font-mono text-[10px] tracking-[0.12em] text-faint uppercase">Keys</dt><dd class="mt-1 text-[15px] font-medium">{{ dates.keys || "Not set" }}</dd></div>
        </dl>
        <div class="mt-5 flex items-baseline justify-between border-b border-ink/30 pb-3">
          <span class="text-[14.5px] text-muted">{{ draft.items.length }} cost lines, total</span>
          <span class="font-serif tabular text-[34px] leading-none">{{ fmt(total) }}</span>
        </div>
        <p class="mt-3 text-[13px] text-muted">That is {{ money(Math.round(total / 100)) }} to save before the work ends, in milestones that open one after another.</p>
      </div>
    </div>

    <div class="flex flex-wrap items-center justify-between gap-3 border-t border-line px-6 py-4 md:px-8">
      <button v-if="!noDiscard" type="button" class="cursor-pointer text-[14px] text-muted underline-offset-4 hover:text-bad hover:underline" @click="emit('discard')">{{ editing ? "Discard changes" : "Skip for now" }}</button>
      <span v-else />
      <div class="flex items-center gap-2">
        <button v-if="at > 0" type="button" class="inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-[4px] border border-ink/30 px-4 text-[14px] font-medium hover:bg-ink/[0.05]" @click="go(at - 1)"><ArrowLeft :size="15" /> Back</button>
        <button v-if="!last" type="button" class="inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-[4px] bg-ink px-5 text-[14px] font-medium text-white hover:opacity-90" @click="go(at + 1)">Next <ArrowRight :size="15" /></button>
        <button v-else type="button" class="inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-[4px] bg-ink px-5 text-[14px] font-medium text-white hover:opacity-90" @click="emit('save', draft, dates)">Save the plan</button>
      </div>
    </div>
  </section>
</template>
