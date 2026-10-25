<script setup lang="ts">
import { computed, ref } from "vue";
import { FINISH_LABEL, itemEstimate, renoItemsFor, type Finish, type Home, type Rooms } from "@/domain/renoBudget";
import { fmt } from "@/domain/money";
import { guideState as g } from "@/stores/renoGuideState";
import { cx } from "@/lib/cx";

/** A house cut into slices, one per line of the works. Pick a flat and a finish, tap a slice or a line to read about it. */
const COLOURS = ["#06363c", "#097c87", "#fca47c", "#0a5059", "#f9d779", "#23ced9", "#a1cca6", "#fdd9c6", "#06606a", "#08464d"];

const lines = computed(() => {
  const items = renoItemsFor(g.home).filter((i) => i.share);
  const rows = items.map((i) => ({ id: i.id, name: i.name, hint: i.hint, dollars: itemEstimate(i, g) }));
  const total = rows.reduce((a, r) => a + r.dollars, 0);
  let y = 8;
  return {
    total,
    rows: rows.map((r, n) => {
      const h = (r.dollars / total) * 174;
      const out = { ...r, pct: Math.round((r.dollars / total) * 100), colour: COLOURS[n % COLOURS.length], y, h };
      y += h;
      return out;
    }),
  };
});

const picked = ref<string | null>(null);
const current = computed(() => lines.value.rows.find((r) => r.id === picked.value));
const toggle = (id: string) => (picked.value = picked.value === id ? null : id);

const HOMES: { id: Home; label: string }[] = [{ id: "bto", label: "New BTO" }, { id: "resale", label: "Resale" }];
const SIZES: Rooms[] = [3, 4, 5];
const FINISHES: Finish[] = ["basic", "mid", "premium"];
const PILL = "cursor-pointer rounded-full border px-3 py-1 text-[12px] font-semibold transition-colors";
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <div class="flex flex-wrap gap-1.5">
      <button v-for="h in HOMES" :key="h.id" type="button" :aria-pressed="g.home === h.id" :class="cx(PILL, g.home === h.id ? 'border-[#06363c] bg-[#06363c] text-white' : 'border-[#06363c]/30 hover:border-[#06363c]')" @click="g.home = h.id">{{ h.label }}</button>
      <span class="mx-1 w-px bg-[#06363c]/20" />
      <button v-for="n in SIZES" :key="n" type="button" :aria-pressed="g.rooms === n" :class="cx(PILL, g.rooms === n ? 'border-[#06363c] bg-[#06363c] text-white' : 'border-[#06363c]/30 hover:border-[#06363c]')" @click="g.rooms = n">{{ n }}-room</button>
    </div>
    <div class="mt-1.5 flex flex-wrap gap-1.5">
      <button v-for="f in FINISHES" :key="f" type="button" :aria-pressed="g.finish === f" :class="cx(PILL, g.finish === f ? 'border-[#097c87] bg-[#097c87] text-white' : 'border-[#097c87]/40 text-[#097c87] hover:border-[#097c87]')" @click="g.finish = f">{{ FINISH_LABEL[f] }}</button>
    </div>

    <div class="mt-3 grid min-h-0 grid-cols-[150px_minmax(0,1fr)] items-start gap-4">
      <div>
        <svg viewBox="0 0 200 190" class="w-full" role="img" aria-label="A house cut into slices, one for each cost">
          <defs><clipPath id="house-clip"><path d="M100 8 L194 80 V182 H6 V80 Z" /></clipPath></defs>
          <g clip-path="url(#house-clip)">
            <rect v-for="r in lines.rows" :key="r.id" x="0" :y="r.y" width="200" :height="r.h + 0.5" :fill="r.colour" :opacity="picked && picked !== r.id ? 0.3 : 1" class="cursor-pointer transition-opacity" @click="toggle(r.id)" />
          </g>
          <path d="M100 8 L194 80 V182 H6 V80 Z" fill="none" stroke="#06363c" stroke-width="2" stroke-linejoin="round" />
        </svg>
        <p class="mt-1 font-serif text-[24px] leading-none font-semibold">{{ fmt(lines.total * 100) }}</p>
        <p class="text-[11px] text-[#48767c]">for the works</p>
      </div>
      <ul class="flex flex-col">
        <li v-for="r in lines.rows" :key="r.id">
          <button type="button" :aria-pressed="picked === r.id" :class="cx('flex w-full cursor-pointer items-center gap-2 rounded px-1.5 py-[3px] text-left transition-colors', picked === r.id ? 'bg-[#fca47c]/40' : 'hover:bg-[#fca47c]/20')" @click="toggle(r.id)">
            <span class="size-2.5 shrink-0 rounded-sm" :style="{ background: r.colour }" />
            <span class="min-w-0 flex-1 truncate text-[12px] font-medium">{{ r.name }}</span>
            <span class="font-serif text-[13px] tabular-nums">{{ fmt(r.dollars * 100) }}</span>
            <span class="w-8 text-right text-[11px] text-[#48767c] tabular-nums">{{ r.pct }}%</span>
          </button>
        </li>
      </ul>
    </div>

    <p class="mt-3 min-h-[34px] text-[12px] leading-snug text-[#48767c]">
      <template v-if="current"><span class="font-semibold text-[#06363c]">{{ current.name }}.</span> {{ current.hint }}.</template>
      <template v-else>Tap a slice or a line. Furniture, appliances and air-conditioning are extra, and a resale flat adds hacking.</template>
    </p>
    <RouterLink to="/pots/new?kind=renovation&from=renovation" class="mt-2 self-start text-[12.5px] font-semibold text-[#097c87] underline underline-offset-4 hover:text-[#06363c]">Fine-tune these in your plan →</RouterLink>
  </div>
</template>
