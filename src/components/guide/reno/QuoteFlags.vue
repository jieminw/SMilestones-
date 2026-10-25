<script setup lang="ts">
import { computed, ref } from "vue";
import { QUOTE } from "@/data/renoAdvice";
import { cx } from "@/lib/cx";

/** A made-up contractor quote. The lines that should make you stop and ask are numbered. Tap one to see why. */
const flagged = QUOTE.map((l, i) => ({ ...l, i })).filter((l) => l.flag);
const num = (i: number) => flagged.findIndex((f) => f.i === i) + 1;
const picked = ref<number | null>(flagged[0].i);
const current = computed(() => QUOTE[picked.value ?? -1]?.flag);
</script>

<template>
  <div class="flex min-h-0 flex-col">
    <div class="rounded-lg border border-[#06363c]/25 bg-[#edf8f8] px-3 py-2.5">
      <p class="flex items-center justify-between border-b border-dashed border-[#06363c]/30 pb-1.5 text-[10.5px] font-semibold tracking-wide text-[#48767c] uppercase"><span>Example quote</span><span>Made up</span></p>
      <ul>
        <li v-for="(l, i) in QUOTE" :key="l.label">
          <button v-if="l.flag" type="button" :aria-pressed="picked === i" :class="cx('flex w-full cursor-pointer items-center gap-2 rounded px-1 py-[5px] text-left transition-colors', picked === i ? 'bg-[#fca47c]/45' : 'bg-[#fca47c]/18 hover:bg-[#fca47c]/35')" @click="picked = i">
            <span class="flex size-[18px] shrink-0 items-center justify-center rounded-full bg-[#097c87] text-[10px] font-bold text-white">{{ num(i) }}</span>
            <span class="min-w-0 flex-1 text-[12px] font-medium">{{ l.label }}</span><span class="font-serif text-[13px]">{{ l.price }}</span>
          </button>
          <div v-else class="flex items-center gap-2 px-1 py-[5px]"><span class="size-[18px] shrink-0" /><span class="min-w-0 flex-1 text-[12px]">{{ l.label }}</span><span class="font-serif text-[13px]">{{ l.price }}</span></div>
        </li>
      </ul>
    </div>
    <div class="mt-3 rounded-lg border-l-4 border-[#097c87] bg-[#06363c]/[0.06] px-3 py-2.5">
      <template v-if="current"><p class="text-[13.5px] font-semibold">{{ current.title }}</p><p class="mt-0.5 text-[12px] leading-snug text-[#48767c]">{{ current.body }}</p></template>
      <p v-else class="text-[12px] text-[#48767c]">Tap a numbered line.</p>
    </div>
  </div>
</template>
