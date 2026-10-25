<script setup lang="ts">
import { computed, ref } from "vue";
import { useCouple } from "@/stores/app";
import type { SplitProposal } from "@/domain/types";
import { fmt } from "@/domain/money";
import { fmtMonth, relativeTime } from "@/domain/dates";
import { firstName, potTarget, profileOf, requiredMonthly } from "@/domain/selectors";
import { sharePct } from "@/domain/split";
import Avatar from "@/components/ui/Avatar.vue";
import Badge from "@/components/ui/Badge.vue";
import Button from "@/components/ui/Button.vue";
import Card from "@/components/ui/Card.vue";
import Notice from "@/components/ui/Notice.vue";
import PotIcon from "@/components/art/PotIcon.vue";
import ProposeSplitModal from "./ProposeSplitModal.vue";

/** Figma 14b–14d: split proposal, seen by either partner. */
const props = withDefaults(defineProps<{ proposal: SplitProposal; showPot?: boolean }>(), { showPot: true });

const { app, s } = useCouple();
const pot = computed(() => s.value.pots.find((p) => p.id === props.proposal.pot_id)!);
const mine = computed(() => props.proposal.proposed_by === app.meId);
const proposer = computed(() => profileOf(s.value, props.proposal.proposed_by));
const counter = ref(false);
const busy = ref<"accept" | "cancel" | null>(null);
const need = computed(() => requiredMonthly(s.value, pot.value));
const pcts = computed(() => sharePct(props.proposal.shares[s.value.profiles[0].id] ?? 0, props.proposal.shares[s.value.profiles[1]?.id] ?? 0));

async function cancel() {
  busy.value = "cancel";
  await app.dispatch({ type: "cancelSplit", proposalId: props.proposal.id }, { success: "Proposal withdrawn." });
  busy.value = null;
}
async function accept() {
  busy.value = "accept";
  await app.dispatch({ type: "respondSplit", proposalId: props.proposal.id, accept: true }, { success: `Split accepted. ${pot.value.name} is live!` });
  busy.value = null;
}
</script>

<template>
  <Card class="p-6">
    <RouterLink v-if="showPot" :to="`/pots/${pot.id}`" class="mb-4 flex items-center gap-3 hover:underline">
      <PotIcon :kind="pot.kind" :size="18" />
      <span class="font-semibold">{{ pot.name }}</span>
      <span class="text-sm text-muted">· {{ fmt(potTarget(s, pot.id)) }} by {{ fmtMonth(pot.target_date) }}</span>
    </RouterLink>
    <div class="flex items-center justify-between">
      <div>
        <div class="text-sm text-muted">{{ mine ? "You proposed" : `${firstName(proposer)} proposed` }} · {{ relativeTime(proposal.created_at) }}</div>
        <div class="tabular mt-0.5 text-xl font-semibold">{{ fmt(proposal.monthly_total) }} / month together</div>
      </div>
      <Badge tone="warn">{{ mine ? "Awaiting partner" : "Needs your answer" }}</Badge>
    </div>
    <div class="mt-4 h-2 overflow-hidden rounded-full bg-sand">
      <div class="h-full bg-terra" :style="{ width: pcts[0] + '%' }" />
    </div>
    <div class="mt-4 grid grid-cols-2 gap-3">
      <div v-for="(p, i) in s.profiles" :key="p.id" class="rounded-2xl bg-surface-2 p-4">
        <div class="flex items-center gap-2 text-sm">
          <Avatar :name="p.display_name" :who="i === 0 ? 'a' : 'b'" :size="24" />
          {{ firstName(p) }}{{ p.id === app.meId ? " (you)" : "" }}
          <span class="ml-auto text-muted">{{ pcts[i] }}%</span>
        </div>
        <div class="tabular mt-2 text-xl font-semibold">{{ fmt(proposal.shares[p.id] ?? 0) }}<span class="text-sm font-normal text-muted">/mo</span></div>
      </div>
    </div>
    <Notice v-if="proposal.monthly_total < need" tone="warn" class="mt-4">This is {{ fmt(need - proposal.monthly_total) }}/month below what the plan needs ({{ fmt(need) }}).</Notice>
    <div class="mt-5 flex gap-3">
      <Button v-if="mine" variant="secondary" :loading="busy === 'cancel'" @click="cancel">Withdraw proposal</Button>
      <template v-else>
        <Button :loading="busy === 'accept'" @click="accept">Accept split</Button>
        <Button variant="secondary" @click="counter = true">Suggest a change</Button>
      </template>
    </div>
    <ProposeSplitModal v-if="counter" :pot="pot" :target="Math.max(need, 100)" title="Suggest a different split" @close="counter = false" />
  </Card>
</template>
