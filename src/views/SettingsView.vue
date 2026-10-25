<script setup lang="ts">
import { ref } from "vue";
import { Info, RotateCcw } from "lucide-vue-next";
import { useApp } from "@/stores/app";
import { updateProfileAction } from "@/lib/api";
import { parseMoney } from "@/domain/money";
import { inputCls } from "@/lib/cx";
import Page from "@/layouts/Page.vue";
import PageHeader from "@/layouts/PageHeader.vue";
import Button from "@/components/ui/Button.vue";
import Card from "@/components/ui/Card.vue";
import Field from "@/components/ui/Field.vue";
import MoneyInput from "@/components/ui/MoneyInput.vue";
import Notice from "@/components/ui/Notice.vue";
import SectionTitle from "@/components/ui/SectionTitle.vue";
import Segmented from "@/components/ui/Segmented.vue";

const app = useApp();
const name = ref(app.me?.display_name ?? "");
const age = ref(app.me?.age ? String(app.me.age) : "");
const income = ref(app.me?.monthly_income ? String(app.me.monthly_income) : "");
const oa = ref(app.me?.cpf_oa ? String(app.me.cpf_oa / 100) : "");
const first = ref<"yes" | "no">(app.me?.first_timer === false ? "no" : "yes");
const couple = ref(app.state?.couple.name ?? "");
const busy = ref(false);

async function save() {
  busy.value = true;
  const inc = parseMoney(income.value);
  const r = await updateProfileAction({ display_name: name.value, age: age.value ? Number(age.value) : null, monthly_income: inc ? Math.round(inc / 100) : null, cpf_oa: parseMoney(oa.value), first_timer: first.value === "yes" });
  if (r.ok) {
    await app.refresh();
    app.toast("Profile saved.");
  } else app.toast(r.error, "bad");
  busy.value = false;
}
</script>

<template>
  <Page>
    <PageHeader title="Settings" />
    <div class="grid max-w-[860px] grid-cols-1 gap-6">
      <Card class="p-7">
        <SectionTitle>Your profile</SectionTitle>
        <Notice v-if="app.mode === 'demo'">
          <template #icon><Info :size="15" /></template>
          Profiles are fixed in the demo. Create an account to set your own.
        </Notice>
        <div v-else class="grid grid-cols-2 gap-5">
          <Field v-slot="{ id }" label="Name"><input :id="id" v-model="name" :class="inputCls" /></Field>
          <Field v-slot="{ id }" label="Age"><input :id="id" v-model="age" type="number" :class="inputCls" /></Field>
          <Field v-slot="{ id }" label="Gross monthly income" hint="Only used to suggest an income-based split and your BTO eligibility.">
            <MoneyInput :id="id" v-model="income" suffix="/ month" />
          </Field>
          <Field v-slot="{ id }" label="CPF Ordinary Account balance" hint="Used to project how much CPF can go towards your BTO."><MoneyInput :id="id" v-model="oa" /></Field>
          <div>
            <div class="mb-1.5 text-[13px] font-medium text-muted">First-time HDB buyer?</div>
            <Segmented v-model="first" class="w-full" :options="[{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]" />
          </div>
          <div class="col-span-2 flex justify-end"><Button :loading="busy" @click="save">Save profile</Button></div>
        </div>
      </Card>
      <Card v-if="app.state" class="p-7">
        <SectionTitle>Your couple</SectionTitle>
        <div class="flex items-end gap-4">
          <Field v-slot="{ id }" label="Couple name" class="flex-1"><input :id="id" v-model="couple" :class="inputCls" maxlength="40" /></Field>
          <Button variant="secondary" @click="app.dispatch({ type: 'renameCouple', name: couple }, { success: 'Couple name updated.' })">Save</Button>
        </div>
      </Card>
      <Card v-if="app.mode === 'demo'" class="p-7">
        <SectionTitle>Demo data</SectionTitle>
        <p class="mb-4 text-sm text-muted">Everything you do in the demo is saved in this browser only. Reset to start over with Dephany &amp; Julian.</p>
        <Button variant="secondary" @click="app.resetDemo()"><RotateCcw :size="16" /> Reset demo</Button>
      </Card>
    </div>
  </Page>
</template>
