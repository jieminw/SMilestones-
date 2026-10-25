<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { ArrowLeft, CalendarRange, Compass, Info, Plus, Trash2 } from "lucide-vue-next";
import { useCouple } from "@/stores/app";
import { TEMPLATES } from "@/domain/templates";
import type { BtoMeta, PotKind, WeddingMeta } from "@/domain/types";
import type { StageInput } from "@/domain/engine";
import { fmt, parseMoney } from "@/domain/money";
import { addMonths, contributionMonths, fmtMonth, todayISO } from "@/domain/dates";
import { firstName, monthlyNeeded, partnerOf, potStages } from "@/domain/selectors";
import { FLAT_TYPE_SHORT } from "@/domain/bto-data";
import { cpfBalance, resolveDraft } from "@/lib/bto-draft";
import { useBtoDraft } from "@/composables/useBtoDraft";
import { cx, inputCls } from "@/lib/cx";
import Page from "@/layouts/Page.vue";
import PageHeader from "@/layouts/PageHeader.vue";
import Badge from "@/components/ui/Badge.vue";
import Button from "@/components/ui/Button.vue";
import Card from "@/components/ui/Card.vue";
import Field from "@/components/ui/Field.vue";
import IconTile from "@/components/ui/IconTile.vue";
import MoneyInput from "@/components/ui/MoneyInput.vue";
import Notice from "@/components/ui/Notice.vue";
import SectionTitle from "@/components/ui/SectionTitle.vue";
import PotIcon from "@/components/art/PotIcon.vue";
import PlanBreakdown from "./PlanBreakdown.vue";
import SplitEditor, { type SplitValue } from "./SplitEditor.vue";
import WeddingBudgetForm from "@/components/WeddingBudgetForm.vue";
import GuideBook from "@/components/guide/GuideBook.vue";
import WeddingDirectory from "@/components/guide/WeddingDirectory.vue";
import { EXAMPLE_WEDDING } from "@/domain/wedding";
import { cashPlan, defaultForm, lineCost, usesAngbao, venueLineName, billedTables, type BudgetForm, type WeddingDates } from "@/domain/weddingBudget";
import { plan, savePlan } from "@/stores/weddingPlan";
import { useRoute } from "vue-router";
import LedgerField from "@/components/LedgerField.vue";
import RenoBudgetForm from "@/components/RenoBudgetForm.vue";
import RenoBook from "@/components/guide/RenoBook.vue";
import RenoDirectory from "@/components/guide/RenoDirectory.vue";
import { renoPlan, saveRenoPlan } from "@/stores/renoPlan";
import { datesFromGuide, formFromGuide, guideState } from "@/stores/renoGuideState";
import { PRIORITIES } from "@/data/renoAdvice";
import { buildRenoStages, type RenoDates, type RenoForm } from "@/domain/renoBudget";

/** Create a pot, or finish setting up a draft. Mount with a :key so each target starts fresh. */
const props = defineProps<{ kind: PotKind | null; editId: string | null }>();
const route = useRoute();
const fromWedding = route.query.from === "wedding";
const fromReno = route.query.from === "renovation";

const { app, s } = useCouple();
const router = useRouter();
const draft = useBtoDraft();

const editing = props.editId ? s.value.pots.find((p) => p.id === props.editId) : undefined;
const kind: PotKind = editing?.kind ?? props.kind ?? "custom";
const tpl = TEMPLATES[kind];
const partner = computed(() => partnerOf(s.value, app.meId));
const today = todayISO();

const bto = computed(() => (kind === "bto" ? resolveDraft(draft.value) : null));

const name = ref(editing?.name ?? (kind === "bto" ? "Our BTO" : tpl.defaultName));
const subtitle = ref(editing?.subtitle ?? "");
const targetDate = ref(editing?.target_date ?? addMonths(today, 12));
const lines = ref<{ key: string; name: string; amount: string }[]>(
  editing && kind !== "bto"
    ? potStages(s.value, editing.id).map((st) => ({ key: st.id, name: st.name, amount: String(st.target / 100) }))
    : tpl.categories.map((c, i) => ({ key: `l${i}`, name: c, amount: "" })),
);
// A wedding pot is planned with the wedding form (dates, style, guests, venue, costs, ang bao). Its lines become the pot's stages.
const planned = (): { key: string; name: string; amount: string }[] => {
  const own = plan.value.extras.filter((x) => x.title.trim() || parseMoney(x.cost)).map((x) => ({ key: x.id, name: x.title || "Your milestone", amount: x.cost || "0" }));
  const f = plan.value.form;
  const venue = plan.value.lines.find((l) => l.id === "venue");
  const venueCost = venue ? parseMoney(venue.quote) || parseMoney(venue.budget) || 0 : 0;
  const deposit = cashPlan(f, venueCost, 0).deposit;
  return plan.value.lines.map((l) => ({
    key: l.id,
    name: l.id === "venue" ? (usesAngbao(f) ? "Banquet deposit" : venueLineName(f.style)) : l.name || "Your own cost",
    amount: String(lineCost(f, l, deposit) / 100),
  })).concat(own);
};
function onWeddingSave(form: BudgetForm, dates: WeddingDates) {
  savePlan(form, dates);
  lines.value = planned();
  if (dates.banquet) targetDate.value = dates.banquet;
  weddingSaved.value = true;
}
// your own milestones: added here, shown on the wedding pot
const msName = ref("");
const msCost = ref("");
const msBox = ref<HTMLElement | null>(null);
const canAddMs = computed(() => !!msName.value.trim() && (parseMoney(msCost.value) ?? 0) > 0);
function addMilestone() {
  if (!canAddMs.value) return;
  plan.value.extras.push({ id: `x${Date.now()}`, title: msName.value.trim(), cost: msCost.value });
  msName.value = "";
  msCost.value = "";
  lines.value = planned();
}
function removeMilestone(id: string) {
  plan.value.extras = plan.value.extras.filter((x) => x.id !== id);
  lines.value = planned();
}
function syncMilestones() {
  lines.value = planned();
}
if (kind === "wedding" && route.query.milestone) setTimeout(() => msBox.value?.scrollIntoView({ behavior: "smooth", block: "center" }), 400);
const weddingSaved = ref(kind === "wedding" && plan.value.filled);
if (kind === "wedding" && plan.value.filled) {
  lines.value = planned();
  if (plan.value.dates.banquet) targetDate.value = plan.value.dates.banquet;
}
// A renovation pot is planned with the renovation form. Its lines become the pot's stages, one per milestone.
const renoPlanned = (): { key: string; name: string; amount: string }[] =>
  buildRenoStages(renoPlan.value.lines, 0, renoPlan.value.extras).map((st) => ({ key: st.def.id, name: st.def.title, amount: String(st.cost / 100) }));
function onRenoSave(form: RenoForm, dates: RenoDates) {
  saveRenoPlan(form, dates);
  lines.value = renoPlanned();
  if (dates.movein) targetDate.value = dates.movein;
  renoSaved.value = true;
}
const renoSaved = ref(kind === "renovation" && renoPlan.value.filled);
if (kind === "renovation" && renoPlan.value.filled) {
  lines.value = renoPlanned();
  if (renoPlan.value.dates.movein) targetDate.value = renoPlan.value.dates.movein;
}
// the move-in date they gave in the guide is the pot's target until the plan is saved
if (kind === "renovation" && !renoPlan.value.filled && guideState.movein) targetDate.value = guideState.movein;
// milestones their priorities often add, offered as one tap
const suggested = computed(() =>
  guideState.picks
    .map((id) => PRIORITIES.find((p) => p.id === id)?.milestone)
    .filter((m): m is { name: string; cost: number } => !!m && !renoPlan.value.extras.some((x) => x.title === m.name)),
);
function addSuggested(m: { name: string; cost: number }) {
  renoPlan.value.extras.push({ id: `x${Date.now()}${Math.random().toString(36).slice(2, 5)}`, title: m.name, cost: String(m.cost) });
  lines.value = renoPlanned();
}
const rmName = ref("");
const rmCost = ref("");
const canAddRm = computed(() => !!rmName.value.trim() && (parseMoney(rmCost.value) ?? 0) > 0);
function addRenoMilestone() {
  if (!canAddRm.value) return;
  renoPlan.value.extras.push({ id: `x${Date.now()}`, title: rmName.value.trim(), cost: rmCost.value });
  rmName.value = "";
  rmCost.value = "";
  lines.value = renoPlanned();
}
function removeRenoMilestone(id: string) {
  renoPlan.value.extras = renoPlan.value.extras.filter((x) => x.id !== id);
  lines.value = renoPlanned();
}
const syncReno = () => (lines.value = renoPlanned());
const rmBox = ref<HTMLElement | null>(null);
if (kind === "renovation" && route.query.milestone) setTimeout(() => rmBox.value?.scrollIntoView({ behavior: "smooth", block: "center" }), 400);
const split = ref<SplitValue>({ mode: "equal", shares: {} });
const wedding = ref<WeddingMeta>(editing?.wedding ? { ...editing.wedding } : { ...EXAMPLE_WEDDING });
const busy = ref<"send" | "draft" | null>(null);

// ---- the stages this pot will be created with
const stages = computed<StageInput[]>(() => {
  if (bto.value) return bto.value.plan.stages.map((st) => ({ name: st.name, description: st.lines.map((l) => l.label).join(" · "), target: st.cash, due_date: st.due }));
  return lines.value.map((l) => ({ name: l.name, description: "", target: parseMoney(l.amount) ?? 0, due_date: null }));
});
const finalDate = computed(() => (bto.value ? bto.value.keysDate : targetDate.value));
const total = computed(() => stages.value.reduce((a, st) => a + st.target, 0));
/** Expected ang bao lowers what the couple save for (wedding pots only). */
// the wedding form already leaves the ang bao-paid balance out of its lines, so there is nothing more to take off
const offset = computed(() => 0);
const target = computed(() => total.value - offset.value);
const monthly = computed(() =>
  monthlyNeeded(offset.value > 0 ? [{ amount: target.value, due: null }] : stages.value.map((st) => ({ amount: st.target, due: st.due_date })), finalDate.value, 0, today),
);
const months = computed(() => contributionMonths(today, finalDate.value));
const fullSubtitle = computed(() => (bto.value ? `${bto.value.project.name} · ${FLAT_TYPE_SHORT[bto.value.flat.type]}` : subtitle.value));
const valid = computed(() => !!name.value.trim() && total.value > 0 && stages.value.every((st) => st.name.trim()));

const btoMeta = computed<BtoMeta | null>(() => {
  const b = bto.value;
  if (!b) return null;
  return {
    project_id: b.project.id, project_name: b.project.name, town: b.project.town, flat_type: b.flat.type, price: b.price * 100,
    scheme: b.scheme, ehg: b.eligibility.ehg, cpf_oa: cpfBalance(draft.value) * 100, waiting_months: b.project.waitingMonths,
    loan_monthly: b.plan.loan.monthly, household: draft.value.household,
  };
});

function setLine(i: number, patch: Partial<{ name: string; amount: string }>) {
  lines.value = lines.value.map((y, j) => (j === i ? { ...y, ...patch } : y));
}

/** What the pot remembers about the banquet, taken from the wedding form. */
function weddingMeta(): WeddingMeta {
  const f = plan.value.form;
  const perTable = parseMoney(f.perTable) ?? 0;
  return {
    ...wedding.value,
    tables: usesAngbao(f) ? billedTables(f) : Math.ceil((f.guests || 0) / 10),
    guests_per_table: 10,
    price_per_table: usesAngbao(f) ? perTable : (parseMoney(f.perHead) ?? 0) * 10,
    avg_angbao: usesAngbao(f) ? (parseMoney(f.angbaoPerGuest) ?? 0) : 0,
    categories: [],
  };
}

async function save(send: boolean) {
  busy.value = send ? "send" : "draft";
  const payload = { name: name.value, subtitle: fullSubtitle.value, target_date: finalDate.value, stages: stages.value, bto: btoMeta.value, wedding: kind === "wedding" ? weddingMeta() : undefined };
  const r = editing ? await app.dispatch({ type: "updatePot", potId: editing.id, ...payload }) : await app.dispatch({ type: "createPot", kind, ...payload });
  if (!r.ok) {
    busy.value = null;
    return;
  }
  const potId = editing?.id ?? r.createdId!;
  if (send && partner.value) {
    const p = await app.dispatch({ type: "proposeSplit", potId, mode: split.value.mode, shares: split.value.shares }, { success: `Split sent to ${firstName(partner.value)} for approval.` });
    if (!p.ok) busy.value = null;
  }
  // a wedding goal set up from the Wedding page goes back there, not to the wallet
  await router.push(fromWedding ? "/wedding" : fromReno ? "/renovation" : `/pots/${potId}`);
}
</script>

<template>
  <Page>
    <PageHeader :title="editing ? `Finish setting up ${editing.name}` : `Set up your ${kind === 'bto' ? 'BTO' : tpl.title.toLowerCase()} pot`" :subtitle="`Agree it with ${firstName(partner)} and the pot goes live.`">
      <template #back>
        <RouterLink :to="fromWedding ? '/wedding' : fromReno ? '/renovation' : editing ? `/pots/${editing.id}` : '/pots/new'" class="mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink"><ArrowLeft :size="16" /> Back</RouterLink>
      </template>
    </PageHeader>
    <div class="grid grid-cols-[minmax(0,1fr)_420px] gap-7">
      <div class="flex min-w-0 flex-col gap-6">
        <Card class="p-7">
          <div class="flex items-center gap-4">
            <IconTile :size="52"><PotIcon :kind="kind" :size="24" /></IconTile>
            <div class="grid flex-1 grid-cols-[1fr_1.5fr] gap-4">
              <Field v-slot="{ id }" label="Pot name"><input :id="id" v-model="name" :class="inputCls" maxlength="40" /></Field>
              <div v-if="bto">
                <div class="mb-1.5 text-[13px] font-medium text-muted">Flat</div>
                <div class="flex h-11 items-center justify-between rounded-xl bg-surface-2 px-3.5 text-[15px]">
                  <span class="truncate">{{ fullSubtitle }} · {{ fmt(bto.price * 100) }}</span>
                  <RouterLink to="/navigator?tab=finances" class="ml-2 inline-flex shrink-0 items-center gap-1 text-sm font-medium text-terra hover:underline"><Compass :size="14" /> Change</RouterLink>
                </div>
              </div>
              <Field v-else v-slot="{ id }" :label="kind === 'trip' ? 'Where & how long' : 'Notes'">
                <input :id="id" v-model="subtitle" :class="inputCls" maxlength="60" :placeholder="kind === 'trip' ? 'e.g. Japan · 8 days' : kind === 'wedding' ? 'e.g. Solemnisation + dinner banquet' : ''" />
              </Field>
            </div>
          </div>
        </Card>

        <Card v-if="bto" class="p-7">
          <SectionTitle>
            Your upfront plan
            <template #action><Badge tone="peach">{{ bto.scheme === "standard" ? "Standard" : "SDS" }} · EHG {{ fmt(bto.eligibility.ehg) }} · CPF {{ fmt(cpfBalance(draft) * 100) }}</Badge></template>
          </SectionTitle>
          <div class="mb-5 flex items-baseline gap-3">
            <span class="tabular font-serif text-[40px]">{{ fmt(total) }}</span>
            <span class="text-muted">cash to save by {{ fmtMonth(bto.keysDate) }}</span>
          </div>
          <PlanBreakdown :plan="bto.plan" compact />
          <p class="mt-4 flex gap-2 text-sm text-muted"><Info :size="15" class="mt-0.5 shrink-0" /> Each stage becomes a checkpoint in your tracker. Money fills them in order: option fee first, then lease, then keys.</p>
        </Card>
        <WeddingBudgetForm v-else-if="kind === 'wedding'"  :model-value="plan.filled ? plan.form : defaultForm()" :dates="plan.dates" :lines="plan.lines" :editing="plan.filled" no-discard @save="onWeddingSave" />
        <RenoBudgetForm v-else-if="kind === 'renovation'" :model-value="renoPlan.filled ? renoPlan.form : formFromGuide()" :dates="renoPlan.filled ? renoPlan.dates : datesFromGuide()" :lines="renoPlan.lines" :editing="renoPlan.filled" :seeded="!renoPlan.filled && guideState.onboarded" no-discard @save="onRenoSave" />
        <Card v-else class="p-7">
          <SectionTitle>Plan your budget</SectionTitle>
          <div class="flex flex-col gap-3">
            <div v-for="(l, i) in lines" :key="l.key" class="grid grid-cols-[minmax(0,1fr)_200px_40px] items-center gap-3">
              <input aria-label="Budget item" :class="inputCls" :value="l.name" @input="setLine(i, { name: ($event.target as HTMLInputElement).value })" />
              <MoneyInput :model-value="l.amount" @update:model-value="setLine(i, { amount: $event })" />
              <button type="button" :aria-label="`Remove ${l.name}`" :disabled="lines.length === 1" class="flex size-10 cursor-pointer items-center justify-center rounded-full text-faint hover:bg-surface-2 hover:text-bad disabled:opacity-30" @click="lines = lines.filter((_, j) => j !== i)">
                <Trash2 :size="16" />
              </button>
            </div>
          </div>
          <Button variant="ghost" size="sm" class="mt-3" @click="lines = [...lines, { key: `l${Date.now()}`, name: '', amount: '' }]"><Plus :size="16" /> Add item</Button>
          <div class="mt-5 flex items-center justify-between border-t border-line pt-5">
            <span class="font-medium">Total budget</span>
            <span class="tabular text-2xl font-semibold">{{ fmt(total) }}</span>
          </div>
          <template v-if="offset > 0">
            <div class="mt-2 flex items-center justify-between text-sm text-muted"><span>Expected ang bao</span><span class="tabular text-ok">−{{ fmt(offset) }}</span></div>
            <div class="mt-2 flex items-center justify-between"><span class="font-medium">Savings target</span><span class="tabular text-xl font-semibold">{{ fmt(target) }}</span></div>
          </template>
          <div class="mt-5 w-[260px]">
            <Field v-slot="{ id }" label="Save it all by"><input :id="id" v-model="targetDate" type="date" :class="inputCls" :min="addMonths(today, 1)" /></Field>
          </div>
        </Card>
        <Card v-if="kind === 'wedding'" class="p-7">
          <div ref="msBox">
            <SectionTitle>Your own milestones</SectionTitle>
            <p class="-mt-2 mb-4 text-[14px] text-muted">The plan above gives you five milestones. Add your own here, such as honeymoon flights. They join the end of the list and open once the one before is funded.</p>
            <ul v-if="plan.extras.length" class="mb-4">
              <li v-for="x in plan.extras" :key="x.id" class="keep-grid grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_40px] items-center divide-x divide-line border-y border-line">
                <LedgerField v-model="x.title" label="Name" @update:model-value="syncMilestones" />
                <LedgerField v-model="x.cost" money label="Cost" @update:model-value="syncMilestones" />
                <button type="button" :aria-label="`Remove ${x.title || 'milestone'}`" class="flex h-full cursor-pointer items-center justify-center text-faint hover:text-bad" @click="removeMilestone(x.id)"><Trash2 :size="15" /></button>
              </li>
            </ul>
            <form class="keep-grid grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_auto] items-end gap-3" @submit.prevent="addMilestone">
              <div class="border-y border-ink/30"><LedgerField v-model="msName" label="New milestone" placeholder="e.g. Honeymoon flights" /></div>
              <div class="border-y border-ink/30"><LedgerField v-model="msCost" money label="Cost" placeholder="0" /></div>
              <Button type="submit" size="lg" :disabled="!canAddMs"><Plus :size="16" /> Add</Button>
            </form>
          </div>
        </Card>
        <Card v-if="kind === 'renovation'" class="p-7">
          <div ref="rmBox">
            <SectionTitle>Your own milestones</SectionTitle>
            <p class="-mt-2 mb-4 text-[14px] text-muted">The plan above gives you six milestones. Add your own here, such as a washing machine. They join the end of the list and open once the one before is funded.</p>
            <div v-if="suggested.length" class="mb-4">
              <p class="mb-2 text-[13px] font-medium">From what matters to you. Rough starting costs, change them after you add one.</p>
              <div class="flex flex-wrap gap-2">
                <button v-for="m in suggested" :key="m.name" type="button" class="cursor-pointer rounded-full border border-ink/30 px-3.5 py-1.5 text-[13px] font-medium hover:bg-ink/[0.05]" @click="addSuggested(m)">+ {{ m.name }} · {{ fmt(m.cost * 100) }}</button>
              </div>
            </div>
            <ul v-if="renoPlan.extras.length" class="mb-4">
              <li v-for="x in renoPlan.extras" :key="x.id" class="keep-grid grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_40px] items-center divide-x divide-line border-y border-line">
                <LedgerField v-model="x.title" label="Name" @update:model-value="syncReno" />
                <LedgerField v-model="x.cost" money label="Cost" @update:model-value="syncReno" />
                <button type="button" :aria-label="`Remove ${x.title || 'milestone'}`" class="flex h-full cursor-pointer items-center justify-center text-faint hover:text-bad" @click="removeRenoMilestone(x.id)"><Trash2 :size="15" /></button>
              </li>
            </ul>
            <form class="keep-grid grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_auto] items-end gap-3" @submit.prevent="addRenoMilestone">
              <div class="border-y border-ink/30"><LedgerField v-model="rmName" label="New milestone" placeholder="e.g. Washing machine" /></div>
              <div class="border-y border-ink/30"><LedgerField v-model="rmCost" money label="Cost" placeholder="0" /></div>
              <Button type="submit" size="lg" :disabled="!canAddRm"><Plus :size="16" /> Add</Button>
            </form>
          </div>
        </Card>
      </div>

      <div class="flex flex-col gap-6">
        <Card class="p-7">
          <div class="flex items-start gap-4">
            <IconTile tone="peach"><CalendarRange :size="20" /></IconTile>
            <div>
              <div class="text-sm text-muted">Your monthly target</div>
              <div class="tabular font-serif text-[36px] leading-tight">{{ fmt(monthly) }}<span class="font-sans text-base text-muted"> / month</span></div>
              <div class="text-sm text-muted">{{ months }} contributions · until {{ fmtMonth(finalDate) }}</div>
            </div>
          </div>
          <Notice v-if="bto" class="mt-4">The option fee is due first, so early months carry more. This is the steady amount that meets every deadline.</Notice>
        </Card>
        <Card class="p-7">
          <SectionTitle>How should you split it?</SectionTitle>
          <SplitEditor v-model="split" :target="monthly" :profiles="s.profiles" :me-id="app.meId" />
        </Card>
        <Notice>
          <template #icon><Info :size="15" /></template>
          SMilestones tracks money you set aside — keep it in your joint account. Nothing is charged automatically.
        </Notice>
        <div class="flex flex-col gap-2">
          <p v-if="kind === 'renovation' && !renoSaved" class="text-[13px] text-muted">Fill in the planning form and press "Save the plan" first. It sets the pot's target.</p>
          <p v-if="kind === 'wedding' && !weddingSaved" class="text-[13px] text-muted">Fill in the planning form and press "Save the plan" first. It sets the pot's target.</p>
          <Button size="lg" :disabled="!valid || !partner" :loading="busy === 'send'" @click="save(true)">Send split to {{ firstName(partner) }}</Button>
          <Button variant="ghost" :disabled="!valid" :loading="busy === 'draft'" :class="cx(busy === 'send' && 'invisible')" @click="save(false)">Save as draft</Button>
        </div>
      </div>
    </div>
    <!-- the guide and the directory, opened from the wedding form's venue step -->
    <template v-if="kind === 'wedding'"><GuideBook /><WeddingDirectory /></template>
    <template v-else-if="kind === 'renovation'"><RenoBook /><RenoDirectory /></template>
  </Page>
</template>
