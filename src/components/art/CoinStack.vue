<script setup lang="ts">
import { computed } from "vue";

/**
 * A stack of coins, one coin per unit saved. `segments` go from the bottom up (e.g. one partner's coins, then the other's),
 * each in its own colour. The top coin carries a $. Coins drop in one after another when the stack appears.
 */
const props = withDefaults(defineProps<{ segments: { count: number; colour: string }[]; width?: number; max?: number }>(), { width: 56, max: 18 });

const RX = 25;
const RY = 8;
const THICK = 9;
const STEP = 8.5;

const coins = computed(() => {
  const out: { colour: string }[] = [];
  for (const s of props.segments) for (let i = 0; i < s.count; i++) out.push({ colour: s.colour });
  return out.slice(0, props.max);
});
const height = computed(() => Math.max(coins.value.length, 1) * STEP + RY * 2 + THICK);
const yOf = (i: number) => height.value - RY - THICK - i * STEP;
const dark = (c: string) => `color-mix(in srgb, ${c}, #000 22%)`;
const light = (c: string) => `color-mix(in srgb, ${c}, #fff 22%)`;
</script>

<template>
  <svg :viewBox="`0 0 ${RX * 2 + 6} ${height}`" :width="width" :height="(width * height) / (RX * 2 + 6)" aria-hidden="true" class="overflow-visible">
    <ellipse :cx="RX + 3" :cy="height - RY + 1" :rx="RX + 4" :ry="RY" fill="#000" opacity="0.35" />
    <g v-if="coins.length === 0">
      <ellipse :cx="RX + 3" :cy="height - RY - THICK" :rx="RX" :ry="RY" fill="none" stroke="#ffffff" stroke-opacity="0.3" stroke-dasharray="4 4" />
    </g>
    <g v-for="(c, i) in coins" :key="i" class="coin" :style="{ animationDelay: i * 45 + 'ms' }">
      <path :d="`M${3} ${yOf(i)} v${THICK} a${RX} ${RY} 0 0 0 ${RX * 2} 0 v${-THICK}`" :fill="dark(c.colour)" />
      <ellipse :cx="RX + 3" :cy="yOf(i)" :rx="RX" :ry="RY" :fill="c.colour" :stroke="`color-mix(in srgb, ${c.colour}, #000 55%)`" stroke-width="1.1" />
      <ellipse :cx="RX + 3" :cy="yOf(i)" :rx="RX - 6" :ry="RY - 2.4" fill="none" :stroke="light(c.colour)" stroke-width="1.2" opacity="0.8" />
      <text v-if="i === coins.length - 1" :x="RX + 3" :y="yOf(i) + 3.6" text-anchor="middle" font-size="10.5" font-weight="700" fill="#1d1e1f" opacity="0.7" font-family="DM Sans Variable, sans-serif">$</text>
    </g>
  </svg>
</template>

<style scoped>
.coin {
  animation: coin-in 0.5s cubic-bezier(0.3, 1.4, 0.5, 1) both;
}
@keyframes coin-in {
  from { transform: translateY(-34px); opacity: 0; }
  to { transform: none; opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  .coin { animation: none; }
}
</style>
