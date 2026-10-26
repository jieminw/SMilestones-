<script setup lang="ts">
import { computed, ref } from "vue";
import { useCouple } from "@/stores/app";
import type { Cover } from "@/domain/types";
import { perMonth } from "@/domain/covers";
import { fmt } from "@/domain/money";
import { fmtMonth, relativeTime } from "@/domain/dates";
import { firstName, profileOf } from "@/domain/selectors";
import Badge from "@/components/ui/Badge.vue";
import Button from "@/components/ui/Button.vue";
import Card from "@/components/ui/Card.vue";
import PotIcon from "@/components/art/PotIcon.vue";

/** A partner offering to cover a missed share: answered by the covered partner, withdrawn by the payer. */
const props = defineProps<{ cover: Cover }>();
const { app, s } = useCouple();
const busy = ref<"yes" | "no" | "cancel" | null>(null);

const pot = computed(() => s.value.pots.find((p) => p.id === props.cover.pot_id));
const mine = computed(() => props.cover.payer_id === app.meId);
const payer = computed(() => profileOf(s.value, props.cover.payer_id));

async function answer(accept: boolean) {
  busy.value = accept ? "yes" : "no";
  await app.dispatch({ type: "respondCover", coverId: props.cover.id, accept }, { success: accept ? `Accepted. You'll pay back ${fmt(perMonth(props.cover))} a month.` : "Offer declined." });
  busy.value = null;
}
async function cancel() {
  busy.value = "cancel";
  await app.dispatch({ type: "cancelCover", coverId: props.cover.id }, { success: "Offer withdrawn." });
  busy.value = null;
}
</script>

<template>
  <Card v-if="pot" class="p-6">
    <div class="flex items-start justify-between gap-4">
      <div>
        <div class="text-sm text-muted">{{ mine ? "You offered" : `${firstName(payer)} offered` }} · {{ relativeTime(cover.created_at) }}</div>
        <div class="mt-0.5 text-lg font-semibold">{{ mine ? `Cover ${fmt(cover.amount)} of their share` : `Cover ${fmt(cover.amount)} of your share` }}</div>
        <div class="mt-1 flex items-center gap-2 text-sm text-muted">{{ pot.name }} · {{ fmtMonth(cover.month) }}</div>
      </div>
      <Badge tone="warn">{{ mine ? "Awaiting partner" : "Needs your answer" }}</Badge>
    </div>
    <p class="mt-4 rounded-lg bg-surface-2 p-3.5 text-sm">
      {{ mine ? "They" : "You" }} would pay it back as <strong>{{ fmt(perMonth(cover)) }} extra a month</strong> for {{ cover.months }} month{{ cover.months === 1 ? "" : "s" }}. The money goes into {{ pot.name }} as soon as it is accepted.
    </p>
    <div class="mt-5 flex gap-3">
      <Button v-if="mine" variant="secondary" :loading="busy === 'cancel'" @click="cancel">Withdraw offer</Button>
      <template v-else>
        <Button :loading="busy === 'yes'" @click="answer(true)">Accept cover</Button>
        <Button variant="secondary" :loading="busy === 'no'" @click="answer(false)">Decline</Button>
      </template>
    </div>
  </Card>
</template>
