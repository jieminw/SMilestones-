<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { Check } from "lucide-vue-next";
import { fmt, pct as pctOf, type Cents } from "@/domain/money";
import { cx } from "@/lib/cx";

/**
 * This month's deposits as two jars that fill with coins. Each jar is one partner: the level is what they have put
 * in against what they agreed, the dashed line is "agreed", and a full jar glows. Hover to make it wiggle and drop a
 * coin; tap a jar to see where the money went.
 */
export interface JarPerson {
  id: string;
  name: string;
  initial: string;
  who: "a" | "b";
  you: boolean;
  done: Cents;
  promised: Cents;
  payback: Cents;
  breakdown: { name: string; done: Cents; expected: Cents }[];
}
const props = defineProps<{ people: JarPerson[] }>();

const open = ref<string | null>(null);
const ready = ref(false);
const hover = ref<string | null>(null);
// Start empty and fill on mount, so the jars visibly rise when the page loads.
onMounted(() => requestAnimationFrame(() => (ready.value = true)));

const BODY_TOP = 34;
const BODY_BOTTOM = 156;
const INNER = BODY_BOTTOM - BODY_TOP;

const jars = computed(() =>
  props.people.map((p) => {
    const raw = p.promised > 0 ? (p.done / p.promised) * 100 : 0;
    const level = Math.min(raw, 100);
    const full = p.promised > 0 && p.done >= p.promised;
    const status = full ? "Deposited" : p.done > 0 ? "Part paid" : "Not yet";
    // coins sitting in the liquid: more money, more coins (deterministic positions so they don't jump around)
    const count = Math.min(9, Math.round(level / 11));
    const coins = Array.from({ length: count }, (_, i) => ({ x: 34 + ((i * 37) % 52), y: BODY_BOTTOM - 10 - Math.floor(i / 3) * 9 - ((i * 7) % 5), r: 6.5 }));
    return { ...p, level, full, status, coins, label: pctOf(p.done, p.promised) };
  }),
);

const selected = computed(() => jars.value.find((j) => j.id === open.value));
const toggle = (id: string) => (open.value = open.value === id ? null : id);
</script>

<template>
  <div>
    <div class="grid grid-cols-2 items-start gap-3">
      <button
        v-for="j in jars"
        :key="j.id"
        type="button"
        :aria-pressed="open === j.id"
        :aria-label="`${j.name}: ${fmt(j.done)} of ${fmt(j.promised)} this month. Show breakdown`"
        :class="cx('group cursor-pointer rounded-2xl p-3 text-center transition-colors', open === j.id ? 'bg-surface-2' : 'hover:bg-surface-2/60')"
        @click="toggle(j.id)"
        @mouseenter="hover = j.id"
        @mouseleave="hover = null"
      >
        <div class="relative mx-auto w-[128px]">
          <svg viewBox="0 0 120 170" :class="cx('jar overflow-visible', hover === j.id && 'jar-hover', j.full && 'jar-full')" aria-hidden="true">
            <defs>
              <clipPath :id="`clip-${j.id}`">
                <path :d="`M26 ${BODY_TOP} H94 a12 12 0 0 1 12 12 V${BODY_BOTTOM - 14} a14 14 0 0 1 -14 14 H28 a14 14 0 0 1 -14 -14 V${BODY_TOP + 12} a12 12 0 0 1 12 -12 Z`" />
              </clipPath>
              <linearGradient :id="`liq-${j.id}`" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" :stop-color="j.who === 'a' ? '#e8906a' : '#86aeb4'" />
                <stop offset="100%" :stop-color="j.who === 'a' ? '#a8543a' : '#3f4a55'" />
              </linearGradient>
            </defs>

            <!-- glow when full -->
            <ellipse v-if="j.full" cx="60" cy="98" rx="62" ry="70" :fill="j.who === 'a' ? '#ffdad3' : '#d9dee2'" opacity="0.8" class="jar-glow" />

            <!-- lid -->
            <rect x="30" y="14" width="60" height="14" rx="5" fill="#9aa5a4" />
            <rect x="36" y="26" width="48" height="8" rx="3" fill="#737f7e" />

            <!-- glass back -->
            <path :d="`M26 ${BODY_TOP} H94 a12 12 0 0 1 12 12 V${BODY_BOTTOM - 14} a14 14 0 0 1 -14 14 H28 a14 14 0 0 1 -14 -14 V${BODY_TOP + 12} a12 12 0 0 1 12 -12 Z`" fill="#ffffff" fill-opacity="0.55" />

            <!-- liquid, rising -->
            <g :clip-path="`url(#clip-${j.id})`">
              <g class="liquid" :style="{ transform: `translateY(${ready ? INNER - (INNER * j.level) / 100 + (j.level <= 0 ? 18 : 0) : INNER + 18}px)` }">
                <rect x="0" :y="BODY_TOP" width="120" :height="INNER + 20" :fill="`url(#liq-${j.id})`" />
                <path class="wave wave-a" :d="`M-40 ${BODY_TOP} q10 -6 20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 V${BODY_TOP + 12} H-40 Z`" :fill="j.who === 'a' ? '#e8906a' : '#86aeb4'" />
                <path class="wave wave-b" :d="`M-40 ${BODY_TOP + 1} q10 6 20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 V${BODY_TOP + 12} H-40 Z`" fill="#ffffff" fill-opacity="0.18" />
              </g>
              <!-- coins on the bottom -->
              <g v-for="(c, i) in j.coins" :key="i" :style="{ opacity: ready ? 1 : 0, transition: `opacity .6s ${0.4 + i * 0.07}s` }">
                <circle :cx="c.x" :cy="c.y" :r="c.r" fill="#e3c476" stroke="#9a7228" stroke-width="1.4" />
                <text :x="c.x" :y="c.y + 3" text-anchor="middle" font-size="8" font-weight="700" fill="#7a5a1c">$</text>
              </g>
            </g>

            <!-- the agreed amount: a dashed line near the top -->
            <line x1="14" :x2="106" :y1="BODY_TOP + 8" :y2="BODY_TOP + 8" stroke="#c8d0cf" stroke-opacity="0.45" stroke-width="1.5" stroke-dasharray="4 4" />

            <!-- glass front -->
            <path :d="`M26 ${BODY_TOP} H94 a12 12 0 0 1 12 12 V${BODY_BOTTOM - 14} a14 14 0 0 1 -14 14 H28 a14 14 0 0 1 -14 -14 V${BODY_TOP + 12} a12 12 0 0 1 12 -12 Z`" fill="none" stroke="#c8d0cf" stroke-width="2.5" />
            <path d="M24 56 V120" stroke="#ffffff" stroke-opacity="0.75" stroke-width="4" stroke-linecap="round" />

            <!-- a coin drops in on hover -->
            <g class="drop-coin">
              <circle cx="60" cy="0" r="9" fill="#e3c476" stroke="#9a7228" stroke-width="1.6" />
              <text x="60" y="3.5" text-anchor="middle" font-size="10" font-weight="700" fill="#7a5a1c">$</text>
            </g>
          </svg>

          <!-- percentage, written on the glass -->
          <span class="font-serif tabular absolute inset-x-0 top-[78px] text-[22px] leading-none text-white drop-shadow-[0_1px_2px_rgba(42,32,26,0.55)]">{{ j.label }}%</span>
          <span v-if="j.full" class="absolute -top-1 -right-2 flex size-7 items-center justify-center rounded-full bg-ok text-white shadow-md"><Check :size="15" /></span>
        </div>

        <div class="mt-1 flex items-center justify-center gap-2">
          <span :class="cx('font-serif flex size-6 items-center justify-center rounded-full text-[12px] text-white', j.who === 'a' ? 'bg-who-a' : 'bg-who-b')">{{ j.initial }}</span>
          <span class="text-[15px] font-medium whitespace-nowrap">{{ j.name }}<span v-if="j.you" class="font-normal text-muted"> (you)</span></span>
        </div>
        <p class="tabular mt-1 text-[13px] text-muted">{{ fmt(j.done) }} <span class="text-faint">of {{ fmt(j.promised) }}</span></p>
        <span :class="cx('mt-2 inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium', j.full ? 'bg-ok-soft text-ok' : j.done > 0 ? 'bg-warn-soft text-warn' : 'bg-surface-2 text-muted')">{{ j.status }}</span>
      </button>
    </div>

    <!-- breakdown for the tapped jar -->
    <Transition name="drawer">
      <div v-if="selected" :key="selected.id" class="mt-4 rounded-2xl bg-surface-2 p-4">
        <p class="mb-2 text-[11px] font-medium tracking-[0.16em] text-muted uppercase">{{ selected.name }}'s month, goal by goal</p>
        <ul class="flex flex-col gap-2 text-[13.5px]">
          <li v-for="b in selected.breakdown" :key="b.name" class="flex items-center justify-between gap-3">
            <span class="truncate">{{ b.name }}</span>
            <span class="tabular shrink-0 text-muted"><span :class="b.done >= b.expected && b.expected > 0 ? 'text-ok' : 'text-ink'">{{ fmt(b.done) }}</span> / {{ fmt(b.expected) }}</span>
          </li>
        </ul>
        <p v-if="selected.payback > 0" class="mt-3 text-xs text-muted">Includes {{ fmt(selected.payback) }} paying back a cover.</p>
      </div>
      <p v-else class="mt-3 text-center text-xs text-faint">Tap a jar to see where the money went.</p>
    </Transition>
  </div>
</template>

<style scoped>
.jar {
  width: 100%;
  height: auto;
  transform-origin: 60px 160px;
  transition: transform 0.3s ease;
}
.jar-hover {
  animation: jar-wiggle 0.7s ease-in-out;
}
.jar-hover .drop-coin {
  animation: drop 0.9s cubic-bezier(0.4, 0, 0.9, 0.6) both;
}
.drop-coin {
  opacity: 0;
}
.liquid {
  transition: transform 1.4s cubic-bezier(0.25, 0.9, 0.3, 1);
}
.wave {
  animation: wave 3.4s linear infinite;
}
.wave-b {
  animation-duration: 5.2s;
  animation-direction: reverse;
}
.jar-glow {
  animation: glow 2.6s ease-in-out infinite;
}
@keyframes wave {
  from { transform: translateX(0); }
  to { transform: translateX(40px); }
}
@keyframes jar-wiggle {
  0%, 100% { transform: rotate(0); }
  25% { transform: rotate(-4deg); }
  60% { transform: rotate(3deg); }
}
@keyframes drop {
  0% { transform: translateY(-14px); opacity: 0; }
  15% { opacity: 1; }
  80% { transform: translateY(60px); opacity: 1; }
  100% { transform: translateY(70px); opacity: 0; }
}
@keyframes glow {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 0.95; }
}
.drawer-enter-active,
.drawer-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
@media (prefers-reduced-motion: reduce) {
  .wave, .jar-glow, .jar-hover, .jar-hover .drop-coin { animation: none; }
  .liquid { transition: none; }
}
</style>
