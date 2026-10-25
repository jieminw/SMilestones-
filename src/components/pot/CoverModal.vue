<script setup lang="ts">
import { computed, ref } from "vue";
import { useCouple } from "@/stores/app";
import type { Pot } from "@/domain/types";
import { COVER_MONTHS_DEFAULT, COVER_MONTHS_MAX, COVER_MONTHS_MIN, monthKey, perMonth, shortfallIn } from "@/domain/covers";
import { fmt, parseMoney } from "@/domain/money";
import { fmtMonth, todayISO } from "@/domain/dates";
import { firstName, partnerOf } from "@/domain/selectors";
import { inputCls } from "@/lib/cx";
import Button from "@/components/ui/Button.vue";
import Field from "@/components/ui/Field.vue";
import Modal from "@/components/ui/Modal.vue";
import MoneyInput from "@/components/ui/MoneyInput.vue";
import Notice from "@/components/ui/Notice.vue";

/** Offer to cover the other partner's missed share this month. Mount with v-if. */
const props = defineProps<{ pot: Pot }>();
const emit = defineEmits<{ close: [] }>();
const { app, s } = useCouple();

const partner = computed(() => partnerOf(s.value, app.meId));
const month = monthKey(todayISO());
const gap = computed(() => (partner.value ? shortfallIn(s.value, props.pot.id, partner.value.id, month) : 0));
const amount = ref(String(gap.value / 100));
const months = ref(COVER_MONTHS_DEFAULT);
const busy = ref(false);

const cents = computed(() => parseMoney(amount.value));
const error = computed(() => (cents.value !== null && cents.value > gap.value ? `${firstName(partner.value)} is only ${fmt(gap.value)} short this month.` : null));

async function send() {
  if (!cents.value) return;
  busy.value = true;
  const r = await app.dispatch({ type: "proposeCover", potId: props.pot.id, month: month + "-01", amount: cents.value, months: months.value }, { success: `Offer sent to ${firstName(partner.value)}.` });
  busy.value = false;
  if (r.ok) emit("close");
}
</script>

<template>
  <Modal open :title="`Cover ${firstName(partner)}'s share`" :width="460" @close="emit('close')">
    <p class="-mt-2 mb-5 text-sm text-muted">
      {{ firstName(partner) }} is {{ fmt(gap) }} short on {{ pot.name }} for {{ fmtMonth(month + "-01") }}. Your money goes in now, and they pay it back in small extra amounts.
    </p>
    <div class="flex flex-col gap-4">
      <Field v-slot="{ id }" label="Amount to cover" :error="error"><MoneyInput :id="id" v-model="amount" :invalid="!!error" /></Field>
      <Field v-slot="{ id }" label="Pay back over">
        <select :id="id" v-model.number="months" :class="inputCls">
          <option v-for="n in COVER_MONTHS_MAX - COVER_MONTHS_MIN + 1" :key="n" :value="n + COVER_MONTHS_MIN - 1">{{ n + COVER_MONTHS_MIN - 1 }} month{{ n + COVER_MONTHS_MIN - 1 === 1 ? "" : "s" }}</option>
        </select>
      </Field>
      <Notice v-if="cents">
        {{ firstName(partner) }}'s share rises by {{ fmt(perMonth({ amount: cents, months })) }} a month for the next {{ months }} month{{ months === 1 ? "" : "s" }}. They need to accept before anything is logged.
      </Notice>
    </div>
    <div class="mt-6 flex gap-3">
      <Button variant="secondary" class="flex-1" @click="emit('close')">Cancel</Button>
      <Button class="flex-1" :disabled="!cents || !!error" :loading="busy" @click="send">Send offer</Button>
    </div>
  </Modal>
</template>
