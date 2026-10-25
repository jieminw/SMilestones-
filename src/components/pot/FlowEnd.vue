<script setup lang="ts">
import { computed } from "vue";
import { Landmark } from "lucide-vue-next";
import { useCouple } from "@/stores/app";
import type { Pot } from "@/domain/types";
import { fmt, type Cents } from "@/domain/money";
import { potBalance } from "@/domain/selectors";
import PotIcon from "@/components/art/PotIcon.vue";

const props = defineProps<{ label: string; p: Pot | "joint"; delta: Cents }>();
const { s } = useCouple();
const bal = computed(() => (props.p === "joint" ? null : potBalance(s.value, props.p.id)));
</script>

<template>
  <div class="flex-1 rounded-2xl border border-line bg-white/50 p-4">
    <div class="text-xs font-semibold tracking-wide text-muted uppercase">{{ label }}</div>
    <div class="mt-2 flex items-center gap-2 font-semibold">
      <Landmark v-if="p === 'joint'" :size="17" />
      <PotIcon v-else :kind="p.kind" :size="17" />
      {{ p === "joint" ? "Your joint account" : p.name }}
    </div>
    <div v-if="bal !== null" class="tabular mt-3 text-sm">
      <div class="text-muted">Now {{ fmt(bal) }}</div>
      <div class="font-semibold">After {{ fmt(bal + delta) }}</div>
    </div>
    <div v-else class="mt-3 text-sm text-muted">Outside SMilestones</div>
  </div>
</template>
