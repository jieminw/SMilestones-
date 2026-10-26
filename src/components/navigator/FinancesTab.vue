<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ArrowRight, CircleAlert } from "lucide-vue-next";
import { useApp } from "@/stores/app";
import { BTO_PROJECTS, FLAT_TYPE_LABEL, FLAT_TYPE_SHORT } from "@/domain/bto-data";
import { MSR, SCHEME_LABEL, type DownpaymentScheme } from "@/domain/bto";
import { fmt, fmtShort, parseMoney } from "@/domain/money";
import { addMonths, fmtMonth, todayISO } from "@/domain/dates";
import { monthlyNeeded, potBalance, requiredMonthly } from "@/domain/selectors";
import type { BtoMeta } from "@/domain/types";
import { cpfBalance, resolveDraft } from "@/lib/bto-draft";
import { CPF_AS_OF } from "@/domain/cpf";
import { useBtoDraft } from "@/composables/useBtoDraft";
import { inputCls } from "@/lib/cx";
import Badge from "@/components/ui/Badge.vue";
import Button from "@/components/ui/Button.vue";
import Card from "@/components/ui/Card.vue";
import Field from "@/components/ui/Field.vue";
import MoneyInput from "@/components/ui/MoneyInput.vue";
import Notice from "@/components/ui/Notice.vue";
import SectionTitle from "@/components/ui/SectionTitle.vue";
import PlanBreakdown from "@/components/pot/PlanBreakdown.vue";

const app = useApp();
const route = useRoute();
const router = useRouter();
const draft = useBtoDraft();
const r = computed(() => resolveDraft(draft.value));
const oaA = ref(String(draft.value.oaA));
const oaB = ref(String(draft.value.oaB));
const today = todayISO();
const monthly = computed(() => monthlyNeeded(r.value.plan.stages.map((s) => ({ amount: s.cash, due: s.due })), r.value.keysDate, 0, today));
const msrCap = computed(() => draft.value.household.monthlyIncome * MSR * 100);

// ---- "Didn't get the flat": retarget an existing BTO pot to the plan on this page, keeping every contribution.
const retargetPot = computed(() => {
  const id = typeof route.query.retarget === "string" ? route.query.retarget : null;
  return id ? app.state?.pots.find((p) => p.id === id && p.kind === "bto") : undefined;
});
const retargetMonthly = computed(() => {
  const p = retargetPot.value;
  if (!p || !app.state) return null;
  const stages = r.value.plan.stages.map((st) => ({ amount: st.cash, due: st.due }));
  return { before: requiredMonthly(app.state, p), after: monthlyNeeded(stages, r.value.keysDate, potBalance(app.state, p.id), today) };
});
const retargetBusy = ref(false);

async function retarget() {
  const p = retargetPot.value;
  if (!p) return;
  retargetBusy.value = true;
  const b = r.value;
  const meta: BtoMeta = {
    project_id: b.project.id, project_name: b.project.name, town: b.project.town, flat_type: b.flat.type, price: b.price * 100,
    scheme: b.scheme, ehg: b.eligibility.ehg, cpf_oa: cpfBalance(draft.value) * 100, waiting_months: b.project.waitingMonths,
    loan_monthly: b.plan.loan.monthly, household: draft.value.household,
  };
  const res = await app.dispatch(
    {
      type: "retargetBto", potId: p.id, subtitle: `${b.project.name} · ${FLAT_TYPE_SHORT[b.flat.type]}`, target_date: b.keysDate, bto: meta,
      stages: b.plan.stages.map((st) => ({ name: st.name, description: st.lines.map((l) => l.label).join(" · "), target: st.cash, due_date: st.due })),
    },
    { success: `${p.name} now targets ${b.project.name}. Your savings are unchanged.` },
  );
  retargetBusy.value = false;
  if (res.ok) await router.push(`/pots/${p.id}`);
}
const midPrice = (f: { minPrice: number; maxPrice: number }) => Math.round((f.minPrice + f.maxPrice) / 2 / 1000) * 1000;

function onProject(id: string) {
  const p = BTO_PROJECTS.find((x) => x.id === id)!;
  const f = p.flats.find((x) => x.type === draft.value.flatType) ?? p.flats[p.flats.length - 1];
  Object.assign(draft.value, { projectId: p.id, flatType: f.type, price: midPrice(f), keysDate: null });
}
function onFlat(type: string) {
  const f = r.value.project.flats.find((x) => x.type === type)!;
  Object.assign(draft.value, { flatType: f.type, price: midPrice(f) });
}
function setOa(who: "A" | "B", v: string) {
  (who === "A" ? oaA : oaB).value = v;
  const c = parseMoney(v);
  if (c === null) return;
  if (who === "A") draft.value.oaA = Math.round(c / 100);
  else draft.value.oaB = Math.round(c / 100);
}
</script>

<template>
  <div class="grid grid-cols-[400px_minmax(0,1fr)] gap-7">
    <Card class="h-fit p-7">
      <SectionTitle>Your flat</SectionTitle>
      <div class="flex flex-col gap-5">
        <Field v-slot="{ id }" label="Project">
          <select :id="id" :class="inputCls" :value="r.project.id" @change="onProject(($event.target as HTMLSelectElement).value)">
            <option v-for="p in BTO_PROJECTS" :key="p.id" :value="p.id">{{ p.name }} · {{ p.town }}</option>
          </select>
        </Field>
        <Field v-slot="{ id }" label="Flat type">
          <select :id="id" :class="inputCls" :value="r.flat.type" @change="onFlat(($event.target as HTMLSelectElement).value)">
            <option v-for="f in r.project.flats" :key="f.type" :value="f.type">{{ FLAT_TYPE_LABEL[f.type] }}</option>
          </select>
        </Field>
        <Field v-slot="{ id }" :label="`Flat price · ${fmt(r.price * 100)}`" :hint="`HDB range ${fmtShort(r.flat.minPrice * 100)} – ${fmtShort(r.flat.maxPrice * 100)}; higher floors cost more.`">
          <input :id="id" type="range" class="w-full accent-[#1d1e1f]" :min="r.flat.minPrice" :max="r.flat.maxPrice" step="1000" :value="r.price" @input="draft.price = Number(($event.target as HTMLInputElement).value)" />
        </Field>
        <div class="grid grid-cols-2 gap-4">
          <Field v-slot="{ id }" label="Your CPF OA today"><MoneyInput :id="id" :model-value="oaA" @update:model-value="setOa('A', $event)" /></Field>
          <Field v-slot="{ id }" label="Partner's CPF OA today"><MoneyInput :id="id" :model-value="oaB" @update:model-value="setOa('B', $event)" /></Field>
        </div>
        <label class="flex cursor-pointer items-start gap-3 rounded-lg bg-surface-2 p-3.5 text-sm">
          <input v-model="draft.includeFutureCpf" type="checkbox" class="mt-0.5 size-4 accent-[#1d1e1f]" />
          <span>
            <span class="font-medium">Include future CPF contributions</span>
            <span class="block text-muted">Adds the OA you will earn from your wages before each payment. CPF only ever pays lease and key costs, never the option fee.</span>
          </span>
        </label>
        <div class="grid grid-cols-2 gap-4">
          <Field v-slot="{ id }" label="Flat selection">
            <input :id="id" type="date" :class="inputCls" :value="draft.bookingDate" :min="today" @change="($event.target as HTMLInputElement).value && (draft.bookingDate = ($event.target as HTMLInputElement).value)" />
          </Field>
          <Field v-slot="{ id }" label="Lease signing after">
            <select :id="id" v-model.number="draft.leaseMonths" :class="inputCls">
              <option v-for="m in [3, 4, 6, 9, 12]" :key="m" :value="m">{{ m }} months</option>
            </select>
          </Field>
        </div>
        <Field v-slot="{ id }" label="Key collection" :hint="draft.keysDate ? undefined : `Estimated from the ${r.project.waitingMonths}-month waiting time.`">
          <input :id="id" type="date" :class="inputCls" :value="r.keysDate" :min="addMonths(draft.bookingDate, 1)" @change="draft.keysDate = ($event.target as HTMLInputElement).value || null" />
        </Field>
        <Field v-slot="{ id }" label="Downpayment scheme">
          <select :id="id" v-model="draft.scheme" :class="inputCls">
            <option value="auto">From eligibility · {{ SCHEME_LABEL[r.eligibility.scheme].split(" · ")[1] }}</option>
            <option v-for="k in Object.keys(SCHEME_LABEL) as DownpaymentScheme[]" :key="k" :value="k">{{ SCHEME_LABEL[k] }}</option>
          </select>
        </Field>
      </div>
    </Card>

    <div class="flex min-w-0 flex-col gap-5">
      <Card class="p-7">
        <div class="flex items-start justify-between gap-6">
          <div>
            <div class="text-sm text-muted">{{ r.project.name }} · {{ FLAT_TYPE_SHORT[r.flat.type] }} · {{ fmt(r.price * 100) }}</div>
            <div class="tabular mt-1 font-serif text-[44px] leading-none">{{ fmt(r.plan.totalCash) }}</div>
            <div class="mt-2 text-muted">cash to save before key collection in {{ fmtMonth(r.keysDate) }}</div>
          </div>
          <div class="rounded-2xl bg-peach-2 px-5 py-4 text-right">
            <div class="text-sm text-terra-2">Save together</div>
            <div class="tabular text-2xl font-semibold text-ink">{{ fmt(monthly) }}<span class="text-base font-normal text-muted">/mo</span></div>
            <div class="text-xs text-muted">starting this month</div>
          </div>
        </div>
        <div class="mt-6"><PlanBreakdown :plan="r.plan" /></div>
        <p class="mt-4 text-sm text-muted">
          <template v-if="draft.includeFutureCpf">Projected CPF OA at key collection: <strong class="text-ink">{{ fmt(r.oaAtKeys) }}</strong> from {{ fmt(cpfBalance(draft) * 100) }} today, using {{ CPF_AS_OF }} contribution rates (estimate; interest simplified).</template>
          <template v-else>Using only the {{ fmt(cpfBalance(draft) * 100) }} in your OA today.</template>
        </p>
        <div class="mt-5 grid grid-cols-3 gap-4 rounded-2xl bg-surface-2 p-4 text-sm">
          <div>
            <div class="text-muted">EHG grant applied</div>
            <div class="tabular font-semibold">{{ fmt(r.plan.grantApplied) }}</div>
          </div>
          <div>
            <div class="text-muted">HDB loan (75% − excess grant)</div>
            <div class="tabular font-semibold">{{ fmt(r.plan.loan.principal) }}</div>
          </div>
          <div>
            <div class="text-muted">Repayment · {{ r.plan.loan.years }} yrs @ {{ r.plan.loan.rate * 100 }}%</div>
            <div class="tabular font-semibold">{{ fmt(r.plan.loan.monthly) }}/month</div>
          </div>
        </div>
        <Notice v-if="r.plan.loan.monthly > msrCap" tone="warn" class="mt-4">
          <template #icon><CircleAlert :size="16" /></template>
          {{ fmt(r.plan.loan.monthly) }}/month is above 30% of your income ({{ fmt(msrCap) }}). HDB may lend you less — try a lower price, more CPF, or a longer loan.
        </Notice>
        <Notice v-if="r.plan.cpfUnused > 0" tone="ok" class="mt-4">{{ fmt(r.plan.cpfUnused) }} of your CPF isn't needed upfront. It can go towards monthly repayments.</Notice>
      </Card>
      <div class="flex items-center justify-end gap-3">
        <p class="mr-auto text-sm text-muted">Change the household on the Eligibility tab. Every number on this page comes from one calculation.</p>
        <template v-if="retargetPot && retargetMonthly">
          <div class="mr-auto rounded-lg border border-line bg-surface p-4 text-sm">
            <div class="text-[11px] font-medium tracking-[0.14em] text-muted uppercase">Monthly target for {{ retargetPot.name }}</div>
            <div class="mt-1"><span class="tabular text-muted line-through">{{ fmt(retargetMonthly.before) }}</span> <span class="tabular font-serif text-xl">{{ fmt(retargetMonthly.after) }}</span> <span class="text-muted">/ month after retargeting</span></div>
          </div>
          <Button :loading="retargetBusy" @click="retarget">Retarget {{ retargetPot.name }} to this plan <ArrowRight :size="18" /></Button>
        </template>
        <RouterLink v-else-if="app.state" to="/pots/new?kind=bto">
          <Button>Create a BTO pot with this plan <ArrowRight :size="18" /></Button>
        </RouterLink>
        <Badge v-else tone="warn">Pair with your partner to create a pot</Badge>
      </div>
    </div>
  </div>
</template>
