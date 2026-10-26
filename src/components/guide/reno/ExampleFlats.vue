<script setup lang="ts">
import { FINISH_LABEL, HOME_LABEL, itemEstimate, renoItemsFor, worksTotal, type Finish, type Home, type Rooms } from "@/domain/renoBudget";
import { fmt } from "@/domain/money";

/** Three example flats. The figures come from this app's own estimator, and the stories are illustrations. */
defineProps<{ compact: boolean }>();

const SPEC: { home: Home; rooms: Rooms; finish: Finish; photo: string; pos: string; story: string }[] = [
  { home: "bto", rooms: 3, finish: "basic", photo: "kitchen", pos: "50% 45%", story: "Kept the layout and the old floor tiles, and spent only on carpentry and a fresh coat of paint." },
  { home: "bto", rooms: 4, finish: "mid", photo: "living-bright", pos: "40% 55%", story: "Wardrobes in both bedrooms and a TV console, with new tiles laid over the old ones." },
  { home: "resale", rooms: 5, finish: "premium", photo: "living-warm", pos: "50% 60%", story: "Hacked out the old walls and rewired the flat, then added custom carpentry and a new kitchen." },
];

const flats = SPEC.map((s) => {
  const lines = renoItemsFor(s.home).filter((i) => i.share).map((i) => ({ name: i.name, dollars: itemEstimate(i, s) })).sort((a, b) => b.dollars - a.dollars);
  return { ...s, total: worksTotal(s), top: lines.slice(0, 2) };
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <ul class="flex flex-col gap-2.5">
      <li v-for="f in flats" :key="`${f.home}${f.rooms}`" class="grid grid-cols-[92px_minmax(0,1fr)] gap-3">
        <img :src="`/images/${f.photo}.jpg`" alt="" class="h-[92px] w-[92px] rounded-t-full rounded-b-md object-cover" :style="{ objectPosition: f.pos }" />
        <div class="min-w-0">
          <p class="text-[11px] font-semibold tracking-wide text-[#d08a54] uppercase">{{ f.rooms }}-room {{ HOME_LABEL[f.home].toLowerCase() }} · {{ FINISH_LABEL[f.finish].toLowerCase() }}</p>
          <p class="font-serif text-[22px] leading-tight font-semibold">{{ fmt(f.total * 100) }} <span class="font-sans text-[11px] font-normal text-[#48767c]">for the works</span></p>
          <p class="text-[11.5px] leading-snug"><span class="font-semibold">Biggest:</span> {{ f.top[0].name }} {{ fmt(f.top[0].dollars * 100) }}, {{ f.top[1].name.toLowerCase() }} {{ fmt(f.top[1].dollars * 100) }}</p>
          <p :class="['mt-0.5 text-[11.5px] leading-snug text-[#48767c]', compact && 'line-clamp-2']">{{ f.story }}</p>
        </div>
      </li>
    </ul>
    <p class="mt-2 text-[11px] leading-relaxed text-[#48767c]">Examples made with this app's estimator, not real couples' budgets. Furniture and appliances are extra.</p>
  </div>
</template>
