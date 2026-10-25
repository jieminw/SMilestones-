<script setup lang="ts">
import { computed } from "vue";
import { PRIORITIES } from "@/data/renoAdvice";
import { guideState as g } from "@/stores/renoGuideState";

/** For each priority picked on the facing page: where the money earns its keep, and where it can wait. */
defineProps<{ compact: boolean }>();
defineEmits<{ back: [] }>();
const chosen = computed(() => g.picks.map((id) => PRIORITIES.find((p) => p.id === id)!).filter(Boolean));
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col overflow-y-auto pr-1">
    <template v-if="chosen.length">
      <ul class="flex flex-col gap-3">
        <li v-for="p in chosen" :key="p.id">
          <p class="font-serif text-[17px] leading-tight font-semibold">{{ p.label }}</p>
          <ul class="mt-1 flex flex-col gap-0.5">
            <li v-for="s in p.spend" :key="s" class="flex gap-2 text-[12px] leading-snug"><span class="font-semibold text-[#097c87]" aria-hidden="true">+</span><span>{{ s }}</span></li>
          </ul>
          <p class="mt-1 flex gap-2 text-[12px] leading-snug text-[#48767c]"><span class="font-semibold" aria-hidden="true">−</span><span>Spend less on: {{ p.save }}</span></p>
        </li>
      </ul>
      <p class="mt-3 text-[11px] leading-relaxed text-[#48767c]">General guidance, not rules. Your designer and your budget decide what fits.</p>
    </template>
    <template v-else>
      <p class="text-[13px] leading-relaxed text-[#48767c]">You skipped the question about what matters most. Answer it, and this page will say where to spend and where to save.</p>
      <button type="button" class="mt-4 inline-flex cursor-pointer items-center gap-2 self-start bg-[#06363c] px-5 py-3 text-[10.5px] font-medium tracking-[0.22em] text-[#e4f4f3] uppercase transition-colors hover:bg-[#097c87]" @click="$emit('back')"><span aria-hidden="true">←</span> Add my priorities</button>
    </template>
  </div>
</template>
