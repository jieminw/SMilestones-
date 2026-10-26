<script setup lang="ts">
import { computed, ref } from "vue";
import { ArrowRight } from "lucide-vue-next";
import type { BtoProject, FlatTypeId } from "@/domain/bto-data";
import { ASSUMED_PRICE_GROWTH as GROWTH, assess, earliest, grownPrice, monthlyNeeded, type Target } from "@/domain/btoReadiness";
import { addMonths, fmtMonth, todayISO } from "@/domain/dates";
import { fmt, fmtShort } from "@/domain/money";
import { useBtoDraft } from "@/composables/useBtoDraft";
import { useExplore } from "@/composables/useExplore";
import { cx } from "@/lib/cx";
import { CASH_COLOUR, CPF_COLOUR, STAGE_COLOUR, whole } from "@/lib/btoUi";
import Chip from "@/components/ui/Chip.vue";
import SgMap, { type MapPin } from "./SgMap.vue";

type Offer = { min: number; max: number; units: number; type: FlatTypeId; sqm: number };

/**
 * For someone who has hardly started: pick a town, see what a flat there costs today and roughly in a few years, and
 * how long it would take to save for at their own pace. Today's launches are the reference prices, not the shopping list.
 */
const props = defineProps<{ projects: { p: BtoProject; offer: Offer }[]; pins: MapPin[]; upcoming: string[]; typeLabel: string }>();
const emit = defineEmits<{ plan: [projectId: string, flatType: FlatTypeId, price: number, bookingDate: string]; pick: [id: string] }>();

const ex = useExplore();
const draft = useBtoDraft();
const hovered = ref<string | null>(null);

const towns = computed(() => [...new Set(props.projects.map((x) => x.p.town))].sort());
const picked = computed(() => (ex.town ? props.projects.filter((x) => x.p.town === ex.town) : props.projects));

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor((s.length - 1) / 2)] : 0;
};
const typical = computed(() => Math.round(median(picked.value.map((x) => (x.offer.min + x.offer.max) / 2)) / 1000) * 1000);
const range = computed(() => ({ lo: Math.min(...picked.value.map((x) => x.offer.min)), hi: Math.max(...picked.value.map((x) => x.offer.max)) }));
/** The launch closest to the typical price: its waiting time and flat type stand in for the town. */
const rep = computed(() => [...picked.value].sort((a, b) => Math.abs((a.offer.min + a.offer.max) / 2 - typical.value) - Math.abs((b.offer.min + b.offer.max) / 2 - typical.value))[0]);
const target = computed<Target | null>(() => (rep.value ? { flatType: rep.value.offer.type, price: typical.value, waitingMonths: median(picked.value.map((x) => x.p.waitingMonths)) } : null));

const savings = computed(() => ({ cash: ex.cash, monthly: ex.monthly }));
const found = computed(() => (target.value ? earliest(draft.value, target.value, savings.value, GROWTH) : null));
const best = computed(() => found.value?.ready ?? null);
const bookOnly = computed(() => (!found.value?.ready ? found.value?.canBook ?? null : null));
/** What it looks like if they began today, to show the gap even when it is a long way off. */
const today = computed(() => (target.value ? assess(draft.value, target.value, savings.value, 0, GROWTH) : null));

const WHEN = [12, 24, 36, 60];
const whatIf = computed(() =>
  target.value
    ? WHEN.map((m) => {
        const need = monthlyNeeded(draft.value, target.value!, ex.cash, m, GROWTH);
        return { m, need, onPace: need <= ex.monthly * 100, date: fmtMonth(addMonths(todayISO(), m)) };
      })
    : [],
);

const shown = computed(() => best.value ?? bookOnly.value ?? today.value);
const projectedRange = computed(() => {
  const a = shown.value;
  return a ? { lo: grownPrice(range.value.lo, a.months, GROWTH), hi: grownPrice(range.value.hi, a.months, GROWTH) } : null;
});

/** Part of a whole as a percentage, kept visible even when it is tiny. */
const share = (part: number, total: number) => Math.min(Math.max(Math.round((part / (total || 1)) * 100), 3), 97);

const mapPins = computed(() => props.pins.map((p) => ({ ...p, on: !ex.town || p.town === ex.town })));
const setTown = (t: string | null) => (ex.town = ex.town === t ? null : t);

function start() {
  if (!rep.value || !target.value) return;
  const when = best.value?.bookingDate ?? bookOnly.value?.bookingDate ?? addMonths(todayISO(), 24);
  emit("plan", rep.value.p.id, rep.value.offer.type, typical.value, when);
}
</script>

<template>
  <section class="grid grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] items-start gap-6">
    <div class="rounded-[10px] bg-navy p-7 shadow-[var(--shadow-card)]">
      <span class="mb-3 block h-[3px] w-12 rounded-full bg-lime" />
      <p class="font-mono text-[11px] tracking-[0.2em] text-lime uppercase">Plan it</p>
      <h2 class="font-serif mt-2 text-[34px] leading-[1.08]">Where would you like <em class="text-who-a">home</em> to be?</h2>
      <div class="mt-4 flex flex-wrap gap-2">
        <Chip :active="!ex.town" @click="ex.town = null">Anywhere</Chip>
        <Chip v-for="t in towns" :key="t" :active="ex.town === t" @click="setTown(t)">{{ t }}</Chip>
      </div>

      <div v-if="!target" class="mt-8 rounded-[8px] border border-dashed border-line p-6 text-[14px] text-muted">No {{ typeLabel }} flats in recent launches here. Try another flat type or town.</div>
      <template v-else>
        <div class="mt-7 grid grid-cols-2 gap-6 border-t border-line pt-6">
          <div>
            <p class="font-mono text-[10.5px] tracking-[0.16em] text-muted uppercase">{{ typeLabel }} {{ ex.town ? `in ${ex.town}` : "across the launches" }}, today</p>
            <p class="tabular mt-1.5 text-[34px] leading-none font-semibold">{{ fmtShort(range.lo * 100) }}<span class="text-[20px] font-normal text-muted"> – {{ fmtShort(range.hi * 100) }}</span></p>
            <p class="mt-2 text-[12.5px] leading-snug text-muted">From {{ picked.length }} recent {{ picked.length === 1 ? "launch" : "launches" }}, before grants.</p>
          </div>
          <div>
            <p class="font-mono text-[10.5px] tracking-[0.16em] text-muted uppercase">By the time you book, about</p>
            <p class="tabular mt-1.5 text-[34px] leading-none font-semibold text-who-a">{{ projectedRange && fmtShort(projectedRange.lo * 100) }}<span class="text-[20px] font-normal text-who-a/70"> – {{ projectedRange && fmtShort(projectedRange.hi * 100) }}</span></p>
            <p class="mt-2 text-[12.5px] leading-snug text-muted">An estimate at {{ Math.round(GROWTH * 1000) / 10 }}% a year. Real prices are set at each launch.</p>
          </div>
        </div>

        <div class="mt-6 rounded-[10px] border border-who-a/35 bg-who-a-soft p-6">
          <template v-if="best">
            <p class="font-mono text-[10.5px] tracking-[0.16em] text-who-a uppercase">At your pace, you could be ready</p>
            <p class="font-serif mt-2 text-[44px] leading-none text-ink">{{ best.months === 0 ? "Right now" : fmtMonth(best.bookingDate) }}</p>
            <p class="mt-2 text-[14px] text-muted">{{ best.months === 0 ? "You already have what you need to book and keep paying." : `That's ${best.months} months from now, saving ${fmt(ex.monthly * 100)} a month.` }}</p>
          </template>
          <template v-else-if="bookOnly">
            <p class="font-mono text-[10.5px] tracking-[0.16em] text-who-a uppercase">You could book by</p>
            <p class="font-serif mt-2 text-[44px] leading-none text-ink">{{ fmtMonth(bookOnly.bookingDate) }}</p>
            <p class="mt-2 text-[14px] text-muted">The keys payment would still be about {{ whole(bookOnly.keysShort) }} short at this pace. Saving {{ whole(bookOnly.extraMonthly) }} more a month would close it.</p>
          </template>
          <template v-else>
            <p class="font-mono text-[10.5px] tracking-[0.16em] text-who-a uppercase">At this pace</p>
            <p class="font-serif mt-2 text-[30px] leading-tight text-ink">It would take more than 20 years.</p>
            <p class="mt-2 text-[14px] text-muted">Saving even a little more each month changes this a lot. Try the options below.</p>
          </template>

          <div v-if="shown" class="mt-5 border-t border-who-a/25 pt-4">
            <div class="flex h-2.5 overflow-hidden rounded-full bg-black/30">
              <div class="h-full" :style="{ width: share(shown.plan.totalCash, shown.plan.totalUpfront) + '%', background: CASH_COLOUR }" />
              <div class="h-full flex-1" :style="{ background: CPF_COLOUR }" />
            </div>
            <p class="mt-2 flex justify-between text-[12px] text-muted">
              <span class="flex items-center gap-1.5"><span class="size-2 rounded-full" :style="{ background: CASH_COLOUR }" />Your cash {{ whole(shown.plan.totalCash) }}</span>
              <span class="flex items-center gap-1.5"><span class="size-2 rounded-full" :style="{ background: CPF_COLOUR }" />CPF &amp; grants {{ whole(shown.plan.totalUpfront - shown.plan.totalCash) }}</span>
            </p>
            <div class="mt-4 grid grid-cols-3 gap-3">
              <div v-for="st in shown.plan.stages" :key="st.key" class="rounded-[6px] border-t-[3px] bg-black/20 px-3 pt-2.5 pb-3" :style="{ borderTopColor: STAGE_COLOUR[st.key] }">
                <p class="text-[12px] font-semibold text-ink">{{ st.name }}</p>
                <p class="text-[11.5px] text-muted">{{ fmtMonth(st.due) }}</p>
                <p class="tabular mt-1 text-[18px] font-semibold" :style="{ color: STAGE_COLOUR[st.key] }">{{ whole(st.cash) }}</p>
                <p class="text-[11.5px] text-muted">cash{{ st.cpfUsed > 0 ? `, CPF covers ${fmtShort(st.cpfUsed)}` : "" }}</p>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-6">
          <p class="font-mono text-[10.5px] tracking-[0.16em] text-muted uppercase">Want to be there sooner?</p>
          <ul class="mt-3 divide-y divide-line rounded-[8px] border border-line">
            <li v-for="w in whatIf" :key="w.m" class="flex items-center gap-4 px-4 py-3 text-[14px]">
              <span class="w-[110px] font-medium">Ready in {{ w.m / 12 === 1 ? "1 year" : `${w.m / 12} years` }}</span>
              <span class="text-muted">{{ w.date }}</span>
              <span class="tabular ml-auto text-[16px] font-semibold">{{ w.need === 0 ? "Already enough" : `${whole(w.need)} a month` }}</span>
              <span :class="cx('w-[78px] rounded-[3px] px-2 py-0.5 text-center text-[11px] font-medium', w.onPace ? 'bg-ok-soft text-ok' : 'bg-surface-2 text-muted')">{{ w.onPace ? "On pace" : `+${fmtShort(Math.max(w.need - ex.monthly * 100, 0))}` }}</span>
            </li>
          </ul>
        </div>

        <button type="button" class="mt-7 flex h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-[8px] bg-who-a text-[16px] font-semibold text-[#2b2b2b] transition hover:brightness-110" @click="start">
          Plan this in my finances <ArrowRight :size="18" />
        </button>
      </template>
    </div>

    <div class="sticky top-24 rounded-[10px] bg-[#10202a] p-4 shadow-[var(--shadow-card)]">
      <p class="mb-2 font-mono text-[11px] tracking-[0.18em] text-white/60 uppercase">Tap a town</p>
      <SgMap :pins="mapPins" :upcoming="upcoming" :hovered="hovered" :selected-town="ex.town" :selected="null" @hover="hovered = $event" @pick="emit('pick', $event)" @town="setTown" />
      <p class="mt-3 text-[12.5px] leading-snug text-white/55">Tinted towns have had a launch this year. The dashed ones are next. Pins are the projects you can see below.</p>
    </div>
  </section>
</template>
