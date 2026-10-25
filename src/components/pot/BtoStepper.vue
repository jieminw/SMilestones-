<script setup lang="ts">
import { computed } from "vue";
import { Check, Hammer, KeyRound } from "lucide-vue-next";
import { useCouple } from "@/stores/app";
import type { Pot } from "@/domain/types";
import { stageProgress } from "@/domain/selectors";
import { cx } from "@/lib/cx";

/** Book → Lease → Build → Keys → Repay (Figma 16). */
const props = defineProps<{ pot: Pot }>();
const { s } = useCouple();

const sp = computed(() => stageProgress(s.value, props.pot));
const doneCount = computed(() => sp.value.filter((x) => x.status === "done").length);
const steps = [
  { label: "Book", icon: null, idx: 0 },
  { label: "Lease", icon: null, idx: 1 },
  { label: "Build", icon: Hammer, idx: 1.5 },
  { label: "Keys", icon: KeyRound, idx: 2 },
  { label: "Repay", icon: null, idx: 3 },
];
const position = (idx: number) => (idx < doneCount.value ? "done" : Math.ceil(idx) === doneCount.value || (idx === 1.5 && doneCount.value === 2) ? "current" : "upcoming");
</script>

<template>
  <div>
    <div class="flex items-center">
      <div v-for="(st, i) in steps" :key="st.label" class="flex flex-1 items-center last:flex-none">
        <div class="flex flex-col items-center gap-1.5">
          <span
            :class="
              cx(
                'flex size-10 items-center justify-center rounded-full border-2 font-serif',
                position(st.idx) === 'done' ? 'border-navy bg-navy text-white' : position(st.idx) === 'current' ? 'border-terra bg-terra text-white' : 'border-line bg-surface text-muted',
              )
            "
          >
            <Check v-if="position(st.idx) === 'done'" :size="17" />
            <component :is="st.icon" v-else-if="st.icon" :size="14" />
            <template v-else>{{ i + 1 }}</template>
          </span>
          <span :class="cx('text-sm', position(st.idx) === 'upcoming' ? 'text-muted' : 'font-medium')">{{ st.label }}</span>
        </div>
        <span v-if="i < steps.length - 1" :class="cx('mx-2 mb-6 h-0.5 flex-1', position(st.idx) === 'done' ? 'bg-navy' : 'bg-line')" />
      </div>
    </div>
    <p class="mt-2 text-center text-sm text-muted">{{ doneCount }} of {{ sp.length }} savings stages funded</p>
  </div>
</template>
