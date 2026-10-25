<script setup lang="ts">
import { computed, ref } from "vue";
import { ChevronRight, Info, Plus, Wallet as WalletIcon } from "lucide-vue-next";
import { useCouple } from "@/stores/app";
import { availableBalance, firstName, heldAmount, liveTx, pendingRequests, potBalance, potTarget, profileOf, walletTotal } from "@/domain/selectors";
import { fmt, pct } from "@/domain/money";
import { fmtDay, fmtMonth } from "@/domain/dates";
import { TEMPLATES } from "@/domain/templates";
import { cx } from "@/lib/cx";
import Page from "@/layouts/Page.vue";
import PageHeader from "@/layouts/PageHeader.vue";
import Avatar from "@/components/ui/Avatar.vue";
import Badge from "@/components/ui/Badge.vue";
import Button from "@/components/ui/Button.vue";
import Card from "@/components/ui/Card.vue";
import Chip from "@/components/ui/Chip.vue";
import IconTile from "@/components/ui/IconTile.vue";
import Notice from "@/components/ui/Notice.vue";
import SectionTitle from "@/components/ui/SectionTitle.vue";
import PotIcon from "@/components/art/PotIcon.vue";
import ReconcileDrawer from "@/components/ReconcileDrawer.vue";
import { ShieldCheck } from "lucide-vue-next";
import StatusBadge from "@/components/pot/StatusBadge.vue";

const KIND_LABEL = { contribution: "Contribution", withdrawal: "Withdrawal", transfer_in: "Transfer in", transfer_out: "Transfer out" } as const;

const { app, s } = useCouple();
const potFilter = ref<string | null>(null);
const who = ref<string | null>(null);
const checking = ref(false);

const total = computed(() => walletTotal(s.value));
const pending = computed(() => pendingRequests(s.value));
const live = computed(() => s.value.pots.filter((p) => p.status === "active" || p.status === "completed"));
const other = computed(() => s.value.pots.filter((p) => !live.value.includes(p)));
const rows = computed(() =>
  [...live.value, ...other.value].map((p) => ({
    p,
    bal: potBalance(s.value, p.id),
    held: heldAmount(s.value, p.id),
    free: availableBalance(s.value, p.id),
    target: potTarget(s.value, p.id),
  })),
);
const ledger = computed(() =>
  liveTx(s.value)
    .filter((t) => (!potFilter.value || t.pot_id === potFilter.value) && (!who.value || t.user_id === who.value))
    .sort((a, b) => (b.occurred_on + b.created_at).localeCompare(a.occurred_on + a.created_at)),
);
const filterPots = computed(() => s.value.pots.filter((p) => liveTx(s.value).some((t) => t.pot_id === p.id)));
// Contributions per person, all time
const totals = computed(() => s.value.profiles.map((p) => liveTx(s.value).filter((t) => t.user_id === p.id && t.kind === "contribution").reduce((a, t) => a + t.amount, 0)));
</script>

<template>
  <Page wide>
    <PageHeader title="Wallet" subtitle="Every pot, every dollar, one shared ledger.">
      <template #actions>
        <RouterLink to="/pots/new"><Button><Plus :size="17" /> New pot</Button></RouterLink>
      </template>
    </PageHeader>

    <div class="mb-7 grid grid-cols-[1.3fr_1fr_1fr] gap-5">
      <Card class="bg-navy p-7 text-white">
        <div class="flex items-center justify-between text-white/70"><span>Total saved</span><WalletIcon :size="20" /></div>
        <div class="tabular mt-2 font-serif text-[46px] leading-none">{{ fmt(total) }}</div>
        <div class="mt-3 text-sm text-white/70">
          across {{ live.length }} active milestone{{ live.length === 1 ? "" : "s" }}{{ pending.length ? ` · ${pending.length} request${pending.length > 1 ? "s" : ""} pending` : "" }}
        </div>
      </Card>
      <Card v-for="(p, i) in s.profiles" :key="p.id" class="p-7">
        <div class="flex items-center gap-2.5">
          <Avatar :name="p.display_name" :who="i === 0 ? 'a' : 'b'" :size="30" />
          <span class="font-medium">{{ firstName(p) }}{{ p.id === app.meId ? " (you)" : "" }}</span>
        </div>
        <div class="tabular mt-3 text-[28px] font-semibold">{{ fmt(totals[i]) }}</div>
        <div class="text-sm text-muted">contributed · {{ pct(totals[i], totals[0] + totals[1]) }}% of all savings</div>
      </Card>
    </div>

    <SectionTitle>Your milestone pots</SectionTitle>
    <div class="mb-8 flex flex-col gap-3">
      <RouterLink v-for="r in rows" :key="r.p.id" :to="`/pots/${r.p.id}`" class="group">
        <Card class="grid grid-cols-[minmax(0,1.4fr)_1fr_1fr_1fr_24px] items-center gap-6 px-6 py-5 transition-shadow group-hover:shadow-[var(--shadow-pop)]">
          <div class="flex min-w-0 items-center gap-4">
            <IconTile><PotIcon :kind="r.p.kind" /></IconTile>
            <div class="min-w-0">
              <div class="flex items-center gap-2"><span class="truncate font-semibold">{{ r.p.name }}</span><StatusBadge :s="s" :pot="r.p" :me-id="app.meId" /></div>
              <div class="truncate text-sm text-muted">{{ r.p.subtitle || TEMPLATES[r.p.kind].title }}</div>
            </div>
          </div>
          <div>
            <div class="text-xs text-muted">Balance</div>
            <div class="tabular text-lg font-semibold">{{ fmt(r.bal) }}</div>
            <div v-if="r.held" class="tabular text-xs text-warn">{{ fmt(r.held) }} held · {{ fmt(r.free) }} free</div>
          </div>
          <div>
            <div class="text-xs text-muted">Progress</div>
            <div class="tabular font-medium">{{ pct(r.bal, r.target) }}% of {{ fmt(r.target) }}</div>
          </div>
          <div>
            <div class="text-xs text-muted">{{ r.p.kind === "bto" ? "Key collection" : "Target date" }}</div>
            <div class="font-medium">{{ fmtMonth(r.p.target_date) }}</div>
          </div>
          <ChevronRight :size="18" class="text-faint" />
        </Card>
      </RouterLink>
    </div>

    <Card class="p-7">
      <SectionTitle>
        Ledger
        <template #action><Button variant="secondary" size="sm" @click="checking = true"><ShieldCheck :size="15" /> Check against bank statement</Button></template>
      </SectionTitle>
      <div class="mb-4 flex flex-wrap gap-2">
        <Chip :active="!potFilter" @click="potFilter = null">All pots</Chip>
        <Chip v-for="p in filterPots" :key="p.id" :active="potFilter === p.id" @click="potFilter = potFilter === p.id ? null : p.id">{{ p.name }}</Chip>
        <span class="mx-2 w-px bg-line" />
        <Chip v-for="p in s.profiles" :key="p.id" :active="who === p.id" @click="who = who === p.id ? null : p.id">{{ firstName(p) }}</Chip>
      </div>
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-line text-left text-xs text-muted">
            <th class="pb-2 font-medium">Date</th>
            <th class="pb-2 font-medium">Pot</th>
            <th class="pb-2 font-medium">Type</th>
            <th class="pb-2 font-medium">By</th>
            <th class="pb-2 font-medium">Note</th>
            <th class="pb-2 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="t in ledger" :key="t.id" class="border-b border-line/60">
            <td class="py-2.5 whitespace-nowrap text-muted">{{ fmtDay(t.occurred_on) }}<ShieldCheck v-if="t.verified_at" :size="13" class="ml-1.5 inline text-ok" title="Verified against a bank statement" /></td>
            <td class="py-2.5"><RouterLink :to="`/pots/${t.pot_id}`" class="hover:underline">{{ s.pots.find((p) => p.id === t.pot_id)?.name }}</RouterLink></td>
            <td class="py-2.5"><Badge :tone="t.kind === 'contribution' ? 'ok' : 'sand'">{{ KIND_LABEL[t.kind] }}</Badge></td>
            <td class="py-2.5">{{ firstName(profileOf(s, t.user_id)) }}</td>
            <td class="max-w-[240px] truncate py-2.5 text-muted">{{ t.note }}</td>
            <td :class="cx('tabular py-2.5 text-right font-semibold', t.kind === 'contribution' || t.kind === 'transfer_in' ? 'text-ok' : '')">
              {{ t.kind === "contribution" || t.kind === "transfer_in" ? "+" : "−" }}{{ fmt(t.amount) }}
            </td>
          </tr>
        </tbody>
      </table>
      <p v-if="ledger.length === 0" class="py-8 text-center text-sm text-muted">No entries match these filters.</p>
    </Card>

    <ReconcileDrawer v-if="checking" @close="checking = false" />

    <Notice class="mt-6">
      <template #icon><Info :size="15" /></template>
      Demo wallet: SMilestones records money you've set aside in your own accounts. It never holds or moves real funds, so it needs no banking licence. Balances are always computed from this ledger, never stored.
    </Notice>
  </Page>
</template>
