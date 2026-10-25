<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { ArrowUpRight, Check, MapPin, Search, Star, X } from "lucide-vue-next";
import { applyFilters, bandLabel, bandOf, emptyFilters, isWellReviewed, REGIONS, tableQuote, type AnyCategory, type Filters, type Listing, type Region, type Sort } from "@/domain/directory";
import { cx } from "@/lib/cx";
import { openExternal } from "@/lib/external";

/**
 * A directory of listings as cards, in the colours of its guide, with filters for location and price. The lists come from published
 * rankings and reader-rated directories. We use the rating and vote count each source gave to order them, but we do not
 * show the numbers, and we do not run reviews of our own. One component serves the wedding and the renovation directory.
 */
interface Tab {
  id: string;
  label: string;
  plural: string;
  /** Price filter heading, e.g. "Per table of 10". */
  unit: string;
  /** What the "Where" filter is called for this list, and a note under it. */
  whereLabel?: string;
  whereNote?: string;
  /** Names the profile button, e.g. "SingaporeBrides". */
  profileSite: string;
}
/** An optional switch that widens one list, e.g. to add Chinese restaurants to the hotels. */
interface Toggle {
  id: string;
  category: string;
  label: string;
  title: string;
  /** Which listings the switch is off for. */
  hiddenWhenOff: (l: Listing) => boolean;
}

/** The directory takes the colours of its guide, and a photo for each list. */
interface Theme {
  /** The page behind the cards. */
  page: string;
  /** The header band, and the text on it. */
  head: string;
  headText: string;
  /** The strong colour: buttons and chosen filters. */
  accent: string;
  /** The soft colour: highlights on the dark header and tints on the cards. */
  soft: string;
  /** Card borders. */
  line: string;
  /** Body text. */
  ink: string;
  /** A photo in public/images for each list, by tab id. */
  photos: Record<string, string>;
}

const props = defineProps<{
  state: { open: boolean; category: string; close: () => void };
  tabs: Tab[];
  listings: Record<string, Listing[]>;
  kicker: string;
  title: string;
  dialogLabel: string;
  toggles?: Toggle[];
  /** Another overlay is open under this one, so keep the page from scrolling when this closes. */
  underOpen?: boolean;
  theme: Theme;
  /** Sort labels depend on the list: reviewed lists order by reviews, the others by name. */
  sortNote?: string;
  /** Added to a name to build the web-search link for a listing with no page of its own. */
  searchSuffix?: string;
}>();
const search = (q: string) => `https://www.google.com/search?q=${encodeURIComponent(q + (props.searchSuffix ?? " Singapore wedding"))}`;

const cat = computed(() => props.state.category);
const tab = computed(() => props.tabs.find((t) => t.id === cat.value)!);
const on = ref<Record<string, boolean>>({});
const toggleFor = computed(() => props.toggles?.find((t) => t.category === cat.value));
// a list leaves out what a switch is off for, until the switch is turned on
const pool = (id: string): Listing[] => {
  const t = props.toggles?.find((x) => x.category === id);
  const all = props.listings[id] ?? [];
  return t && !on.value[t.id] ? all.filter((l) => !t.hiddenWhenOff(l)) : all;
};
const all = computed(() => pool(cat.value));
const countFor = (id: string) => (props.toggles?.find((t) => t.category === id) ? (props.listings[id] ?? []).filter((l) => !props.toggles!.find((t) => t.category === id)!.hiddenWhenOff(l)).length : (props.listings[id] ?? []).length);
const hiddenCount = computed(() => (toggleFor.value ? (props.listings[cat.value] ?? []).filter(toggleFor.value.hiddenWhenOff).length : 0));

const f = ref<Filters>(emptyFilters());
const openMenu = ref<"loc" | "price" | null>(null);
watch(cat, () => {
  f.value = emptyFilters();
  on.value = {};
  openMenu.value = null;
});

const regionCounts = computed(() => {
  const m = new Map<Region, number>();
  for (const l of all.value) m.set(l.region, (m.get(l.region) ?? 0) + 1);
  return REGIONS.filter((r) => m.has(r)).map((r) => ({ region: r, n: m.get(r)! }));
});
// a location filter is no use when the sources name no place for most listings
const showWhere = computed(() => regionCounts.value.filter((r) => r.region !== "Not listed").length >= 2);
const showPrice = computed(() => all.value.some((l) => bandOf(l) !== undefined));
const results = computed(() => applyFilters(all.value, f.value));
const filtered = computed(() => !!(f.value.regions.length || f.value.bands.length || f.value.q));

function toggleRegion(r: Region) {
  const i = f.value.regions.indexOf(r);
  if (i >= 0) f.value.regions.splice(i, 1);
  else f.value.regions.push(r);
}
function toggleBand(b: 1 | 2 | 3 | 4) {
  const i = f.value.bands.indexOf(b);
  if (i >= 0) f.value.bands.splice(i, 1);
  else f.value.bands.push(b);
}
const reset = () => (f.value = emptyFilters());
const regionLabel = (r: Region) => (r === "Not listed" ? "Place not listed" : r);
const SORTS: { id: Sort; label: string }[] = [
  { id: "best", label: "Best reviewed first" },
  { id: "reviewed", label: "Most popular first" },
  { id: "low", label: "Price, low to high" },
  { id: "high", label: "Price, high to low" },
];

// ---- the toolbar's menus: one open at a time, closed by a click anywhere else
function toggleMenu(m: "loc" | "price") {
  openMenu.value = openMenu.value === m ? null : m;
}
function onDocDown(e: MouseEvent) {
  if (openMenu.value && !(e.target as HTMLElement).closest("[data-menu]")) openMenu.value = null;
}

const closeBtn = ref<HTMLButtonElement | null>(null);
let opener: HTMLElement | null = null;
function close() {
  props.state.close();
}
function onKey(e: KeyboardEvent) {
  if (!props.state.open || e.key !== "Escape") return;
  e.stopPropagation();
  if (openMenu.value) openMenu.value = null;
  else close();
}
watch(
  () => props.state.open,
  async (open) => {
    if (open) {
      document.body.style.overflow = "hidden";
      opener = document.activeElement as HTMLElement | null;
      await nextTick();
      closeBtn.value?.focus();
    } else {
      document.body.style.overflow = props.underOpen ? "hidden" : "";
      opener?.focus?.();
    }
  },
);
onMounted(() => {
  window.addEventListener("keydown", onKey, true);
  document.addEventListener("mousedown", onDocDown);
});
onBeforeUnmount(() => {
  window.removeEventListener("keydown", onKey, true);
  document.removeEventListener("mousedown", onDocDown);
});

/** A cell in the filter strip: a label you click, in the ledger style used across the planner. */
const pill = "flex h-11 cursor-pointer items-center gap-2 rounded-full border px-4 text-[14px] font-medium transition-colors";
const menuBox = "absolute top-full left-0 z-40 mt-2 w-[min(320px,calc(100vw-40px))] rounded-xl border bg-white p-2 shadow-lg";
const level = (l: Listing) => bandOf(l);
const dollars = (n: number) => "$" + n.toLocaleString("en-SG");
const asCat = (c: string) => c as AnyCategory;
</script>

<template>
  <Teleport to="body">
    <Transition name="dir">
      <div v-if="state.open" class="fixed inset-0 z-[120] flex items-stretch justify-center bg-black/70 min-[900px]:p-6" role="dialog" aria-modal="true" :aria-label="dialogLabel" @click.self="close">
        <div class="flex h-full w-full max-w-[1280px] flex-col overflow-hidden min-[900px]:rounded-xl" :style="{ background: theme.page, color: theme.ink }">
          <div class="min-h-0 flex-1 overflow-y-auto">
          <!-- the header: a photo for the open list, under the guide's colour -->
          <header class="relative shrink-0 overflow-hidden" :style="{ background: theme.head, color: theme.headText }">
            <img :key="cat" :src="`/images/${theme.photos[cat]}.jpg`" alt="" class="absolute inset-0 size-full object-cover opacity-50" />
            <div class="absolute inset-0" :style="{ background: `linear-gradient(90deg, ${theme.head} 20%, ${theme.head}b3 60%, ${theme.head}59 100%)` }" />
            <div class="relative px-5 pt-5 pb-4 min-[900px]:px-10 min-[900px]:pt-6">
              <div class="flex items-start justify-between gap-6">
                <div class="min-w-0">
                  <p class="text-[12px] font-semibold tracking-[0.2em] uppercase" :style="{ color: theme.soft }">{{ kicker }}</p>
                  <h2 class="font-serif mt-2 text-[clamp(28px,3.6vw,40px)] leading-[1.05] font-semibold">{{ title }}</h2>
                </div>
                <button ref="closeBtn" type="button" class="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-current/50 transition-colors hover:bg-white/15" aria-label="Close" @click="close"><X :size="18" /></button>
              </div>
              <nav class="mt-4 flex gap-2 overflow-x-auto pb-1" role="tablist">
                <button v-for="t in tabs" :key="t.id" type="button" role="tab" :aria-selected="cat === t.id"
                  :class="cx('shrink-0 cursor-pointer rounded-full border px-5 py-2.5 text-[15px] leading-none font-semibold whitespace-nowrap transition-colors', cat !== t.id && 'border-current/40 hover:bg-white/15')"
                  :style="cat === t.id ? { background: theme.soft, borderColor: theme.soft, color: theme.head } : undefined" @click="state.category = t.id">
                  {{ t.label }} <span class="ml-1 text-[13px] opacity-70">{{ countFor(t.id) }}</span>
                </button>
              </nav>
            </div>
          </header>

          <!-- the filters -->
          <div class="relative z-30 flex flex-wrap min-[900px]:sticky min-[900px]:top-0 items-center gap-2.5 border-b bg-white px-5 py-2.5 min-[900px]:px-10" :style="{ borderColor: theme.line }">
            <label :class="cx(pill, 'min-w-[220px] flex-1 cursor-text min-[900px]:max-w-[340px] min-[900px]:flex-none')" :style="{ borderColor: theme.line }">
              <Search :size="16" class="shrink-0 opacity-60" />
              <input v-model="f.q" type="search" placeholder="Name or place" aria-label="Search by name or place" class="min-w-0 flex-1 border-0 bg-transparent p-0 text-[15px] outline-none placeholder:opacity-50" />
            </label>

            <div v-if="showWhere" class="relative" data-menu>
              <button type="button" :aria-expanded="openMenu === 'loc'" :class="pill" :style="f.regions.length ? { background: theme.accent, borderColor: theme.accent, color: '#fff' } : { borderColor: theme.line }" @click="toggleMenu('loc')">
                <MapPin :size="15" /> {{ tab.whereLabel ?? "Where" }}: {{ f.regions.length ? `${f.regions.length} chosen` : "anywhere" }} <span class="text-[10px] opacity-60">▾</span>
              </button>
              <div v-if="openMenu === 'loc'" :class="menuBox" :style="{ borderColor: theme.line }">
                <ul class="max-h-[320px] overflow-y-auto">
                  <li v-for="r in regionCounts" :key="r.region">
                    <button type="button" :aria-pressed="f.regions.includes(r.region)" class="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left text-[14px] hover:bg-black/[0.05]" @click="toggleRegion(r.region)">
                      <span class="flex size-4 shrink-0 items-center justify-center rounded border" :style="f.regions.includes(r.region) ? { background: theme.accent, borderColor: theme.accent, color: '#fff' } : { borderColor: theme.line }"><Check v-if="f.regions.includes(r.region)" :size="11" /></span>
                      <span class="flex-1">{{ regionLabel(r.region) }}</span><span class="text-[12px] opacity-60">{{ r.n }}</span>
                    </button>
                  </li>
                </ul>
                <p v-if="tab.whereNote" class="mt-1 border-t px-3 pt-2.5 pb-1 text-[12px] leading-relaxed opacity-70" :style="{ borderColor: theme.line }">{{ tab.whereNote }}</p>
              </div>
            </div>

            <div v-if="showPrice" class="relative" data-menu>
              <button type="button" :aria-expanded="openMenu === 'price'" :class="pill" :style="f.bands.length ? { background: theme.accent, borderColor: theme.accent, color: '#fff' } : { borderColor: theme.line }" @click="toggleMenu('price')">
                Price: {{ f.bands.length ? `${f.bands.length} chosen` : "any" }} <span class="text-[10px] opacity-60">▾</span>
              </button>
              <div v-if="openMenu === 'price'" :class="menuBox" :style="{ borderColor: theme.line }">
                <p class="px-3 pt-1 pb-2 text-[12px] font-semibold tracking-wide uppercase opacity-60">{{ tab.unit }}</p>
                <ul>
                  <li v-for="b in ([1, 2, 3, 4] as const)" :key="b">
                    <button type="button" :aria-pressed="f.bands.includes(b)" class="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left text-[14px] hover:bg-black/[0.05]" @click="toggleBand(b)">
                      <span class="flex size-4 shrink-0 items-center justify-center rounded border" :style="f.bands.includes(b) ? { background: theme.accent, borderColor: theme.accent, color: '#fff' } : { borderColor: theme.line }"><Check v-if="f.bands.includes(b)" :size="11" /></span>
                      <span class="w-14 font-semibold tracking-wide" :style="{ color: theme.accent }">{{ "$".repeat(b) }}<span class="opacity-25">{{ "$".repeat(4 - b) }}</span></span>
                      <span class="flex-1 opacity-70">{{ bandLabel(asCat(cat), b) }}</span>
                    </button>
                  </li>
                </ul>
                <label v-if="f.bands.length" class="mt-1 flex cursor-pointer items-start gap-2.5 border-t px-3 pt-3 pb-1 text-[13px] leading-snug opacity-80" :style="{ borderColor: theme.line }"><input v-model="f.keepUnpriced" type="checkbox" class="mt-0.5" /> Also show listings with no published price</label>
              </div>
            </div>

            <button v-if="toggleFor" type="button" :aria-pressed="!!on[toggleFor.id]" :title="toggleFor.title" :class="pill" :style="on[toggleFor.id] ? { background: theme.accent, borderColor: theme.accent, color: '#fff' } : { borderColor: theme.line }" @click="on[toggleFor.id] = !on[toggleFor.id]">
              <Check v-if="on[toggleFor.id]" :size="14" /> {{ toggleFor.label.replace("{n}", String(hiddenCount)) }}
            </button>

            <label :class="cx(pill, 'ml-auto')" :style="{ borderColor: theme.line }">
              <span class="text-[13px] opacity-60">Order</span>
              <select v-model="f.sort" aria-label="Order by" class="cursor-pointer border-0 bg-transparent py-1 pr-1 text-[14px] font-semibold outline-none"><option v-for="s in SORTS" :key="s.id" :value="s.id">{{ s.label }}</option></select>
            </label>
          </div>

          <!-- the cards -->
          <section class="px-5 min-[900px]:px-10" @click="openExternal">
            <div class="flex flex-wrap items-baseline gap-x-5 gap-y-1 py-4">
              <p class="text-[14px] font-semibold">{{ results.length }} of {{ all.length }} {{ tab.plural }}</p>
              <p class="text-[13px] opacity-65">{{ sortNote ?? "Starting prices from the sources, not quotes. Ordered by published reviews and popularity." }}</p>
              <button v-if="filtered" type="button" class="ml-auto cursor-pointer text-[14px] font-semibold underline underline-offset-4" :style="{ color: theme.accent }" @click="reset">Clear filters</button>
            </div>

            <p v-if="!results.length" class="rounded-xl border bg-white py-14 text-center text-[15px]" :style="{ borderColor: theme.line }">Nothing matches those filters. <button type="button" class="cursor-pointer font-semibold underline underline-offset-4" :style="{ color: theme.accent }" @click="reset">Clear them</button> to see everything.</p>

            <ol class="grid grid-cols-1 gap-4 min-[760px]:grid-cols-2 min-[1120px]:grid-cols-3">
              <li v-for="(l, i) in results" :key="l.name + l.area" class="group flex flex-col rounded-xl border bg-white p-4 transition-colors hover:border-[var(--d-accent)]" :style="{ borderColor: theme.line, '--d-accent': theme.accent }">
                <div class="flex items-start gap-3">
                  <span class="flex size-8 shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white" :style="{ background: theme.accent }">{{ i + 1 }}</span>
                  <div class="min-w-0 flex-1">
                    <h3 class="font-serif text-[19px] leading-[1.15] font-semibold">{{ l.name }}</h3>
                    <p class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px] font-medium">
                      <span class="opacity-70">{{ l.type }}</span>
                      <span v-if="isWellReviewed(l)" class="inline-flex items-center gap-1 font-semibold" :style="{ color: theme.accent }"><Star :size="12" fill="currentColor" /> Well reviewed</span>
                    </p>
                  </div>
                </div>

                <p class="mt-3 flex items-start gap-1.5 text-[14px] font-medium"><MapPin :size="15" class="mt-0.5 shrink-0" :style="{ color: theme.accent }" /> {{ l.area === "Not listed" ? "Location not listed" : l.area }}</p>

                <p v-if="l.note" class="mt-2 line-clamp-2 text-[14px] leading-snug opacity-75" :title="l.note">{{ l.note }}</p>

                <div class="mt-3 border-l-4 pl-3" :style="{ borderColor: theme.soft }">
                  <template v-if="tableQuote(l)">
                    <p class="text-[12px] font-semibold tracking-wide uppercase opacity-60">Per table of 10</p>
                    <p class="font-serif text-[24px] leading-tight font-semibold" :style="{ color: theme.accent }">
                      <span v-if="tableQuote(l)!.derived" class="font-sans text-[13px] font-semibold">about </span><span v-else-if="tableQuote(l)!.from" class="font-sans text-[13px] font-semibold">from </span>{{ dollars(tableQuote(l)!.amount) }}<span v-if="tableQuote(l)!.plus" class="text-[15px]">++</span>
                    </p>
                    <p class="text-[12.5px] leading-snug opacity-65">
                      <template v-if="tableQuote(l)!.derived">Worked out from {{ tableQuote(l)!.perPerson }} a person. </template><template v-if="tableQuote(l)!.minTables">Minimum {{ tableQuote(l)!.minTables }} tables. </template>{{ l.source }}
                    </p>
                  </template>
                  <template v-else>
                    <p v-if="level(l)" class="text-[15px] font-bold tracking-[0.1em]" :style="{ color: theme.accent }" :title="bandLabel(l.category, level(l)!)" :aria-label="`Price band ${level(l)} of 4: ${bandLabel(l.category, level(l)!)}`">{{ "$".repeat(level(l)!) }}<span class="opacity-25">{{ "$".repeat(4 - level(l)!) }}</span></p>
                    <p class="text-[14px] leading-snug font-medium" :class="level(l) && 'mt-0.5'">{{ l.priceNote }}</p>
                    <p class="mt-1 text-[12.5px] leading-snug opacity-65">{{ l.source }}</p>
                  </template>
                </div>

                <div class="mt-auto flex gap-2 pt-4">
                  <a v-if="l.url" :href="l.url" target="_blank" rel="noreferrer noopener" class="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-full px-4 text-[13.5px] font-semibold text-white transition-opacity hover:opacity-85" :style="{ background: theme.accent }">Website <ArrowUpRight :size="15" /></a>
                  <a v-if="l.profile" :href="l.profile" target="_blank" rel="noreferrer noopener" :title="l.url ? `Its page on ${tab.profileSite}` : `Details and reviews, on ${tab.profileSite}`" class="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-full px-4 text-[13.5px] font-semibold transition-opacity hover:opacity-85" :style="l.url ? { border: `2px solid ${theme.accent}`, color: theme.accent } : { background: theme.accent, color: '#fff' }">{{ l.url ? "Profile" : "View details" }} <ArrowUpRight :size="15" /></a>
                  <a v-if="!l.url && !l.profile" :href="search(l.name)" target="_blank" rel="noreferrer noopener" title="No page of its own found: opens a web search" class="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-full px-4 text-[13.5px] font-semibold" :style="{ border: `2px solid ${theme.accent}`, color: theme.accent }">Search the web <ArrowUpRight :size="15" /></a>
                </div>
              </li>
            </ol>
            <div class="h-10" />
          </section>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.dir-enter-active,
.dir-leave-active {
  transition: opacity 0.2s ease;
}
.dir-enter-from,
.dir-leave-to {
  opacity: 0;
}
</style>
