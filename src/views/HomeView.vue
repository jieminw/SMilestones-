<script setup lang="ts">
import { computed, ref } from "vue";
import { ArrowRight, Check, ChevronRight, Plus, Target, TrendingUp, TriangleAlert, Users, Wallet } from "lucide-vue-next";
import { useCouple } from "@/stores/app";
import { expectedShare, creditedIn, whosAhead } from "@/domain/covers";
import { activeSplit, currentStage, firstName, inboxFor, liveTx, potBalance, potTarget, profileOf, stageProgress, walletTotal } from "@/domain/selectors";
import { fmt, pct } from "@/domain/money";
import { fmtMonth, relativeTime } from "@/domain/dates";
import { nextCrunch } from "@/domain/timeline";
import { cx } from "@/lib/cx";
import Page from "@/layouts/Page.vue";
import PageHeader from "@/layouts/PageHeader.vue";
import Avatar from "@/components/ui/Avatar.vue";
import Button from "@/components/ui/Button.vue";
import Card from "@/components/ui/Card.vue";
import Empty from "@/components/ui/Empty.vue";
import PotIcon from "@/components/art/PotIcon.vue";
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

/** Everything that happened, not just deposits: money moves, requests and answers, splits, covers, applications, new goals. */
type Event = { id: string; at: string; who?: ReturnType<typeof profileOf>; verb: string; object: string; amount?: number; sign?: "+" | "−"; tag?: string; tone?: "ok" | "bad" };
const activity = computed<Event[]>(() => {
  const st = s.value;
  const potName = (id: string | null) => st.pots.find((x) => x.id === id)?.name ?? "a goal";
  const out: Event[] = [];

  for (const t of liveTx(st)) {
    if (t.kind === "transfer_in") continue;
    const verb = t.kind === "contribution" ? "added to" : t.kind === "withdrawal" ? "withdrew from" : "moved from";
    out.push({ id: "t" + t.id, at: t.created_at, who: profileOf(st, t.user_id), verb, object: potName(t.pot_id), amount: t.amount, sign: t.kind === "contribution" ? "+" : "−" });
  }
  for (const r of st.requests) {
    const what = r.kind === "transfer" ? `a transfer of ${fmt(r.amount)} from ${potName(r.pot_id)} to ${potName(r.to_pot_id)}` : `a withdrawal of ${fmt(r.amount)} from ${potName(r.pot_id)}`;
    out.push({ id: "r" + r.id, at: r.created_at, who: profileOf(st, r.requested_by), verb: "asked for", object: what });
    if (r.status === "approved" || r.status === "declined") {
      const other = st.profiles.find((x) => x.id !== r.requested_by);
      out.push({ id: "ra" + r.id, at: r.responded_at ?? r.created_at, who: other, verb: r.status === "approved" ? "approved" : "declined", object: `${firstName(profileOf(st, r.requested_by))}'s ${r.kind}`, tag: r.status === "approved" ? "Approved" : "Declined", tone: r.status === "approved" ? "ok" : "bad" });
    }
  }
  for (const p of st.proposals) {
    out.push({ id: "p" + p.id, at: p.created_at, who: profileOf(st, p.proposed_by), verb: "proposed a monthly split for", object: potName(p.pot_id) });
    if (p.status === "accepted" || p.status === "declined") {
      const other = st.profiles.find((x) => x.id !== p.proposed_by);
      out.push({ id: "pa" + p.id, at: p.responded_at ?? p.created_at, who: other, verb: p.status === "accepted" ? "accepted the split for" : "declined the split for", object: potName(p.pot_id), tag: p.status === "accepted" ? "Agreed" : "Declined", tone: p.status === "accepted" ? "ok" : "bad" });
    }
  }
  for (const c of st.covers ?? []) {
    out.push({ id: "c" + c.id, at: c.created_at, who: profileOf(st, c.payer_id), verb: "offered to cover", object: `${firstName(profileOf(st, c.for_user_id))}'s share of ${potName(c.pot_id)}`, amount: c.amount });
    if (c.status === "accepted" || c.status === "declined") out.push({ id: "ca" + c.id, at: c.responded_at ?? c.created_at, who: profileOf(st, c.for_user_id), verb: c.status === "accepted" ? "accepted the cover for" : "declined the cover for", object: potName(c.pot_id), tag: c.status === "accepted" ? "Accepted" : "Declined", tone: c.status === "accepted" ? "ok" : "bad" });
  }
  for (const a of st.btoApplications ?? []) {
    const who = st.profiles.find((x) => x.id === st.pots.find((p) => p.id === a.pot_id)?.created_by);
    out.push({ id: "a" + a.id, at: a.created_at, who, verb: "logged a BTO application for", object: a.exercise, tag: a.result === "pending" ? "Pending" : a.result === "successful" ? "Successful" : a.result === "unsuccessful" ? "Unsuccessful" : "Declined", tone: a.result === "successful" ? "ok" : a.result === "pending" ? undefined : "bad" });
  }
  for (const p of st.pots) out.push({ id: "g" + p.id, at: p.created_at, who: profileOf(st, p.created_by), verb: "started a new goal,", object: p.name });

  return out.sort((x, y) => y.at.localeCompare(x.at)).slice(0, 8);
});

const crunch = computed(() => nextCrunch(s.value, 12));
const total = computed(() => walletTotal(s.value));
const goalsEl = ref<HTMLElement | null>(null);
/** The goal to look at first: the BTO (or any stage-by-stage goal) in progress, else the first active one. */
const nextUp = computed(() => {
  const pot = pots.value.find((p) => p.status === "active" && p.sequential) ?? pots.value.find((p) => p.status === "active");
  if (!pot) return null;
  const kind = pot.kind === "bto" ? "BTO" : pot.kind.charAt(0).toUpperCase() + pot.kind.slice(1);
  const cur = pot.sequential ? currentStage(s.value, pot) : undefined;
  if (cur) {
    const n = stageProgress(s.value, pot).findIndex((x) => x.stage.id === cur.stage.id) + 1;
    return { pot, title: cur.stage.name, kicker: `${kind} · Stage ${n}`, due: cur.stage.due_date ?? pot.target_date, saved: cur.saved, target: cur.stage.target, pct: cur.pct };
  }
  const saved = potBalance(s.value, pot.id);
  const target = potTarget(s.value, pot.id);
  return { pot, title: pot.name, kicker: kind, due: pot.target_date, saved, target, pct: pct(saved, target) };
});
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
      <template #title>{{ greet }}, <em class="text-who-a">{{ firstName(app.me ?? undefined) }}</em></template>
      <template #actions><p class="hidden text-right text-[14px] leading-snug text-muted md:block">Same goals.<br />A kinder tomorrow.</p></template>
    </PageHeader>

    <!-- what is next, and the balance -->
    <div class="grid grid-cols-12 gap-6">
      <section v-reveal class="col-span-8 rounded-[10px] bg-navy p-7 shadow-[var(--shadow-card)]">
        <template v-if="nextUp">
          <div class="flex items-center justify-between gap-4">
            <p class="text-[13px] font-medium tracking-[0.16em] text-muted uppercase">Next up</p>
            <p class="text-[14px] text-muted">{{ fmtMonth(nextUp.due) }}</p>
          </div>
          <div class="mt-5 grid grid-cols-2 gap-8">
            <div class="min-w-0">
              <div class="flex items-center gap-5">
                <span class="flex size-[68px] shrink-0 items-center justify-center rounded-full bg-who-a text-[#2b2b2b]"><PotIcon :kind="nextUp.pot.kind" :size="30" /></span>
                <div class="min-w-0">
                  <h2 class="text-[26px] leading-tight font-semibold">{{ nextUp.title }}</h2>
                  <p class="mt-1 text-[16px] text-muted">{{ nextUp.kicker }}</p>
                </div>
              </div>
              <div class="tabular mt-9 flex items-baseline gap-2">
                <span class="text-[26px] font-semibold">{{ fmt(nextUp.saved) }}</span>
                <span class="text-[15px] text-muted">of {{ fmt(nextUp.target) }} saved</span>
              </div>
              <div class="mt-3 flex items-center gap-4">
                <div class="h-2.5 flex-1 overflow-hidden rounded-full bg-white/10"><div class="h-full rounded-full bg-who-a transition-[width] duration-700" :style="{ width: Math.min(nextUp.pct, 100) + '%' }" /></div>
                <span class="tabular text-[15px]">{{ nextUp.pct }}%</span>
              </div>
            </div>

            <div class="flex flex-col justify-center gap-5 border-l border-line pl-8 max-[860px]:border-l-0 max-[860px]:pl-0">
              <div v-if="crunch" class="flex items-center gap-4 rounded-[8px] border border-who-a/35 bg-who-a-soft px-5 py-5 text-who-a">
                <TriangleAlert :size="30" class="shrink-0" />
                <div>
                  <p class="tabular text-[22px] leading-tight font-semibold">Short by {{ fmt(crunch.month.shortfall) }}</p>
                  <p class="mt-0.5 text-[13px] opacity-80">in {{ fmtMonth(crunch.month.month) }}</p>
                </div>
              </div>
              <div v-else class="flex items-center gap-4 rounded-[8px] border border-ok/35 bg-ok-soft px-5 py-5 text-ok">
                <Check :size="30" class="shrink-0" />
                <p class="text-[22px] leading-tight font-semibold">On track</p>
              </div>
              <RouterLink :to="crunch || nextUp.pot.kind === 'bto' ? '/timeline' : `/pots/${nextUp.pot.id}`" class="flex h-14 items-center justify-center gap-2 rounded-[8px] bg-who-a text-[17px] font-semibold text-[#2b2b2b] transition hover:brightness-110">
                {{ crunch || nextUp.pot.kind === "bto" ? (nextUp.pot.kind === "bto" ? "View BTO timeline" : "View timeline") : "Open goal" }} <ArrowRight :size="19" />
              </RouterLink>
            </div>
          </div>
        </template>
        <template v-else>
          <p class="text-[13px] font-medium tracking-[0.16em] text-muted uppercase">Next up</p>
          <h2 class="mt-3 text-[26px] font-semibold">Nothing planned yet</h2>
          <p class="mt-1 text-[16px] text-muted">Add a goal with a budget and a deadline, and the next step shows up here.</p>
          <RouterLink to="/pots/new" class="mt-6 inline-flex h-12 items-center gap-2 rounded-[8px] bg-who-a px-6 font-semibold text-[#2b2b2b] transition hover:brightness-110"><Plus :size="18" /> Add a goal</RouterLink>
        </template>
      </section>

      <section v-reveal="100" class="col-span-4 rounded-[10px] bg-navy p-7 shadow-[var(--shadow-card)]">
        <div class="flex items-center justify-between">
          <p class="text-[13px] font-medium tracking-[0.16em] text-muted uppercase">Shared balance</p>
          <Users :size="20" class="text-muted" />
        </div>
        <p class="tabular mt-3 text-[52px] leading-none font-semibold tracking-tight">{{ fmt(total) }}</p>
        <p v-if="addedThisMonth > 0" class="mt-3 flex items-center gap-2 text-[16px]"><TrendingUp :size="19" class="text-ok" /><span class="tabular font-medium text-ok">+{{ fmt(addedThisMonth) }}</span> this month</p>
        <p v-else class="mt-3 text-[16px] text-muted">Nothing added yet this month</p>
        <button type="button" class="mt-5 flex w-full cursor-pointer items-center gap-3 border-t border-line py-4 text-left text-[16px]" @click="goalsEl?.scrollIntoView({ behavior: 'smooth', block: 'start' })">
          <Target :size="20" class="text-muted" /><span class="flex-1">{{ activeCount }} active goal{{ activeCount === 1 ? "" : "s" }}</span><ChevronRight :size="18" class="text-muted" />
        </button>
        <RouterLink to="/wallet" class="flex items-center gap-3 border-t border-line pt-4 text-[16px] font-medium text-who-a hover:brightness-110">
          <Wallet :size="20" /><span>Open wallet</span><ArrowRight :size="17" />
        </RouterLink>
      </section>
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
    <section ref="goalsEl" class="mt-12 scroll-mt-24">
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
    <div class="mt-12 grid grid-cols-12 items-start gap-6">
      <Card v-reveal class="col-span-7 p-8">
        <div class="mb-5 flex items-end justify-between">
          <h2 class="font-serif text-[26px] leading-none">Recent activity</h2>
          <RouterLink to="/wallet" class="text-sm font-medium text-terra hover:underline">Open wallet</RouterLink>
        </div>
        <p v-if="activity.length === 0" class="text-sm text-muted">Nothing yet. What you both do shows up here.</p>
        <ul v-else class="divide-y divide-line">
          <li v-for="a in activity" :key="a.id" class="flex items-center gap-4 py-3.5">
            <Avatar :name="a.who?.display_name ?? '?'" :who="s.profiles.findIndex((x) => x.id === a.who?.id) === 0 ? 'a' : 'b'" :size="34" />
            <div class="min-w-0 flex-1 text-[14.5px]">
              <span class="font-medium">{{ firstName(a.who) }}</span> <span class="text-muted">{{ a.verb }}</span> {{ a.object }}
              <div class="text-xs text-faint">{{ relativeTime(a.at) }}</div>
            </div>
            <span v-if="a.sign" :class="cx('tabular text-[15px] font-medium', a.sign === '+' ? 'text-ok' : 'text-ink')">{{ a.sign }}{{ fmt(a.amount ?? 0) }}</span>
            <span v-else-if="a.amount !== undefined" class="tabular text-[15px] text-muted">{{ fmt(a.amount) }}</span>
            <span v-if="a.tag" :class="cx('rounded-[3px] px-2 py-0.5 text-xs font-medium', a.tone === 'ok' ? 'bg-ok-soft text-ok' : a.tone === 'bad' ? 'bg-bad-soft text-bad' : 'bg-surface-2 text-muted')">{{ a.tag }}</span>
          </li>
        </ul>
      </Card>

      <div class="col-span-5 flex flex-col gap-6">
        <Card v-reveal="100" class="p-7">
          <p class="text-[12px] font-medium tracking-[0.2em] text-muted uppercase">This month</p>
          <h2 class="font-serif mt-2 text-[26px] leading-tight">Who's put in</h2>
          <div class="mt-5"><DepositJars :people="jarPeople" /></div>
          <p v-if="ahead.leaderId" class="mt-6 border-t border-line pt-4 text-[13px] text-muted">
            {{ firstName(profileOf(s, ahead.leaderId)) }} is ahead by <strong class="tabular text-ink">{{ fmt(ahead.amount) }}</strong>, repaid over the next few months.
          </p>
        </Card>
      <div v-reveal="100" class="relative overflow-hidden rounded-[6px] text-white shadow-[var(--shadow-card)]">
        <img v-for="(src, n) in quoteImages" :key="src" :src="src" alt="" :class="['absolute inset-0 size-full object-cover sepia-[0.35] transition-opacity duration-[1400ms]', n === quoteIdx ? 'opacity-100' : 'opacity-0']" />
        <div class="absolute inset-0 bg-black/65" />
        <div class="relative flex h-full min-h-[260px] items-end px-9 py-9"><QuoteRotator v-model="quoteIdx" tone="dark" class="[&_blockquote]:text-[27px] [&_blockquote]:leading-[1.2]" /></div>
      </div>
      </div>
    </div>
  </Page>
</template>
