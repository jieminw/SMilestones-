<script setup lang="ts">
import { computed } from "vue";
import { ArrowRight, BookOpen, Plus, Pencil, Search } from "lucide-vue-next";
import { useApp } from "@/stores/app";
import { RENO_CHAPTERS } from "@/data/renoGuide";
import { RENO_LISTINGS } from "@/data/renoDirectory";
import { renoDirectory, renoGuide } from "@/stores/guide";
import Page from "@/layouts/Page.vue";
import RenoBook from "@/components/guide/RenoBook.vue";
import RenoDirectory from "@/components/guide/RenoDirectory.vue";
import RenoPage from "@/components/guide/RenoPage.vue";
import RenoOnboarding from "@/components/guide/reno/RenoOnboarding.vue";
import { guideState, reopenPlanning } from "@/stores/renoGuideState";
import { homeNoun, FINISH_LABEL } from "@/domain/renoBudget";

/**
 * The Renovation page is the renovation guide: a large book cover to open, the chapters, and the directory of design
 * firms and furniture stores. Planning lives on the renovation pot's setup page, and the milestones on the pot's page
 * beside "Log contribution". The strip near the top links to both.
 */
const app = useApp();

const TILE_PHOTO = ["swatches", "plans", "wall-hack", "showroom-living", "kitchen-fridge", "saw", "keys"];
const COVER = { kind: "cover" } as const;

const DIRECTORY = [
  { id: "firm", label: "Design firms and contractors", note: "With starting prices and a profile to read", photo: "swatches", pos: "50% 55%", tone: "#1d1e1f", count: RENO_LISTINGS.firm.length },
  { id: "furniture", label: "Furniture", note: "From budget to designer, by price level", photo: "showroom-living", pos: "40% 60%", tone: "#2f3132", count: RENO_LISTINGS.furniture.length },
] as const;
const total = RENO_LISTINGS.firm.length + RENO_LISTINGS.furniture.length;

const draft = computed(() => app.state?.pots.find((p) => p.kind === "renovation" && p.status === "draft"));
const pot = computed(() => app.state?.pots.find((p) => p.kind === "renovation"));
const setup = computed(() => (draft.value ? `/pots/new?edit=${draft.value.id}&from=renovation` : "/pots/new?kind=renovation&from=renovation"));
const addLink = computed(() => `${setup.value}${setup.value.includes("?") ? "&" : "?"}milestone=add`);
</script>

<template>
  <Page wide>
    <!-- first visit: the planning questions -->
    <RenoOnboarding v-if="!guideState.onboarded" />

    <!-- the book -->
    <section v-else class="relative mb-6 grid grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] items-center gap-10 overflow-hidden bg-navy px-8 py-12 text-[#f1f1ef] md:px-14 md:py-16">
      <div class="relative z-10">
        <p class="text-[11px] tracking-[0.5em] text-[#e3c476] uppercase">The renovation guide</p>
        <h1 class="mt-5 text-[clamp(40px,5.4vw,76px)] leading-[1.12] font-extralight tracking-[0.12em] uppercase">Renovating your first home</h1>
        <div class="mt-6 h-px w-16 bg-[#e3c476]" />
        <p class="mt-5 text-[15px] font-semibold text-[#e3c476]">Made for your {{ guideState.rooms }}-room {{ homeNoun(guideState.home) }}, {{ FINISH_LABEL[guideState.finish].toLowerCase() }} finish. <button type="button" class="cursor-pointer font-normal underline underline-offset-4 hover:text-white" @click="reopenPlanning">Change</button></p>
        <p class="mt-3 max-w-[46ch] text-[17px] leading-relaxed text-[#f1f1ef]/80">Getting the keys is the easy part. Find out what the works really cost, how to choose a designer who won't surprise you, which walls HDB lets you change and what to buy first. Compare {{ total }} firms and stores, with the red flags to watch for in every quote.</p>
        <div class="mt-9 flex flex-wrap gap-4">
          <button type="button" class="inline-flex h-14 cursor-pointer items-center gap-3 bg-[#e3c476] px-8 text-[14px] font-medium tracking-[0.25em] text-[#2b2b2b] uppercase transition-colors hover:bg-white" @click="renoGuide.show(0)"><BookOpen :size="19" /> Open the guide</button>
          <button type="button" class="inline-flex h-14 cursor-pointer items-center gap-3 border border-[#f1f1ef]/60 px-8 text-[14px] font-medium tracking-[0.25em] uppercase transition-colors hover:bg-[#f1f1ef] hover:text-[#2b2b2b]" @click="renoDirectory.show('firm')"><Search :size="18" /> Browse {{ total }} listings</button>
        </div>
      </div>

      <!-- the real cover, large: it opens the book -->
      <button type="button" class="group relative mx-auto block h-[min(560px,70vw)] w-[min(420px,52vw)] cursor-pointer" aria-label="Open the renovation guide" @click="renoGuide.show(0)">
        <span class="absolute inset-0 translate-x-3 translate-y-3 bg-black/35 blur-[2px]" />
        <span class="absolute top-0 left-0 block origin-top-left transition-transform duration-500 group-hover:-translate-y-1 group-hover:rotate-[-1.2deg]" style="width: 500px; height: 667px; transform: scale(0.84)">
          <span class="absolute inset-0 block overflow-hidden shadow-[0_30px_60px_-20px_rgba(0,0,0,0.7)]"><RenoPage :page="COVER" :no="0" side="single" :compact="true" /></span>
        </span>
      </button>
    </section>

    <!-- milestones: added and edited on the renovation pot -->
    <section class="mb-10 flex flex-wrap items-center justify-between gap-4 border border-terra/40 bg-surface px-6 py-5">
      <div>
        <p class="text-[10px] tracking-[0.4em] text-terra uppercase">Your renovation savings</p>
        <p class="mt-1.5 max-w-[60ch] text-[14.5px] leading-snug text-ink/80">
          {{ pot ? "Plan the works and add or edit your milestones on the pot setup page. Save enough for one and the next opens." : "Set up a renovation pot to plan the works and track them in milestones." }}
        </p>
      </div>
      <div class="flex flex-wrap gap-3">
        <RouterLink :to="addLink" class="inline-flex h-11 items-center gap-2 bg-terra px-5 text-[12px] font-medium tracking-[0.2em] text-[#2b2b2b] uppercase hover:bg-navy"><Plus :size="15" /> Add a milestone</RouterLink>
        <RouterLink :to="addLink" class="inline-flex h-11 items-center gap-2 border border-ink/50 px-5 text-[12px] font-medium tracking-[0.2em] text-ink uppercase hover:bg-ink hover:text-[#2b2b2b]"><Pencil :size="14" /> Edit milestones</RouterLink>
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
        <li v-for="(c, i) in RENO_CHAPTERS" :key="c.n" :class="i === RENO_CHAPTERS.length - 1 && 'col-span-2'">
          <button type="button" class="group relative block h-[250px] w-full cursor-pointer overflow-hidden bg-navy text-left text-[#f1f1ef]" @click="renoGuide.show(c.page)">
            <img :src="`/images/${TILE_PHOTO[c.n - 1]}.jpg`" alt="" class="absolute inset-0 size-full object-cover transition-transform duration-700 group-hover:scale-105" />
            <span class="absolute inset-0 bg-gradient-to-t from-[#1d1e1f]/85 from-0% via-[#1d1e1f]/40 via-50% to-transparent transition-colors duration-300 group-hover:from-[#d08a54]/85 group-hover:via-[#d08a54]/40" />
            <span class="absolute inset-x-0 bottom-0 flex flex-col p-6 [text-shadow:0_1px_10px_rgb(0_0_0/0.6)]">
              <span class="text-[17px] leading-[1.3] font-light tracking-[0.2em] uppercase">{{ c.title }}</span>
              <span class="mt-2 text-[13px] leading-relaxed text-[#f1f1ef]/80">{{ c.blurb }}</span>
              <span class="mt-4 inline-flex items-center gap-2 text-[10px] tracking-[0.3em] uppercase">Open <ArrowRight :size="13" class="transition-transform group-hover:translate-x-1" /></span>
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
      <ul class="grid grid-cols-2 gap-4">
        <li v-for="d in DIRECTORY" :key="d.id">
          <button type="button" class="group relative flex h-[360px] w-full cursor-pointer flex-col justify-between overflow-hidden text-left text-[#f1f1ef]" :style="{ background: d.tone }" @click="renoDirectory.show(d.id)">
            <img :src="`/images/${d.photo}.jpg`" alt="" class="absolute inset-0 size-full object-cover transition-transform duration-700 group-hover:scale-105" :style="{ objectPosition: d.pos }" />
            <span class="absolute inset-0 transition-opacity duration-300 group-hover:opacity-90" :style="{ background: `linear-gradient(to top, ${d.tone}d9 0%, ${d.tone}8c 32%, ${d.tone}2e 58%, ${d.tone}00 82%)` }" />
            <span class="absolute inset-3 border border-[#f1f1ef]/35" />
            <span class="relative [text-shadow:0_1px_10px_rgb(0_0_0/0.6)] p-7 text-[10px] tracking-[0.4em] text-[#f1f1ef]/80 uppercase">Directory</span>
            <span class="relative flex flex-col p-7 pt-0 [text-shadow:0_1px_10px_rgb(0_0_0/0.6)]">
              <span class="text-[84px] leading-[0.9] font-extralight tabular-nums">{{ d.count }}</span>
              <span class="mt-4 text-[17px] font-light tracking-[0.22em] uppercase">{{ d.label }}</span>
              <span class="mt-1.5 text-[13px] text-[#f1f1ef]/80">{{ d.note }}</span>
              <span class="mt-5 flex items-center justify-between border-t border-[#f1f1ef]/40 pt-3 text-[10.5px] tracking-[0.3em] uppercase">See the list <ArrowRight :size="15" class="transition-transform group-hover:translate-x-1.5" /></span>
            </span>
          </button>
        </li>
      </ul>
      <p class="mt-4 text-[12px] leading-relaxed text-muted">Starting points from published guides, not endorsements. Prices are from 2024 to 2026 and will have changed. Always ask for an itemised quote.</p>
    </section>

    <RenoBook />
    <RenoDirectory />
  </Page>
</template>
