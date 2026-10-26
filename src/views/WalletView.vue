<script setup lang="ts">
import { computed, ref } from "vue";
import { Plus } from "lucide-vue-next";
import { useCouple } from "@/stores/app";
import { availableBalance, contributionsBy, firstName, heldAmount, liveTx, pendingRequests, potBalance, potTarget, profileOf, signed, walletTotal } from "@/domain/selectors";
import { fmt, pct } from "@/domain/money";
import { fmtMonth } from "@/domain/dates";
import { TEMPLATES } from "@/domain/templates";
import { cx } from "@/lib/cx";
import Page from "@/layouts/Page.vue";
import PageHeader from "@/layouts/PageHeader.vue";
import Avatar from "@/components/ui/Avatar.vue";
import Button from "@/components/ui/Button.vue";
import Chip from "@/components/ui/Chip.vue";
import Notice from "@/components/ui/Notice.vue";
import CoinStack from "@/components/art/CoinStack.vue";
import PigMeter from "@/components/art/PigMeter.vue";
import PiggyBank from "@/components/art/PiggyBank.vue";
import ReconcileDrawer from "@/components/ReconcileDrawer.vue";
import StatusBadge from "@/components/pot/StatusBadge.vue";

const KIND_LABEL = { contribution: "Contribution", withdrawal: "Withdrawal", transfer_in: "Moved in", transfer_out: "Moved out" } as const;

const { app, s } = useCouple();
const potFilter = ref<string | null>(null);
const who = ref<string | null>(null);
const checking = ref(false);

const total = computed(() => walletTotal(s.value));
const pending = computed(() => pendingRequests(s.value));
const live = computed(() => s.value.pots.filter((p) => p.status === "active" || p.status === "completed"));
const pa = computed(() => s.value.profiles[0]);
const pb = computed(() => s.value.profiles[1]);

// ------------------------------------------------------------ who has put in what, all time
const totals = computed(() => s.value.profiles.map((p) => liveTx(s.value).filter((t) => t.user_id === p.id && t.kind === "contribution").reduce((a, t) => a + t.amount, 0)));
const everyone = computed(() => (totals.value[0] ?? 0) + (totals.value[1] ?? 0));

/** Dollars per coin, so the tallest stack is about `maxCoins` coins: a round figure such as $50 or $250. */
const coinValue = (maxCents: number, maxCoins: number) => {
  const need = maxCents / 100 / maxCoins;
  return [10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000].find((v) => v >= need) ?? 10000;
};
const coinsOf = (cents: number, unit: number) => (cents > 0 ? Math.max(Math.round(cents / 100 / unit), 1) : 0);

const heroUnit = computed(() => coinValue(Math.max(...totals.value, 1), 18));
const heroCoins = computed(() => totals.value.map((t) => coinsOf(t, heroUnit.value)));

// ------------------------------------------------------------ the last six months, as stacks of coins
const MONTHS = 6;
const months = computed(() => {
  const now = new Date();
  return Array.from({ length: MONTHS }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (MONTHS - 1 - i), 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const by = s.value.profiles.map((p) => liveTx(s.value).filter((t) => t.kind === "contribution" && t.user_id === p.id && t.occurred_on.startsWith(key)).reduce((a, t) => a + t.amount, 0));
    return { key, label: d.toLocaleDateString("en-SG", { month: "short" }), a: by[0] ?? 0, b: by[1] ?? 0, sum: (by[0] ?? 0) + (by[1] ?? 0) };
  });
});
const monthUnit = computed(() => coinValue(Math.max(...months.value.map((m) => m.sum), 1), 14));
const sixTotal = computed(() => months.value.reduce((a, m) => a + m.sum, 0));
const average = computed(() => Math.round(sixTotal.value / MONTHS));
const thisMonth = computed(() => months.value[MONTHS - 1]);

// ------------------------------------------------------------ pots
const rows = computed(() =>
  [...live.value, ...s.value.pots.filter((p) => !live.value.includes(p))].map((p) => {
    const bal = potBalance(s.value, p.id);
    const target = potTarget(s.value, p.id);
    const by = contributionsBy(s.value, p.id);
    const w = (c: number) => Math.min((c / (target || 1)) * 100, 100);
    const ca = by[pa.value?.id] ?? 0;
    const cb = by[pb.value?.id] ?? 0;
    return { p, bal, target, held: heldAmount(s.value, p.id), free: availableBalance(s.value, p.id), bar: { a: w(ca), b: w(cb), other: w(Math.max(bal - ca - cb, 0)) } };
  }),
);

// ------------------------------------------------------------ ledger, grouped by month
const filterPots = computed(() => s.value.pots.filter((p) => liveTx(s.value).some((t) => t.pot_id === p.id)));
const ledger = computed(() =>
  liveTx(s.value)
    .filter((t) => (!potFilter.value || t.pot_id === potFilter.value) && (!who.value || t.user_id === who.value))
    .sort((a, b) => (b.occurred_on + b.created_at).localeCompare(a.occurred_on + a.created_at)),
);
const groups = computed(() => {
  const out: { key: string; label: string; net: number; items: typeof ledger.value }[] = [];
  for (const t of ledger.value) {
    const key = t.occurred_on.slice(0, 7);
    let g = out[out.length - 1];
    if (!g || g.key !== key) {
      g = { key, label: new Date(`${key}-01T00:00`).toLocaleDateString("en-SG", { month: "long", year: "numeric" }), net: 0, items: [] };
      out.push(g);
    }
    g.items.push(t);
    g.net += signed(t);
  }
  return out;
});
const day = (iso: string) => new Date(`${iso}T00:00`).toLocaleDateString("en-SG", { day: "numeric", month: "short" });
const idx = (id: string) => (s.value.profiles.findIndex((x) => x.id === id) === 0 ? "a" : "b");
const potName = (id: string) => s.value.pots.find((p) => p.id === id)?.name ?? "";
</script>

<template>
  <Page wide>
    <PageHeader title="Wallet" subtitle="Every pot, every dollar, one shared ledger.">
      <template #actions>
        <RouterLink to="/pots/new"><Button><Plus :size="17" /> New pot</Button></RouterLink>
      </template>
    </PageHeader>

    <!-- the headline: both partners' coins, and the piggy bank they are saving into -->
    <section class="rounded-[10px] bg-navy px-8 pt-16 pb-7 shadow-[var(--shadow-card)]">
      <div class="grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,1fr)] items-end gap-6">
        <div v-for="p in s.profiles.slice(0, 1)" :key="p.id" class="flex flex-col items-center text-center">
          <CoinStack :segments="[{ count: heroCoins[0] ?? 0, colour: '#e8906a' }]" :width="104" :max="18" />
          <div class="mt-4 flex items-center gap-2.5"><Avatar :name="p.display_name" who="a" :size="34" /><span class="text-[16px] font-medium">{{ firstName(p) }}{{ p.id === app.meId ? " (you)" : "" }}</span></div>
          <p class="tabular mt-1 text-[26px] leading-tight font-semibold">{{ fmt(totals[0] ?? 0) }}</p>
          <p class="text-[13px] text-muted">{{ pct(totals[0] ?? 0, everyone) }}% of the savings</p>
        </div>

        <div class="flex flex-col items-center text-center">
          <PiggyBank :amount="fmt(total)" :size="400" />
          <p class="mt-2 text-[14.5px] text-muted">
            across {{ live.length }} active goal{{ live.length === 1 ? "" : "s" }}<template v-if="pending.length"> · <RouterLink to="/inbox" class="text-who-a underline underline-offset-4">{{ pending.length }} request{{ pending.length > 1 ? "s" : "" }} waiting</RouterLink></template>
          </p>
        </div>

        <div v-for="p in s.profiles.slice(1, 2)" :key="p.id" class="flex flex-col items-center text-center">
          <CoinStack :segments="[{ count: heroCoins[1] ?? 0, colour: '#86aeb4' }]" :width="104" :max="18" />
          <div class="mt-4 flex items-center gap-2.5"><Avatar :name="p.display_name" who="b" :size="34" /><span class="text-[16px] font-medium">{{ firstName(p) }}{{ p.id === app.meId ? " (you)" : "" }}</span></div>
          <p class="tabular mt-1 text-[26px] leading-tight font-semibold">{{ fmt(totals[1] ?? 0) }}</p>
          <p class="text-[13px] text-muted">{{ pct(totals[1] ?? 0, everyone) }}% of the savings</p>
        </div>
      </div>
      <p class="mt-5 text-center text-[12.5px] text-faint">Each coin is about ${{ heroUnit.toLocaleString() }}</p>
    </section>

    <!-- month by month -->
    <section class="mt-6 rounded-[10px] bg-navy p-8 shadow-[var(--shadow-card)]">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 class="font-serif text-[28px] leading-none">Coins in, month by month</h2>
          <p class="mt-2 text-[14px] text-muted">{{ fmt(sixTotal) }} over six months, about {{ fmt(average) }} a month. Each coin is about ${{ monthUnit.toLocaleString() }}. <span class="text-who-a">{{ firstName(pa) }}</span>'s coins sit at the bottom of each stack and <span class="text-who-b">{{ firstName(pb) }}</span>'s on top.</p>
        </div>
      </div>
      <div class="mt-8 grid grid-cols-6 items-end gap-4">
        <div v-for="(m, i) in months" :key="m.key" class="flex flex-col items-center">
          <div class="flex h-[190px] items-end">
            <CoinStack :segments="[{ count: coinsOf(m.a, monthUnit), colour: '#e8906a' }, { count: coinsOf(m.b, monthUnit), colour: '#86aeb4' }]" :width="62" :max="14" />
          </div>
          <p :class="cx('tabular mt-3 text-[15px] font-semibold', m.sum ? '' : 'text-faint')">{{ m.sum ? fmt(m.sum) : "$0" }}</p>
          <p :class="cx('text-[13px]', i === MONTHS - 1 ? 'font-semibold text-ink' : 'text-muted')">{{ m.label }}</p>
        </div>
      </div>
    </section>

    <!-- goals, each its own piggy bank -->
    <div class="mt-12 mb-5 flex items-end justify-between">
      <h2 class="font-serif text-[32px] leading-none">Your goals</h2>
      <p class="text-[13.5px] text-muted">{{ fmt(thisMonth.sum) }} put in this month</p>
    </div>
    <div class="grid grid-cols-3 gap-5">
      <RouterLink v-for="r in rows" :key="r.p.id" :to="`/pots/${r.p.id}`" class="group">
        <article class="flex h-full flex-col items-center rounded-[10px] bg-navy px-6 pt-7 pb-6 text-center shadow-[var(--shadow-card)] transition group-hover:-translate-y-1 group-hover:shadow-[var(--shadow-pop)]">
          <PigMeter :a="r.bar.a" :b="r.bar.b" :other="r.bar.other" :size="230" :label="`${r.p.name}: ${pct(r.bal, r.target)}% saved`" class="transition-transform duration-300 group-hover:-rotate-2" />
          <div class="mt-3 flex items-center justify-center gap-2.5"><h3 class="text-[19px] font-semibold">{{ r.p.name }}</h3><StatusBadge :s="s" :pot="r.p" :me-id="app.meId" /></div>
          <p class="text-[13.5px] text-muted">{{ r.p.subtitle || TEMPLATES[r.p.kind].title }}</p>
          <p class="tabular mt-4 text-[30px] leading-none font-semibold">{{ fmt(r.bal) }}</p>
          <p class="tabular mt-1.5 text-[13.5px] text-muted">{{ pct(r.bal, r.target) }}% of {{ fmt(r.target) }}</p>
          <p v-if="r.held" class="tabular mt-1 text-[12.5px] text-warn">{{ fmt(r.held) }} held · {{ fmt(r.free) }} free</p>
          <p class="mt-4 w-full border-t border-line pt-3 text-[13px] text-muted">{{ r.p.kind === "bto" ? "Keys" : "By" }} {{ fmtMonth(r.p.target_date) }}</p>
        </article>
      </RouterLink>
    </div>

    <!-- ledger -->
    <section class="mt-12 rounded-[10px] bg-navy p-8 shadow-[var(--shadow-card)]">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 class="font-serif text-[32px] leading-none">Ledger</h2>
          <p class="mt-2 text-[14px] text-muted">Every deposit and withdrawal, newest first. Balances are always worked out from this list.</p>
        </div>
        <Button variant="secondary" size="sm" @click="checking = true">Check against bank statement</Button>
      </div>

      <div class="mt-6 flex flex-wrap gap-2">
        <Chip :active="!potFilter" @click="potFilter = null">All goals</Chip>
        <Chip v-for="p in filterPots" :key="p.id" :active="potFilter === p.id" @click="potFilter = potFilter === p.id ? null : p.id">{{ p.name }}</Chip>
        <span class="mx-2 w-px bg-line" />
        <Chip v-for="p in s.profiles" :key="p.id" :active="who === p.id" @click="who = who === p.id ? null : p.id">{{ firstName(p) }}</Chip>
      </div>

      <div v-for="g in groups" :key="g.key" class="mt-8">
        <div class="flex items-baseline justify-between border-b border-line pb-2.5">
          <h3 class="text-[15px] font-semibold">{{ g.label }}</h3>
          <p :class="cx('tabular text-[13.5px]', g.net >= 0 ? 'text-ok' : 'text-muted')">{{ g.net >= 0 ? "+" : "−" }}{{ fmt(Math.abs(g.net)) }} net</p>
        </div>
        <ul class="divide-y divide-line/60">
          <li v-for="t in g.items" :key="t.id" class="grid grid-cols-[64px_36px_minmax(0,1fr)_auto] items-center gap-4 py-3">
            <span class="text-[13.5px] text-muted">{{ day(t.occurred_on) }}</span>
            <Avatar :name="profileOf(s, t.user_id)?.display_name ?? '?'" :who="idx(t.user_id)" :size="32" />
            <div class="min-w-0">
              <p class="truncate text-[14.5px]">
                <RouterLink :to="`/pots/${t.pot_id}`" class="font-medium hover:underline">{{ potName(t.pot_id) }}</RouterLink>
                <span v-if="t.verified_at" class="ml-2 rounded-[3px] bg-ok-soft px-1.5 py-px text-[11px] font-medium text-ok" title="Matched to a bank statement">Verified</span>
              </p>
              <p class="truncate text-[13px] text-muted">{{ firstName(profileOf(s, t.user_id)) }}<template v-if="t.kind !== 'contribution'"> · {{ KIND_LABEL[t.kind] }}</template><template v-if="t.note"> · {{ t.note }}</template></p>
            </div>
            <span :class="cx('tabular text-[16px] font-semibold', t.kind === 'contribution' || t.kind === 'transfer_in' ? 'text-ok' : '')">{{ t.kind === "contribution" || t.kind === "transfer_in" ? "+" : "−" }}{{ fmt(t.amount) }}</span>
          </li>
        </ul>
      </div>
      <p v-if="groups.length === 0" class="py-10 text-center text-sm text-muted">No entries match these filters.</p>
    </section>

    <ReconcileDrawer v-if="checking" @close="checking = false" />

    <Notice class="mt-6">
      Demo wallet: SMilestones records money you've set aside in your own accounts. It never holds or moves real funds, so it needs no banking licence.
    </Notice>
  </Page>
</template>
