<script setup lang="ts">
import { computed } from "vue";
import { Clock } from "lucide-vue-next";
import { useCouple } from "@/stores/app";
import type { ApprovalRequest } from "@/domain/types";
import { fmt } from "@/domain/money";
import { firstName, partnerOf } from "@/domain/selectors";
import { REQUEST_TTL_HOURS } from "@/domain/engine";
import { useCountdown } from "@/composables/useCountdown";
import Button from "@/components/ui/Button.vue";

const props = defineProps<{ request: ApprovalRequest }>();
const emit = defineEmits<{ close: [] }>();
const { app, s } = useCouple();
const { label } = useCountdown(() => props.request.expires_at);
const partner = computed(() => partnerOf(s.value, app.meId));
const to = computed(() => (props.request.to_pot_id ? s.value.pots.find((p) => p.id === props.request.to_pot_id) : null));
const from = computed(() => s.value.pots.find((p) => p.id === props.request.pot_id));

async function cancel() {
  const r = await app.dispatch({ type: "cancelRequest", requestId: props.request.id }, { success: "Request cancelled." });
  if (r.ok) emit("close");
}
</script>

<template>
  <div class="text-center">
    <h2 class="text-2xl font-semibold">Waiting for {{ firstName(partner) }}</h2>
    <p class="mt-2 text-muted">We've notified {{ firstName(partner) }}. They have {{ REQUEST_TTL_HOURS }} hours to approve.</p>
    <div class="mt-5 flex items-center justify-center gap-3 font-serif text-[42px]"><Clock :size="30" /> {{ label }}</div>
    <div class="text-sm text-muted">left to respond</div>
    <div class="mt-5 rounded-2xl bg-surface-2 p-4">
      <div class="tabular text-2xl font-semibold">{{ fmt(request.amount) }}</div>
      <div class="text-sm text-muted">{{ to ? `${from?.name} → ${to.name}` : `Withdrawal from ${from?.name}` }}</div>
    </div>
    <p class="mt-4 text-sm text-muted">No funds have moved yet.</p>
    <div class="mt-5 flex gap-3">
      <Button variant="ghost" class="flex-1" @click="cancel">Cancel request</Button>
      <Button variant="navy" class="flex-1" @click="emit('close')">Done</Button>
    </div>
  </div>
</template>
