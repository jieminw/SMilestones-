<script setup lang="ts">
import { TriangleAlert } from "lucide-vue-next";
import type { Pot } from "@/domain/types";
import { fmt, type Cents } from "@/domain/money";
import Button from "@/components/ui/Button.vue";
import Modal from "@/components/ui/Modal.vue";
import Notice from "@/components/ui/Notice.vue";

/** Figma 24–26: "Timeline moved earlier" → choose how to cover the gap. Mount with v-if="gap". */
defineProps<{ pot: Pot; gap: { need: Cents; agreed: Cents } }>();
const emit = defineEmits<{ close: []; raise: []; move: [] }>();
</script>

<template>
  <Modal open title="Your plan needs a top-up" :width="480" @close="emit('close')">
    <Notice tone="warn">
      <template #icon><TriangleAlert :size="16" /></template>
      To stay on schedule for {{ pot.name }} you now need <strong>{{ fmt(gap.need) }}/month</strong>, {{ fmt(gap.need - gap.agreed) }} more than you agreed.
    </Notice>
    <div class="mt-5 flex flex-col gap-3">
      <button type="button" class="cursor-pointer rounded-2xl border border-line bg-white/5 p-4 text-left hover:border-navy" @click="emit('raise')">
        <div class="font-semibold">Increase monthly savings</div>
        <div class="text-sm text-muted">Propose a new split of {{ fmt(gap.need) }}/month. Your partner approves it.</div>
      </button>
      <button type="button" class="cursor-pointer rounded-2xl border border-line bg-white/5 p-4 text-left hover:border-navy" @click="emit('move')">
        <div class="font-semibold">Move money from another pot</div>
        <div class="text-sm text-muted">Cover part of the gap now from a pot that can spare it. Needs approval too.</div>
      </button>
      <Button variant="ghost" @click="emit('close')">Keep the current plan for now</Button>
    </div>
  </Modal>
</template>
