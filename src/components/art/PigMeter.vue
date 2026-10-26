<script setup lang="ts">
import { computed, onMounted, ref } from "vue";

/**
 * A glass piggy bank with coins heaped inside. The more a goal is funded, the more coins pile up. The coins at the bottom are
 * the first partner's, then the second's, and anything else (a parent's gift) is grey. The coins drop in when the page loads.
 */
const props = withDefaults(defineProps<{ a: number; b: number; other?: number; size?: number; label: string }>(), { other: 0, size: 220 });

const ready = ref(false);
onMounted(() => requestAnimationFrame(() => (ready.value = true)));

// where coins can sit: rows from the belly upwards, each as wide as the body allows at that height
const CX = 150;
const CY = 118;
const RXB = 108;
const RYB = 78;
const COIN = { rx: 12.5, ry: 4.8, thick: 4 };
const slots = (() => {
  const out: { x: number; y: number }[] = [];
  for (let r = 0; r < 14; r++) {
    const y = 187 - r * 8.2;
    const k = (y - CY) / RYB;
    if (Math.abs(k) >= 1) break;
    const half = RXB * Math.sqrt(1 - k * k) - 9;
    const n = Math.floor((half * 2) / (COIN.rx * 2 + 1));
    if (n < 1) break;
    const start = CX - ((n - 1) * (COIN.rx * 2 + 1)) / 2 + (r % 2 ? 6 : 0);
    for (let i = 0; i < n; i++) out.push({ x: start + i * (COIN.rx * 2 + 1), y });
    if (y < 62) break;
  }
  return out;
})();

const total = computed(() => Math.max(0, Math.min(100, props.a + props.b + (props.other ?? 0))));
const shown = computed(() => (total.value <= 0 ? 0 : Math.max(2, Math.round((total.value / 100) * slots.length))));
const coins = computed(() => {
  const sum = props.a + props.b + (props.other ?? 0) || 1;
  const aEnd = (props.a / sum) * shown.value;
  const bEnd = ((props.a + props.b) / sum) * shown.value;
  return slots.slice(0, ready.value ? shown.value : 0).map((p, i) => ({ ...p, colour: i < aEnd ? "#e8906a" : i < bEnd ? "#86aeb4" : "#9aa5a4", i }));
});
const dark = (c: string) => `color-mix(in srgb, ${c}, #000 30%)`;
const light = (c: string) => `color-mix(in srgb, ${c}, #fff 28%)`;
</script>

<template>
  <svg viewBox="0 0 300 230" :width="size" :height="(size * 230) / 300" role="img" :aria-label="label" class="overflow-visible">
    <defs>
      <clipPath id="pm-body"><ellipse :cx="CX" :cy="CY" :rx="RXB" :ry="RYB" /></clipPath>
      <linearGradient id="pm-glass" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#ffd9cb" stop-opacity="0.3" />
        <stop offset="1" stop-color="#f4a98d" stop-opacity="0.1" />
      </linearGradient>
      <linearGradient id="pm-pink" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#ffc9b8" />
        <stop offset="1" stop-color="#ee9a7e" />
      </linearGradient>
    </defs>

    <ellipse cx="150" cy="216" rx="104" ry="8" fill="#000" opacity="0.3" />

    <!-- curly tail and back legs -->
    <path d="M46 108 C20 96 18 130 38 126 C30 120 34 110 48 114" fill="none" stroke="#ee9a7e" stroke-width="6" stroke-linecap="round" />
    <rect x="76" y="166" width="32" height="42" rx="13" fill="#d9826a" />
    <rect x="178" y="166" width="32" height="42" rx="13" fill="#d9826a" />

    <!-- the glass body, with the coins inside -->
    <ellipse :cx="CX" :cy="CY" :rx="RXB" :ry="RYB" fill="#1f2123" />
    <ellipse :cx="CX" :cy="CY" :rx="RXB" :ry="RYB" fill="url(#pm-glass)" />
    <g clip-path="url(#pm-body)">
      <g v-for="c in coins" :key="c.i" class="pm-coin" :style="{ animationDelay: c.i * 28 + 'ms' }">
        <path :d="`M${c.x - COIN.rx} ${c.y} v${COIN.thick} a${COIN.rx} ${COIN.ry} 0 0 0 ${COIN.rx * 2} 0 v${-COIN.thick}`" :fill="dark(c.colour)" />
        <ellipse :cx="c.x" :cy="c.y" :rx="COIN.rx" :ry="COIN.ry" :fill="c.colour" :stroke="dark(c.colour)" stroke-width="0.9" />
        <ellipse :cx="c.x" :cy="c.y" :rx="COIN.rx - 4" :ry="COIN.ry - 1.7" fill="none" :stroke="light(c.colour)" stroke-width="0.9" opacity="0.8" />
      </g>
    </g>
    <ellipse :cx="CX" :cy="CY" :rx="RXB" :ry="RYB" fill="none" stroke="url(#pm-pink)" stroke-width="5" />
    <!-- shine -->
    <path d="M70 84 C78 58 104 44 130 42" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity="0.45" />
    <circle cx="62" cy="104" r="3" fill="#fff" opacity="0.4" />

    <!-- front legs, ear, snout, face -->
    <rect x="104" y="170" width="32" height="40" rx="13" fill="url(#pm-pink)" />
    <rect x="196" y="170" width="32" height="40" rx="13" fill="url(#pm-pink)" />
    <path d="M206 54 L234 20 L248 68 Z" fill="url(#pm-pink)" stroke="#ee9a7e" stroke-width="3" stroke-linejoin="round" />
    <path d="M214 54 L232 32 L240 60 Z" fill="#e8806a" opacity="0.55" />
    <ellipse cx="258" cy="116" rx="28" ry="24" fill="url(#pm-pink)" />
    <ellipse cx="266" cy="110" rx="4" ry="6" fill="#a84d3d" />
    <ellipse cx="266" cy="126" rx="4" ry="6" fill="#a84d3d" />
    <circle cx="226" cy="92" r="7" fill="#2b1c1a" />
    <circle cx="228.5" cy="89.5" r="2.4" fill="#fff" />
    <ellipse cx="214" cy="116" rx="11" ry="7" fill="#ff7f6e" opacity="0.5" />
    <path d="M232 128 Q240 136 250 130" fill="none" stroke="#a84d3d" stroke-width="2.4" stroke-linecap="round" />

    <!-- coin slot -->
    <rect x="118" y="44" width="64" height="10" rx="5" fill="#2b1c1a" />
  </svg>
</template>

<style scoped>
.pm-coin {
  animation: pm-drop 0.5s cubic-bezier(0.3, 1.4, 0.5, 1) both;
}
@keyframes pm-drop {
  from { transform: translateY(-60px); opacity: 0; }
  to { transform: none; opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  .pm-coin { animation: none; }
}
</style>
