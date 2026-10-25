<script setup lang="ts">
import { computed, ref } from "vue";
import { useCouple } from "@/stores/app";
import type { Pot } from "@/domain/types";
import { fmt, type Cents } from "@/domain/money";
import { activeSplit, potStages, requiredMonthly } from "@/domain/selectors";
import { cx, inputCls } from "@/lib/cx";
import Button from "@/components/ui/Button.vue";
import Field from "@/components/ui/Field.vue";
import Modal from "@/components/ui/Modal.vue";
import Notice from "@/components/ui/Notice.vue";

/** Timeline change (Figma 21–28). Mount with v-if. */
const props = defineProps<{ pot: Pot }>();
const emit = defineEmits<{ close: []; gap: [gap: { need: Cents; agreed: Cents }] }>();

const { app, s } = useCouple();
const stages = computed(() => potStages(s.value, props.pot.id));
const dates = ref<Record<string, string>>(Object.fromEntries(stages.value.filter((x) => x.due_date).map((x) => [x.id, x.due_date!])));
const target = ref(props.pot.target_date);
const busy = ref(false);

const preview = computed(() => {
  const fake = {
    ...s.value,
    pots: s.value.pots.map((p) => (p.id === props.pot.id ? { ...p, target_date: target.value } : p)),
    stages: s.value.stages.map((st) => (dates.value[st.id] ? { ...st, due_date: dates.value[st.id] } : st)),
  };
  return { before: requiredMonthly(s.value, props.pot), after: requiredMonthly(fake, { ...props.pot, target_date: target.value }) };
});
const agreed = computed(() => activeSplit(s.value, props.pot.id)?.monthly_total ?? 0);
const outOfOrder = computed(() => {
  const order = stages.value.filter((x) => x.due_date).map((x) => dates.value[x.id] ?? x.due_date);
  return order.some((d, i) => i > 0 && d! < order[i - 1]!);
});

function setDate(id: string, v: string) {
  if (v) dates.value = { ...dates.value, [id]: v };
}

async function save() {
  busy.value = true;
  const last = stages.value[stages.value.length - 1];
  const r = await app.dispatch(
    { type: "changeDates", potId: props.pot.id, target_date: props.pot.sequential ? (dates.value[last.id] ?? target.value) : target.value, stageDates: dates.value },
    { success: "Timeline updated." },
  );
  busy.value = false;
  if (!r.ok) return;
  emit("close");
  if (preview.value.after > agreed.value) emit("gap", { need: preview.value.after, agreed: agreed.value });
}
</script>

<template>
  <Modal open title="Change dates" :width="480" @close="emit('close')">
    <p class="-mt-2 mb-5 text-sm text-muted">HDB timelines shift. Update them here and we'll re-check your monthly plan.</p>
    <div class="flex flex-col gap-4">
      <template v-if="pot.sequential">
        <Field v-for="st in stages.filter((x) => x.due_date)" :key="st.id" v-slot="{ id }" :label="st.name">
          <input :id="id" type="date" :class="inputCls" :value="dates[st.id] ?? ''" @change="setDate(st.id, ($event.target as HTMLInputElement).value)" />
        </Field>
      </template>
      <Field v-else v-slot="{ id }" label="Target date">
        <input :id="id" v-model="target" type="date" :class="inputCls" />
      </Field>
    </div>
    <Notice v-if="outOfOrder" tone="bad" class="mt-4">Stages must stay in order: each date should be on or after the one before.</Notice>
    <div :class="cx('mt-5 rounded-2xl p-4', preview.after > agreed ? 'bg-warn-soft' : 'bg-surface-2')">
      <div class="flex justify-between text-sm"><span class="text-muted">Needed per month now</span><span class="tabular">{{ fmt(preview.before) }}</span></div>
      <div class="mt-1 flex justify-between text-sm font-semibold"><span>With new dates</span><span class="tabular">{{ fmt(preview.after) }}</span></div>
      <div class="mt-1 flex justify-between text-sm"><span class="text-muted">You agreed to</span><span class="tabular">{{ fmt(agreed) }}</span></div>
    </div>
    <div class="mt-5 flex gap-3">
      <Button variant="secondary" class="flex-1" @click="emit('close')">Cancel</Button>
      <Button class="flex-1" :disabled="outOfOrder" :loading="busy" @click="save">Save dates</Button>
    </div>
  </Modal>
</template>
