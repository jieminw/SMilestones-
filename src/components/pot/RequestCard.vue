<script setup lang="ts">
import { computed, ref } from "vue";
import { ArrowRight, Clock, Landmark } from "lucide-vue-next";
import { useCouple } from "@/stores/app";
import type { ApprovalRequest } from "@/domain/types";
import { fmt } from "@/domain/money";
import { relativeTime } from "@/domain/dates";
import { availableBalance, firstName, potBalance, profileOf } from "@/domain/selectors";
import { useCountdown } from "@/composables/useCountdown";
import { inputCls } from "@/lib/cx";
import Badge from "@/components/ui/Badge.vue";
import Button from "@/components/ui/Button.vue";
import Card from "@/components/ui/Card.vue";
import Field from "@/components/ui/Field.vue";
import Modal from "@/components/ui/Modal.vue";
import PotIcon from "@/components/art/PotIcon.vue";

/** Figma C1/C2 (partner view) and W5 (requester view). */
const props = defineProps<{ request: ApprovalRequest }>();

const { app, s } = useCouple();
const from = computed(() => s.value.pots.find((p) => p.id === props.request.pot_id));
const to = computed(() => (props.request.to_pot_id ? s.value.pots.find((p) => p.id === props.request.to_pot_id) : null));
const mine = computed(() => props.request.requested_by === app.meId);
const who = computed(() => profileOf(s.value, props.request.requested_by));
const { label } = useCountdown(() => props.request.expires_at);
const decline = ref(false);
const note = ref("");
const busy = ref<string | null>(null);
const bal = computed(() => (from.value ? potBalance(s.value, from.value.id) : 0));

async function cancel() {
  busy.value = "cancel";
  await app.dispatch({ type: "cancelRequest", requestId: props.request.id }, { success: "Request cancelled." });
  busy.value = null;
}
async function approve() {
  busy.value = "ok";
  const r = props.request;
  await app.dispatch({ type: "respondRequest", requestId: r.id, approve: true }, { success: to.value ? `Moved ${fmt(r.amount)} to ${to.value.name}.` : `Withdrawal of ${fmt(r.amount)} approved.` });
  busy.value = null;
}
async function reject() {
  busy.value = "no";
  const r = await app.dispatch({ type: "respondRequest", requestId: props.request.id, approve: false, note: note.value }, { success: "Request declined." });
  busy.value = null;
  if (r.ok) decline.value = false;
}
</script>

<template>
  <Card v-if="from" class="p-6">
    <div class="flex items-start justify-between gap-4">
      <div>
        <div class="text-sm text-muted">{{ mine ? "You asked" : `${firstName(who)} asks` }} · {{ relativeTime(request.created_at) }}</div>
        <div class="mt-0.5 text-lg font-semibold">{{ to ? `Move ${fmt(request.amount)} to ${to.name}` : `Withdraw ${fmt(request.amount)} to your joint account` }}</div>
        <div v-if="request.reason" class="mt-1 text-sm text-muted">“{{ request.reason }}”</div>
      </div>
      <Badge tone="warn">
        <template #icon><Clock :size="12" /></template>
        {{ label }} left
      </Badge>
    </div>
    <div class="mt-4 flex items-center gap-3 text-sm">
      <div class="flex-1 rounded-2xl bg-surface-2 p-3.5">
        <div class="flex items-center gap-2 font-medium"><PotIcon :kind="from.kind" :size="15" />{{ from.name }}</div>
        <div class="tabular mt-1 text-muted">{{ fmt(bal) }} → <span class="font-semibold text-ink">{{ fmt(bal - request.amount) }}</span></div>
      </div>
      <ArrowRight :size="18" class="text-faint" />
      <div class="flex-1 rounded-2xl bg-surface-2 p-3.5">
        <div class="flex items-center gap-2 font-medium">
          <PotIcon v-if="to" :kind="to.kind" :size="15" />
          <Landmark v-else :size="15" />
          {{ to ? to.name : "Joint account" }}
        </div>
        <div class="tabular mt-1 text-muted">
          <template v-if="to">{{ fmt(potBalance(s, to.id)) }} → <span class="font-semibold text-ink">{{ fmt(potBalance(s, to.id) + request.amount) }}</span></template>
          <template v-else>Outside SMilestones</template>
        </div>
      </div>
    </div>
    <div class="mt-5 flex gap-3">
      <Button v-if="mine" variant="secondary" :loading="busy === 'cancel'" @click="cancel">Cancel request</Button>
      <template v-else>
        <Button :loading="busy === 'ok'" @click="approve">Approve</Button>
        <Button variant="secondary" @click="decline = true">Decline</Button>
      </template>
    </div>
    <Modal :open="decline" title="Decline this request?" :width="440" @close="decline = false">
      <Field v-slot="{ id }" :label="`Tell ${firstName(who)} why (optional)`">
        <input :id="id" v-model="note" :class="inputCls" autofocus maxlength="120" placeholder="e.g. Let's keep the buffer until lease signing" />
      </Field>
      <p class="mt-3 text-sm text-muted">{{ fmt(availableBalance(s, from.id) + request.amount) }} becomes available in {{ from.name }} again.</p>
      <div class="mt-6 flex gap-3">
        <Button variant="secondary" class="flex-1" @click="decline = false">Back</Button>
        <Button variant="danger" class="flex-1" :loading="busy === 'no'" @click="reject">Decline</Button>
      </div>
    </Modal>
  </Card>
</template>
