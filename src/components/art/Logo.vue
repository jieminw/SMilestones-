<script setup lang="ts">
/** Three rising blocks, each split by a wave: the milestones you climb together. `size` is roughly the old square size. */
const props = withDefaults(defineProps<{ size?: number }>(), { size: 32 });

const NAVY = "#1e3345";
const CORAL = "#dc6a50";
const SKY = "#c7dde4";

// x, y, w, h, top colour, bottom colour, where the wave leaves the left edge and meets the right edge (fractions of the height)
const BLOCKS = [
  { x: 0, y: 32, w: 32, h: 24, top: NAVY, bottom: CORAL, l: 0.88, r: 0.18 },
  { x: 34.5, y: 17.5, w: 37.5, h: 38.5, top: NAVY, bottom: SKY, l: 0.82, r: 0.26 },
  { x: 74.5, y: 2, w: 43, h: 54, top: CORAL, bottom: SKY, l: 0.6, r: 0.16 },
].map((b, i) => {
  const yl = b.y + b.h * b.l;
  const yr = b.y + b.h * b.r;
  const wave = `M${b.x} ${yl} C${b.x + b.w * 0.55} ${yl} ${b.x + b.w * 0.35} ${yr} ${b.x + b.w} ${yr} V${b.y + b.h} H${b.x}Z`;
  return { ...b, wave, id: `lg-${i}` };
});
</script>

<template>
  <svg viewBox="0 0 117.5 56" :width="props.size * 2.3" :height="(props.size * 2.3 * 56) / 117.5" aria-hidden="true">
    <defs>
      <clipPath v-for="b in BLOCKS" :id="b.id" :key="b.id"><rect :x="b.x" :y="b.y" :width="b.w" :height="b.h" rx="9" /></clipPath>
    </defs>
    <g v-for="b in BLOCKS" :key="b.id" :clip-path="`url(#${b.id})`">
      <rect :x="b.x" :y="b.y" :width="b.w" :height="b.h" :fill="b.top" />
      <path :d="b.wave" :fill="b.bottom" />
    </g>
  </svg>
</template>
