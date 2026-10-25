<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { ChevronLeft, ChevronRight, X } from "lucide-vue-next";
import { cx } from "@/lib/cx";
import { openExternal } from "@/lib/external";

/**
 * A guide as a flipbook. On a wide screen it is a two-page spread with leaves that turn in 3D. On a phone it is one
 * page at a time. Both move with the arrow keys, and Escape closes it. The pages themselves come from the `page` slot,
 * so the wedding guide and the renovation guide share this one book. `count` is even: a cover, the pages, a back cover.
 */
const props = defineProps<{
  count: number;
  chapters: { n: number; title: string; page: number }[];
  /** The shared open/page state, so any part of the app can open the book at a page. */
  state: { open: boolean; page: number; close: () => void };
  /** Another overlay (the directory) is on top, so keys belong to it. */
  blocked?: boolean;
  label: string;
  dialogLabel: string;
  /** Backdrop colour class, and the light colour used for the controls. */
  backdrop: string;
  light: string;
  dark: string;
}>();

const N = props.count;
const LEAVES = N / 2;
const W = 1000;
const H = 667;

const cur = ref(0); // the page showing, 0 to N - 1
const flipped = ref(0); // leaves turned over, 0 to LEAVES
const turning = ref<number | null>(null);
let turnTimer = 0;

const win = ref({ w: window.innerWidth, h: window.innerHeight });
const single = computed(() => win.value.w < 900);
const scale = computed(() => Math.min(1, (win.value.w - 96) / W, (win.value.h - 170) / H));
const onResize = () => (win.value = { w: window.innerWidth, h: window.innerHeight });

const reduced = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/** A page is visible on spread ceil(p / 2): that many leaves are turned. */
const spreadOf = (p: number) => Math.ceil(p / 2);

function goTo(p: number) {
  const page = Math.min(Math.max(p, 0), N - 1);
  const to = spreadOf(page);
  if (to !== flipped.value) {
    // the leaf that moves is the highest-numbered one in between, so it sits on top while it turns
    turning.value = to > flipped.value ? flipped.value : flipped.value - 1;
    window.clearTimeout(turnTimer);
    turnTimer = window.setTimeout(() => (turning.value = null), reduced ? 0 : 950);
  }
  flipped.value = to;
  cur.value = page;
  props.state.page = page;
}
const next = () => goTo(single.value ? cur.value + 1 : (flipped.value + 1) * 2 - 1);
const prev = () => goTo(single.value ? cur.value - 1 : flipped.value * 2 - 3);

const canPrev = computed(() => (single.value ? cur.value > 0 : flipped.value > 0));
const canNext = computed(() => (single.value ? cur.value < N - 1 : flipped.value < LEAVES));

// the book is centred on whichever page is alone: the cover on the right, the back cover on the left
const shift = computed(() => (flipped.value === 0 ? -W / 4 : flipped.value === LEAVES ? W / 4 : 0));

const leafStyle = (i: number) => {
  const done = i < flipped.value;
  const z = turning.value === i ? 100 : done ? i + 1 : LEAVES - i;
  return { transform: done ? "rotateY(-180deg)" : "rotateY(0deg)", zIndex: z };
};

const chapterNow = computed(() => [...props.chapters].reverse().find((c) => cur.value >= c.page)?.title ?? "Welcome");
const heading = computed(() => (cur.value === 0 ? "Cover" : cur.value === N - 1 ? "Back cover" : `Page ${cur.value} of ${N - 2}`));

let opener: HTMLElement | null = null;
const closeBtn = ref<HTMLButtonElement | null>(null);
function onKey(e: KeyboardEvent) {
  if (!props.state.open || props.blocked) return;
  if (e.key === "Escape") props.state.close();
  else if (e.key === "ArrowRight") next();
  else if (e.key === "ArrowLeft") prev();
}
watch(
  () => props.state.open,
  async (open) => {
    document.body.style.overflow = open ? "hidden" : "";
    if (open) {
      opener = document.activeElement as HTMLElement | null;
      flipped.value = spreadOf(props.state.page);
      cur.value = props.state.page;
      await nextTick();
      closeBtn.value?.focus();
    } else {
      opener?.focus?.();
    }
  },
);
// opening at another page while already open (a link in the planner)
watch(() => props.state.page, (p) => props.state.open && p !== cur.value && goTo(p));

onMounted(() => {
  window.addEventListener("resize", onResize);
  window.addEventListener("keydown", onKey);
});
onBeforeUnmount(() => {
  window.removeEventListener("resize", onResize);
  window.removeEventListener("keydown", onKey);
  window.clearTimeout(turnTimer);
  document.body.style.overflow = "";
});
</script>

<template>
  <Teleport to="body">
    <Transition name="guide">
      <div v-if="state.open" :class="cx('fixed inset-0 z-[100] flex flex-col items-center', backdrop)" role="dialog" aria-modal="true" :aria-label="dialogLabel" @click.self="state.close()">
        <!-- top bar -->
        <div class="flex w-full max-w-[1100px] items-center justify-between px-5 pt-4 pb-2 text-white" @click.self="state.close()">
          <div class="min-w-0">
            <p class="text-[9.5px] tracking-[0.45em] uppercase" :style="{ color: light, opacity: 0.6 }">{{ label }}</p>
            <p class="mt-1 truncate text-[15px] font-light tracking-[0.2em] uppercase">{{ chapterNow }}</p>
          </div>
          <button ref="closeBtn" type="button" class="flex size-10 cursor-pointer items-center justify-center border border-white/30 hover:bg-white/10" aria-label="Close the guide" @click="state.close()"><X :size="18" /></button>
        </div>

        <!-- the book -->
        <div class="flex min-h-0 w-full flex-1 items-center justify-center px-3" @click.self="state.close()">
          <!-- two pages -->
          <div v-if="!single" class="relative" :style="{ width: W * scale + 'px', height: H * scale + 'px' }" @click="openExternal">
            <div class="absolute top-0 left-0 origin-top-left" :style="{ width: W + 'px', height: H + 'px', transform: `scale(${scale})`, perspective: '2800px' }">
              <div class="absolute inset-0 transition-transform duration-[900ms] ease-[cubic-bezier(.5,.1,.2,1)] motion-reduce:duration-0" :style="{ transform: `translateX(${shift}px)`, transformStyle: 'preserve-3d' }">
                <!-- one soft shadow under whatever is showing: the cover, a spread, or the back cover -->
                <div class="pointer-events-none absolute inset-y-0 shadow-[0_28px_50px_-18px_rgba(0,0,0,0.55)] transition-all duration-[900ms] ease-[cubic-bezier(.5,.1,.2,1)] motion-reduce:duration-0" :style="{ left: flipped === 0 ? '50%' : '0', width: flipped === 0 || flipped === LEAVES ? '50%' : '100%' }" />
                <div
                  v-for="i in LEAVES"
                  :key="i"
                  class="absolute top-0 left-1/2 h-full w-1/2 origin-left transition-transform duration-[900ms] ease-[cubic-bezier(.5,.1,.2,1)] motion-reduce:duration-0"
                  :style="{ ...leafStyle(i - 1), transformStyle: 'preserve-3d' }"
                >
                  <!-- the face turned away must not catch clicks, or links on the page beneath it stop working -->
                  <div class="absolute inset-0 overflow-hidden [backface-visibility:hidden]" :class="i - 1 < flipped && 'pointer-events-none'">
                    <slot name="page" :index="(i - 1) * 2" :side="(i - 1) * 2 === 0 ? 'single' : 'right'" :compact="true" :go="goTo" />
                  </div>
                  <div class="absolute inset-0 overflow-hidden [backface-visibility:hidden] [transform:rotateY(180deg)]" :class="i - 1 >= flipped && 'pointer-events-none'">
                    <slot name="page" :index="(i - 1) * 2 + 1" :side="(i - 1) * 2 + 1 === N - 1 ? 'single' : 'left'" :compact="true" :go="goTo" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- one page, for phones -->
          <div v-else class="relative h-full max-h-[calc(100vh-170px)] w-full max-w-[460px] overflow-y-auto rounded-[6px] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.6)]" @click="openExternal">
            <Transition name="turn" mode="out-in">
              <div :key="cur" class="flex min-h-full flex-col">
                <slot name="page" :index="cur" side="single" :compact="false" :go="goTo" />
              </div>
            </Transition>
          </div>
        </div>

        <!-- controls -->
        <div class="flex w-full max-w-[1100px] items-center justify-between gap-4 px-5 pt-2 pb-4 text-white">
          <button type="button" :disabled="!canPrev" class="inline-flex h-11 cursor-pointer items-center gap-1.5 border border-white/30 px-4 text-[14px] font-medium hover:bg-white/10 disabled:cursor-default disabled:opacity-30" @click="prev"><ChevronLeft :size="17" /> Back</button>
          <div class="flex min-w-0 flex-1 flex-col items-center gap-2">
            <p class="font-mono text-[11px] tracking-[0.1em] text-white/60 uppercase">{{ heading }}</p>
            <div class="flex items-center gap-1.5" role="tablist" aria-label="Chapters">
              <button v-for="c in chapters" :key="c.n" type="button" role="tab" :aria-selected="chapterNow === c.title" :aria-label="`Go to ${c.title}`" :title="c.title"
                :class="cx('h-1.5 cursor-pointer transition-all', chapterNow === c.title ? 'w-8' : 'w-3 bg-white/30 hover:bg-white/60')" :style="chapterNow === c.title ? { background: light } : undefined" @click="goTo(c.page)" />
            </div>
          </div>
          <button type="button" :disabled="!canNext" class="inline-flex h-11 cursor-pointer items-center gap-1.5 bg-white px-4 text-[14px] font-medium hover:opacity-90 disabled:cursor-default disabled:opacity-30" :style="{ color: dark }" @click="next">Next <ChevronRight :size="17" /></button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.guide-enter-active,
.guide-leave-active {
  transition: opacity 0.25s ease;
}
.guide-enter-from,
.guide-leave-to {
  opacity: 0;
}
.turn-enter-active,
.turn-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.turn-enter-from {
  opacity: 0;
  transform: translateX(14px);
}
.turn-leave-to {
  opacity: 0;
  transform: translateX(-14px);
}
@media (prefers-reduced-motion: reduce) {
  .turn-enter-active,
  .turn-leave-active,
  .guide-enter-active,
  .guide-leave-active {
    transition: none;
  }
}
</style>
