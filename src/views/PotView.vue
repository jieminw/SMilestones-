<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ShieldCheck, ArrowLeft, CalendarDays, Check, ChevronRight, History, Landmark, MoveRight, Pencil, Plus, Trash2, TrendingUp } from "lucide-vue-next";
import { useCouple } from "@/stores/app";
import type { Transaction } from "@/domain/types";
import { activeSplit, contributionsBy, firstName, liveTx, partnerOf, pendingRequests, pendingSplit, potBalance, potTarget, potTx, profileOf, requiredMonthly, stageProgress } from "@/domain/selectors";
import { fmt, pct, type Cents } from "@/domain/money";
import { contributionMonths, fmtDay, fmtMonth, todayISO } from "@/domain/dates";
import { FLAT_TYPE_SHORT } from "@/domain/bto-data";
import { cx } from "@/lib/cx";
import Page from "@/layouts/Page.vue";
import PageHeader from "@/layouts/PageHeader.vue";
import Avatar from "@/components/ui/Avatar.vue";
import Badge from "@/components/ui/Badge.vue";
import Button from "@/components/ui/Button.vue";
import Card from "@/components/ui/Card.vue";
import Empty from "@/components/ui/Empty.vue";
import Modal from "@/components/ui/Modal.vue";
import Notice from "@/components/ui/Notice.vue";
import Progress from "@/components/ui/Progress.vue";
import SectionTitle from "@/components/ui/SectionTitle.vue";
import Blocks from "@/components/art/Blocks.vue";
import ActionRow from "@/components/pot/ActionRow.vue";
import BtoStepper from "@/components/pot/BtoStepper.vue";
import ContributionDrawer from "@/components/pot/ContributionDrawer.vue";
import DatesModal from "@/components/pot/DatesModal.vue";
import GapModal from "@/components/pot/GapModal.vue";
import LogContributionModal from "@/components/pot/LogContributionModal.vue";
import ProposalCard from "@/components/pot/ProposalCard.vue";
import ProposeSplitModal from "@/components/pot/ProposeSplitModal.vue";
import RequestCard from "@/components/pot/RequestCard.vue";
import StatusBadge from "@/components/pot/StatusBadge.vue";
import WithdrawModal, { type WithdrawInit } from "@/components/pot/WithdrawModal.vue";
import { creditedIn, expectedShare, paybacks, shortfallIn } from "@/domain/covers";
import CoverModal from "@/components/pot/CoverModal.vue";
import WeddingGuestsPanel from "@/components/pot/WeddingGuestsPanel.vue";
import WeddingMilestones from "@/components/WeddingMilestones.vue";
import { plan as weddingPlan } from "@/stores/weddingPlan";
import RenoMilestones from "@/components/RenoMilestones.vue";
import { renoPlan } from "@/stores/renoPlan";
import BtoApplicationsCard from "@/components/pot/BtoApplicationsCard.vue";
import { EXAMPLE_WEDDING } from "@/domain/wedding";
import { potBudget, potOffset } from "@/domain/selectors";
import type { WeddingMeta } from "@/domain/types";

const props = defineProps<{ id: string }>();
const { app, s } = useCouple();
const route = useRoute();
const router = useRouter();

const pot = computed(() => s.value.pots.find((p) => p.id === props.id));

const wedding = ref<WeddingMeta>(pot.value?.wedding ? { ...pot.value.wedding } : { ...EXAMPLE_WEDDING });
const savingWedding = ref(false);
const budget = computed(() => (pot.value ? potBudget(s.value, pot.value.id) : 0));
const offset = computed(() => (pot.value ? potOffset(s.value, pot.value.id) : 0));
async function saveWedding() {
  savingWedding.value = true;
  await app.dispatch({ type: "setWedding", potId: props.id, wedding: wedding.value }, { success: "Guest and ang bao plan saved." });
  savingWedding.value = false;
}

const log = ref(false);
const withdraw = ref<WithdrawInit | "choose" | null>(null);
const dates = ref(false);
const gap = ref<{ need: Cents; agreed: Cents } | null>(null);
const raise = ref<Cents | null>(null);
const editTx = ref<Transaction | null>(null);
const del = ref(false);

const balance = computed(() => (pot.value ? potBalance(s.value, pot.value.id) : 0));
const target = computed(() => (pot.value ? potTarget(s.value, pot.value.id) : 0));
const partner = computed(() => partnerOf(s.value, app.meId));
const split = computed(() => (pot.value ? activeSplit(s.value, pot.value.id) : undefined));
const proposal = computed(() => (pot.value ? pendingSplit(s.value, pot.value.id) : undefined));
const requests = computed(() => pendingRequests(s.value).filter((r) => r.pot_id === props.id || r.to_pot_id === props.id));
const by = computed(() => (pot.value ? contributionsBy(s.value, pot.value.id) : {}));
/** A person's part of the bar, as a percentage of the target. */
const share = (cents: number) => Math.min((cents / (target.value || 1)) * 100, 100);
/** Money from anyone else (a parent's gift), shown in grey. */
const others = computed(() => Math.max(balance.value - s.value.profiles.reduce((a, p) => a + (by.value[p.id] ?? 0), 0), 0));
const live = computed(() => pot.value?.status === "active" || pot.value?.status === "completed");
const need = computed(() => (pot.value ? requiredMonthly(s.value, pot.value) : 0));
const history = computed(() => (pot.value ? potTx(s.value, pot.value.id) : []));
const sp = computed(() => (pot.value ? stageProgress(s.value, pot.value) : []));
const subtitle = computed(() => {
  const p = pot.value!;
  return p.bto
    ? `${p.bto.project_name} · ${p.bto.town} · ${FLAT_TYPE_SHORT[p.bto.flat_type]} at ${fmt(p.bto.price)} · keys ~${fmtMonth(p.target_date)}`
    : `${p.subtitle ? p.subtitle + " · " : ""}Target ${fmtDay(p.target_date)}`;
});
const thisMonth = new Date().toISOString().slice(0, 7);
const monthShares = computed(() =>
  s.value.profiles.map((p, i) => {
    const share = expectedShare(s.value, props.id, p.id, thisMonth);
    return { p, i, done: creditedIn(s.value, props.id, p.id, thisMonth), share, extra: share - (split.value?.shares[p.id] ?? 0) };
  }),
);
const partnerGap = computed(() => (partner.value && pot.value?.status === "active" ? shortfallIn(s.value, props.id, partner.value.id, thisMonth) : 0));
const covering = ref(false);
const potPaybacks = computed(() => paybacks(s.value).filter((p) => p.cover.pot_id === props.id && p.outstanding > 0));
const historyRows = computed(() =>
  history.value.map((t) => ({
    t,
    p: profileOf(s.value, t.user_id),
    idx: s.value.profiles.findIndex((x) => x.id === t.user_id),
    plus: t.kind === "contribution" || t.kind === "transfer_in",
  })),
);
const withdrawInit = computed(() => (withdraw.value === "choose" || withdraw.value === null ? undefined : withdraw.value));

/** Supports /pots/:id?dates=1 (from the Timeline's "move a deadline" fix). */
watch(
  () => route.query.dates,
  (d) => {
    if (d) {
      dates.value = true;
      void router.replace(`/pots/${props.id}`);
    }
  },
  { immediate: true },
);

/** Supports /pots/:id?move=:targetId (from the "move money from another pot" re-plan path). */
watch(
  () => route.query.move,
  (to) => {
    if (typeof to === "string" && to !== props.id) {
      withdraw.value = { mode: "pot", toPotId: to };
      void router.replace(`/pots/${props.id}`);
    }
  },
  { immediate: true },
);

function onMove() {
  const donor = s.value.pots.find((p) => p.id !== props.id && p.status === "active" && potBalance(s.value, p.id) > 0);
  gap.value = null;
  if (donor) void router.push(`/pots/${donor.id}?move=${props.id}`);
}
function onRaise() {
  raise.value = gap.value!.need;
  gap.value = null;
}
async function removePot() {
  const r = await app.dispatch({ type: "deletePot", potId: props.id }, { success: "Pot deleted." });
  if (r.ok) void router.push("/wallet");
}
const badgeLabel = (k: string) => (k === "withdrawal" ? "Withdrawal" : k === "transfer_in" ? "Transfer in" : "Transfer out");
</script>

<template>
  <Page v-if="!pot">
    <Card>
      <Empty title="This pot doesn't exist">
        It may have been deleted by your partner.
        <template #action><RouterLink to="/wallet"><Button variant="secondary">Back to wallet</Button></RouterLink></template>
      </Empty>
    </Card>
  </Page>

  <Page v-else wide>
    <PageHeader :subtitle="subtitle">
      <template #back>
        <RouterLink to="/wallet" class="mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink"><ArrowLeft :size="16" /> Wallet</RouterLink>
      </template>
      <template #title>
        <span class="flex items-center gap-3">{{ pot.name }} <StatusBadge :s="s" :pot="pot" :me-id="app.meId" /></span>
      </template>
      <template #actions>
        <Button v-if="live && pot.status === 'active'" @click="log = true"><Plus :size="18" /> Log contribution</Button>
        <RouterLink v-else-if="pot.status === 'draft'" :to="`/pots/new?edit=${pot.id}`"><Button><Pencil :size="16" /> Finish setup</Button></RouterLink>
      </template>
    </PageHeader>

    <Notice v-if="pot.status === 'draft'" tone="peach" class="mb-6">This pot is a draft. Finish setting it up and send the split to {{ firstName(partner) }} to make it live.</Notice>
    <Notice v-if="pot.status === 'completed'" tone="ok" class="mb-6">
      <template #icon><Check :size="16" /></template>
      Fully funded! {{ s.couple.pet_name }} is very proud of you both.
    </Notice>

    <div class="grid grid-cols-[minmax(0,1fr)_380px] gap-7">
      <div class="flex min-w-0 flex-col gap-6">
        <!-- Hero -->
        <Card class="overflow-hidden">
          <Blocks v-if="pot.bto" :seed="pot.bto.project_id ?? pot.id" class="h-[110px] w-full" />
          <div class="p-7">
            <div class="flex items-end justify-between gap-6">
              <div>
                <div class="text-sm text-muted">Saved together</div>
                <div class="tabular font-serif text-[48px] leading-none">{{ fmt(balance) }} <span class="font-sans text-xl text-muted">/ {{ fmt(target) }}</span></div>
              </div>
              <div class="text-right">
                <div class="tabular text-2xl font-semibold">{{ pct(balance, target) }}%</div>
                <div class="text-sm text-muted">{{ fmt(Math.max(target - balance, 0)) }} to go</div>
              </div>
            </div>
            <!-- one bar, one colour per partner: each grows with what that person has put in -->
            <div class="mt-4 flex h-2.5 overflow-hidden rounded-full bg-white/10" role="progressbar" :aria-valuenow="Math.min(pct(balance, target), 100)" aria-valuemin="0" aria-valuemax="100">
              <div v-for="(p, i) in s.profiles" :key="p.id" :class="cx('h-full transition-[width] duration-700', i === 0 ? 'bg-who-a' : 'bg-who-b')" :style="{ width: share(by[p.id] ?? 0) + '%' }" />
              <div v-if="others > 0" class="h-full bg-faint/60 transition-[width] duration-700" :style="{ width: share(others) + '%' }" />
            </div>
            <div class="mt-5 flex gap-6">
              <div v-for="(p, i) in s.profiles" :key="p.id" class="flex items-center gap-2.5 text-sm">
                <Avatar :name="p.display_name" :who="i === 0 ? 'a' : 'b'" :size="28" />
                <span class="text-muted">{{ firstName(p) }}</span>
                <span class="tabular font-semibold">{{ fmt(by[p.id] ?? 0) }}</span>
                <span :class="cx('size-2 rounded-full', i === 0 ? 'bg-who-a' : 'bg-who-b')" />
              </div>
            </div>
          </div>
        </Card>

        <!-- Stages / budget -->
        <Card v-if="pot.sequential" class="p-7">
          <BtoStepper :pot="pot" />
          <div class="mt-6 flex flex-col gap-3">
            <div v-for="(x, i) in sp" :key="x.stage.id" :class="cx('rounded-2xl border p-5', x.status === 'current' ? 'border-terra/50 bg-peach-2/60' : 'border-line bg-white/5')">
              <div class="flex items-center gap-4">
                <span :class="cx('flex size-9 shrink-0 items-center justify-center rounded-full font-serif', x.status === 'done' ? 'bg-navy text-white' : x.status === 'current' ? 'bg-terra text-white' : 'bg-surface-2 text-muted')">
                  <Check v-if="x.status === 'done'" :size="17" />
                  <template v-else>{{ String(i + 1).padStart(2, "0") }}</template>
                </span>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2">
                    <span class="font-serif text-lg">{{ x.stage.name }}</span>
                    <Badge v-if="x.status === 'current'" tone="peach">In progress</Badge>
                    <Badge v-else-if="x.status === 'done'" tone="ok">Funded</Badge>
                  </div>
                  <div class="text-[13px] text-muted">{{ x.stage.description }}{{ x.stage.due_date ? ` · due ${fmtMonth(x.stage.due_date)}` : "" }}</div>
                </div>
                <div class="text-right">
                  <div class="tabular font-semibold">{{ x.stage.target === 0 ? "Covered by CPF" : `${fmt(x.saved)} / ${fmt(x.stage.target)}` }}</div>
                  <div v-if="x.stage.target > 0 && x.status !== 'done'" class="tabular text-xs text-muted">{{ fmt(x.remaining) }} remaining</div>
                </div>
              </div>
              <Progress v-if="x.stage.target > 0" class="mt-4" :value="x.pct" :tone="x.status === 'current' ? 'terra' : 'navy'" :height="6" />
            </div>
            <div v-if="pot.bto" class="flex items-center gap-4 rounded-2xl border border-dashed border-line p-5 text-muted">
              <span class="flex size-9 items-center justify-center rounded-full bg-surface-2 font-serif">0{{ sp.length + 1 }}</span>
              <div class="flex-1">
                <div class="font-serif text-lg text-ink">Monthly repayments</div>
                <div class="text-[13px]">HDB loan, usually paid from CPF OA after you collect your keys</div>
              </div>
              <div class="tabular font-semibold text-ink">~{{ fmt(pot.bto.loan_monthly) }}/mo</div>
            </div>
          </div>
        </Card>
        <!-- a wedding pot with a saved plan shows its milestones here, next to Log contribution -->
        <WeddingMilestones v-else-if="pot.kind === 'wedding' && weddingPlan.filled" :saved="balance" />
        <RenoMilestones v-else-if="pot.kind === 'renovation' && renoPlan.filled" :saved="balance" />
        <Card v-else class="p-7">
          <SectionTitle>Budget</SectionTitle>
          <ul class="flex flex-col divide-y divide-line">
            <li v-for="x in sp" :key="x.stage.id" class="flex items-center justify-between py-3 text-[15px]">
              <span>{{ x.stage.name }}</span>
              <span class="tabular font-medium">{{ fmt(x.stage.target) }}</span>
            </li>
            <li v-if="offset > 0" class="flex items-center justify-between py-3 text-[15px] text-muted">
              <span>Expected ang bao</span>
              <span class="tabular font-medium text-ok">−{{ fmt(offset) }}</span>
            </li>
            <li class="flex items-center justify-between pt-4 font-semibold">
              <span>{{ offset > 0 ? "Savings target" : "Total" }}</span>
              <span class="tabular text-lg">{{ fmt(target) }}</span>
            </li>
          </ul>
        </Card>

        <!-- History -->
        <Card class="p-7">
          <SectionTitle>
            Contribution history
            <template #action><span class="flex items-center gap-1.5 text-sm text-muted"><History :size="15" /> {{ history.length }} entries</span></template>
          </SectionTitle>
          <Empty v-if="history.length === 0" title="No contributions yet">
            {{ pot.status === "active" ? "Log what you each move into savings. Entries can be edited or undone." : "Contributions open once you both agree the split." }}
            <template v-if="pot.status === 'active'" #action><Button @click="log = true"><Plus :size="17" /> Log the first one</Button></template>
          </Empty>
          <table v-else class="w-full text-sm">
            <thead>
              <tr class="border-b border-line text-left text-xs text-muted">
                <th class="pb-2 font-medium">Date</th>
                <th class="pb-2 font-medium">Who</th>
                <th class="pb-2 font-medium">Note</th>
                <th class="pb-2 text-right font-medium">Amount</th>
                <th class="w-8" />
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in historyRows" :key="r.t.id" class="cursor-pointer border-b border-line/60 hover:bg-surface-2/60" @click="editTx = r.t">
                <td class="py-3 whitespace-nowrap text-muted">{{ fmtDay(r.t.occurred_on) }}<ShieldCheck v-if="r.t.verified_at" :size="13" class="ml-1.5 inline text-ok" title="Verified against a bank statement" /></td>
                <td class="py-3"><span class="flex items-center gap-2"><Avatar :name="r.p?.display_name ?? '?'" :who="r.idx === 0 ? 'a' : 'b'" :size="24" />{{ firstName(r.p) }}</span></td>
                <td class="max-w-[260px] truncate py-3 text-muted">
                  <Badge v-if="r.t.kind !== 'contribution'" tone="sand" class="mr-2">{{ badgeLabel(r.t.kind) }}</Badge>
                  {{ r.t.note }}<span v-if="r.t.edited_at" class="ml-1 text-xs text-faint">(edited)</span>
                </td>
                <td :class="cx('tabular py-3 text-right font-semibold', r.plus ? 'text-ok' : 'text-ink')">{{ r.plus ? "+" : "−" }}{{ fmt(r.t.amount) }}</td>
                <td class="py-3 text-right text-faint"><ChevronRight :size="16" /></td>
              </tr>
            </tbody>
          </table>
        </Card>
      </div>

      <!-- Side column -->
      <aside class="flex flex-col gap-6">
        <ProposalCard v-if="proposal" :proposal="proposal" :show-pot="false" />
        <RequestCard v-for="r in requests" :key="r.id" :request="r" />

        <BtoApplicationsCard v-if="pot.kind === 'bto'" :pot="pot" />

        <Card v-if="pot.kind === 'wedding' && !weddingPlan.filled" class="p-6">
          <SectionTitle>Guests &amp; ang bao</SectionTitle>
          <WeddingGuestsPanel v-model="wedding" :budget="budget" saveable :saving="savingWedding" @save="saveWedding" />
        </Card>

        <Card v-if="live" class="p-6">
          <SectionTitle>Monthly plan</SectionTitle>
          <template v-if="split">
            <div class="flex items-end justify-between">
              <div>
                <div class="tabular font-serif text-[32px] leading-none">{{ fmt(split.monthly_total) }}</div>
                <div class="mt-1 text-sm text-muted">agreed per month</div>
              </div>
              <template v-if="pot.status === 'active'">
                <Badge v-if="need > split.monthly_total" tone="warn">Needs {{ fmt(need) }}</Badge>
                <Badge v-else tone="ok">On track</Badge>
              </template>
            </div>
            <div class="mt-5 flex flex-col gap-3">
              <div v-for="m in monthShares" :key="m.p.id">
                <div class="mb-1.5 flex items-center gap-2 text-sm">
                  <Avatar :name="m.p.display_name" :who="m.i === 0 ? 'a' : 'b'" :size="22" />
                  <span>{{ firstName(m.p) }}</span>
                  <span class="tabular ml-auto text-muted">{{ fmt(m.done) }} / {{ fmt(m.share) }} this month</span>
                </div>
                <Progress :value="pct(m.done, m.share)" :tone="m.i === 0 ? 'terra' : 'navy'" :height="5" />
                <div v-if="m.extra > 0" class="mt-1 text-xs text-muted">includes {{ fmt(m.extra) }} payback for a cover</div>
              </div>
            </div>
            <ul v-if="potPaybacks.length" class="mt-4 flex flex-col gap-1.5 text-[13px] text-muted">
              <li v-for="p in potPaybacks" :key="p.cover.id">{{ firstName(s.profiles.find((x) => x.id === p.cover.for_user_id)) }} still owes {{ fmt(p.outstanding) }} to {{ firstName(s.profiles.find((x) => x.id === p.cover.payer_id)) }}.</li>
            </ul>
            <Button v-if="partnerGap > 0" variant="secondary" size="sm" class="mt-4 w-full" @click="covering = true">Cover {{ firstName(partner) }}'s {{ fmt(partnerGap) }} this month</Button>
            <p v-if="pot.status === 'active'" class="mt-4 text-sm text-muted">
              {{ need > split.monthly_total ? `Dates or withdrawals changed the maths. ${fmt(need)}/month keeps every deadline.` : `${contributionMonths(todayISO(), pot.target_date)} months left. ${fmt(need)}/month keeps every deadline.` }}
            </p>
            <Button v-if="pot.status === 'active'" variant="secondary" size="sm" class="mt-4 w-full" :disabled="!!proposal" @click="raise = Math.max(need, split.monthly_total)">
              <TrendingUp :size="16" /> {{ proposal ? "New split waiting for an answer" : "Propose a new split" }}
            </Button>
          </template>
        </Card>

        <Card v-if="live" class="p-6">
          <SectionTitle>Manage</SectionTitle>
          <div class="flex flex-col gap-2">
            <ActionRow title="Withdraw" sub="To your joint account · needs approval" :disabled="balance <= 0" @click="withdraw = { mode: 'joint' }"><template #icon><Landmark :size="18" /></template></ActionRow>
            <ActionRow title="Move to another pot" sub="Reallocate savings · needs approval" :disabled="balance <= 0" @click="withdraw = 'choose'"><template #icon><MoveRight :size="18" /></template></ActionRow>
            <ActionRow title="Change dates" :sub="pot.sequential ? 'Lease signing or key collection moved' : 'Target date changed'" @click="dates = true"><template #icon><CalendarDays :size="18" /></template></ActionRow>
          </div>
        </Card>

        <Button v-if="balance === 0 && !requests.length" variant="ghost" class="text-bad hover:bg-bad-soft" @click="del = true"><Trash2 :size="16" /> Delete this pot</Button>
      </aside>
    </div>

    <CoverModal v-if="covering" :pot="pot" @close="covering = false" />
    <LogContributionModal v-if="log" :pot="pot" @close="log = false" />
    <ContributionDrawer v-if="editTx" :key="editTx.id" :tx="editTx" @close="editTx = null" />
    <WithdrawModal v-if="withdraw" :pot="pot" :initial="withdrawInit" @close="withdraw = null" />
    <DatesModal v-if="dates" :pot="pot" @close="dates = false" @gap="gap = $event" />
    <GapModal v-if="gap" :pot="pot" :gap="gap" @close="gap = null" @raise="onRaise" @move="onMove" />
    <ProposeSplitModal v-if="raise !== null" :pot="pot" :target="raise" @close="raise = null" />
    <Modal :open="del" :title="`Delete ${pot.name}?`" :width="420" @close="del = false">
      <p class="text-muted">The pot is empty, so nothing is lost except its plan and history. {{ firstName(partner) }} will be notified.</p>
      <div class="mt-6 flex gap-3">
        <Button variant="secondary" class="flex-1" @click="del = false">Keep it</Button>
        <Button variant="danger" class="flex-1" @click="removePot">Delete pot</Button>
      </div>
    </Modal>
  </Page>
</template>
