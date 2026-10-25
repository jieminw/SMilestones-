<script setup lang="ts">
import { computed } from "vue";
import { CHAPTERS, QUESTIONS, type PageSpec } from "@/data/guideBook";
import { allInPrice, HOTEL_NAMES, HOTEL_PRICES, RESOURCES, search } from "@/data/weddingResources";
import { fmt } from "@/domain/money";
import { LISTINGS } from "@/data/directory";
import { isRestaurant, topPicks, type Category } from "@/domain/directory";
import { directory } from "@/stores/guide";
import { cx } from "@/lib/cx";

/**
 * One page of the guide, in wine red, warm dark blue and light blue, set like a fine-dining menu. Every inside page
 * uses the same template: a framed card on light-blue paper, a wine-red chapter label, a thin spaced title, a short
 * rule, then centred entries divided by hairlines and one underlined link at the foot. Only the covers are dark.
 * On the desktop book every page is a fixed 500 by 667 sheet, so `compact` trims long notes. On a phone the page flows.
 */
const props = defineProps<{ page: PageSpec; no: number; side: "left" | "right" | "single"; compact: boolean }>();
const emit = defineEmits<{ jump: [page: number] }>();

const group = (id: string) => RESOURCES.find((g) => g.id === id)!;
const first = (s: string) => (s.match(/^.*?[.!?](\s|$)/)?.[0] ?? s).trim();
const money = (n: number) => fmt(n * 100);
const SHORT: Record<string, string> = { "Grand Copthorne Waterfront": "Grand Copthorne", "Holiday Inn Singapore Atrium": "Holiday Inn Atrium", "Mandarin Oriental, Singapore": "Mandarin Oriental" };
const shortName = (n: string) => SHORT[n] ?? n.replace(" Singapore", "");
const hotelUrl = (name: string) => RESOURCES.find((g) => g.id === "venues")!.items.find((i) => i.name === name)?.url;
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

const chap = computed(() => {
  const p = props.page;
  if (p.kind === "hotels") return 1;
  if (p.kind === "steps" || p.kind === "questions") return 7;
  if (p.kind === "links") return 8;
  if (p.kind === "opener" || p.kind === "tips" || p.kind === "list" || p.kind === "top") return p.chapter;
  return 0;
});
const continued = computed(() => {
  const p = props.page;
  return p.kind === "hotels" || p.kind === "questions" || p.kind === "tips" || ((p.kind === "list" || p.kind === "top") && !!p.continued);
});
const kicker = computed(() => (props.page.kind === "contents" ? "Contents" : chap.value === 8 ? "The last word" : `Chapter ${ROMAN[chap.value - 1]}${continued.value ? ", continued" : ""}`));
const running = computed(() => (props.page.kind === "contents" ? "Contents" : chap.value ? CHAPTERS[chap.value - 1].title : ""));

const picks = (c: Category) => topPicks(LISTINGS[c], 6);
const countOf = (c: Category) => (c === "hotel" ? LISTINGS.hotel.filter((l) => !isRestaurant(l)).length : LISTINGS[c].length);
const NOUN: Record<Category, string> = { hotel: "hotels", venue: "small venues", photo: "photographers", gown: "gown boutiques" };

const title = computed(() => {
  const p = props.page;
  if (p.kind === "contents") return "In this guide";
  if (p.kind === "hotels") return "Price per table";
  if (p.kind === "steps") return "The order to plan in";
  if (p.kind === "questions") return "Ask every vendor";
  if (p.kind === "links") return "Links and fine print";
  if (p.kind === "opener" || p.kind === "top" || p.kind === "list" || p.kind === "tips") return p.title;
  return "";
});
const intro = computed(() => {
  const p = props.page;
  if (p.kind === "contents") return "Begin with where to hold it. Turn the page, or choose a chapter.";
  if (p.kind === "hotels") return "Starting prices for a table of ten.";
  if (p.kind === "steps") return "If you have never planned a wedding, do these in this order.";
  if (p.kind === "questions") return "Eight questions for any venue or supplier. Get every answer in writing.";
  if (p.kind === "opener" || p.kind === "top") return p.intro;
  if (p.kind === "list") return p.intro ?? "";
  return "";
});

/** The photo at the top of a page, if it has one, and where to centre the crop so faces stay in the band. */
const PHOTOS = {
  table: ["/images/banquet-table.jpg", "50% 55%"],
  chairs: ["/images/rustic-table.jpg", "50% 45%"],
  palm: ["/images/palm-couple.jpg", "50% 46%"],
  hands: ["/images/rings-hands.jpg", "40% 50%"],
  veil: ["/images/veil-beach.jpg", "50% 31%"],
  petals: ["/images/petals-kiss.jpg", "50% 38%"],
  trip: ["/images/trip.jpg", "50% 50%"],
} as const;
const photo = computed<readonly [string, string] | undefined>(() => {
  const p = props.page;
  if (p.kind === "opener") return p.chapter === 1 ? PHOTOS.table : p.chapter === 2 ? PHOTOS.chairs : undefined;
  if (p.kind === "top") return p.category === "photo" ? PHOTOS.palm : p.category === "gown" ? PHOTOS.hands : undefined;
  if (p.kind === "tips") return p.chapter === 3 ? PHOTOS.petals : p.chapter === 4 ? PHOTOS.veil : undefined;
  if (p.kind === "list") return p.image ? PHOTOS.trip : undefined;
  return undefined;
});

const dark = computed(() => props.page.kind === "cover" || props.page.kind === "back");
const fold = computed(() => (props.side === "left" ? "right-0 bg-gradient-to-l" : "left-0 bg-gradient-to-r"));

const NAME = "text-[11.5px] leading-snug font-medium tracking-[0.14em] uppercase";
const SUB = "mt-0.5 text-[11px] leading-snug text-[#48767c]";
const LINK = "mx-auto cursor-pointer text-[9.5px] tracking-[0.3em] text-[#06606a] uppercase underline decoration-[#06606a]/40 underline-offset-4 hover:decoration-[#06606a]";
const BTN = "mx-auto mt-auto flex w-full cursor-pointer items-center justify-center gap-2 bg-[#06606a] px-4 py-2.5 text-[10px] font-medium tracking-[0.3em] text-[#f2fafa] uppercase transition-colors hover:bg-[#06363c]";
const ROW = "border-t border-[#06606a]/15 py-2 text-center first:border-t-0";
</script>

<template>
  <article :class="cx('relative flex h-full flex-col overflow-hidden', dark ? 'bg-[#06606a] text-[#f2fafa]' : 'bg-[#e8f6f6] text-[#06363c]', page.kind === 'back' && 'bg-[#06363c]', compact ? 'px-9 pt-9 pb-5' : 'px-5 pt-7 pb-5')">
    <!-- the fold: a soft shadow along the spine -->
    <span v-if="side !== 'single'" :class="cx('pointer-events-none absolute inset-y-0 z-20 w-8 to-transparent', fold, dark ? 'from-black/40' : 'from-black/12')" />

    <!-- cover -->
    <div v-if="page.kind === 'cover'" class="relative z-10 flex min-h-0 flex-1 flex-col">
      <img src="/images/wedding.jpg" alt="" class="absolute -inset-x-9 -top-9 h-[60%] w-[calc(100%+72px)] max-w-none object-cover" />
      <div class="absolute -inset-x-9 -top-9 h-[60%] bg-gradient-to-b from-transparent via-[#06606a]/35 to-[#06606a]" />
      <span class="pointer-events-none absolute -inset-x-4 -top-4 -bottom-1 border border-[#f2fafa]/25" />
      <div class="relative mt-auto text-center">
        <p class="text-[9.5px] tracking-[0.55em] text-[#f2fafa]/65 uppercase">SMilestones</p>
        <h2 class="mt-5 text-[30px] leading-[1.35] font-extralight tracking-[0.22em] uppercase">Getting married<br />in Singapore</h2>
        <div class="mx-auto mt-5 h-px w-12 bg-[#f2fafa]/60" />
        <p class="mx-auto mt-5 max-w-[30ch] text-[11.5px] leading-relaxed tracking-[0.04em] text-[#f2fafa]/70">A guide for couples planning for the first time: where to hold it, who to book, and what to ask.</p>
        <p class="mt-8 text-[9px] tracking-[0.45em] text-[#f2fafa]/45 uppercase">The couples' guide · 2026</p>
      </div>
    </div>

    <!-- back cover -->
    <div v-else-if="page.kind === 'back'" class="relative z-10 m-auto text-center">
      <div class="mx-auto h-px w-10 bg-[#f2fafa]/50" />
      <p class="mt-6 text-[13px] font-light tracking-[0.5em] uppercase">SMilestones</p>
      <p class="mx-auto mt-5 max-w-[26ch] text-[11px] leading-relaxed tracking-[0.04em] text-[#f2fafa]/55">Save enough for one milestone and the next one opens.</p>
      <div class="mx-auto mt-6 h-px w-10 bg-[#f2fafa]/50" />
    </div>

    <!-- every inside page: the same framed card -->
    <template v-else>
      <div class="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden border border-[#06606a]/60 bg-[#f5f9fc] px-6 pt-6 pb-4 outline outline-1 outline-offset-[5px] outline-[#06606a]/30">
        <img v-if="photo" :src="photo[0]" alt="" class="-mx-6 -mt-6 mb-4 max-w-none object-cover" :class="compact ? 'h-[72px]' : 'h-[110px]'" :style="{ width: 'calc(100% + 48px)', objectPosition: photo[1] }" />

        <p class="text-center text-[9.5px] tracking-[0.5em] text-[#06606a] uppercase">{{ kicker }}</p>
        <h2 class="mt-2.5 text-center text-[19px] leading-[1.3] font-extralight tracking-[0.2em] uppercase">{{ title }}</h2>
        <div class="mx-auto mt-3 h-px w-10 bg-[#06606a]" />
        <p v-if="intro" class="mx-auto mt-3 max-w-[38ch] text-center text-[11px] leading-relaxed text-[#48767c] italic">{{ intro }}</p>

        <!-- contents -->
        <ol v-if="page.kind === 'contents'" class="mt-3">
          <li v-for="c in CHAPTERS" :key="c.n" :class="ROW">
            <button type="button" class="group w-full cursor-pointer" @click="emit('jump', c.page)">
              <span :class="cx(NAME, 'block underline-offset-4 group-hover:underline group-hover:decoration-[#06606a]')">{{ c.title }}</span>
              <span :class="cx(SUB, 'block')">{{ c.blurb }}</span>
            </button>
          </li>
        </ol>

        <!-- chapter opener -->
        <dl v-else-if="page.kind === 'opener'" class="mt-3">
          <div v-for="f in page.facts" :key="f.h" :class="ROW">
            <dt :class="NAME">{{ f.h }}</dt>
            <dd :class="SUB">{{ f.b }}</dd>
          </div>
        </dl>

        <!-- hotels: price per table -->
        <template v-else-if="page.kind === 'hotels'">
          <ul class="mt-3">
            <li v-for="n in HOTEL_NAMES" :key="n" :class="cx(ROW, compact && 'py-[5px]')">
              <p :class="NAME">{{ shortName(n) }}</p>
              <p :class="SUB">
                {{ money(HOTEL_PRICES[n].perTable) }}{{ HOTEL_PRICES[n].basis === "++" ? "++" : " nett" }} · min {{ HOTEL_PRICES[n].minTables }} tables · {{ money(allInPrice(HOTEL_PRICES[n])) }} all in
                <a v-if="hotelUrl(n)" :href="hotelUrl(n)" target="_blank" rel="noreferrer noopener" :aria-label="`Official wedding page of ${n}`" class="ml-1 text-[#06606a] underline decoration-[#06606a]/40 underline-offset-4 hover:decoration-[#06606a]">Enquire</a>
              </p>
            </li>
          </ul>
          <p class="mx-auto mt-2 mb-3 max-w-[40ch] text-center text-[10px] leading-relaxed text-[#7a86a0]">All in adds 10% service charge and 9% GST. Min is the fewest tables sold. Vows.sg, March 2026. Not quotes.</p>
          <button type="button" :class="BTN" @click="directory.show('hotel')">See all {{ countOf("hotel") }} hotels <span aria-hidden="true">→</span></button>
        </template>

        <!-- top picks from the directory -->
        <template v-else-if="page.kind === 'top'">
          <ul class="mt-3 mb-4">
            <li v-for="l in picks(page.category)" :key="l.name" :class="ROW">
              <p :class="NAME">{{ l.name }}</p>
              <p :class="cx(SUB, compact && 'line-clamp-1')">{{ l.type }} · {{ l.priceNote }}</p>
            </li>
          </ul>
          <button type="button" :class="BTN" @click="directory.show(page.category)">See all {{ countOf(page.category) }} {{ NOUN[page.category] }} <span aria-hidden="true">→</span></button>
        </template>

        <!-- a list from the resources -->
        <ul v-else-if="page.kind === 'list'" class="mt-3">
          <li v-for="r in group(page.group).items" :key="r.name" :class="cx(ROW, compact && 'py-[5px]')">
            <a :href="r.url ?? search(r.name)" target="_blank" rel="noreferrer noopener" class="group block">
              <span :class="cx(NAME, 'underline-offset-4 group-hover:underline group-hover:decoration-[#06606a]')">{{ r.name }}<span v-if="r.tag" class="ml-2 text-[10.5px] tracking-[0.06em] text-[#06606a]">{{ r.tag }}</span></span>
              <span :class="cx(SUB, 'block', compact && 'line-clamp-1')">{{ compact ? first(r.note) : r.note }}</span>
            </a>
          </li>
        </ul>

        <!-- steps -->
        <ol v-else-if="page.kind === 'steps'" class="mt-3">
          <li v-for="(s, i) in group('basics').items" :key="s.name" :class="ROW">
            <p class="text-[10px] tracking-[0.1em] text-[#06606a]">{{ ROMAN[i] }}</p>
            <p :class="NAME">{{ s.name.replace(/^\d\.\s*/, "") }}</p>
            <p :class="SUB">{{ compact ? first(s.note) : s.note }}</p>
            <a v-if="s.url" :href="s.url" target="_blank" rel="noreferrer noopener" :class="cx(LINK, 'mt-1 inline-block')">{{ s.cta ?? "Open" }}</a>
          </li>
        </ol>

        <!-- questions -->
        <ul v-else-if="page.kind === 'questions'" class="mt-3">
          <li v-for="q in QUESTIONS" :key="q" :class="cx(ROW, 'text-[11.5px] leading-snug')">{{ q }}</li>
        </ul>

        <!-- tips -->
        <template v-else-if="page.kind === 'tips'">
          <ol class="mt-3">
            <li v-for="(t, i) in page.tips" :key="t" :class="ROW">
              <p class="text-[10px] tracking-[0.1em] text-[#06606a]">{{ ROMAN[i] }}</p>
              <p class="text-[11.5px] leading-snug">{{ t }}</p>
            </li>
          </ol>
          <div class="mt-auto pt-3 text-center">
            <p class="text-[9px] tracking-[0.4em] text-[#7a86a0] uppercase">Further reading</p>
            <ul class="mt-2 flex flex-col items-center gap-1">
              <li v-for="g in group(page.group).guides ?? []" :key="g.url">
                <a :href="g.url" target="_blank" rel="noreferrer noopener" class="text-[10.5px] leading-snug text-[#06606a] underline decoration-[#06606a]/40 underline-offset-4 hover:decoration-[#06606a]">{{ g.label }}</a>
              </li>
            </ul>
          </div>
        </template>

        <!-- links and fine print -->
        <template v-else-if="page.kind === 'links'">
          <div :class="cx(ROW, 'mt-3')">
            <p class="text-[9px] tracking-[0.4em] text-[#7a86a0] uppercase">Official</p>
            <a :href="group('basics').items[3].url" target="_blank" rel="noreferrer noopener" class="group mt-1.5 block">
              <span :class="cx(NAME, 'underline decoration-[#06606a]/40 underline-offset-4 group-hover:decoration-[#06606a]')">Our Marriage Journey</span>
              <span :class="cx(SUB, 'block')">The Registry of Marriages (MSF). Apply online, then book your solemnisation.</span>
            </a>
          </div>
          <div :class="ROW">
            <p class="text-[9px] tracking-[0.4em] text-[#7a86a0] uppercase">Reading the prices</p>
            <p :class="cx(SUB, 'mt-1.5')">++ means before 10% service charge and 9% GST. Nett means all in.</p>
            <p :class="SUB">Prices come from published guides and hotel pages dated 2024 to 2026. They are starting points, not quotes.</p>
            <p :class="SUB">Nothing here is an endorsement. Read recent reviews, ask for written quotes and check availability before you book.</p>
          </div>
        </template>
      </div>

      <!-- folio -->
      <footer class="mt-2 flex items-center justify-center gap-3 text-[8.5px] tracking-[0.35em] text-[#7a86a0] uppercase">
        <span>{{ running }}</span><span class="h-px w-4 bg-[#06606a]/50" /><span class="tabular-nums">{{ no }}</span>
      </footer>
    </template>
  </article>
</template>
