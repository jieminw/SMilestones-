<script setup lang="ts">
import { computed } from "vue";
import { SG_AREAS, SG_MAP } from "@/data/sgAreas";

/**
 * A map of Singapore drawn from the real URA planning-area boundaries. Towns with a launch are tinted, towns in the next
 * launch have a dashed outline, and every project is a pin at its town: sized by how many flats it has, coloured by class.
 */
export interface MapPin {
  id: string;
  name: string;
  town: string;
  classification: string;
  units: number;
  label: string;
  on: boolean;
}

const props = defineProps<{ pins: MapPin[]; upcoming: string[]; hovered: string | null; selected: string | null; selectedTown?: string | null }>();
const emit = defineEmits<{ hover: [id: string | null]; pick: [id: string]; town: [name: string] }>();

const COLOUR: Record<string, string> = { Standard: "#86aeb4", Plus: "#e3c476", Prime: "#e8906a" };
const centre = (town: string): [number, number] => {
  const a = SG_AREAS.find((x) => x.name === town);
  return a ? [a.cx, a.cy] : [500, 280];
};

// where each town's name sits, so close neighbours never print on top of each other
const SIDE: Record<string, "above" | "left" | "right" | "below"> = {
  Sembawang: "right", Woodlands: "left", Yishun: "right", "Ang Mo Kio": "right", Bishan: "left", "Toa Payoh": "right",
  Tampines: "right", Bedok: "below", Geylang: "below", Tengah: "below", "Bukit Merah": "right",
};
const labelAt = (town: string, cx: number, cy: number, reach: number) => {
  switch (SIDE[town] ?? "below") {
    case "above": return { x: cx, y: cy - reach - 6, anchor: "middle" };
    case "left": return { x: cx - reach - 8, y: cy + 5, anchor: "end" };
    case "right": return { x: cx + reach + 8, y: cy + 5, anchor: "start" };
    default: return { x: cx, y: cy + reach + 18, anchor: "middle" };
  }
};

const launchTowns = computed(() => new Set(props.pins.map((p) => p.town)));
const groups = computed(() => {
  const by = new Map<string, MapPin[]>();
  for (const p of props.pins) by.set(p.town, [...(by.get(p.town) ?? []), p]);
  return [...by.entries()].map(([town, list]) => {
    const [cx, cy] = centre(town);
    const ring = list.length > 1 ? 16 + list.length * 5 : 0;
    const pins = list.map((p, i) => {
      const a = (i / list.length) * Math.PI * 2 - Math.PI / 2;
      return { ...p, x: cx + Math.cos(a) * ring, y: cy + Math.sin(a) * ring, r: 8 + Math.min(9, Math.sqrt(p.units) / 4) };
    });
    return { town, cx, cy, reach: ring + 17, pins };
  });
});
const ghosts = computed(() =>
  props.upcoming.filter((t) => !launchTowns.value.has(t)).map((t) => {
    const [x, y] = centre(t);
    return { town: t, x, y };
  }),
);

const activeId = computed(() => props.hovered ?? props.selected);
const activeTown = computed(() => props.pins.find((p) => p.id === activeId.value)?.town ?? props.selectedTown ?? null);
const active = computed(() => {
  for (const g of groups.value) for (const p of g.pins) if (p.id === activeId.value) return p;
  return null;
});
const tip = computed(() => {
  const p = active.value;
  if (!p) return null;
  const w = Math.max(p.name.length * 7.6, p.label.length * 6.4) + 28;
  const x = Math.min(Math.max(p.x - w / 2, 6), SG_MAP.width - w - 6);
  const above = p.y > 90;
  return { p, x, y: above ? p.y - p.r - 58 : p.y + p.r + 10, w };
});

const regionOf = (region: string) => `r-${region.toLowerCase().replace(/[^a-z]/g, '')}`;
const REGIONS = [
  { k: 'r-central', label: 'Central' },
  { k: 'r-north', label: 'North' },
  { k: 'r-northeast', label: 'North-East' },
  { k: 'r-east', label: 'East' },
  { k: 'r-west', label: 'West' },
];
const areaClass = (name: string) => (launchTowns.value.has(name) ? (activeTown.value === name ? "launch hot" : "launch") : props.upcoming.includes(name) ? "next" : "base");
</script>

<template>
  <svg :viewBox="`0 0 ${SG_MAP.width} ${SG_MAP.height}`" class="h-auto w-full" role="img" aria-label="Map of Singapore showing where each BTO project is">
    <defs>
      <pattern id="sg-dots" width="26" height="26" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.1" fill="#9fd0e6" opacity="0.1" /></pattern>
    </defs>
    <rect :width="SG_MAP.width" :height="SG_MAP.height" fill="#10202a" />
    <rect :width="SG_MAP.width" :height="SG_MAP.height" fill="url(#sg-dots)" />

    <g stroke-linejoin="round">
      <path v-for="a in SG_AREAS" :key="a.name" :d="a.d" :class="['sg-area', regionOf(a.region), areaClass(a.name), launchTowns.has(a.name) && 'cursor-pointer']" @click="launchTowns.has(a.name) && emit('town', a.name)" />
    </g>

    <text v-for="g in ghosts" :key="g.town" :x="g.x" :y="g.y + 4" text-anchor="middle" font-size="15" letter-spacing="2" class="fill-[#e3c476]" font-weight="500">{{ g.town.toUpperCase() }}</text>

    <g v-for="g in groups" :key="g.town">
      <text :x="labelAt(g.town, g.cx, g.cy, g.reach).x" :y="labelAt(g.town, g.cx, g.cy, g.reach).y" :text-anchor="labelAt(g.town, g.cx, g.cy, g.reach).anchor" font-size="16" letter-spacing="2.2" class="sg-label" font-weight="600">{{ g.town.toUpperCase() }}</text>
      <g
        v-for="p in g.pins"
        :key="p.id"
        class="cursor-pointer"
        :opacity="p.on ? 1 : 0.25"
        style="transition: opacity 0.3s"
        @mouseenter="emit('hover', p.id)"
        @mouseleave="emit('hover', null)"
        @click="emit('pick', p.id)"
      >
        <circle v-if="p.id === activeId" :cx="p.x" :cy="p.y" :r="p.r + 10" :fill="COLOUR[p.classification]" opacity="0.28" class="sg-pulse" />
        <circle :cx="p.x" :cy="p.y" :r="p.id === activeId ? p.r + 2.5 : p.r" :fill="COLOUR[p.classification]" stroke="#1d1e1f" stroke-width="2.5" style="transition: r 0.2s" />
        <circle :cx="p.x" :cy="p.y" :r="p.r * 0.34" fill="#1d1e1f" opacity="0.55" />
      </g>
    </g>

    <g pointer-events="none">
      <g v-for="(rg, i) in REGIONS" :key="rg.k" :transform="`translate(${SG_MAP.width - 150} ${SG_MAP.height - 24 - (REGIONS.length - i) * 22})`">
        <rect width="14" height="14" rx="3" :class="['sg-key', rg.k]" />
        <text x="22" y="12" font-size="13" letter-spacing="1.4" class="fill-white/65">{{ rg.label.toUpperCase() }}</text>
      </g>
    </g>

    <g v-if="tip" pointer-events="none">
      <rect :x="tip.x" :y="tip.y" :width="tip.w" height="48" rx="6" fill="#1d1e1f" stroke="#ffffff" stroke-opacity="0.28" />
      <text :x="tip.x + 14" :y="tip.y + 21" font-size="16" class="fill-white" font-family="'Fraunces Variable', serif">{{ tip.p.name }}</text>
      <text :x="tip.x + 14" :y="tip.y + 38" font-size="12.5" class="fill-white/65">{{ tip.p.label }}</text>
    </g>
  </svg>
</template>

<style scoped>
.sg-area {
  stroke-width: 1;
  transition: fill 0.25s, stroke 0.25s;
}
.sg-area.base {
  fill: var(--c);
  stroke: #ffffff;
  stroke-opacity: 0.22;
}
.sg-area.launch {
  fill: var(--cl);
  stroke: #ffffff;
  stroke-opacity: 0.7;
  stroke-width: 1.4;
}
.sg-area.launch.hot {
  fill: var(--ch);
  stroke-opacity: 1;
  stroke-width: 2;
}
.sg-area.next {
  fill: var(--c);
  stroke: #e3c476;
  stroke-opacity: 0.95;
  stroke-width: 1.6;
  stroke-dasharray: 5 4;
}
.sg-key.r-central, .sg-area.r-central { --c: #3b5368; --cl: #4f7396; --ch: #6c97bd; }
.sg-key.r-north, .sg-area.r-north { --c: #3b6152; --cl: #50876f; --ch: #6dad92; }
.sg-key.r-northeast, .sg-area.r-northeast { --c: #59486f; --cl: #7662a0; --ch: #9a85c6; }
.sg-key.r-east, .sg-area.r-east { --c: #70593a; --cl: #a07b4b; --ch: #c79c63; }
.sg-key.r-west, .sg-area.r-west { --c: #356a72; --cl: #45919b; --ch: #62b6c1; }
.sg-key {
  fill: var(--cl);
}
.sg-label {
  fill: #ffffff;
  fill-opacity: 0.85;
  paint-order: stroke;
  stroke: #1d1e1f;
  stroke-width: 4px;
  stroke-opacity: 0.8;
}
.sg-pulse {
  transform-box: fill-box;
  transform-origin: center;
  animation: sg-ping 1.6s ease-out infinite;
}
@keyframes sg-ping {
  0% { transform: scale(0.8); opacity: 0.45; }
  100% { transform: scale(1.5); opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .sg-pulse { animation: none; }
}
</style>
