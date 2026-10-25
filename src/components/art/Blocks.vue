<script setup lang="ts">
import { computed } from "vue";

/** Generic HDB-block illustration, tinted per project (no copyrighted photos). */
const props = withDefaults(defineProps<{ seed?: string; classification?: string }>(), { seed: "x" });

const h = computed(() => {
  let v = 0;
  for (const c of props.seed) v = (v * 31 + c.charCodeAt(0)) >>> 0;
  return v;
});
const sky = computed(() => (props.classification === "Prime" ? ["#f7dfc9", "#f0c9a8"] : props.classification === "Plus" ? ["#dbe6ef", "#c6d6e4"] : ["#e9efe4", "#d6e3d0"]));
const towers = computed(() =>
  Array.from({ length: 5 }, (_, i) => ({
    x: 8 + i * 38 + ((h.value >> (i * 3)) % 8),
    w: 30 + ((h.value >> (i * 2)) % 10),
    hgt: 60 + ((h.value >> (i * 4)) % 50),
  })),
);
</script>

<template>
  <svg viewBox="0 0 200 120" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
    <defs>
      <linearGradient :id="`sky-${seed}`" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" :stop-color="sky[0]" />
        <stop offset="100%" :stop-color="sky[1]" />
      </linearGradient>
    </defs>
    <rect width="200" height="120" :fill="`url(#sky-${seed})`" />
    <circle :cx="150 + (h % 30)" cy="26" r="11" fill="#f2b38b" opacity="0.8" />
    <g v-for="(t, i) in towers" :key="i">
      <rect :x="t.x" :y="120 - t.hgt" :width="t.w" :height="t.hgt" rx="2" :fill="i % 2 ? '#fbf7f1' : '#f1ebe2'" stroke="#d8cdbd" />
      <rect
        v-for="r in Math.floor(t.hgt / 9)"
        :key="r"
        :x="t.x + 4"
        :y="120 - t.hgt + 5 + (r - 1) * 9"
        :width="t.w - 8"
        height="3"
        rx="1"
        :fill="i % 2 ? '#9fb3c8' : '#b8c7d6'"
        opacity="0.7"
      />
    </g>
    <rect y="112" width="200" height="8" fill="#a7c19a" />
  </svg>
</template>
