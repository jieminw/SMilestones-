<script setup lang="ts">
import { computed, ref } from "vue";
import { WALLS } from "@/data/renoAdvice";
import { cx } from "@/lib/cx";

/** A typical flat, with the walls drawn by how freely they can change. Tap a wall to read about it. */
defineEmits<{ links: [] }>();
const picked = ref<string | null>("kitchen");
const current = computed(() => WALLS.find((w) => w.id === picked.value));
const STYLE = { keep: { stroke: "#06363c", w: 7, dash: undefined }, wet: { stroke: "#097c87", w: 5, dash: undefined }, maybe: { stroke: "#fca47c", w: 5, dash: "9 6" } } as const;
const LEGEND = [
  { k: "keep", label: "Keep" },
  { k: "wet", label: "Wet area" },
  { k: "maybe", label: "Often changed, with approval" },
] as const;
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <svg viewBox="0 0 440 255" class="w-full rounded-lg bg-[#06363c]/[0.06]" role="img" aria-label="A typical flat, with each wall marked as keep, wet area, or often changed">
      <g class="pointer-events-none select-none" font-family="Inter, sans-serif" font-size="11" font-weight="600" fill="#48767c" text-anchor="middle">
        <text x="85" y="62">BEDROOM</text><text x="190" y="62">BATH</text><text x="280" y="62">KITCHEN</text><text x="375" y="62">SHELTER</text>
        <text x="285" y="170">LIVING AND DINING</text><text x="85" y="170">BEDROOM 2</text>
      </g>
      <g fill="none" stroke-linejoin="round" stroke-linecap="square">
        <g v-for="w in WALLS" :key="w.id" class="cursor-pointer" :opacity="picked && picked !== w.id ? 0.5 : 1" @click="picked = picked === w.id ? null : w.id">
          <path :d="w.d" :stroke="STYLE[w.kind].stroke" :stroke-width="STYLE[w.kind].w" :stroke-dasharray="STYLE[w.kind].dash" />
          <path :d="w.d" stroke="transparent" stroke-width="22" />
        </g>
      </g>
    </svg>
    <ul class="mt-2.5 flex flex-wrap gap-x-4 gap-y-1">
      <li v-for="l in LEGEND" :key="l.k" class="flex items-center gap-1.5 text-[11.5px] font-medium">
        <svg width="22" height="8" aria-hidden="true"><line x1="1" y1="4" x2="21" y2="4" :stroke="STYLE[l.k].stroke" :stroke-width="STYLE[l.k].w" :stroke-dasharray="STYLE[l.k].dash" /></svg>{{ l.label }}
      </li>
    </ul>
    <div :class="cx('mt-2.5 min-h-[58px] rounded-lg border-l-4 bg-[#06363c]/[0.06] px-3 py-2', current ? 'border-[#097c87]' : 'border-transparent')">
      <template v-if="current"><p class="text-[13px] font-semibold">{{ current.label }}</p><p class="text-[12px] leading-snug text-[#48767c]">{{ current.body }}</p></template>
      <p v-else class="text-[12px] leading-snug text-[#48767c]">Tap any wall to see whether it can change.</p>
    </div>
    <p class="mt-2.5 text-[11px] leading-relaxed text-[#48767c]">A typical layout, not your flat. Bold lines on your own HDB floor plan mark walls you cannot hack. Check with HDB before you hack anything.</p>
    <button type="button" class="mt-2 self-start text-[12.5px] font-semibold text-[#097c87] underline underline-offset-4 hover:text-[#06363c]" @click="$emit('links')">HDB's own pages →</button>
  </div>
</template>
