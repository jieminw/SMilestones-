<script setup lang="ts">
import { computed, ref } from "vue";
import { CalendarClock, Compass, ExternalLink, Search, X } from "lucide-vue-next";
import { BTO_PROJECTS, FLAT_TYPE_LABEL, FLAT_TYPE_SHORT, UPCOMING_EXERCISE, type BtoProject, type FlatTypeId } from "@/domain/bto-data";
import { fmtShort } from "@/domain/money";
import { useBtoDraft } from "@/composables/useBtoDraft";
import { cx, inputCls } from "@/lib/cx";
import Badge from "@/components/ui/Badge.vue";
import Button from "@/components/ui/Button.vue";
import Card from "@/components/ui/Card.vue";
import Chip from "@/components/ui/Chip.vue";
import Drawer from "@/components/ui/Drawer.vue";
import Notice from "@/components/ui/Notice.vue";
import Segmented from "@/components/ui/Segmented.vue";
import Blocks from "@/components/art/Blocks.vue";

const emit = defineEmits<{ plan: [projectId: string, flatType: FlatTypeId, price: number] }>();

const PRICE_CAPS = [
  { v: 400_000, label: "Under $400k" },
  { v: 500_000, label: "Under $500k" },
  { v: 600_000, label: "Under $600k" },
];

const draft = useBtoDraft();
const q = ref("");
const type = ref<"2R" | "3R" | "4R" | "5R">("4R");
const cap = ref(0);
const cls = ref<string | null>(null);
const open = ref<BtoProject | null>(null);

const offerFor = (p: BtoProject) => {
  const list = p.flats.filter((f) => (type.value === "2R" ? f.type.startsWith("2R") : f.type === type.value));
  if (!list.length) return null;
  return { min: Math.min(...list.map((f) => f.minPrice)), max: Math.max(...list.map((f) => f.maxPrice)), units: list.reduce((a, f) => a + f.units, 0), type: list[list.length - 1].type };
};

const results = computed(() =>
  BTO_PROJECTS.map((p) => ({ p, offer: offerFor(p)! }))
    .filter(({ p, offer }) => {
      if (!offer) return false;
      if (cap.value && offer.min >= cap.value) return false;
      if (cls.value && p.classification !== cls.value) return false;
      const s = q.value.trim().toLowerCase();
      return !s || p.name.toLowerCase().includes(s) || p.town.toLowerCase().includes(s) || p.region.toLowerCase().includes(s);
    })
    .sort((a, b) => a.offer.min - b.offer.min),
);

const classTone = (c: string) => (c === "Prime" ? "peach" : c === "Plus" ? "navy" : "sand");

function plan(p: BtoProject, f: BtoProject["flats"][number]) {
  emit("plan", p.id, f.type, Math.round((f.minPrice + f.maxPrice) / 2 / 1000) * 1000);
  open.value = null;
}
</script>

<template>
  <div>
    <div class="mb-6 flex flex-wrap items-center gap-3">
      <div class="relative w-[340px]">
        <Search :size="18" class="absolute top-1/2 left-3.5 -translate-y-1/2 text-faint" />
        <input v-model="q" :class="cx(inputCls, 'pl-10')" placeholder="Search estates, e.g. Woodlands" />
        <button v-if="q" type="button" aria-label="Clear search" class="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer text-faint hover:text-ink" @click="q = ''"><X :size="16" /></button>
      </div>
      <Segmented v-model="type" :options="[{ value: '2R', label: '2-room' }, { value: '3R', label: '3-room' }, { value: '4R', label: '4-room' }, { value: '5R', label: '5-room' }]" />
      <div class="flex gap-2">
        <Chip v-for="c in PRICE_CAPS" :key="c.v" :active="cap === c.v" @click="cap = cap === c.v ? 0 : c.v">{{ c.label }}</Chip>
      </div>
      <div class="flex gap-2">
        <Chip v-for="c in ['Standard', 'Plus', 'Prime']" :key="c" :active="cls === c" @click="cls = cls === c ? null : c">{{ c }}</Chip>
      </div>
    </div>

    <Card v-if="results.length === 0" class="p-12 text-center">
      <Compass :size="36" class="mx-auto text-faint" />
      <h3 class="mt-4 font-semibold">No projects match</h3>
      <p class="mt-1 text-sm text-muted">Try a different flat type or remove a filter.</p>
    </Card>
    <div v-else class="grid grid-cols-3 gap-5">
      <button v-for="{ p, offer } in results" :key="p.id" type="button" class="group cursor-pointer text-left" @click="open = p">
        <Card :class="cx('h-full overflow-hidden transition-shadow group-hover:shadow-[var(--shadow-pop)]', draft.projectId === p.id && 'ring-2 ring-terra')">
          <div class="relative h-[120px]">
            <Blocks :seed="p.id" :classification="p.classification" class="h-full w-full" />
            <div class="absolute top-3 left-3 flex gap-1.5">
              <Badge :tone="classTone(p.classification)">{{ p.classification }}</Badge>
              <Badge tone="plain" class="bg-surface/90">{{ p.launch }}</Badge>
            </div>
          </div>
          <div class="p-5">
            <h3 class="font-serif text-[21px] leading-tight">{{ p.name }}</h3>
            <p class="mt-0.5 text-sm text-muted">{{ p.town }} · {{ p.region }}</p>
            <div class="mt-4 flex items-end justify-between">
              <div>
                <div class="text-xs text-faint">{{ FLAT_TYPE_SHORT[offer.type] }} · excl. grants</div>
                <div class="tabular text-lg font-semibold">{{ fmtShort(offer.min * 100) }} – {{ fmtShort(offer.max * 100) }}</div>
              </div>
              <div class="text-right text-xs text-muted"><CalendarClock :size="14" class="mb-0.5 ml-auto" />~{{ Math.round((p.waitingMonths / 12) * 10) / 10 }} yrs wait</div>
            </div>
          </div>
        </Card>
      </button>
    </div>

    <Notice class="mt-8">
      <template #icon><CalendarClock :size="16" /></template>
      <strong class="text-ink">Next up: {{ UPCOMING_EXERCISE.label }} exercise</strong> · about {{ UPCOMING_EXERCISE.flats.toLocaleString() }} flats in {{ UPCOMING_EXERCISE.towns.join(", ") }}. {{ UPCOMING_EXERCISE.note }}
    </Notice>

    <Drawer :open="!!open" :title="open?.name ?? ''" :width="520" @close="open = null">
      <div v-if="open">
        <div class="-mx-7 -mt-6 mb-6 h-[150px]"><Blocks :seed="open.id" :classification="open.classification" class="h-full w-full" /></div>
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
