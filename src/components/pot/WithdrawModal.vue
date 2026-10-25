<script lang="ts">
export type WithdrawInit = { mode: "joint" | "pot"; toPotId?: string; amount?: number; reason?: string };
</script>

<script setup lang="ts">
import { computed, ref } from "vue";
import { ArrowRight, Clock, Landmark, MoveRight } from "lucide-vue-next";
import { useCouple } from "@/stores/app";
import type { Pot } from "@/domain/types";
import { fmt, parseMoney } from "@/domain/money";
import { availableBalance, firstName, partnerOf, potBalance, potTarget } from "@/domain/selectors";
import { REQUEST_TTL_HOURS } from "@/domain/engine";
import { inputCls } from "@/lib/cx";
import Button from "@/components/ui/Button.vue";
import Field from "@/components/ui/Field.vue";
import Modal from "@/components/ui/Modal.vue";
import MoneyInput from "@/components/ui/MoneyInput.vue";
import Notice from "@/components/ui/Notice.vue";
import FlowEnd from "./FlowEnd.vue";
import TimelineImpact from "./TimelineImpact.vue";
import WaitingCard from "./WaitingCard.vue";

/** Withdraw / move (Figma W1–W8). Mount with v-if so every opening starts fresh. */
type WStep = "choose" | "amount" | "review" | "waiting";
const props = defineProps<{ pot: Pot; initial?: WithdrawInit }>();
const emit = defineEmits<{ close: [] }>();

const { app, s } = useCouple();
const step = ref<WStep>(props.initial ? "amount" : "choose");
const mode = ref<"joint" | "pot">(props.initial?.mode ?? "joint");
const toPotId = ref<string>(props.initial?.toPotId ?? "");
const amount = ref(props.initial?.amount ? String(props.initial.amount / 100) : "");
const reason = ref(props.initial?.reason ?? "");
const busy = ref(false);
const requestId = ref<string | null>(null);

const partner = computed(() => partnerOf(s.value, app.meId));
const isTo = computed(() => mode.value === "pot");
const others = computed(() => s.value.pots.filter((p) => p.id !== props.pot.id && p.status === "active"));
const available = computed(() => availableBalance(s.value, props.pot.id));
const cents = computed(() => parseMoney(amount.value));
const target = computed(() => s.value.pots.find((p) => p.id === toPotId.value));
const targetRoom = computed(() => (target.value ? potTarget(s.value, target.value.id) - potBalance(s.value, target.value.id) : 0));
const error = computed(() => {
  const c = cents.value;
  if (c !== null && c > available.value) return `Only ${fmt(available.value)} is available${available.value < potBalance(s.value, props.pot.id) ? " (some is waiting on another request)" : ""}.`;
  if (target.value && c !== null && c > targetRoom.value) return `${target.value.name} only needs ${fmt(targetRoom.value)} more.`;
  return null;
});
const request = computed(() => (requestId.value ? s.value.requests.find((r) => r.id === requestId.value) : undefined));
const title = computed(() => (step.value === "waiting" ? undefined : step.value === "choose" ? "Where should it go?" : step.value === "amount" ? (isTo.value ? "Move to another pot" : "Withdraw to your joint account") : "Review"));
const choices = computed(() => [
  { m: "joint" as const, icon: Landmark, title: "Withdraw to joint account", sub: "Take money out of this goal for something else.", disabled: false },
  { m: "pot" as const, icon: MoveRight, title: "Move to another pot", sub: others.value.length ? `e.g. ${others.value[0].name}` : "You need another active pot first.", disabled: !others.value.length },
]);

function choose(m: "joint" | "pot") {
  mode.value = m;
  if (m === "pot") toPotId.value = others.value[0]?.id ?? "";
  step.value = "amount";
}

async function submit() {
  if (!cents.value) return;
  busy.value = true;
  const r = isTo.value
    ? await app.dispatch({ type: "requestTransfer", fromPotId: props.pot.id, toPotId: toPotId.value, amount: cents.value, reason: reason.value })
    : await app.dispatch({ type: "requestWithdrawal", potId: props.pot.id, amount: cents.value, reason: reason.value });
  busy.value = false;
  if (r.ok) {
    requestId.value = r.createdId ?? null;
    step.value = "waiting";
  }
}
</script>

<template>
  <Modal open :width="520" :title="title" @close="emit('close')">
    <div v-if="step === 'choose'" class="flex flex-col gap-3">
      <p class="-mt-2 mb-2 text-sm text-muted">{{ fmt(available) }} available in {{ pot.name }}. Money leaving a shared pot needs {{ firstName(partner) }}'s OK.</p>
      <button
        v-for="o in choices"
        :key="o.m"
        type="button"
        :disabled="o.disabled"
        class="flex cursor-pointer items-center gap-4 rounded-2xl border border-line bg-white/50 p-4 text-left hover:border-navy disabled:cursor-not-allowed disabled:opacity-50"
        @click="choose(o.m)"
      >
        <span class="flex size-11 items-center justify-center rounded-2xl bg-surface-2"><component :is="o.icon" :size="20" /></span>
        <span class="flex-1">
          <span class="block font-semibold">{{ o.title }}</span>
          <span class="block text-sm text-muted">{{ o.sub }}</span>
        </span>
        <ArrowRight :size="18" class="text-faint" />
      </button>
    </div>

    <div v-else-if="step === 'amount'" class="flex flex-col gap-4">
      <Field v-if="isTo" v-slot="{ id }" label="Move to">
        <select :id="id" v-model="toPotId" :class="inputCls">
          <option v-for="p in others" :key="p.id" :value="p.id">{{ p.name }} · needs {{ fmt(potTarget(s, p.id) - potBalance(s, p.id)) }}</option>
        </select>
      </Field>
      <Field v-slot="{ id }" label="Amount" :error="error" :hint="`${fmt(available)} available`">
        <MoneyInput :id="id" v-model="amount" autofocus :invalid="!!error" />
      </Field>
      <Field v-slot="{ id }" label="Reason" :hint="`${firstName(partner)} sees this when approving.`">
        <input :id="id" v-model="reason" :class="inputCls" maxlength="100" :placeholder="isTo ? 'e.g. Lease signing moved earlier' : 'e.g. Wedding deposit'" />
      </Field>
      <div class="mt-2 flex gap-3">
        <Button variant="secondary" class="flex-1" @click="initial ? emit('close') : (step = 'choose')">Back</Button>
        <Button class="flex-1" :disabled="!cents || !!error || (isTo && !toPotId)" @click="step = 'review'">Review</Button>
      </div>
    </div>

    <div v-else-if="step === 'review' && cents">
      <div class="flex items-stretch gap-3">
        <FlowEnd label="From" :p="pot" :delta="-cents" />
        <div class="flex items-center text-faint"><ArrowRight :size="20" /></div>
        <FlowEnd label="To" :p="isTo && target ? target : 'joint'" :delta="cents" />
      </div>
      <div class="mt-4 rounded-2xl bg-surface-2 p-4">
        <div class="text-sm text-muted">Amount</div>
        <div class="tabular font-serif text-3xl">{{ fmt(cents) }}</div>
        <div v-if="reason" class="mt-1 text-sm text-muted">“{{ reason }}”</div>
      </div>
      <TimelineImpact v-if="pot.sequential" :pot="pot" :minus="cents" />
      <Notice class="mt-4">
        <template #icon><Clock :size="15" /></template>
        {{ firstName(partner) }} has {{ REQUEST_TTL_HOURS }} hours to approve. Nothing moves until then, and the amount is held so it can't be requested twice.
      </Notice>
      <div class="mt-5 flex gap-3">
        <Button variant="secondary" class="flex-1" @click="step = 'amount'">Back</Button>
        <Button class="flex-1" :loading="busy" @click="submit">Send for approval</Button>
      </div>
    </div>

    <WaitingCard v-else-if="step === 'waiting' && request" :request="request" @close="emit('close')" />
  </Modal>
</template>
