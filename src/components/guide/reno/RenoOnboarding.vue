<script setup lang="ts">
import { computed, ref } from "vue";
import { Archive, ArrowLeft, ArrowRight, Baby, ChefHat, Laptop, Moon, PiggyBank, Sun, Tv, Wine } from "lucide-vue-next";
import { PRIORITIES } from "@/data/renoAdvice";
import { FINISH_LABEL, HOME_LABEL, SQM, type Finish, type Home, type Rooms } from "@/domain/renoBudget";
import { guideState as g, togglePick } from "@/stores/renoGuideState";
import { cx } from "@/lib/cx";

/**
 * The planning stage, shown the first time a couple opens the Renovation page: four short questions. The renovation
 * guide is then made for them. Answers are kept in this browser, and can be changed from the guide's "Your plan" page.
 */
const emit = defineEmits<{ done: [] }>();

const STEPS = ["home", "size", "finish", "dates", "matters"] as const;
const at = ref(0);
const last = computed(() => at.value === STEPS.length - 1);
const finish = () => {
  g.onboarded = true;
  emit("done");
};

const HOMES: { id: Home; body: string }[] = [
  { id: "bto", body: "Waterproofed bathrooms and little to hack out. The usual starting point." },
  { id: "resale", body: "Often needs hacking and rewiring. Guides put the cost 20% to 40% higher." },
];
const FINISHES: { id: Finish; body: string }[] = [
  { id: "basic", body: "Practical choices, standard materials, minimal carpentry." },
  { id: "mid", body: "A balanced finish with built-in carpentry throughout." },
  { id: "premium", body: "Designer-led, custom carpentry and better materials." },
];
const ICONS = { cook: ChefHat, wfh: Laptop, host: Wine, family: Baby, sleep: Moon, storage: Archive, screen: Tv, light: Sun, budget: PiggyBank };

const CARD = "w-full cursor-pointer rounded-lg border-2 px-5 py-4 text-left transition-colors";
const card = (on: boolean) => cx(CARD, on ? "border-[#e3c476] bg-[#d99573] text-[#1d1e1f]" : "border-[#f1f1ef]/30 hover:border-[#e3c476]");
</script>

<template>
  <section class="relative mb-6 grid min-h-[520px] grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-10 overflow-hidden bg-[#1d1e1f] px-8 py-12 text-[#f1f1ef] md:px-14 md:py-14" aria-label="Plan your renovation">
    <div class="flex flex-col">
      <p class="text-[11px] font-semibold tracking-[0.3em] text-[#e3c476] uppercase">Plan your renovation · {{ at + 1 }} of {{ STEPS.length }}</p>
      <div class="mt-4 flex gap-1.5" aria-hidden="true"><span v-for="(s, i) in STEPS" :key="s" :class="cx('h-1 w-10 rounded-full', i <= at ? 'bg-[#e3c476]' : 'bg-[#f1f1ef]/25')" /></div>
      <h1 class="font-serif mt-8 text-[clamp(34px,4.2vw,56px)] leading-[1.05] font-semibold">
        <template v-if="STEPS[at] === 'home'">What kind of home are you renovating?</template>
        <template v-else-if="STEPS[at] === 'size'">How big is it?</template>
        <template v-else-if="STEPS[at] === 'finish'">What finish do you have in mind?</template>
        <template v-else-if="STEPS[at] === 'dates'">When do you get the keys?</template>
        <template v-else>What matters most to you?</template>
      </h1>
      <p class="mt-5 max-w-[42ch] text-[16px] leading-relaxed text-[#f1f1ef]/80">
        <template v-if="STEPS[at] === 'home'">A new BTO flat and a resale flat cost very different amounts. Your guide will use this.</template>
        <template v-else-if="STEPS[at] === 'size'">Size sets the starting estimate for every cost in your guide.</template>
        <template v-else-if="STEPS[at] === 'finish'">You can change any figure later, once you have real quotes.</template>
        <template v-else-if="STEPS[at] === 'dates'">Leave a date blank and add it later. Most couples need two to three months of works after the keys.</template>
        <template v-else>Choose as many as you like. Your guide will say where to spend and where to save.</template>
      </p>
      <button type="button" class="mt-auto cursor-pointer self-start pt-8 text-[13px] text-[#f1f1ef]/70 underline underline-offset-4 hover:text-white" @click="finish">Skip, show me the guide</button>
    </div>

    <div class="flex flex-col justify-center">
      <ul v-if="STEPS[at] === 'home'" class="flex flex-col gap-3">
        <li v-for="h in HOMES" :key="h.id"><button type="button" :aria-pressed="g.home === h.id" :class="card(g.home === h.id)" @click="g.home = h.id"><span class="font-serif block text-[24px] font-semibold">{{ HOME_LABEL[h.id] }}</span><span class="mt-1 block text-[14px] leading-snug opacity-80">{{ h.body }}</span></button></li>
      </ul>
      <ul v-else-if="STEPS[at] === 'size'" class="flex flex-col gap-3">
        <li v-for="n in ([3, 4, 5] as Rooms[])" :key="n"><button type="button" :aria-pressed="g.rooms === n" :class="card(g.rooms === n)" @click="g.rooms = n"><span class="font-serif block text-[24px] font-semibold">{{ n }}-room</span><span class="mt-1 block text-[14px] opacity-80">About {{ SQM[n] }} sqm</span></button></li>
      </ul>
      <ul v-else-if="STEPS[at] === 'finish'" class="flex flex-col gap-3">
        <li v-for="f in FINISHES" :key="f.id"><button type="button" :aria-pressed="g.finish === f.id" :class="card(g.finish === f.id)" @click="g.finish = f.id"><span class="font-serif block text-[24px] font-semibold">{{ FINISH_LABEL[f.id] }}</span><span class="mt-1 block text-[14px] leading-snug opacity-80">{{ f.body }}</span></button></li>
      </ul>
      <div v-else-if="STEPS[at] === 'dates'" class="grid grid-cols-2 gap-5">
        <label class="flex flex-col gap-2"><span class="text-[12px] font-semibold tracking-wide text-[#e3c476] uppercase">Key collection</span><input v-model="g.keys" type="date" class="h-14 rounded-lg border-2 border-[#f1f1ef]/30 bg-transparent px-4 text-[16px] text-[#f1f1ef] [color-scheme:dark] focus:border-[#e3c476] focus:outline-none" /></label>
        <label class="flex flex-col gap-2"><span class="text-[12px] font-semibold tracking-wide text-[#e3c476] uppercase">Move in</span><input v-model="g.movein" type="date" :min="g.keys || undefined" class="h-14 rounded-lg border-2 border-[#f1f1ef]/30 bg-transparent px-4 text-[16px] text-[#f1f1ef] [color-scheme:dark] focus:border-[#e3c476] focus:outline-none" /></label>
      </div>
      <ul v-else class="grid grid-cols-3 gap-3">
        <li v-for="p in PRIORITIES" :key="p.id">
          <button type="button" :aria-pressed="g.picks.includes(p.id)" :class="cx('flex h-[108px] w-full cursor-pointer flex-col items-start justify-between rounded-lg border-2 p-3 text-left transition-colors', g.picks.includes(p.id) ? 'border-[#e3c476] bg-[#d99573] text-[#1d1e1f]' : 'border-[#f1f1ef]/30 hover:border-[#e3c476]')" @click="togglePick(p.id)">
            <component :is="ICONS[p.id as keyof typeof ICONS]" :size="22" :stroke-width="1.75" />
            <span class="text-[14px] leading-tight font-semibold">{{ p.label }}</span>
          </button>
        </li>
      </ul>

      <div class="mt-7 flex items-center gap-3">
        <button v-if="at > 0" type="button" class="inline-flex h-12 cursor-pointer items-center gap-2 border border-[#f1f1ef]/50 px-5 text-[14px] font-semibold hover:bg-[#f1f1ef] hover:text-[#1d1e1f]" @click="at--"><ArrowLeft :size="16" /> Back</button>
        <button v-if="!last" type="button" class="inline-flex h-12 cursor-pointer items-center gap-2 bg-[#e3c476] px-7 text-[14px] font-semibold text-[#1d1e1f] hover:bg-white" @click="at++">Next <ArrowRight :size="16" /></button>
        <button v-else type="button" class="inline-flex h-12 cursor-pointer items-center gap-2 bg-[#e3c476] px-7 text-[14px] font-semibold text-[#1d1e1f] hover:bg-white" @click="finish">Make my guide <ArrowRight :size="16" /></button>
      </div>
    </div>
  </section>
</template>
