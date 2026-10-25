<script setup lang="ts">
import { computed, ref } from "vue";
import { ArrowRight, Check, Plus, TriangleAlert } from "lucide-vue-next";
import { useCouple } from "@/stores/app";
import { expectedShare, creditedIn, whosAhead } from "@/domain/covers";
import { activeSplit, firstName, inboxFor, liveTx, profileOf, walletTotal } from "@/domain/selectors";
import { fmt, pct } from "@/domain/money";
import { relativeTime } from "@/domain/dates";
import { nextCrunch } from "@/domain/timeline";
import { cx } from "@/lib/cx";
import Page from "@/layouts/Page.vue";
import PageHeader from "@/layouts/PageHeader.vue";
import Avatar from "@/components/ui/Avatar.vue";
import Button from "@/components/ui/Button.vue";
import Card from "@/components/ui/Card.vue";
import Empty from "@/components/ui/Empty.vue";
import TotalHero from "@/components/TotalHero.vue";
import DepositJars, { type JarPerson } from "@/components/DepositJars.vue";
import PotCard from "@/components/pot/PotCard.vue";
import QuoteRotator from "@/components/QuoteRotator.vue";

const { app, s } = useCouple();
// One photo per quote, in quote order; the background fades as the quote changes.
const quoteIdx = ref(0);
const quoteImages = ["/images/wedding.jpg", "/images/keys.jpg", "/images/interior.jpg", "/images/living.jpg", "/images/bedroom.jpg"];
const order = (st: string) => ({ pending_split: 0, active: 1, draft: 2, completed: 3 })[st] ?? 9;

const inbox = computed(() => inboxFor(s.value, app.meId));
const greet = computed(() => {
  const hour = new Date().getHours();
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
});
const today = new Date().toLocaleDateString("en-SG", { weekday: "long", day: "numeric", month: "long" });
const pots = computed(() => [...s.value.pots].sort((a, b) => order(a.status) - order(b.status) || a.target_date.localeCompare(b.target_date)));
const inboxSummary = computed(() =>
  [
    ...inbox.value.proposals.map((p) => `Split for ${s.value.pots.find((x) => x.id === p.pot_id)?.name}`),
    ...inbox.value.requests.map((r) => `${r.kind === "transfer" ? "Transfer" : "Withdrawal"} of ${fmt(r.amount)}`),
    ...inbox.value.covers.map((c) => `Cover of ${fmt(c.amount)}`),
  ].join(" · "),
);

// This month: each partner's contributions vs their agreed monthly share across live pots
const ahead = computed(() => whosAhead(s.value));
const monthly = computed(() => {
  const month = new Date().toISOString().slice(0, 7);
  return s.value.profiles.map((p, i) => {
    const active = s.value.pots.filter((x) => x.status === "active");
    // includes any payback instalments owed for a cover, and credits money paid on a partner's behalf
    const promised = active.reduce((sum, x) => sum + expectedShare(s.value, x.id, p.id, month), 0);
    const done = active.reduce((sum, x) => sum + creditedIn(s.value, x.id, p.id, month), 0);
    const base = active.reduce((sum, x) => sum + (activeSplit(s.value, x.id)?.shares[p.id] ?? 0), 0);
    return { p, i, promised, done, payback: promised - base };
  });
});

/** The same month, per person, for the jars: each goal's deposit against what was agreed. */
const jarPeople = computed<JarPerson[]>(() => {
  const month = new Date().toISOString().slice(0, 7);
  const active = s.value.pots.filter((x) => x.status === "active");
  return monthly.value.map((m) => ({
    id: m.p.id,
    name: firstName(m.p),
    initial: m.p.display_name.trim().charAt(0).toUpperCase(),
    who: m.i === 0 ? "a" : "b",
    you: m.p.id === app.meId,
    done: m.done,
    promised: m.promised,
    payback: m.payback,
    breakdown: active.map((x) => ({ name: x.name, done: creditedIn(s.value, x.id, m.p.id, month), expected: expectedShare(s.value, x.id, m.p.id, month) })),
  }));
});

const activity = computed(() =>
  liveTx(s.value)
    .filter((t) => t.kind !== "transfer_in")
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 6)
    .map((t) => ({
      t,
      who: profileOf(s.value, t.user_id),
      idx: s.value.profiles.findIndex((x) => x.id === t.user_id),
      pot: s.value.pots.find((x) => x.id === t.pot_id),
      verb: t.kind === "contribution" ? "added to" : t.kind === "withdrawal" ? "withdrew from" : "moved from",
    })),
);

const crunch = computed(() => nextCrunch(s.value, 12));
const total = computed(() => walletTotal(s.value));
const activeCount = computed(() => s.value.pots.filter((p) => p.status === "active").length);
/** Money added across all goals this month, by anyone. */
const addedThisMonth = computed(() => {
  const month = new Date().toISOString().slice(0, 7);
  return liveTx(s.value).filter((t) => t.kind === "contribution" && t.occurred_on.startsWith(month)).reduce((a, t) => a + t.amount, 0);
});
/** How the total divides by who paid it in. */
const split = computed(() => {
  const paid: Record<string, number> = {};
  for (const t of liveTx(s.value)) if (t.kind === "contribution") paid[t.user_id] = (paid[t.user_id] ?? 0) + t.amount;
  const t = total.value || 1;
  const [a, b] = s.value.profiles;
  const ca = paid[a?.id] ?? 0;
  const cb = paid[b?.id] ?? 0;
  return { a: (ca / t) * 100, b: (cb / t) * 100, ca, cb, na: firstName(a), nb: firstName(b) };
});
</script>

<template>
  <Page wide>
    <PageHeader :subtitle="today">
      <template #title>{{ greet }}, <em class="text-terra">{{ firstName(app.me ?? undefined) }}</em></template>
    </PageHeader>

    <!-- total, and who has deposited -->
    <div class="grid grid-cols-12 gap-6">
      <TotalHero v-reveal class="col-span-8" />

      <Card v-reveal="100" class="col-span-4 p-7">
        <p class="text-[12px] font-medium tracking-[0.2em] text-muted uppercase">This month</p>
        <h2 class="font-serif mt-2 text-[26px] leading-tight">Who's put in</h2>
        <div class="mt-5"><DepositJars :people="jarPeople" /></div>
        <p v-if="ahead.leaderId" class="mt-6 border-t border-line pt-4 text-[13px] text-muted">
          {{ firstName(profileOf(s, ahead.leaderId)) }} is ahead by <strong class="tabular text-ink">{{ fmt(ahead.amount) }}</strong>, repaid over the next few months.
        </p>
      </Card>
    </div>

    <!-- things that need attention -->
    <div v-if="inbox.count > 0 || crunch" :class="cx('mt-6 grid gap-6', inbox.count > 0 && crunch ? 'grid-cols-2' : 'grid-cols-1')">
      <RouterLink v-if="inbox.count > 0" v-reveal to="/inbox" class="flex items-center gap-4 rounded-[4px] border-l-[3px] border-warn bg-ink/[0.035] px-6 py-5 transition hover:bg-ink/[0.06]">
        <span class="flex size-9 shrink-0 items-center justify-center rounded-[3px] bg-ink font-mono text-[14px] font-medium text-white">{{ inbox.count }}</span>
        <div class="min-w-0 flex-1">
          <div class="font-medium">{{ inbox.count === 1 ? "1 thing needs your answer" : `${inbox.count} things need your answer` }}</div>
          <div class="truncate font-mono text-[12.5px] text-warn">{{ inboxSummary }}</div>
        </div>
        <ArrowRight :size="18" class="text-warn" />
      </RouterLink>
      <RouterLink v-if="crunch" v-reveal="80" to="/timeline" class="flex items-start gap-4 rounded-[4px] border-l-[3px] border-bad bg-ink/[0.035] px-6 py-5 transition hover:bg-ink/[0.06]">
        <TriangleAlert :size="20" class="mt-0.5 shrink-0 text-bad" />
        <div class="min-w-0 flex-1">
          <div class="text-[11px] font-medium tracking-[0.16em] text-bad uppercase">Crunch month ahead</div>
          <div class="mt-1 text-sm leading-relaxed">{{ crunch.message }}</div>
        </div>
        <ArrowRight :size="18" class="mt-1 text-bad" />
      </RouterLink>
    </div>

    <!-- goals -->
    <section class="mt-12">
      <div class="mb-5 flex items-end justify-between">
        <h2 class="font-serif text-[32px] leading-none">Your goals</h2>
        <RouterLink to="/pots/new"><Button size="sm"><Plus :size="16" /> Add a goal</Button></RouterLink>
      </div>
      <Card v-if="pots.length === 0">
        <Empty title="Create your first shared goal">
          Add a goal with a budget and a deadline, agree the monthly split, and track it together. BTO, wedding, travel, or anything else.
          <template #action><RouterLink to="/pots/new"><Button><Plus :size="17" /> Add a goal</Button></RouterLink></template>
        </Empty>
      </Card>
      <div v-else class="grid grid-cols-3 gap-6">
        <PotCard v-for="(p, i) in pots" :key="p.id" v-reveal="i * 90" :s="s" :pot="p" :me-id="app.meId" />
      </div>
    </section>

    <!-- activity, and a thought -->
    <div class="mt-12 grid grid-cols-12 gap-6">
      <Card v-reveal class="col-span-7 p-8">
        <div class="mb-5 flex items-end justify-between">
          <h2 class="font-serif text-[26px] leading-none">Recent activity</h2>
          <RouterLink to="/wallet" class="text-sm font-medium text-terra hover:underline">Open wallet</RouterLink>
        </div>
        <p v-if="activity.length === 0" class="text-sm text-muted">Nothing yet. Contributions you both log appear here.</p>
        <ul v-else class="divide-y divide-line">
          <li v-for="a in activity" :key="a.t.id" class="flex items-center gap-4 py-3.5">
            <Avatar :name="a.who?.display_name ?? '?'" :who="a.idx === 0 ? 'a' : 'b'" :size="34" />
            <div class="min-w-0 flex-1 text-[14.5px]">
              <span class="font-medium">{{ firstName(a.who) }}</span> <span class="text-muted">{{ a.verb }}</span> {{ a.pot?.name }}
              <div class="text-xs text-faint">{{ relativeTime(a.t.created_at) }}</div>
            </div>
            <span :class="cx('tabular text-[15px] font-medium', a.t.kind === 'contribution' ? 'text-ok' : 'text-ink')">{{ a.t.kind === "contribution" ? "+" : "−" }}{{ fmt(a.t.amount) }}</span>
          </li>
        </ul>
      </Card>

      <div v-reveal="100" class="relative col-span-5 overflow-hidden rounded-[6px] text-white shadow-[var(--shadow-card)]">
        <img v-for="(src, n) in quoteImages" :key="src" :src="src" alt="" :class="['absolute inset-0 size-full object-cover sepia-[0.35] transition-opacity duration-[1400ms]', n === quoteIdx ? 'opacity-100' : 'opacity-0']" />
        <div class="absolute inset-0 bg-ink/65" />
        <div class="relative flex h-full min-h-[320px] items-end px-9 py-9"><QuoteRotator v-model="quoteIdx" tone="dark" class="[&_blockquote]:text-[27px] [&_blockquote]:leading-[1.2]" /></div>
      </div>
    </div>
  </Page>
</template>
