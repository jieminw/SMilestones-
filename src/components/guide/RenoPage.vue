<script setup lang="ts">
import { computed } from "vue";
import { COST_TABLE, PAGE_OF, RENO_CHAPTERS, type RenoPageSpec } from "@/data/renoGuide";
import { RENO_LISTINGS } from "@/data/renoDirectory";
import { RENO_SOURCES, homeNoun } from "@/domain/renoBudget";
import { topPicks, type RenoCategory } from "@/domain/directory";
import { renoDirectory, renoGuide } from "@/stores/guide";
import { guideState, reopenPlanning } from "@/stores/renoGuideState";
import { cx } from "@/lib/cx";
import MoneySplit from "./reno/MoneySplit.vue";
import PlanSummary from "./reno/PlanSummary.vue";
import PriorityResult from "./reno/PriorityResult.vue";
import WallPlan from "./reno/WallPlan.vue";
import QuoteFlags from "./reno/QuoteFlags.vue";
import ExampleFlats from "./reno/ExampleFlats.vue";

/**
 * One page of the renovation guide, set like an interior-design monograph. Tinted paper with no white, a running head
 * and folio, big serif titles with one italic word, hairline rules, and photos cropped as arches and circles. Chapter
 * openers and the covers are deep berry; everything else is blush paper. This is nothing like the wedding guide's menu.
 * On the desktop book every page is a fixed 500 by 667 sheet, so `compact` trims long notes. On a phone the page flows.
 */
const props = defineProps<{ page: RenoPageSpec; no: number; side: "left" | "right" | "single"; compact: boolean }>();
const emit = defineEmits<{ jump: [page: number] }>();

const short = (n: number) => `$${Math.round(n / 1000)}k`;
const first = (s: string) => (s.match(/^.*?[.!?](\s|$)/)?.[0] ?? s).trim();
const pad = (n: number) => String(n).padStart(2, "0");

const chap = computed(() => {
  const p = props.page;
  if (p.kind === "costs") return 1;
  if (p.kind === "links") return 7;
  if ("chapter" in p) return p.chapter;
  return 0;
});
const running = computed(() => (props.page.kind === "contents" ? "Contents" : chap.value ? RENO_CHAPTERS[chap.value - 1].title : ""));
const title = computed(() => {
  const p = props.page;
  if (p.kind === "contents") return "In this guide";
  if (p.kind === "costs") return "What a flat costs";
  if (p.kind === "links") return "Links and fine print";
  if ("title" in p) return p.title;
  return "";
});
// the last word of every title is set in italics
const words = computed(() => title.value.replace(/\?$/, "").split(" "));
const lead = computed(() => words.value.slice(0, -1).join(" "));
const tail = computed(() => words.value[words.value.length - 1] + (title.value.endsWith("?") ? "?" : ""));
const intro = computed(() => {
  const p = props.page;
  if (p.kind === "contents") return "Start with what it costs. Turn the page, or jump to a chapter.";
  if (p.kind === "costs") return "";
  if ("intro" in p) return p.intro;
  return "";
});

const PHOTOS: Record<string, [string, string]> = {
  keys: ["/images/keys.jpg", "60% 55%"],
  plans: ["/images/plans.jpg", "40% 60%"],
  "living-bright": ["/images/living-bright.jpg", "40% 55%"],
  "living-warm": ["/images/living-warm.jpg", "50% 60%"],
  bedroom: ["/images/bedroom.jpg", "65% 55%"],
  kitchen: ["/images/kitchen.jpg", "50% 45%"],
  interior: ["/images/interior.jpg", "50% 50%"],
  reno: ["/images/reno.jpg", "50% 50%"],
  "dining-room": ["/images/dining-room.jpg", "50% 55%"],
  living: ["/images/living.jpg", "50% 55%"],
  swatches: ["/images/swatches.jpg", "40% 55%"],
  "paint-swatches": ["/images/paint-swatches.jpg", "50% 50%"],
  "wall-hack": ["/images/wall-hack.jpg", "50% 45%"],
  "room-reno": ["/images/room-reno.jpg", "50% 55%"],
  saw: ["/images/saw.jpg", "35% 40%"],
  bathtub: ["/images/bathtub.jpg", "40% 55%"],
  sink: ["/images/sink.jpg", "50% 55%"],
  "tiles-sage": ["/images/tiles-sage.jpg", "50% 50%"],
  "fabric-samples": ["/images/fabric-samples.jpg", "50% 50%"],
  "showroom-living": ["/images/showroom-living.jpg", "40% 60%"],
  "bedroom-closet": ["/images/bedroom-closet.jpg", "60% 55%"],
  "kitchen-cabinet": ["/images/kitchen-cabinet.jpg", "50% 55%"],
  "kitchen-fridge": ["/images/kitchen-fridge.jpg", "40% 55%"],
  "kitchen-teal": ["/images/kitchen-teal.jpg", "50% 50%"],
  "kitchen-reno": ["/images/kitchen-reno.jpg", "40% 55%"],
};
// pages with no photo of their own get one that fits what they say
const BY_PAGE: Record<number, string> = { 1: "swatches", 3: "wall-hack", 9: "kitchen-reno", 13: "paint-swatches", 14: "showroom-living", 16: "kitchen-fridge", 18: "saw", 19: "plans", 20: "keys" };
const photo = computed(() => {
  const p = props.page;
  return PHOTOS["image" in p && p.image ? p.image : (BY_PAGE[props.no] ?? "")];
});
// Large photos that fill whatever is left of a page, running off its outer edge. Only pages with room for one have one.
const FILL: Record<number, string[]> = {
  3: ["room-reno"],
  13: ["wall-hack", "paint-swatches"],
  15: ["showroom-living", "bedroom-closet"],
  16: ["sink", "bathtub"],
  17: ["kitchen-cabinet", "kitchen-teal"],
  19: ["plans"],
  20: ["keys"],
};
const fill = computed(() => (FILL[props.no] ?? []).map((k) => PHOTOS[k]).filter(Boolean));
// it bleeds off the outer edge of the page and curls round its inner top corner
const fillEdge = computed(() => (props.side === "left" ? "-ml-9 rounded-tr-[130px]" : props.side === "right" ? "-mr-9 rounded-tl-[130px]" : "-mx-9 rounded-t-[70px]"));

const NOUN: Record<RenoCategory, string> = { firm: "firms", furniture: "furniture stores" };
const picks = (c: RenoCategory) => topPicks(RENO_LISTINGS[c], 6);

const mine = computed(() => guideState.onboarded);
const changeAnswers = () => {
  reopenPlanning();
  renoGuide.close();
  window.scrollTo({ top: 0, behavior: "smooth" });
};

const dark = computed(() => props.page.kind === "cover" || props.page.kind === "back" || props.page.kind === "opener");
const fold = computed(() => (props.side === "left" ? "right-0 bg-gradient-to-l" : "left-0 bg-gradient-to-r"));
// two tints of blush, so a spread has a left and a right
const paper = computed(() => {
  if (props.page.kind === "back") return "#fca47c";
  if (dark.value) return "#06363c";
  return props.no % 2 ? "#d9efee" : "#d0eaea";
});
const GRAIN = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.5'/%3E%3C/svg%3E\")";

const CAPS = "text-[10px] font-medium tracking-[0.26em] uppercase";
const NUM = "shrink-0 font-serif text-[15px] italic leading-none text-[#097c87]";
const NAME = "font-serif text-[17px] leading-[1.15] font-medium";
const SUB = "text-[12px] leading-[1.45] text-[#48767c]";
const BTN = "inline-flex cursor-pointer items-center gap-3 self-start bg-[#06363c] px-5 py-3 text-[10.5px] font-medium tracking-[0.22em] text-[#e4f4f3] uppercase transition-colors hover:bg-[#097c87]";
const RULE = "border-t border-[#06363c]/25";
</script>

<template>
  <article :class="cx('relative flex h-full flex-col overflow-hidden', dark ? 'text-[#e4f4f3]' : 'text-[#06363c]')" :style="{ background: paper }">
    <!-- a little grain, so the paper is not flat -->
    <span class="pointer-events-none absolute inset-0 z-0 opacity-[0.10] mix-blend-multiply" :style="{ backgroundImage: GRAIN }" />
    <!-- the fold: a soft shadow along the spine -->
    <span v-if="side !== 'single'" :class="cx('pointer-events-none absolute inset-y-0 z-30 w-8 to-transparent', fold, dark ? 'from-black/35' : 'from-black/12')" />

    <!-- cover -->
    <template v-if="page.kind === 'cover'">
      <span class="pointer-events-none absolute inset-4 z-10 border border-[#fca47c]/50" />
      <div class="relative z-10 flex flex-1 flex-col items-center px-10 pt-11 pb-10 text-center">
        <p :class="cx(CAPS, 'text-[#fca47c]')">The renovation guide · 2026</p>
        <div class="relative mt-6 h-[300px] w-[236px] shrink-0 overflow-hidden rounded-t-full">
          <img src="/images/living-warm.jpg" alt="" class="size-full object-cover" style="object-position: 50% 60%" />
          <span class="absolute inset-0 bg-[#06363c]/15" />
        </div>
        <h2 class="font-serif mt-7 text-[40px] leading-[1.02] font-medium tracking-[-0.01em]">Renovating<br />your <em class="text-[#fca47c]">first</em> home</h2>
        <p v-if="mine" :class="cx(CAPS, 'mt-4 text-[#fca47c]')">Made for your {{ guideState.rooms }}-room {{ homeNoun(guideState.home) }}</p>
        <p v-else class="font-serif mt-4 max-w-[30ch] text-[14px] leading-snug italic text-[#e4f4f3]/80">What it costs, who to hire and what HDB expects.</p>
        <p :class="cx(CAPS, 'mt-auto text-[9px] text-[#e4f4f3]/60')">SMilestones</p>
      </div>
    </template>

    <!-- back cover -->
    <div v-else-if="page.kind === 'back'" class="relative z-10 flex flex-1 flex-col items-center justify-center px-12 text-center text-[#06363c]">
      <div class="relative size-[150px] overflow-hidden rounded-full"><img src="/images/living-bright.jpg" alt="" class="size-full object-cover" style="object-position: 40% 55%" /><span class="absolute inset-0 bg-[#06363c]/10" /></div>
      <p class="font-serif mt-9 text-[32px] leading-[1.08] font-medium">Save for one milestone.<br /><em>The next one opens.</em></p>
      <span class="mt-6 h-px w-12 bg-[#06363c]/60" />
      <p class="mt-5 max-w-[30ch] text-[12.5px] leading-relaxed text-[#06363c]/80">Plan the works and add your own milestones when you set up your renovation pot.</p>
      <p :class="cx(CAPS, 'mt-12 text-[9px]')">SMilestones</p>
    </div>

    <!-- every inside page -->
    <template v-else>
      <!-- running head -->
      <header :class="cx('relative z-10 flex shrink-0 items-center justify-between gap-4 px-9 pt-7 text-[9px] font-medium tracking-[0.28em] uppercase', dark ? 'text-[#fca47c]' : 'text-[#48767c]')">
        <span class="shrink-0">SMilestones</span><span class="truncate">{{ running }}</span>
      </header>

      <!-- chapter openers: deep berry, an arched photo and the key points -->
      <template v-if="page.kind === 'opener'">
        <div class="relative z-10 flex shrink-0 gap-5 px-9 pt-5">
          <div class="flex min-w-0 flex-1 flex-col">
            <p :class="cx(CAPS, 'text-[#fca47c]')">Chapter</p>
            <p class="font-serif -mt-1 text-[84px] leading-[0.95] font-light text-[#fca47c]">{{ pad(chap) }}</p>
            <h2 class="font-serif mt-3 text-[28px] leading-[1.05] font-medium"><template v-if="lead">{{ lead + " " }}</template><em class="text-[#fca47c]">{{ tail }}</em></h2>
          </div>
          <div v-if="photo" class="relative w-[44%] shrink-0 overflow-hidden rounded-t-full" :class="compact ? 'h-[210px]' : 'h-[190px]'">
            <img :src="photo[0]" alt="" class="size-full object-cover" :style="{ objectPosition: photo[1] }" /><span class="absolute inset-0 bg-[#06363c]/15" />
          </div>
        </div>
        <div data-body class="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden px-9 pt-4">
          <p class="font-serif mb-2 line-clamp-2 text-[13px] leading-snug italic text-[#e4f4f3]/80">{{ intro }}</p>
          <ol>
            <li v-for="(f, i) in page.facts" :key="f.h" class="flex gap-4 border-t border-[#fca47c]/30 py-2">
              <span class="w-5 shrink-0 font-serif text-[14px] italic text-[#fca47c]">{{ pad(i + 1) }}</span>
              <div class="min-w-0"><p class="text-[12.5px] leading-snug font-semibold">{{ f.h }}</p><p :class="cx('text-[11.5px] leading-[1.4] text-[#e4f4f3]/70', compact && 'line-clamp-2')">{{ f.b }}</p></div>
            </li>
          </ol>
        </div>
      </template>

      <!-- every other page: title (and a round photo), then the content on blush paper -->
      <template v-else>
        <div class="relative z-10 flex shrink-0 items-start justify-between gap-4 px-9 pt-6">
          <div class="min-w-0">
            <p :class="cx(CAPS, 'flex items-center gap-3 text-[#097c87]')"><span class="h-px w-7 bg-[#097c87]" />{{ chap ? `Chapter ${pad(chap)}` : "Contents" }}</p>
            <h2 class="font-serif mt-3 text-[31px] leading-[1.03] font-medium tracking-[-0.01em]"><template v-if="lead">{{ lead + " " }}</template><em class="text-[#097c87]">{{ tail }}</em></h2>
            <p v-if="intro" class="font-serif mt-2.5 max-w-[34ch] text-[13.5px] leading-snug italic text-[#48767c]">{{ intro }}</p>
          </div>
        </div>

        <div data-body class="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden px-9 pt-4">
          <!-- contents -->
          <ol v-if="page.kind === 'contents'" :class="RULE">
            <li v-for="c in RENO_CHAPTERS" :key="c.n" :class="cx(RULE, 'first:border-t-0')">
              <button type="button" class="group grid w-full cursor-pointer grid-cols-[38px_minmax(0,1fr)_auto] items-baseline gap-3 py-2.5 text-left" @click="emit('jump', c.page)">
                <span class="font-serif text-[22px] leading-none font-light text-[#097c87]">{{ pad(c.n) }}</span>
                <span class="min-w-0"><span :class="cx(NAME, 'block group-hover:text-[#097c87]')">{{ c.title }}</span><span :class="cx(SUB, 'block')">{{ c.blurb }}</span></span>
                <span class="font-serif text-[13px] italic text-[#48767c]">{{ c.page }}</span>
              </button>
            </li>
          </ol>

          <!-- what a flat costs: the numbers, large -->
          <template v-else-if="page.kind === 'costs'">
            <ul>
              <li v-for="c in COST_TABLE" :key="c.flat" :class="cx(RULE, 'flex items-end justify-between gap-4 py-2', mine && c.flat === `${guideState.rooms}-room` && '-mx-3 bg-[#06363c]/[0.07] px-3')">
                <div><p class="font-serif text-[30px] leading-none font-light">{{ c.flat }}</p><p v-if="mine && c.flat === `${guideState.rooms}-room`" :class="cx(CAPS, 'mt-2 text-[9px] text-[#097c87]')">Your flat</p></div>
                <div class="text-right">
                  <p class="flex items-baseline justify-end gap-3"><span class="text-[9.5px] font-medium tracking-[0.2em] text-[#48767c] uppercase">New BTO</span><span class="font-serif text-[21px] leading-tight">{{ short(c.bto[0]) }} to {{ short(c.bto[1]) }}</span></p>
                  <p class="mt-0.5 flex items-baseline justify-end gap-3"><span class="text-[9.5px] font-medium tracking-[0.2em] text-[#48767c] uppercase">Resale</span><span class="font-serif text-[17px] leading-tight text-[#06363c]/80">{{ short(c.resale[0]) }}{{ c.resale[1] ? ` to ${short(c.resale[1])}` : " and up" }}</span></p>
                </div>
              </li>
              <li :class="RULE" />
            </ul>
            <p :class="cx(SUB, 'mt-1 text-[11px]')">For the works only: furniture and appliances are extra. Terris, August 2026. Other guides give a lower or higher middle, so treat these as a starting point, not a quote.</p>
            <ul class="mt-2 flex flex-col gap-0.5">
              <li v-for="s in RENO_SOURCES.slice(1, 3)" :key="s.url"><a :href="s.url" target="_blank" rel="noreferrer noopener" class="text-[11.5px] font-medium text-[#097c87] underline underline-offset-4 hover:text-[#06363c]">{{ s.label }}</a></li>
            </ul>
            <RouterLink to="/pots/new?kind=renovation&from=renovation" :class="cx(BTN, 'mt-3')">Plan your budget <span aria-hidden="true">→</span></RouterLink>
          </template>

          <!-- top picks -->
          <template v-else-if="page.kind === 'top'">
            <ol :class="RULE">
              <li v-for="(l, i) in picks(page.category)" :key="l.name" :class="cx(RULE, 'grid grid-cols-[30px_minmax(0,1fr)] items-baseline py-2 first:border-t-0')">
                <span :class="NUM">{{ pad(i + 1) }}</span>
                <div class="min-w-0"><p :class="NAME">{{ l.name }}</p><p :class="cx(SUB, compact && 'line-clamp-1')">{{ l.type }} · {{ l.priceNote }}</p></div>
              </li>
            </ol>
            <button type="button" :class="cx(BTN, 'mt-5')" @click="renoDirectory.show(page.category)">See all {{ RENO_LISTINGS[page.category].length }} {{ NOUN[page.category] }} <span aria-hidden="true">→</span></button>
          </template>

          <!-- stores -->
          <ol v-else-if="page.kind === 'list'" :class="RULE">
            <li v-for="(r, i) in page.items" :key="r.name" :class="cx(RULE, 'first:border-t-0')">
              <a :href="r.url" target="_blank" rel="noreferrer noopener" class="group grid grid-cols-[30px_minmax(0,1fr)] items-baseline py-3">
                <span :class="NUM">{{ pad(i + 1) }}</span>
                <span class="min-w-0"><span :class="cx(NAME, 'underline decoration-[#097c87]/40 underline-offset-4 group-hover:decoration-[#097c87]')">{{ r.name }}</span><span v-if="r.tag" class="ml-2 text-[9.5px] font-medium tracking-[0.18em] text-[#097c87] uppercase">{{ r.tag }}</span><span :class="cx(SUB, 'block', compact && 'line-clamp-2')">{{ compact ? first(r.note) : r.note }}</span></span>
              </a>
            </li>
          </ol>

          <!-- the works, in order -->
          <ol v-else-if="page.kind === 'steps'" :class="RULE">
            <li v-for="(s, i) in page.steps" :key="s.h" :class="cx(RULE, 'grid grid-cols-[30px_minmax(0,1fr)] items-baseline py-[7px] first:border-t-0')">
              <span :class="NUM">{{ pad(i + 1) }}</span>
              <div class="min-w-0"><p class="text-[13px] leading-snug font-semibold">{{ s.h }}</p><p :class="cx(SUB, compact && 'line-clamp-1')">{{ s.b }}</p></div>
            </li>
          </ol>

          <!-- questions -->
          <ol v-else-if="page.kind === 'questions'" :class="RULE">
            <li v-for="(q, i) in page.questions" :key="q" :class="cx(RULE, 'grid grid-cols-[30px_minmax(0,1fr)] items-baseline py-1.5 first:border-t-0')">
              <span :class="NUM">{{ pad(i + 1) }}</span><span class="text-[12.5px] leading-snug">{{ q }}</span>
            </li>
          </ol>

          <!-- tips -->
          <template v-else-if="page.kind === 'tips'">
            <ol :class="RULE">
              <li v-for="(t, i) in page.tips" :key="t" :class="cx(RULE, 'grid grid-cols-[30px_minmax(0,1fr)] items-baseline py-3 first:border-t-0')">
                <span :class="NUM">{{ pad(i + 1) }}</span><span class="text-[13px] leading-snug">{{ t }}</span>
              </li>
            </ol>
            <button v-if="page.chapter === 3" type="button" :class="cx(BTN, 'mt-5')" @click="emit('jump', PAGE_OF.links)">HDB's own pages <span aria-hidden="true">→</span></button>
          </template>

          <!-- the interactive pages -->
          <MoneySplit v-else-if="page.kind === 'split'" />
          <PlanSummary v-else-if="page.kind === 'plan'" @change="changeAnswers" />
          <PriorityResult v-else-if="page.kind === 'result'" :compact="compact" @back="changeAnswers" />
          <ExampleFlats v-else-if="page.kind === 'examples'" :compact="compact" />
          <QuoteFlags v-else-if="page.kind === 'flags'" />
          <WallPlan v-else-if="page.kind === 'walls'" @links="emit('jump', PAGE_OF.links)" />

          <!-- links and fine print -->
          <template v-else-if="page.kind === 'links'">
            <p :class="cx(CAPS, 'text-[#097c87]')">Official pages</p>
            <a href="https://go.gov.sg/hdb-reno" target="_blank" rel="noreferrer noopener" class="group mt-2 block">
              <span :class="cx(NAME, 'underline decoration-[#097c87]/50 decoration-2 underline-offset-4 group-hover:decoration-[#097c87]')">HDB: renovation guidelines →</span>
              <span :class="cx(SUB, 'block')">Permits, guidelines and examples of disallowed works.</span>
            </a>
            <a href="https://go.gov.sg/hdb-reno-contractors" target="_blank" rel="noreferrer noopener" class="group mt-3 block">
              <span :class="cx(NAME, 'underline decoration-[#097c87]/50 decoration-2 underline-offset-4 group-hover:decoration-[#097c87]')">HDB: renovation contractors →</span>
              <span :class="cx(SUB, 'block')">The Directory of Renovation Contractors, with an online lookup.</span>
            </a>
            <p :class="cx(CAPS, 'mt-6 text-[#097c87]')">Reading the prices</p>
            <p :class="cx(SUB, 'mt-2')">Costs come from 2026 guides and are for the works only. Furniture and appliances are extra.</p>
            <p :class="cx(SUB, 'mt-1.5')">Ratings and review counts are the ones Qanvast and the guides showed. We have not reviewed or visited any firm.</p>
            <p :class="cx(SUB, 'mt-1.5')">Nothing here is an endorsement. Ask for itemised quotes and check HDB's pages before you sign.</p>
          </template>

          <!-- the photo that fills the rest of the page -->
          <div v-if="fill.length" :class="cx('relative mt-4 flex min-h-[96px] flex-1 gap-2 overflow-hidden', fillEdge)">
            <div v-for="(g, i) in fill" :key="g[0]" :class="cx('relative min-w-0', i === 0 ? 'flex-[1.5]' : 'flex-1')"><img :src="g[0]" alt="" class="absolute inset-0 size-full object-cover" :style="{ objectPosition: g[1] }" /><span class="absolute inset-0 bg-[#06363c]/10" /></div>
          </div>
        </div>
      </template>

      <!-- folio -->
      <footer :class="cx('relative z-10 flex shrink-0 items-center justify-between px-9 pt-2 pb-6 text-[9px] font-medium tracking-[0.28em] uppercase', dark ? 'text-[#e4f4f3]/60' : 'text-[#48767c]')">
        <span>The renovation guide</span><span class="font-serif text-[14px] tracking-normal normal-case italic" :class="dark ? 'text-[#fca47c]' : 'text-[#097c87]'">{{ no }}</span>
      </footer>
    </template>
  </article>
</template>
