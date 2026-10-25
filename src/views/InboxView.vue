<script setup lang="ts">
import { computed } from "vue";
import { CheckCheck, Inbox } from "lucide-vue-next";
import { useCouple } from "@/stores/app";
import { effectiveStatus, firstName, inboxFor, pendingRequests, profileOf } from "@/domain/selectors";
import { fmt } from "@/domain/money";
import { relativeTime } from "@/domain/dates";
import Page from "@/layouts/Page.vue";
import PageHeader from "@/layouts/PageHeader.vue";
import Badge from "@/components/ui/Badge.vue";
import Card from "@/components/ui/Card.vue";
import Empty from "@/components/ui/Empty.vue";
import SectionTitle from "@/components/ui/SectionTitle.vue";
import ProposalCard from "@/components/pot/ProposalCard.vue";
import RequestCard from "@/components/pot/RequestCard.vue";
import CoverCard from "@/components/pot/CoverCard.vue";

const STATUS_TONE = { approved: "ok", accepted: "ok", declined: "bad", cancelled: "sand", expired: "warn", superseded: "sand" } as const;

const { app, s } = useCouple();
const inbox = computed(() => inboxFor(s.value, app.meId));
const mineRequests = computed(() => pendingRequests(s.value).filter((r) => r.requested_by === app.meId));
const mineCovers = computed(() => s.value.covers.filter((c) => c.status === "pending" && c.payer_id === app.meId));
const mineProposals = computed(() => s.value.proposals.filter((p) => p.status === "pending" && p.proposed_by === app.meId));

const history = computed(() => {
  const st = s.value;
  return [
    ...st.requests
      .filter((r) => effectiveStatus(r) !== "pending")
      .map((r) => ({
        id: r.id,
        at: r.responded_at ?? r.expires_at,
        status: effectiveStatus(r) as string,
        text: `${firstName(profileOf(st, r.requested_by))}: ${
          r.kind === "transfer" ? `move ${fmt(r.amount)} to ${st.pots.find((p) => p.id === r.to_pot_id)?.name}` : `withdraw ${fmt(r.amount)} from ${st.pots.find((p) => p.id === r.pot_id)?.name}`
        }`,
        note: r.response_note,
      })),
    ...st.covers
      .filter((c) => c.status !== "pending")
      .map((c) => ({
        id: c.id,
        at: c.responded_at ?? c.created_at,
        status: c.status as string,
        text: `${firstName(profileOf(st, c.payer_id))}: cover ${fmt(c.amount)} of ${firstName(profileOf(st, c.for_user_id))}'s share`,
        note: c.response_note,
      })),
    ...st.proposals
      .filter((p) => p.status !== "pending")
      .map((p) => ({
        id: p.id,
        at: p.responded_at ?? p.created_at,
        status: p.status as string,
        text: `${firstName(profileOf(st, p.proposed_by))}: ${fmt(p.monthly_total)}/month split for ${st.pots.find((x) => x.id === p.pot_id)?.name}`,
        note: p.response_note,
      })),
  ].sort((a, b) => b.at.localeCompare(a.at));
});
const tone = (status: string) => STATUS_TONE[status as keyof typeof STATUS_TONE] ?? "sand";
</script>

<template>
  <Page>
    <PageHeader title="Approvals" subtitle="Splits and money going out of a shared pot need both of you." />
    <div class="grid grid-cols-[minmax(0,1fr)_360px] gap-7">
      <div class="flex flex-col gap-8">
        <section>
          <SectionTitle>Needs your answer</SectionTitle>
          <Card v-if="inbox.count === 0">
            <Empty title="You're all caught up">
              <template #icon><CheckCheck :size="34" /></template>
              When your partner proposes a split or asks to move money, it shows up here.
            </Empty>
          </Card>
          <div v-else class="flex flex-col gap-4">
            <ProposalCard v-for="p in inbox.proposals" :key="p.id" :proposal="p" />
            <RequestCard v-for="r in inbox.requests" :key="r.id" :request="r" />
            <CoverCard v-for="c in inbox.covers" :key="c.id" :cover="c" />
          </div>
        </section>
        <section v-if="mineProposals.length + mineRequests.length + mineCovers.length > 0">
          <SectionTitle>Waiting on your partner</SectionTitle>
          <div class="flex flex-col gap-4">
            <ProposalCard v-for="p in mineProposals" :key="p.id" :proposal="p" />
            <RequestCard v-for="r in mineRequests" :key="r.id" :request="r" />
            <CoverCard v-for="c in mineCovers" :key="c.id" :cover="c" />
          </div>
        </section>
      </div>
      <Card class="h-fit p-6">
        <SectionTitle>History</SectionTitle>
        <div v-if="history.length === 0" class="py-6 text-center text-sm text-muted"><Inbox :size="26" class="mx-auto mb-2 text-faint" />Nothing decided yet.</div>
        <ul v-else class="flex flex-col gap-4">
          <li v-for="h in history.slice(0, 20)" :key="h.id" class="text-sm">
            <div class="flex items-start justify-between gap-3">
              <span>{{ h.text }}</span>
              <Badge :tone="tone(h.status)">{{ h.status }}</Badge>
            </div>
            <div v-if="h.note" class="mt-0.5 text-muted">“{{ h.note }}”</div>
            <div class="mt-0.5 text-xs text-faint">{{ relativeTime(h.at) }}</div>
          </li>
        </ul>
      </Card>
    </div>
  </Page>
</template>
