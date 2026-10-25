<script setup lang="ts">
import { computed, ref } from "vue";
import { Check } from "lucide-vue-next";
import { useCouple } from "@/stores/app";
import { moneyDateStatus, pickDecision, savedThisMonth, MONEY_DATE_XP, MONEY_DATE_COINS } from "@/domain/moneyDate";
import { petStatus } from "@/domain/pet";
import { fmt, pct } from "@/domain/money";
import { fmtMonth, todayISO } from "@/domain/dates";
import { firstName, inboxFor, profileOf } from "@/domain/selectors";
import { cx } from "@/lib/cx";
import Page from "@/layouts/Page.vue";
import PageHeader from "@/layouts/PageHeader.vue";
import Button from "@/components/ui/Button.vue";
import Card from "@/components/ui/Card.vue";
import Progress from "@/components/ui/Progress.vue";
import PetAlcove from "@/components/art/PetAlcove.vue";
import ProposalCard from "@/components/pot/ProposalCard.vue";
import RequestCard from "@/components/pot/RequestCard.vue";
import CoverCard from "@/components/pot/CoverCard.vue";

const { app, s } = useCouple();
const STEPS = ["What we saved", "Waiting on us", "One decision", "Fluffy and the streak"];
const step = ref(0);
const busy = ref(false);

const month = computed(() => todayISO().slice(0, 7));
const status = computed(() => moneyDateStatus(s.value, app.meId));
const saved = computed(() => savedThisMonth(s.value));
const inbox = computed(() => inboxFor(s.value, app.meId));
const decision = computed(() => pickDecision(s.value));
const pet = computed(() => petStatus(s.value));
const mood = computed(() => (pet.value.happiness >= 50 ? "happy" : pet.value.happiness >= 20 ? "content" : "sad"));
const partnerName = computed(() => firstName(s.value.profiles.find((p) => p.id !== app.meId)));
const totals = computed(() => s.value.profiles.map((p) => ({ p, done: saved.value.reduce((a, r) => a + (r.perPerson.find((x) => x.userId === p.id)?.done ?? 0), 0), expected: saved.value.reduce((a, r) => a + (r.perPerson.find((x) => x.userId === p.id)?.expected ?? 0), 0) })));

async function finish() {
  busy.value = true;
  await app.dispatch({ type: "completeMoneyDate" }, { success: status.value.doneByPartner ? "Money date done together." : `Marked done. ${partnerName.value} is next.` });
  busy.value = false;
}
</script>

<template>
  <Page>
    <PageHeader title="Money date" :subtitle="`Your check-in for ${fmtMonth(month + '-01')}. Ten minutes, once a month, together.`" />

    <ol class="mb-8 grid grid-cols-4 gap-3">
      <li v-for="(t, i) in STEPS" :key="t">
        <button type="button" :class="cx('w-full cursor-pointer border-t-2 pt-3 text-left transition-colors', i <= step ? 'border-ink' : 'border-line')" @click="step = i">
          <span class="text-[11px] font-medium tracking-[0.14em] text-muted uppercase">Step {{ i + 1 }}</span>
          <span :class="cx('mt-0.5 block text-sm', i === step ? 'font-semibold' : 'text-muted')">{{ t }}</span>
        </button>
      </li>
    </ol>

    <Card v-if="status.complete" class="mb-6 flex items-center gap-4 p-6">
      <span class="flex size-10 items-center justify-center rounded-full bg-ok-soft text-ok"><Check :size="20" /></span>
      <div>
        <div class="font-semibold">This month's money date is done.</div>
        <div class="text-sm text-muted">Both of you have marked it. See you next month.</div>
      </div>
    </Card>

    <!-- 1. what we saved -->
    <div v-if="step === 0" class="flex flex-col gap-5">
      <Card class="p-7">
        <div class="grid grid-cols-2 gap-8">
          <div v-for="t in totals" :key="t.p.id">
            <div class="text-sm text-muted">{{ firstName(t.p) }}{{ t.p.id === app.meId ? " (you)" : "" }}</div>
            <div class="font-serif tabular mt-1 text-[32px] leading-none">{{ fmt(t.done) }} <span class="font-sans text-base text-muted">of {{ fmt(t.expected) }}</span></div>
            <Progress class="mt-3" :value="pct(t.done, t.expected)" tone="terra" :height="6" />
          </div>
        </div>
      </Card>
      <Card class="p-7">
        <h3 class="mb-3 font-semibold">By goal</h3>
        <table class="w-full text-sm">
          <tbody>
            <tr v-for="r in saved" :key="r.potId" class="border-t border-line first:border-0">
              <td class="py-3 font-medium">{{ r.potName }}</td>
              <td v-for="x in r.perPerson" :key="x.userId" class="tabular py-3 text-right text-muted">{{ firstName(profileOf(s, x.userId)) }} {{ fmt(x.done) }} / {{ fmt(x.expected) }}</td>
            </tr>
          </tbody>
        </table>
      </Card>
    </div>

    <!-- 2. waiting on us -->
    <div v-else-if="step === 1" class="flex flex-col gap-4">
      <Card v-if="!inbox.count" class="p-7 text-sm text-muted">Nothing is waiting for your answer.</Card>
      <ProposalCard v-for="p in inbox.proposals" :key="p.id" :proposal="p" />
      <RequestCard v-for="r in inbox.requests" :key="r.id" :request="r" />
      <CoverCard v-for="c in inbox.covers" :key="c.id" :cover="c" />
    </div>

    <!-- 3. one decision -->
    <Card v-else-if="step === 2" class="p-8">
      <p class="text-[11px] font-medium tracking-[0.18em] text-terra uppercase">The one thing to decide</p>
      <h2 class="font-serif mt-3 text-[30px] leading-tight">{{ decision.title }}</h2>
      <p class="mt-3 max-w-2xl text-[16px] leading-relaxed text-muted">{{ decision.detail }}</p>
      <div class="mt-6 flex flex-wrap gap-3">
        <template v-if="decision.kind === 'crunch'">
          <RouterLink to="/timeline"><Button>See the timeline and fixes</Button></RouterLink>
          <RouterLink :to="`/pots/${decision.crunch.potId}`"><Button variant="secondary">Propose a bigger split</Button></RouterLink>
        </template>
        <template v-else-if="decision.kind === 'offtrack'">
          <RouterLink :to="`/pots/${decision.potId}`"><Button>Propose a new split for {{ decision.potName }}</Button></RouterLink>
          <RouterLink :to="`/pots/${decision.potId}?dates=1`"><Button variant="secondary">Change dates</Button></RouterLink>
        </template>
        <RouterLink v-else-if="decision.kind === 'payback'" :to="`/pots/${decision.potId}`"><Button>Open the pot</Button></RouterLink>
      </div>
    </Card>

    <!-- 4. Fluffy -->
    <Card v-else class="grid grid-cols-[auto_1fr] items-center gap-10 p-8">
      <PetAlcove :size="190" :mood="mood" :outfit="pet.outfits" />
      <div>
        <h2 class="font-serif text-[30px] leading-tight">{{ pet.mood }}</h2>
        <p class="mt-2 text-muted">{{ pet.name }} is level {{ pet.level }} with a {{ pet.streakMonths }}-month streak. Finishing this together adds {{ MONEY_DATE_XP }} XP and {{ MONEY_DATE_COINS }} coins, and keeps the streak going.</p>
        <div class="mt-6 flex items-center gap-4">
          <Button v-if="!status.doneByMe" :loading="busy" @click="finish"><Check :size="16" /> We're done</Button>
          <span v-else class="text-sm text-muted">You marked this done. {{ status.doneByPartner ? "" : `Waiting for ${partnerName}.` }}</span>
        </div>
      </div>
    </Card>

    <div class="mt-8 flex justify-between">
      <Button variant="secondary" :disabled="step === 0" @click="step--">Back</Button>
      <Button v-if="step < STEPS.length - 1" @click="step++">Next</Button>
    </div>
  </Page>
</template>
