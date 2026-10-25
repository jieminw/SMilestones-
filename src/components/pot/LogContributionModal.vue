<script setup lang="ts">
import { computed, ref } from "vue";
import { Check } from "lucide-vue-next";
import { useCouple } from "@/stores/app";
import type { Pot } from "@/domain/types";
import { fmt, parseMoney, type Cents } from "@/domain/money";
import { todayISO } from "@/domain/dates";
import { activeSplit, firstName, partnerOf, potBalance, potTarget } from "@/domain/selectors";
import { contributionReward } from "@/domain/pet";
import { inputCls } from "@/lib/cx";
import Button from "@/components/ui/Button.vue";
import Field from "@/components/ui/Field.vue";
import Modal from "@/components/ui/Modal.vue";
import MoneyInput from "@/components/ui/MoneyInput.vue";

/** Log contribution (Figma 17–19). Mount with v-if so every opening starts with a fresh form. */
const props = defineProps<{ pot: Pot }>();
const emit = defineEmits<{ close: [] }>();

const { app, s } = useCouple();
const amount = ref("");
const date = ref(todayISO());
const note = ref("");
const moved = ref(false);
const busy = ref(false);
const done = ref<{ amount: Cents; xp: number; coins: number } | null>(null);

const cents = computed(() => parseMoney(amount.value));
const room = computed(() => potTarget(s.value, props.pot.id) - potBalance(s.value, props.pot.id));
const share = computed(() => activeSplit(s.value, props.pot.id)?.shares[app.meId]);
const error = computed(() => (cents.value !== null && cents.value > room.value ? `That's ${fmt(cents.value - room.value)} more than ${props.pot.name} still needs (${fmt(room.value)}).` : null));
const quick = computed(() => (share.value ? [share.value, Math.round(share.value / 2 / 100) * 100, 5000].filter((v, i, a) => v > 0 && a.indexOf(v) === i) : []));

async function submit() {
  if (!cents.value) return;
  busy.value = true;
  const r = await app.dispatch({ type: "logContribution", potId: props.pot.id, amount: cents.value, occurred_on: date.value, note: note.value });
  busy.value = false;
  if (r.ok) done.value = { amount: cents.value, ...contributionReward(cents.value) };
}
</script>

<template>
  <Modal open :title="done ? undefined : `Log contribution · ${pot.name}`" :width="460" :hide-close="!!done" @close="emit('close')">
    <div v-if="done" class="text-center">
      <div class="anim-pop mx-auto flex size-16 items-center justify-center rounded-full bg-navy text-white"><Check :size="32" /></div>
      <h2 class="mt-5 text-2xl font-semibold">{{ fmt(done.amount) }} added</h2>
      <p class="mt-2 text-muted">
        {{ firstName(partnerOf(s, app.meId)) }} has been notified. {{ s.couple.pet_name }} earned <strong class="text-ink">+{{ done.xp }} XP</strong> and
        <strong class="text-ink">{{ done.coins }} coins</strong>.
      </p>
      <Button class="mt-6 w-full" @click="emit('close')">Done</Button>
    </div>
    <div v-else class="flex flex-col gap-4">
      <Field v-slot="{ id }" label="Amount" :error="error" :hint="share ? `Your agreed share is ${fmt(share)}/month.` : undefined">
        <MoneyInput :id="id" v-model="amount" autofocus :invalid="!!error" />
      </Field>
      <div v-if="quick.length" class="-mt-1 flex gap-2">
        <button v-for="v in quick" :key="v" type="button" class="cursor-pointer rounded-[3px] border border-line px-3 py-1 text-sm hover:bg-surface-2" @click="amount = String(v / 100)">{{ fmt(v) }}</button>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <Field v-slot="{ id }" label="Date">
          <input :id="id" v-model="date" type="date" :class="inputCls" :max="todayISO()" @change="!date && (date = todayISO())" />
        </Field>
        <Field v-slot="{ id }" label="Note (optional)">
          <input :id="id" v-model="note" :class="inputCls" maxlength="80" placeholder="e.g. Bonus" />
        </Field>
      </div>
      <label class="flex cursor-pointer items-start gap-3 rounded-2xl bg-surface-2 p-4 text-sm">
        <input v-model="moved" type="checkbox" class="mt-0.5 size-4 accent-[#06363c]" />
        <span>
          <span class="font-medium text-ink">I've moved this money into our savings account</span>
          <span class="block text-muted">SMilestones records it; it doesn't move money for you.</span>
        </span>
      </label>
      <Button size="lg" :disabled="!cents || !!error || !moved" :loading="busy" @click="submit">Confirm &amp; log {{ cents ? fmt(cents) : "" }}</Button>
    </div>
  </Modal>
</template>
