<script setup lang="ts">
import { computed } from "vue";
import { PRIORITIES } from "@/data/renoAdvice";
import { FINISH_LABEL, homeNoun, itemEstimate, renoItemsFor, worksTotal } from "@/domain/renoBudget";
import { fmt } from "@/domain/money";
import { guideState as g } from "@/stores/renoGuideState";

/** Their answers from the first visit, turned into a short plan: the works total, the biggest lines, what they care about. */
defineEmits<{ change: [] }>();

const works = computed(() => worksTotal(g));
const top = computed(() => renoItemsFor(g.home).filter((i) => i.share).map((i) => ({ name: i.name, dollars: itemEstimate(i, g) })).sort((a, b) => b.dollars - a.dollars).slice(0, 3));
const extras = computed(() => renoItemsFor(g.home).filter((i) => i.fixed).reduce((a, i) => a + itemEstimate(i, g), 0));
const picks = computed(() => g.picks.map((id) => PRIORITIES.find((p) => p.id === id)?.label).filter(Boolean));
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col overflow-y-auto pr-1">
    <p class="text-[11px] font-semibold tracking-wide text-[#d08a54] uppercase">Made for you</p>
    <p class="font-serif text-[24px] leading-tight font-semibold">{{ g.rooms }}-room {{ homeNoun(g.home) }}, {{ FINISH_LABEL[g.finish].toLowerCase() }} finish</p>

    <div class="mt-3 border-y-2 border-[#1d1e1f] py-3">
      <p class="font-serif text-[34px] leading-none font-semibold">{{ fmt(works * 100) }}</p>
      <p class="mt-1 text-[12px] text-[#48767c]">for the works. Furniture, appliances and air-con add about {{ fmt(extras * 100) }}.</p>
    </div>

    <p class="mt-3 text-[11px] font-semibold tracking-wide text-[#d08a54] uppercase">Where most of it goes</p>
    <ol class="mt-1.5 flex flex-col gap-1.5">
      <li v-for="(t, i) in top" :key="t.name" class="flex items-baseline gap-3"><span class="font-serif w-4 text-[18px] text-[#d08a54]">{{ i + 1 }}</span><span class="flex-1 text-[13px] font-medium">{{ t.name }}</span><span class="font-serif text-[15px]">{{ fmt(t.dollars * 100) }}</span></li>
    </ol>

    <p class="mt-3 text-[11px] font-semibold tracking-wide text-[#d08a54] uppercase">What matters to you</p>
    <ul v-if="picks.length" class="mt-1.5 flex flex-wrap gap-1"><li v-for="p in picks" :key="p" class="rounded-full bg-[#d99573] px-2.5 py-0.5 text-[11.5px] font-semibold">{{ p }}</li></ul>
    <p v-else class="mt-1.5 text-[12px] text-[#48767c]">You skipped this. Add your priorities to see where to spend and where to save.</p>

    <div class="mt-auto flex shrink-0 items-center justify-between gap-3 pt-4">
      <button type="button" class="cursor-pointer text-[12.5px] font-semibold text-[#d08a54] underline underline-offset-4 hover:text-[#1d1e1f]" @click="$emit('change')">Change my answers</button>
      <RouterLink to="/pots/new?kind=renovation&from=renovation" class="inline-flex items-center gap-2 bg-[#1d1e1f] px-5 py-3 text-[10.5px] font-medium tracking-[0.22em] text-[#e6e2da] uppercase transition-colors hover:bg-[#d08a54]">Plan it <span aria-hidden="true">→</span></RouterLink>
    </div>
  </div>
</template>
