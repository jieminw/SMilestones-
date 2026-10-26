<script setup lang="ts">
import { computed, ref } from "vue";
import { ArrowRight, Compass, ExternalLink, Search, X } from "lucide-vue-next";
import { BTO_PROJECTS, btoPhoto, FLAT_TYPE_LABEL, UPCOMING_EXERCISE, type BtoProject, type FlatTypeId } from "@/domain/bto-data";
import { APPLY_TO_SELECTION_MONTHS as LEAD, ASSUMED_PRICE_GROWTH as GROWTH, assess, earliest, type Reach, type Target } from "@/domain/btoReadiness";
import { todayISO } from "@/domain/dates";
import { fmt, fmtShort } from "@/domain/money";
import { useBtoDraft } from "@/composables/useBtoDraft";
import { useExplore } from "@/composables/useExplore";
import { cx, inputCls } from "@/lib/cx";
import { CLASS_COLOUR, FLAT_CHOICE_LABEL, townColour, whole, yrs } from "@/lib/btoUi";
import Badge from "@/components/ui/Badge.vue";
import Button from "@/components/ui/Button.vue";
import Card from "@/components/ui/Card.vue";
import Chip from "@/components/ui/Chip.vue";
import Drawer from "@/components/ui/Drawer.vue";
import MoneyInput from "@/components/ui/MoneyInput.vue";
import Notice from "@/components/ui/Notice.vue";
import Segmented from "@/components/ui/Segmented.vue";
import Blocks from "@/components/art/Blocks.vue";
import BtoCard from "./BtoCard.vue";
import SgMap, { type MapPin } from "./SgMap.vue";
import StartPlanner from "./StartPlanner.vue";

const emit = defineEmits<{ plan: [projectId: string, flatType: FlatTypeId, price: number, bookingDate?: string] }>();

/**
 * Two ways in. "Ready to apply": the current launches, each marked with whether the couple could afford it.
 * "Just starting": pick a town and see the likely price, and when their saving would get them there.
 */
const ex = useExplore();
const draft = useBtoDraft();

const PRICE_CAPS = [
  { v: 400_000, label: "Under $400k" },
  { v: 500_000, label: "Under $500k" },
  { v: 600_000, label: "Under $600k" },
];
const FLAT_OPTIONS = [
  { value: "2R" as const, label: "2-room" },
  { value: "3R" as const, label: "3-room" },
  { value: "4R" as const, label: "4-room" },
  { value: "5R" as const, label: "5-room" },
];
const MODES = [
  { k: "ready" as const, accent: "#e3c476", title: "I've saved up and want to apply", sub: "See which of the latest launches you could afford, and what each one would ask of you." },
  { k: "start" as const, accent: "#86aeb4", title: "I'm just starting to save", sub: "Pick a town, see what a flat there is likely to cost, and how long it would take at your pace." },
];
const q = ref("");
const cap = ref(0);
const cls = ref<string | null>(null);
const sort = ref<"price" | "wait" | "units">("price");
const reachOnly = ref(false);
const open = ref<BtoProject | null>(null);
const hovered = ref<string | null>(null);

// the two money fields are kept as numbers; the input wants text
const money = (key: "cash" | "monthly") =>
  computed({
    get: () => (ex[key] ? String(ex[key]) : ""),
    set: (v: string) => (ex[key] = Math.max(Number(v.replace(/,/g, "")) || 0, 0)),
  });
const cashText = money("cash");
const monthlyText = money("monthly");

const offerFor = (p: BtoProject) => {
  const list = p.flats.filter((f) => (ex.type === "2R" ? f.type.startsWith("2R") : f.type === ex.type));
  if (!list.length) return null;
  return { min: Math.min(...list.map((f) => f.minPrice)), max: Math.max(...list.map((f) => f.maxPrice)), units: list.reduce((a, f) => a + f.units, 0), type: list[list.length - 1].type, sqm: list[list.length - 1].internalSqm };
};
type Offer = NonNullable<ReturnType<typeof offerFor>>;

/** Every project that has the chosen flat type, before any filter: the base for the headline numbers and the price scale. */
const all = computed(() => BTO_PROJECTS.map((p) => ({ p, offer: offerFor(p) })).filter((x): x is { p: BtoProject; offer: Offer } => !!x.offer));
const typeLabel = computed(() => FLAT_CHOICE_LABEL[ex.type]);
const scale = computed(() => ({ lo: Math.min(...all.value.map((x) => x.offer.min)), hi: Math.max(...all.value.map((x) => x.offer.max)) }));

// ------------------------------------------------------------ could they afford each launch?
type ReachInfo = { status: Reach; title: string; detail: string; split: { cash: number; cpf: number } };
const reach = computed(() => {
  const out = new Map<string, ReachInfo>();
  const savings = { cash: ex.cash, monthly: ex.monthly };
  for (const { p, offer } of all.value) {
    const t: Target = { flatType: offer.type, price: offer.min, waitingMonths: p.waitingMonths };
    const a = assess(draft.value, t, savings, LEAD);
    const split = { cash: a.plan.totalCash, cpf: a.plan.totalUpfront - a.plan.totalCash };
    if (a.status === "ready") out.set(p.id, { status: "ready", title: "You can afford this", detail: `Upfront costs come to ${whole(a.plan.totalUpfront)}: ${whole(a.keysNeed)} in cash and ${whole(a.plan.totalUpfront - a.plan.totalCash)} from your CPF OA and grants.`, split });
    else if (a.status === "tight") out.set(p.id, { status: "tight", title: "You can book it", detail: `The keys payment would be ${whole(a.keysShort)} short. Save ${whole(a.extraMonthly)} more a month to cover it.`, split });
    else {
      const later = earliest(draft.value, t, savings, 0, 120, todayISO(), LEAD).canBook;
      const gap = a.bookShort > 0 ? `You'd be ${whole(a.bookShort)} short of the option fee when you choose your flat.` : `You'd be ${whole(a.signShort)} short of the signing payment.`;
      out.set(p.id, { status: "short", title: "Not quite yet", detail: later ? `${gap} About ${Math.max(later.months - LEAD, 1)} more months of saving would cover it.` : gap, split });
    }
  }
  return out;
});
const withinReach = computed(() => all.value.filter(({ p }) => reach.value.get(p.id)?.status !== "short").length);

const results = computed(() =>
  all.value
    .filter(({ p, offer }) => {
      if (reachOnly.value && reach.value.get(p.id)?.status === "short") return false;
      if (cap.value && offer.min >= cap.value) return false;
      if (cls.value && p.classification !== cls.value) return false;
      const s = q.value.trim().toLowerCase();
      return !s || p.name.toLowerCase().includes(s) || p.town.toLowerCase().includes(s) || p.region.toLowerCase().includes(s);
    })
    .sort((a, b) => (sort.value === "price" ? a.offer.min - b.offer.min : sort.value === "wait" ? a.p.waitingMonths - b.p.waitingMonths : b.offer.units - a.offer.units)),
);
const resultIds = computed(() => new Set(results.value.map((r) => r.p.id)));
const filtered = computed(() => !!q.value || !!cap.value || !!cls.value || reachOnly.value);
const clearAll = () => {
  q.value = "";
  cap.value = 0;
  cls.value = null;
  reachOnly.value = false;
};

// the launches shown under the planner: the chosen town, or all of them
const inTown = computed(() => all.value.filter(({ p }) => !ex.town || p.town === ex.town).sort((a, b) => a.offer.min - b.offer.min));

// ------------------------------------------------------------ headline numbers
const lowest = computed(() => [...all.value].sort((a, b) => a.offer.min - b.offer.min)[0]);
const quickest = computed(() => [...all.value].sort((a, b) => a.p.waitingMonths - b.p.waitingMonths)[0]);
const biggest = computed(() => [...all.value].sort((a, b) => b.offer.units - a.offer.units)[0]);
const totalFlats = computed(() => all.value.reduce((a, x) => a + x.offer.units, 0));
const towns = computed(() => new Set(BTO_PROJECTS.map((p) => p.town)).size);

const pins = computed<MapPin[]>(() =>
  all.value.map(({ p, offer }) => ({
    id: p.id,
    name: p.name,
    town: p.town,
    classification: p.classification,
    units: offer.units,
    label: `${typeLabel.value} from ${fmtShort(offer.min * 100)}`,
    on: resultIds.value.has(p.id),
  })),
);
const pick = (id: string) => (open.value = BTO_PROJECTS.find((p) => p.id === id) ?? null);

const picks = computed(() => [
  { key: "price", label: "Lowest entry price", value: lowest.value && fmtShort(lowest.value.offer.min * 100), sub: lowest.value?.p.name, id: lowest.value?.p.id },
  { key: "wait", label: "Quickest to keys", value: quickest.value && `${yrs(quickest.value.p.waitingMonths)} yrs`, sub: quickest.value?.p.name, id: quickest.value?.p.id },
  { key: "units", label: "Most flats to win", value: biggest.value && biggest.value.offer.units.toLocaleString(), sub: biggest.value?.p.name, id: biggest.value?.p.id },
]);

function plan(p: BtoProject, f: BtoProject["flats"][number]) {
  emit("plan", p.id, f.type, Math.round((f.minPrice + f.maxPrice) / 2 / 1000) * 1000);
  open.value = null;
}
</script>

<template>
  <div>
    <!-- where are you at? -->
    <div class="grid grid-cols-2 gap-4">
      <button
        v-for="m in MODES"
        :key="m.k"
        type="button"
        :class="cx('flex cursor-pointer items-start gap-4 rounded-[10px] border px-6 py-5 text-left transition', ex.mode === m.k ? 'bg-navy shadow-[var(--shadow-card)]' : 'border-line bg-surface hover:border-white/30')"
        :style="ex.mode === m.k ? { borderColor: m.accent } : undefined"
        @click="ex.mode = m.k"
      >
        <span :class="cx('mt-1 size-5 shrink-0 rounded-full border-2', ex.mode === m.k ? 'shadow-[inset_0_0_0_3px_#1d1e1f]' : 'border-faint')" :style="ex.mode === m.k ? { borderColor: m.accent, background: m.accent } : undefined" />
        <span>
          <span class="block text-[19px] font-semibold">{{ m.title }}</span>
          <span class="mt-1 block text-[14px] leading-snug text-muted">{{ m.sub }}</span>
        </span>
      </button>
    </div>

    <!-- what you have -->
    <section class="mt-5 grid grid-cols-4 items-end gap-6 rounded-[10px] border border-line bg-surface px-6 py-5">
      <label class="block">
        <span class="flex items-center gap-2 text-[12.5px] font-medium text-muted"><span class="size-2 rounded-full bg-lime" />Saved so far</span>
        <MoneyInput v-model="cashText" class="mt-1.5" placeholder="0" />
      </label>
      <label class="block">
        <span class="flex items-center gap-2 text-[12.5px] font-medium text-muted"><span class="size-2 rounded-full bg-who-a" />You add each month</span>
        <MoneyInput v-model="monthlyText" class="mt-1.5" placeholder="0" suffix="/ month" />
      </label>
      <div>
        <span class="flex items-center gap-2 text-[12.5px] font-medium text-muted"><span class="size-2 rounded-full bg-who-b" />CPF OA counted</span>
        <p class="tabular mt-1.5 flex h-11 items-center text-[18px] font-semibold">{{ fmt((draft.oaA + draft.oaB) * 100) }}</p>
      </div>
      <div v-if="ex.mode === 'start'">
        <span class="flex items-center gap-2 text-[12.5px] font-medium text-muted"><span class="size-2 rounded-full" style="background: #9a85c6" />Price rise assumed</span>
        <p class="tabular mt-1.5 flex h-11 items-center text-[18px] font-semibold">{{ Math.round(GROWTH * 1000) / 10 }}% a year</p>
        <p class="text-[12px] leading-snug text-muted">An estimate, since real prices are set at each launch.</p>
      </div>
      <p v-else class="text-[12.5px] leading-snug text-muted">Judged on each project's lowest-priced {{ typeLabel }}, counting about {{ LEAD }} months of saving before you choose your flat. Change your CPF and wages on the Finances tab.</p>
    </section>

    <!-- ============ ready to apply ============ -->
    <template v-if="ex.mode === 'ready'">
      <section v-reveal class="mt-6 grid grid-cols-[minmax(0,5fr)_minmax(0,7fr)] overflow-hidden rounded-[10px] bg-navy shadow-[var(--shadow-card)]">
        <div class="p-9">
          <p class="text-[13.5px] text-muted">Latest launches · Feb and Jun 2026</p>
          <h2 class="font-serif mt-2 text-[38px] leading-[1.12]">You could afford {{ withinReach }} of the {{ all.length }} latest launches.</h2>
          <p class="mt-3 max-w-[42ch] text-[15px] leading-relaxed text-muted">That's with {{ fmt(ex.cash * 100) }} saved and {{ fmt(ex.monthly * 100) }} a month going in, after your CPF and any grants. These are the most recent prices HDB has published, so use them as a guide: the next launch will differ.</p>

          <dl class="mt-8 divide-y divide-line border-y border-line text-[14.5px]">
            <div class="flex items-baseline justify-between gap-4 py-3.5">
              <dt class="text-muted">Cheapest {{ typeLabel }}<span class="text-ink"> · {{ lowest?.p.name }}</span></dt>
              <dd class="tabular text-[20px] font-semibold">{{ lowest && fmtShort(lowest.offer.min * 100) }}</dd>
            </div>
            <div class="flex items-baseline justify-between gap-4 py-3.5">
              <dt class="text-muted">{{ typeLabel }} flats on offer<span class="text-ink"> · {{ towns }} towns</span></dt>
              <dd class="tabular text-[20px] font-semibold">{{ totalFlats.toLocaleString() }}</dd>
            </div>
            <div class="flex items-baseline justify-between gap-4 py-3.5">
              <dt class="text-muted">Shortest wait<span class="text-ink"> · {{ quickest?.p.name }}</span></dt>
              <dd class="tabular text-[20px] font-semibold">{{ quickest && yrs(quickest.p.waitingMonths) }} yrs</dd>
            </div>
            <div class="flex items-baseline justify-between gap-4 py-3.5">
              <dt class="text-muted">Next launch<span class="text-ink"> · {{ UPCOMING_EXERCISE.label }}</span></dt>
              <dd class="tabular text-[20px] font-semibold">{{ UPCOMING_EXERCISE.flats.toLocaleString() }} flats</dd>
            </div>
          </dl>
        </div>

        <div class="flex flex-col justify-center bg-[#10202a] px-5 py-5">
          <SgMap :pins="pins" :upcoming="UPCOMING_EXERCISE.towns" :hovered="hovered" :selected="open?.id ?? null" @hover="hovered = $event" @pick="pick" />
          <div class="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12.5px] text-white/65">
            <span v-for="(c, name) in CLASS_COLOUR" :key="name" class="flex items-center gap-2"><span class="size-2.5 rounded-full" :style="{ background: c }" />{{ name }}</span>
            <span class="flex items-center gap-2"><span class="size-3 rounded-full border border-dashed border-lime" />{{ UPCOMING_EXERCISE.label }} launch</span>
            <span class="ml-auto text-white/45">Pin size shows how many flats · {{ results.length }} of {{ all.length }} shown</span>
          </div>
        </div>
      </section>

      <div class="mt-8 flex flex-wrap items-center gap-3">
        <div class="relative w-[300px]">
          <Search :size="18" class="absolute top-1/2 left-3.5 -translate-y-1/2 text-faint" />
          <input v-model="q" :class="cx(inputCls, 'pl-10')" placeholder="Search estates, e.g. Woodlands" />
          <button v-if="q" type="button" aria-label="Clear search" class="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer text-faint hover:text-ink" @click="q = ''"><X :size="16" /></button>
        </div>
        <Segmented v-model="ex.type" :options="FLAT_OPTIONS" />
        <Chip :active="reachOnly" @click="reachOnly = !reachOnly">Within my reach</Chip>
        <div class="flex gap-2">
          <Chip v-for="c in PRICE_CAPS" :key="c.v" :active="cap === c.v" @click="cap = cap === c.v ? 0 : c.v">{{ c.label }}</Chip>
        </div>
        <div class="flex gap-2">
          <Chip v-for="c in ['Standard', 'Plus', 'Prime']" :key="c" :active="cls === c" @click="cls = cls === c ? null : c"><span class="size-2 rounded-full" :style="{ background: CLASS_COLOUR[c] }" />{{ c }}</Chip>
        </div>
        <Segmented v-model="sort" class="ml-auto" :options="[{ value: 'price', label: 'Cheapest' }, { value: 'wait', label: 'Quickest' }, { value: 'units', label: 'Most flats' }]" />
      </div>

      <div v-if="!filtered" class="mt-6 grid grid-cols-3 gap-4">
        <button v-for="(x, i) in picks" :key="x.key" v-reveal="i * 80" type="button" class="group flex cursor-pointer items-center gap-4 rounded-[8px] border border-line bg-surface px-5 py-4 text-left transition hover:border-lime/60 hover:bg-surface-2" @click="x.id && pick(x.id)" @mouseenter="hovered = x.id ?? null" @mouseleave="hovered = null">
          <span class="min-w-0 flex-1">
            <span class="block font-mono text-[10.5px] tracking-[0.16em] text-muted uppercase">{{ x.label }}</span>
            <span class="tabular block text-[26px] leading-tight font-semibold">{{ x.value }}</span>
            <span class="block truncate text-[13px] text-muted">{{ x.sub }}</span>
          </span>
          <ArrowRight :size="18" class="text-faint transition-transform group-hover:translate-x-1 group-hover:text-lime" />
        </button>
      </div>

      <div class="mt-10">
        <span class="mb-3 block h-[3px] w-12 rounded-full bg-who-a" />
        <h3 class="font-serif text-[28px] leading-none">Latest launches</h3>
        <p class="mt-2 text-[14px] text-muted">{{ results.length }} {{ results.length === 1 ? "project" : "projects" }} from the Feb and Jun 2026 exercises, the latest with published prices{{ filtered ? ", matching your filters" : "" }}. Applications for these have closed; they show what a launch costs.</p>
      </div>

      <Card v-if="results.length === 0" class="mt-6 p-12 text-center">
        <Compass :size="36" class="mx-auto text-faint" />
        <h3 class="mt-4 font-semibold">No projects match</h3>
        <p class="mt-1 text-sm text-muted">Try a different flat type or remove a filter.</p>
        <Button class="mt-5" variant="secondary" size="sm" @click="clearAll">Clear filters</Button>
      </Card>
      <div v-else class="mt-6 grid grid-cols-3 gap-5">
        <div v-for="({ p, offer }, i) in results" :key="p.id" v-reveal="Math.min(i, 5) * 60" class="h-full">
          <BtoCard
            :project="p" :offer="offer" :scale="scale" :reach="reach.get(p.id)"
            :lowest="lowest?.p.id === p.id" :quickest="quickest?.p.id === p.id" :in-plan="draft.projectId === p.id" :hovered="hovered === p.id"
            @open="open = p" @hover="hovered = $event"
          />
        </div>
      </div>
    </template>

    <!-- ============ just starting ============ -->
    <template v-else>
      <div class="mt-6 flex items-center gap-3">
        <span class="text-[13.5px] font-medium text-muted">Flat type</span>
        <Segmented v-model="ex.type" :options="FLAT_OPTIONS" />
      </div>
      <StartPlanner class="mt-4" :projects="all" :pins="pins" :upcoming="UPCOMING_EXERCISE.towns" :type-label="typeLabel" @plan="(id, t, price, when) => emit('plan', id, t, price, when)" @pick="pick" />

      <div class="mt-10">
        <div class="mb-5 border-b border-line pb-4">
          <span class="mb-3 block h-[3px] w-12 rounded-full" style="background: #86aeb4" />
          <h3 class="font-serif text-[28px] leading-none">What you'd be saving for</h3>
          <p class="mt-2 text-[14px] text-muted">{{ ex.town ? `Recent launches in ${ex.town}` : "Recent launches" }}, with the official artist's impressions. Future launches will differ, but these show the homes and the prices to aim at.</p>
        </div>
        <div v-if="inTown.length === 0" class="rounded-[8px] border border-dashed border-line p-8 text-center text-[14px] text-muted">No {{ typeLabel }} flats in {{ ex.town }} yet.</div>
        <div v-else class="grid grid-cols-3 gap-5">
          <div v-for="({ p, offer }, i) in inTown" :key="p.id" v-reveal="Math.min(i, 5) * 60" class="h-full">
            <BtoCard :project="p" :offer="offer" :scale="scale" :hovered="hovered === p.id" @open="open = p" @hover="hovered = $event" />
          </div>
        </div>
      </div>
    </template>

    <!-- what comes after -->
    <section v-reveal class="relative mt-10 overflow-hidden rounded-[10px] border border-dashed border-lime/50 bg-surface px-8 py-7">
      <div class="flex flex-wrap items-center gap-x-10 gap-y-4">
        <div>
          <p class="font-mono text-[10.5px] tracking-[0.18em] text-lime uppercase">Next up · {{ UPCOMING_EXERCISE.label }} exercise</p>
          <p class="tabular text-[30px] leading-tight font-semibold">{{ UPCOMING_EXERCISE.flats.toLocaleString() }} <span class="text-[16px] font-normal text-muted">flats expected</span></p>
        </div>
        <div class="flex min-w-[260px] flex-1 flex-wrap items-center gap-2">
          <span v-for="t in UPCOMING_EXERCISE.towns" :key="t" class="flex items-center gap-2 rounded-full border px-3.5 py-1 text-[13px] text-ink" :style="{ borderColor: townColour(t) + '99', background: townColour(t) + '22' }"><span class="size-2 rounded-full" :style="{ background: townColour(t) }" />{{ t }}</span>
        </div>
      </div>
      <p class="mt-4 text-[13px] text-muted">{{ UPCOMING_EXERCISE.note }} Not published yet, so these are not on the map until launch.</p>
    </section>

    <Drawer :open="!!open" :title="open?.name ?? ''" :width="520" @close="open = null">
      <div v-if="open">
        <div class="relative -mx-7 -mt-6 mb-6 h-[230px] overflow-hidden">
          <img v-if="btoPhoto(open.id)" :src="btoPhoto(open.id)!" :alt="`Artist's impression of ${open.name}`" class="size-full object-cover" />
          <Blocks v-else :seed="open.id" :classification="open.classification" class="h-full w-full" />
          <p v-if="btoPhoto(open.id)" class="absolute right-3 bottom-2.5 rounded-[3px] bg-black/50 px-2 py-0.5 text-[10px] tracking-wide text-white/80">Artist's impression · HDB</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <Badge tone="sand">{{ open.town }}</Badge>
          <Badge tone="sand">{{ open.classification }}</Badge>
          <Badge tone="sand">{{ open.launch }} launch</Badge>
          <Badge tone="sand">~{{ open.waitingMonths }} months wait</Badge>
        </div>
        <Notice v-if="open.classification !== 'Standard'" tone="warn" class="mt-4">
          {{ open.classification }} flats come with tighter conditions (e.g. a longer minimum occupation period and resale restrictions). Check HDB's terms before you apply.
        </Notice>
        <table class="mt-6 w-full text-sm">
          <thead>
            <tr class="border-b border-line text-left text-xs text-muted">
              <th class="pb-2 font-medium">Flat type</th>
              <th class="pb-2 font-medium">Units</th>
              <th class="pb-2 text-right font-medium">Price range</th>
              <th />
            </tr>
          </thead>
          <tbody>
            <tr v-for="f in open.flats" :key="f.type" class="border-b border-line/60">
              <td class="py-3">
                <div class="font-medium">{{ FLAT_TYPE_LABEL[f.type].replace(/ \(.*/, "") }}</div>
                <div class="text-xs text-faint">{{ f.internalSqm }} sqm internal</div>
              </td>
              <td class="tabular py-3">{{ f.units }}</td>
              <td class="tabular py-3 text-right">{{ fmtShort(f.minPrice * 100) }} – {{ fmtShort(f.maxPrice * 100) }}</td>
              <td class="py-3 pl-3 text-right"><Button size="sm" variant="secondary" @click="plan(open, f)">Plan</Button></td>
            </tr>
          </tbody>
        </table>
        <p class="mt-4 text-xs leading-relaxed text-faint">
          {{ open.includesFinishes ? "Prices include floor finishes, internal doors and sanitary fittings. " : "" }}
          Indicative prices for 99-year leases, before grants. Waiting time is from flat selection to median completion.
          <a :href="open.source" target="_blank" rel="noreferrer" class="inline-flex items-center gap-1 text-terra hover:underline">HDB source <ExternalLink :size="11" /></a>
        </p>
      </div>
    </Drawer>
  </div>
</template>
