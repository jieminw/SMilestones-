<script setup lang="ts">
import { computed, ref } from "vue";
import { useCouple } from "@/stores/app";
import type { Pot } from "@/domain/types";
import { fmt, type Cents } from "@/domain/money";
import { activeSplit, firstName, partnerOf } from "@/domain/selectors";
import Button from "@/components/ui/Button.vue";
import Modal from "@/components/ui/Modal.vue";
import SplitEditor, { type SplitValue } from "./SplitEditor.vue";

/** Mount with v-if so every opening starts from the current split. */
const props = defineProps<{ pot: Pot; target: Cents; title?: string }>();
const emit = defineEmits<{ close: [] }>();

const { app, s } = useCouple();
const current = activeSplit(s.value, props.pot.id);
const split = ref<SplitValue>({ mode: current?.mode === "custom" ? "equal" : (current?.mode ?? "equal"), shares: current?.shares ?? {} });
const busy = ref(false);
const partner = computed(() => partnerOf(s.value, app.meId));

async function send() {
  busy.value = true;
  const r = await app.dispatch({ type: "proposeSplit", potId: props.pot.id, mode: split.value.mode, shares: split.value.shares }, { success: `Sent to ${firstName(partner.value)}.` });
  busy.value = false;
  if (r.ok) emit("close");
}
</script>

<template>
  <Modal open :title="title ?? 'Propose a new split'" :width="520" @close="emit('close')">
    <p class="-mt-2 mb-5 text-sm text-muted">Target {{ fmt(target) }}/month for {{ pot.name }}. {{ firstName(partner) }} needs to accept before it replaces the current split.</p>
    <SplitEditor v-model="split" :target="target" :profiles="s.profiles" :me-id="app.meId" />
    <div class="mt-6 flex gap-3">
      <Button variant="secondary" class="flex-1" @click="emit('close')">Cancel</Button>
      <Button class="flex-1" :loading="busy" @click="send">Send to {{ firstName(partner) }}</Button>
    </div>
  </Modal>
</template>
