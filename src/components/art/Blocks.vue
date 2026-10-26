<script setup lang="ts">
import { computed } from "vue";

/** A dusk skyline of HDB blocks, drawn from the project id so every estate looks a little different (no copyrighted photos). */
const props = withDefaults(defineProps<{ seed?: string; classification?: string }>(), { seed: "x" });

const SKY = {
  Standard: ["#14303a", "#3f747c", "#e6b07c"],
  Plus: ["#211f3f", "#6d5d94", "#f0bd74"],
  Prime: ["#2e1a2b", "#a34e64", "#f6a873"],
} as const;
const sky = computed(() => SKY[props.classification as keyof typeof SKY] ?? SKY.Standard);

/** Small seeded random numbers, so the same project always draws the same skyline. */
function rng(seed: string) {
  let a = 0;
  for (const c of seed) a = (a * 31 + c.charCodeAt(0)) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const scene = computed(() => {
  const r = rng(props.seed);
  const towers: { x: number; w: number; top: number; shade: string; wins: { x: number; y: number; lit: boolean }[] }[] = [];
  let x = -6;
  while (x < 200) {
    const w = 22 + Math.floor(r() * 18);
    const h = 44 + Math.floor(r() * 54);
    const wins: { x: number; y: number; lit: boolean }[] = [];
    const cols = Math.max(2, Math.floor((w - 6) / 7));
    const rows = Math.floor((h - 8) / 8);
    for (let row = 0; row < rows; row++) for (let c = 0; c < cols; c++) wins.push({ x: x + 5 + c * 7, y: 112 - h + 6 + row * 8, lit: r() < 0.4 });
    towers.push({ x, w, top: 112 - h, shade: r() > 0.5 ? "#12171a" : "#1a2024", wins });
    x += w + 2 + Math.floor(r() * 4);
  }
  const stars = Array.from({ length: 14 }, () => ({ x: r() * 200, y: 4 + r() * 46, o: 0.25 + r() * 0.55, s: 0.4 + r() * 0.7 }));
  return { towers, stars, sunX: 30 + r() * 140 };
});
</script>

<template>
  <svg viewBox="0 0 200 120" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
    <defs>
      <linearGradient :id="`sky-${seed}`" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" :stop-color="sky[0]" />
        <stop offset="62%" :stop-color="sky[1]" />
        <stop offset="100%" :stop-color="sky[2]" />
      </linearGradient>
      <radialGradient :id="`sun-${seed}`">
        <stop offset="0%" stop-color="#fff3d6" stop-opacity="0.95" />
        <stop offset="45%" :stop-color="sky[2]" stop-opacity="0.55" />
        <stop offset="100%" :stop-color="sky[2]" stop-opacity="0" />
      </radialGradient>
    </defs>
    <rect width="200" height="120" :fill="`url(#sky-${seed})`" />
    <circle v-for="(s, i) in scene.stars" :key="i" :cx="s.x" :cy="s.y" :r="s.s" fill="#fff" :opacity="s.o" />
    <circle :cx="scene.sunX" cy="92" r="34" :fill="`url(#sun-${seed})`" />
    <g v-for="(t, i) in scene.towers" :key="i">
      <rect :x="t.x" :y="t.top" :width="t.w" :height="112 - t.top" rx="1.5" :fill="t.shade" />
      <rect v-for="(w, j) in t.wins" :key="j" :x="w.x" :y="w.y" width="4" height="4.5" rx="0.8" :fill="w.lit ? '#ffd98a' : '#ffffff'" :opacity="w.lit ? 0.92 : 0.06" />
    </g>
    <rect y="112" width="200" height="8" fill="#0d1113" />
    <rect y="112" width="200" height="0.8" fill="#ffd98a" opacity="0.35" />
  </svg>
</template>
