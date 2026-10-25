<script setup lang="ts">
import { computed, ref } from "vue";
import { useCouple } from "@/stores/app";
import type { ApplicationResult, Pot } from "@/domain/types";
import { BTO_PROJECTS, FLAT_TYPE_LABEL, UPCOMING_EXERCISE, type FlatTypeId } from "@/domain/bto-data";
import { todayISO } from "@/domain/dates";
import { inputCls } from "@/lib/cx";
import Button from "@/components/ui/Button.vue";
import Field from "@/components/ui/Field.vue";
import Modal from "@/components/ui/Modal.vue";

/** Log a BTO application against a pot. Mount with v-if so each opening starts fresh. */
const props = defineProps<{ pot: Pot }>();
const emit = defineEmits<{ close: [] }>();
const { app } = useCouple();

const exercises = ["Feb 2026", "Jun 2026", UPCOMING_EXERCISE.label];
const exercise = ref(exercises[1]);
const projectId = ref<string>(props.pot.bto?.project_id ?? BTO_PROJECTS[0].id);
const flatType = ref<FlatTypeId>(props.pot.bto?.flat_type ?? "4R");
const appliedOn = ref(todayISO());
const result = ref<ApplicationResult>("pending");
const queue = ref("");
const busy = ref(false);

const flats = computed(() => BTO_PROJECTS.find((p) => p.id === projectId.value)?.flats ?? []);
function onProject() {
  if (!flats.value.some((f) => f.type === flatType.value)) flatType.value = flats.value[flats.value.length - 1]?.type ?? "4R";
}

async function save() {
  busy.value = true;
  const q = queue.value.trim() ? Number(queue.value) : null;
  const r = await app.dispatch({ type: "logApplication", potId: props.pot.id, exercise: exercise.value, project_id: projectId.value, flat_type: flatType.value, applied_on: appliedOn.value, result: result.value, queue_number: q }, { success: "Application logged." });
  busy.value = false;
  if (r.ok) emit("close");
}
</script>

<template>
  <Modal open title="Log an application" :width="480" @close="emit('close')">
    <div class="flex flex-col gap-4">
      <div class="grid grid-cols-2 gap-4">
        <Field v-slot="{ id }" label="Exercise">
          <select :id="id" v-model="exercise" :class="inputCls"><option v-for="e in exercises" :key="e" :value="e">{{ e }}</option></select>
        </Field>
        <Field v-slot="{ id }" label="Date applied"><input :id="id" v-model="appliedOn" type="date" :class="inputCls" /></Field>
      </div>
      <Field v-slot="{ id }" label="Project">
        <select :id="id" v-model="projectId" :class="inputCls" @change="onProject"><option v-for="p in BTO_PROJECTS" :key="p.id" :value="p.id">{{ p.name }} · {{ p.town }}</option></select>
      </Field>
      <Field v-slot="{ id }" label="Flat type">
        <select :id="id" v-model="flatType" :class="inputCls"><option v-for="f in flats" :key="f.type" :value="f.type">{{ FLAT_TYPE_LABEL[f.type] }}</option></select>
      </Field>
      <div class="grid grid-cols-2 gap-4">
        <Field v-slot="{ id }" label="Result">
          <select :id="id" v-model="result" :class="inputCls">
            <option value="pending">Waiting for the ballot</option>
            <option value="successful">Successful</option>
            <option value="unsuccessful">Unsuccessful</option>
            <option value="declined">Declined the flat</option>
          </select>
        </Field>
        <Field v-slot="{ id }" label="Queue number (optional)"><input :id="id" v-model="queue" inputmode="numeric" :class="inputCls" placeholder="e.g. 412" /></Field>
      </div>
      <div class="mt-2 flex gap-3">
        <Button variant="secondary" class="flex-1" @click="emit('close')">Cancel</Button>
        <Button class="flex-1" :loading="busy" @click="save">Save application</Button>
      </div>
    </div>
  </Modal>
</template>
