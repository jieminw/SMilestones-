<script setup lang="ts">
import { computed, ref } from "vue";
import { Info, TriangleAlert } from "lucide-vue-next";
import { useCouple } from "@/stores/app";
import type { Transaction } from "@/domain/types";
import { fmt, parseMoney } from "@/domain/money";
import { fmtDay, todayISO } from "@/domain/dates";
import { firstName, partnerOf, profileOf, stageProgress } from "@/domain/selectors";
import { inputCls } from "@/lib/cx";
import Button from "@/components/ui/Button.vue";
import Drawer from "@/components/ui/Drawer.vue";
import Field from "@/components/ui/Field.vue";
import Modal from "@/components/ui/Modal.vue";
import MoneyInput from "@/components/ui/MoneyInput.vue";
import Notice from "@/components/ui/Notice.vue";
import PotIcon from "@/components/art/PotIcon.vue";

/** Edit / delete (Figma A3–B6). Mount with :key="tx.id" so each entry gets a fresh form. */
const props = defineProps<{ tx: Transaction }>();
const emit = defineEmits<{ close: [] }>();

const { app, s } = useCouple();
const amount = ref(String(props.tx.amount / 100));
const date = ref(props.tx.occurred_on);
const note = ref(props.tx.note);
const error = ref<string | null>(null);
const confirm = ref<"discard" | "delete" | "reopen" | null>(null);
const busy = ref(false);

const pot = computed(() => s.value.pots.find((p) => p.id === props.tx.pot_id)!);
const mine = computed(() => props.tx.user_id === app.meId && props.tx.kind === "contribution");
const cents = computed(() => parseMoney(amount.value));
const dirty = computed(() => cents.value !== props.tx.amount || date.value !== props.tx.occurred_on || note.value !== props.tx.note);
const who = computed(() => profileOf(s.value, props.tx.user_id));

// Would this edit reopen a completed stage? (Figma B6)
const reopens = computed(() => {
  const c = cents.value;
  const p = pot.value;
  if (!c || !p.sequential || c >= props.tx.amount) return null;
  const before = stageProgress(s.value, p).filter((x) => x.status === "done").length;
  const fake = { ...s.value, transactions: s.value.transactions.map((t) => (t.id === props.tx.id ? { ...t, amount: c } : t)) };
  const after = stageProgress(fake, p).filter((x) => x.status === "done").length;
  return after < before ? stageProgress(s.value, p)[after].stage.name : null;
});

const close = () => (dirty.value && mine.value ? (confirm.value = "discard") : emit("close"));

async function save(force = false) {
  if (!cents.value) {
    error.value = "Enter an amount greater than $0.";
    return;
  }
  if (reopens.value && !force) {
    confirm.value = "reopen";
    return;
  }
  busy.value = true;
  const before = { amount: props.tx.amount, occurred_on: props.tx.occurred_on, note: props.tx.note };
  const r = await app.dispatch(
    { type: "editContribution", txId: props.tx.id, amount: cents.value, occurred_on: date.value, note: note.value },
    { success: "Contribution updated.", undo: { cmd: { type: "editContribution", txId: props.tx.id, ...before } } },
  );
  busy.value = false;
  if (r.ok) emit("close");
  else error.value = r.error;
}

async function del() {
  busy.value = true;
  const r = await app.dispatch(
    { type: "deleteContribution", txId: props.tx.id },
    { success: `${fmt(props.tx.amount)} contribution deleted.`, undo: { cmd: { type: "restoreContribution", txId: props.tx.id } } },
  );
  busy.value = false;
  if (r.ok) emit("close");
}
</script>

<template>
  <Drawer open :title="mine ? 'Edit contribution' : 'Contribution details'" @close="close">
    <div class="mb-6 flex items-center gap-3 rounded-2xl bg-surface-2 p-4">
      <PotIcon :kind="pot.kind" />
      <div class="text-sm">
        <div class="font-medium">{{ pot.name }}</div>
        <div class="text-muted">
          {{ tx.kind === "contribution" ? "Contribution" : tx.kind === "withdrawal" ? "Approved withdrawal" : "Approved transfer" }} by {{ firstName(who) }} · logged {{ fmtDay(tx.created_at.slice(0, 10)) }}
          {{ tx.edited_at ? ` · edited ${fmtDay(tx.edited_at.slice(0, 10))}` : "" }}
        </div>
      </div>
    </div>
    <div v-if="mine" class="flex flex-col gap-4">
      <Field v-slot="{ id }" label="Amount" :error="error">
        <MoneyInput :id="id" v-model="amount" :invalid="!!error" @update:model-value="error = null" />
      </Field>
      <Field v-slot="{ id }" label="Date">
        <input :id="id" v-model="date" type="date" :class="inputCls" :max="todayISO()" />
      </Field>
      <Field v-slot="{ id }" label="Note">
        <input :id="id" v-model="note" :class="inputCls" maxlength="80" />
      </Field>
      <Notice>
        <template #icon><Info :size="15" /></template>
        Balances, stage progress, {{ firstName(partnerOf(s, app.meId)) }}'s view and {{ s.couple.pet_name }}'s XP all update from this one entry.
      </Notice>
    </div>
    <dl v-else class="grid grid-cols-2 gap-y-4 text-sm">
      <dt class="text-muted">Amount</dt>
      <dd class="tabular text-right font-semibold">{{ fmt(tx.amount) }}</dd>
      <dt class="text-muted">Date</dt>
      <dd class="text-right">{{ fmtDay(tx.occurred_on) }}</dd>
      <dt class="text-muted">Note</dt>
      <dd class="text-right">{{ tx.note || "—" }}</dd>
      <dt class="col-span-2 mt-2 text-xs text-faint">Only {{ firstName(who) }} can edit this entry.</dt>
    </dl>

    <template #footer>
      <div v-if="mine" class="flex gap-3">
        <Button variant="ghost" class="text-bad hover:bg-bad-soft" @click="confirm = 'delete'">Delete</Button>
        <Button variant="secondary" class="ml-auto" @click="close">Cancel</Button>
        <Button :disabled="!dirty" :loading="busy" @click="save()">Save changes</Button>
      </div>
      <Button v-else variant="secondary" class="w-full" @click="emit('close')">Close</Button>
    </template>
  </Drawer>

  <Modal :open="confirm === 'discard'" title="Discard changes?" :width="400" @close="confirm = null">
    <p class="text-muted">Your edits to this contribution won't be saved. The original entry stays as it is.</p>
    <div class="mt-6 flex gap-3">
      <Button variant="secondary" class="flex-1" @click="confirm = null">Keep editing</Button>
      <Button
        variant="danger"
        class="flex-1"
        @click="
          confirm = null;
          emit('close');
        "
      >
        Discard
      </Button>
    </div>
  </Modal>
  <Modal :open="confirm === 'delete'" title="Delete this contribution?" :width="420" @close="confirm = null">
    <p class="text-muted">
      {{ fmt(tx.amount) }} will be removed from {{ pot.name }}. Progress and {{ s.couple.pet_name }}'s rewards adjust, and {{ firstName(partnerOf(s, app.meId)) }} is notified. You can undo straight after.
    </p>
    <div class="mt-6 flex gap-3">
      <Button variant="secondary" class="flex-1" @click="confirm = null">Keep it</Button>
      <Button variant="danger" class="flex-1" :loading="busy" @click="del">Delete contribution</Button>
    </div>
  </Modal>
  <Modal :open="confirm === 'reopen'" title="This reopens a completed stage" :width="440" @close="confirm = null">
    <Notice tone="warn">
      <template #icon><TriangleAlert :size="16" /></template>
      Lowering this to {{ cents ? fmt(cents) : "" }} means <strong>{{ reopens }}</strong> is no longer fully funded. Later stages wait until it's complete again.
    </Notice>
    <div class="mt-6 flex gap-3">
      <Button variant="secondary" class="flex-1" @click="confirm = null">Go back</Button>
      <Button
        class="flex-1"
        :loading="busy"
        @click="
          confirm = null;
          void save(true);
        "
      >
        Save anyway
      </Button>
    </div>
  </Modal>
</template>
