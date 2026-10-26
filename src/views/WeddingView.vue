<script setup lang="ts">
import { computed } from "vue";
import { ArrowRight, BookOpen, Plus, Pencil, Search } from "lucide-vue-next";
import { useApp } from "@/stores/app";
import { CHAPTERS } from "@/data/guideBook";
import { LISTINGS } from "@/data/directory";
import { isRestaurant, type Category } from "@/domain/directory";
import { directory, guide } from "@/stores/guide";
import Page from "@/layouts/Page.vue";
import GuideBook from "@/components/guide/GuideBook.vue";
import GuidePage from "@/components/guide/GuidePage.vue";
import WeddingDirectory from "@/components/guide/WeddingDirectory.vue";

/**
 * The Wedding page is the couples' guide: a large book cover to open, the chapters, and the directory of venues and
 * vendors. Planning lives on the wedding pot's setup page, and the milestones on the pot's page beside "Log contribution".
 * The strip near the top links to both, so adding or editing a milestone is one tap away.
 */
const app = useApp();

/** A photo behind each chapter tile, tinted with the guide's wine red and dark blue. */
const TILE_PHOTO = ["banquet-table", "rustic-table", "palm-couple", "veil-beach", "petals-kiss", "trip", "wedding", "rings-hands"];
const total = Object.values(LISTINGS).reduce((a, l) => a + l.length, 0);
const COVER = { kind: "cover" } as const;

const DIRECTORY: { id: Category; label: string; note: string; photo: string; pos: string; tone: string }[] = [
  { id: "hotel", label: "Hotels", note: "Ballrooms, with the price per table", photo: "banquet-table", pos: "50% 55%", tone: "#1d1e1f" },
  { id: "venue", label: "Small venues", note: "Restaurants and gardens for 20 to 60", photo: "rustic-table", pos: "50% 45%", tone: "#2f3132" },
  { id: "photo", label: "Photographers", note: "Compared by package price", photo: "palm-couple", pos: "50% 46%", tone: "#1d1e1f" },
  { id: "gown", label: "Wedding gowns", note: "Rental and bespoke boutiques", photo: "rings-hands", pos: "40% 50%", tone: "#2f3132" },
];
const countOf = (c: Category) => (c === "hotel" ? LISTINGS.hotel.filter((l) => !isRestaurant(l)).length : LISTINGS[c].length);

// the wedding pot, where milestones are added and edited
const draft = computed(() => app.state?.pots.find((p) => p.kind === "wedding" && p.status === "draft"));
const pot = computed(() => app.state?.pots.find((p) => p.kind === "wedding"));
// milestones are added and edited on the pot setup page, the same place the wedding is planned
const setup = computed(() => (draft.value ? `/pots/new?edit=${draft.value.id}&from=wedding` : "/pots/new?kind=wedding&from=wedding"));
const addLink = computed(() => `${setup.value}${setup.value.includes("?") ? "&" : "?"}milestone=add`);
const editLink = addLink;
</script>

<template>
  <Page wide>
    <!-- the book -->
    <section class="relative mb-6 grid grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] items-center gap-10 overflow-hidden bg-navy px-8 py-12 text-[#f1f1ef] md:px-14 md:py-16">
      <div class="relative z-10">
        <p class="text-[11px] tracking-[0.5em] text-[#e3c476] uppercase">The couples' guide</p>
        <h1 class="mt-5 text-[clamp(40px,5.4vw,76px)] leading-[1.12] font-extralight tracking-[0.12em] uppercase">Getting married in Singapore</h1>
        <div class="mt-6 h-px w-16 bg-terra" />
        <p class="mt-6 max-w-[46ch] text-[17px] leading-relaxed text-[#f1f1ef]/80">Planning a wedding for the first time? Start here. Browse {{ total }} hotels, venues, photographers, gowns and honeymoon spots with starting prices, plus the questions worth asking before you book anyone.</p>
        <div class="mt-9 flex flex-wrap gap-4">
          <button type="button" class="inline-flex h-14 cursor-pointer items-center gap-3 bg-[#f1f1ef] px-8 text-[14px] font-medium tracking-[0.25em] text-[#2b2b2b] uppercase transition-colors hover:bg-white" @click="guide.show(0)"><BookOpen :size="19" /> Open the guide</button>
          <button type="button" class="inline-flex h-14 cursor-pointer items-center gap-3 border border-[#f1f1ef]/60 px-8 text-[14px] font-medium tracking-[0.25em] uppercase transition-colors hover:bg-[#f1f1ef] hover:text-[#2b2b2b]" @click="directory.show('hotel')"><Search :size="18" /> Browse {{ total }} places</button>
        </div>
      </div>

      <!-- the real cover, large: it opens the book -->
      <button type="button" class="group relative mx-auto block h-[min(560px,70vw)] w-[min(420px,52vw)] cursor-pointer" aria-label="Open the couples' guide" @click="guide.show(0)">
        <span class="absolute inset-0 translate-x-3 translate-y-3 bg-black/35 blur-[2px]" />
        <span class="absolute top-0 left-0 block origin-top-left transition-transform duration-500 group-hover:-translate-y-1 group-hover:rotate-[-1.2deg]" style="width: 500px; height: 667px; transform: scale(0.84)">
          <span class="absolute inset-0 block overflow-hidden shadow-[0_30px_60px_-20px_rgba(0,0,0,0.7)]"><GuidePage :page="COVER" :no="0" side="single" :compact="true" /></span>
        </span>
      </button>
    </section>

    <!-- milestones: added and edited on the wedding pot -->
    <section class="mb-10 flex flex-wrap items-center justify-between gap-4 border border-terra/40 bg-surface px-6 py-5">
      <div>
        <p class="text-[10px] tracking-[0.4em] text-terra uppercase">Your wedding savings</p>
        <p class="mt-1.5 max-w-[60ch] text-[14.5px] leading-snug text-ink/80">
          {{ pot ? "Plan the day and add or edit your milestones on the pot setup page. Save enough for one and the next opens." : "Set up a wedding pot to plan the day and track it in milestones." }}
        </p>
      </div>
      <div class="flex flex-wrap gap-3">
        <RouterLink :to="addLink" class="inline-flex h-11 items-center gap-2 bg-terra px-5 text-[12px] font-medium tracking-[0.2em] text-[#2b2b2b] uppercase hover:bg-[#7a2234] hover:text-[#f1f1ef]"><Plus :size="15" /> Add a milestone</RouterLink>
        <RouterLink :to="editLink" class="inline-flex h-11 items-center gap-2 border border-ink/50 px-5 text-[12px] font-medium tracking-[0.2em] text-ink uppercase hover:bg-ink hover:text-[#2b2b2b]"><Pencil :size="14" /> Edit milestones</RouterLink>
        <RouterLink v-if="!pot" :to="setup" class="inline-flex h-11 items-center gap-2 border border-ink/50 px-5 text-[12px] font-medium tracking-[0.2em] text-ink uppercase hover:bg-ink hover:text-[#2b2b2b]">Set up the pot <ArrowRight :size="14" /></RouterLink>
      </div>
    </section>

    <!-- the chapters -->
    <section class="mb-12">
      <div class="mb-6 flex items-end justify-between gap-4 border-b border-ink/20 pb-4">
        <h2 class="text-[26px] font-extralight tracking-[0.22em] text-ink uppercase">Inside the guide</h2>
        <p class="hidden text-[13px] text-muted sm:block">Tap a chapter to open the book there</p>
      </div>
      <ol class="grid grid-cols-4 gap-4">
        <li v-for="c in CHAPTERS" :key="c.n">
          <button type="button" class="group relative block h-[250px] w-full cursor-pointer overflow-hidden bg-navy text-left text-[#f1f1ef]" @click="guide.show(c.page)">
            <img :src="`/images/${TILE_PHOTO[c.n - 1]}.jpg`" alt="" class="absolute inset-0 size-full object-cover transition-transform duration-700 group-hover:scale-105" />
            <span class="absolute inset-0 bg-gradient-to-t from-[#1d1e1f]/85 from-0% via-[#1d1e1f]/40 via-50% to-transparent transition-colors duration-300 group-hover:from-[#d08a54]/85 group-hover:via-[#d08a54]/40" />
            <span class="absolute inset-x-0 bottom-0 flex flex-col p-6 [text-shadow:0_1px_10px_rgb(0_0_0/0.6)]">
              <span class="text-[19px] leading-[1.3] font-medium tracking-[0.18em] uppercase">{{ c.title }}</span>
              <span class="mt-2 text-[14px] leading-relaxed font-normal text-[#f1f1ef]/95">{{ c.blurb }}</span>
              <span class="mt-4 inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.3em] uppercase">Open <ArrowRight :size="13" class="transition-transform group-hover:translate-x-1" /></span>
            </span>
          </button>
        </li>
      </ol>
    </section>

    <!-- the directory -->
    <section class="mb-4">
      <div class="mb-6 flex items-end justify-between gap-4 border-b border-ink/20 pb-4">
        <h2 class="text-[26px] font-extralight tracking-[0.22em] text-ink uppercase">Find and compare</h2>
        <p class="hidden text-[13px] text-muted sm:block">Filter by location and price</p>
      </div>
      <ul class="grid grid-cols-4 gap-4">
        <li v-for="d in DIRECTORY" :key="d.id">
          <button type="button" class="group relative flex h-[360px] w-full cursor-pointer flex-col justify-between overflow-hidden text-left text-[#f1f1ef]" :style="{ background: d.tone }" @click="directory.show(d.id)">
            <img :src="`/images/${d.photo}.jpg`" alt="" class="absolute inset-0 size-full object-cover transition-transform duration-700 group-hover:scale-105" :style="{ objectPosition: d.pos }" />
            <span class="absolute inset-0 transition-opacity duration-300 group-hover:opacity-90" :style="{ background: `linear-gradient(to top, ${d.tone}d9 0%, ${d.tone}8c 32%, ${d.tone}2e 58%, ${d.tone}00 82%)` }" />
            <span class="absolute inset-3 border border-[#f1f1ef]/35" />
            <span class="relative [text-shadow:0_1px_10px_rgb(0_0_0/0.6)] p-7 text-[11px] font-medium tracking-[0.4em] text-[#f1f1ef]/90 uppercase">Directory</span>
            <span class="relative flex flex-col p-7 pt-0 [text-shadow:0_1px_10px_rgb(0_0_0/0.6)]">
              <span class="text-[88px] leading-[0.9] font-light tabular-nums">{{ countOf(d.id) }}</span>
              <span class="mt-4 text-[19px] font-medium tracking-[0.2em] uppercase">{{ d.label }}</span>
              <span class="mt-1.5 text-[14px] text-[#f1f1ef]/95">{{ d.note }}</span>
              <span class="mt-5 flex items-center justify-between border-t border-[#f1f1ef]/50 pt-3 text-[11.5px] font-semibold tracking-[0.3em] uppercase">See the list <ArrowRight :size="15" class="transition-transform group-hover:translate-x-1.5" /></span>
            </span>
          </button>
        </li>
      </ul>
      <p class="mt-4 text-[12px] leading-relaxed text-muted">Starting points from published guides, not endorsements. Prices are from 2024 to 2026 and will have changed.</p>
    </section>

    <GuideBook />
    <WeddingDirectory />
  </Page>
</template>
