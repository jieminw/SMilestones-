<script setup lang="ts">
import { computed, ref } from "vue";
import { ArrowRight, BadgeCheck, CircleAlert } from "lucide-vue-next";
import { HDB_LOAN_RATE, MSR, RULES_AS_OF, maxLoanByMsr } from "@/domain/bto";
import { fmt, fmtShort, parseMoney } from "@/domain/money";
import { resolveDraft } from "@/lib/bto-draft";
import { useBtoDraft } from "@/composables/useBtoDraft";
import { cx, inputCls } from "@/lib/cx";
import Button from "@/components/ui/Button.vue";
import Card from "@/components/ui/Card.vue";
import Field from "@/components/ui/Field.vue";
import MoneyInput from "@/components/ui/MoneyInput.vue";
import Notice from "@/components/ui/Notice.vue";
import SectionTitle from "@/components/ui/SectionTitle.vue";
import Segmented from "@/components/ui/Segmented.vue";

const emit = defineEmits<{ next: [] }>();

const draft = useBtoDraft();
const e = computed(() => resolveDraft(draft.value).eligibility);
const h = computed(() => draft.value.household);
const wageA = ref(String(draft.value.wageA));
const wageB = ref(String(draft.value.wageB));
const maxLoan = computed(() => maxLoanByMsr(h.value.monthlyIncome, draft.value.loanYears));

function setWage(who: "A" | "B", v: string) {
  (who === "A" ? wageA : wageB).value = v;
  const c = parseMoney(v);
  if (c === null) return;
  if (who === "A") draft.value.wageA = Math.round(c / 100);
  else draft.value.wageB = Math.round(c / 100);
  draft.value.household.monthlyIncome = draft.value.wageA + draft.value.wageB;
}
</script>

<template>
  <div class="grid grid-cols-[400px_minmax(0,1fr)] gap-7">
    <Card class="h-fit p-7">
      <SectionTitle>Your household</SectionTitle>
      <div class="flex flex-col gap-5">
        <div class="grid grid-cols-2 gap-4">
          <Field v-slot="{ id }" label="Your age"><input :id="id" v-model.number="draft.household.ageA" type="number" min="18" max="99" :class="inputCls" /></Field>
          <Field v-slot="{ id }" label="Partner's age"><input :id="id" v-model.number="draft.household.ageB" type="number" min="18" max="99" :class="inputCls" /></Field>
        </div>
        <div>
          <div class="mb-1.5 text-[13px] font-medium text-muted">Have you owned an HDB flat or got a housing grant before?</div>
          <Segmented
            v-model="draft.household.firstTimers"
            class="w-full"
            :options="[{ value: 'both', label: 'Neither of us' }, { value: 'one', label: 'One of us' }, { value: 'none', label: 'Both' }]"
          />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <Field v-slot="{ id }" label="Your gross monthly wage"><MoneyInput :id="id" :model-value="wageA" suffix="/ mo" @update:model-value="setWage('A', $event)" /></Field>
          <Field v-slot="{ id }" label="Partner's gross monthly wage"><MoneyInput :id="id" :model-value="wageB" suffix="/ mo" @update:model-value="setWage('B', $event)" /></Field>
        </div>
        <p class="-mt-2 text-[13px] text-faint">Household income {{ fmt(h.monthlyIncome * 100) }}/month, averaged over the last 12 months before CPF. Wages also drive the CPF projection.</p>
      </div>
    </Card>

    <div class="flex flex-col gap-5">
      <Card :class="cx('p-6', e.canApply ? '' : 'ring-2 ring-bad/40')">
        <div class="flex items-start gap-4">
          <span :class="cx('flex size-11 items-center justify-center rounded-full', e.canApply ? 'bg-ok-soft text-ok' : 'bg-bad-soft text-bad')">
            <BadgeCheck v-if="e.canApply" :size="22" />
            <CircleAlert v-else :size="22" />
          </span>
          <div>
            <h3 class="text-lg font-semibold">{{ e.canApply ? "You can apply for a BTO flat together" : "Something blocks your application" }}</h3>
            <p v-if="e.canApply" class="text-sm text-muted">As a couple under the Fiancé/Fiancée or Public Scheme.</p>
            <ul v-else class="mt-1 list-disc pl-4 text-sm text-bad"><li v-for="b in e.blockers" :key="b">{{ b }}</li></ul>
          </div>
        </div>
      </Card>
      <div class="grid grid-cols-2 gap-5">
        <Card class="p-6">
          <div class="text-sm text-muted">Enhanced CPF Housing Grant</div>
          <div class="tabular mt-1 font-serif text-[34px]">{{ fmt(e.ehg) }}</div>
          <p class="mt-1 text-sm text-muted">{{ e.ehgReason }}</p>
        </Card>
        <Card class="p-6">
          <div class="text-sm text-muted">Downpayment at lease signing</div>
          <div class="mt-1 font-serif text-[34px]">{{ e.scheme === "standard" ? "10%" : e.scheme === "sds" ? "5%" : "2.5%" }}</div>
          <p class="mt-1 text-sm text-muted">{{ e.schemeReason }}</p>
        </Card>
        <Card class="p-6">
          <div class="text-sm text-muted">HDB housing loan</div>
          <div class="mt-1 font-serif text-[34px]">{{ e.hdbLoan ? "Up to 75%" : "Bank loan" }}</div>
          <p class="mt-1 text-sm text-muted">{{ e.hdbLoanReason }}</p>
        </Card>
        <Card class="p-6">
          <div class="text-sm text-muted">Max loan you can service</div>
          <div class="tabular mt-1 font-serif text-[34px]">{{ fmtShort(maxLoan) }}</div>
          <p class="mt-1 text-sm text-muted">Repayments are capped at {{ MSR * 100 }}% of income ({{ fmt(h.monthlyIncome * MSR * 100) }}/month) over {{ draft.loanYears }} years at {{ HDB_LOAN_RATE * 100 }}%.</p>
        </Card>
      </div>
      <Notice>
        <template #icon><CircleAlert :size="16" /></template>
        This is an estimate from public rules as of {{ RULES_AS_OF }}. Your HDB Flat Eligibility (HFE) letter is the final word on grants and loans.
      </Notice>
      <div class="flex justify-end"><Button @click="emit('next')">See what you'll pay <ArrowRight :size="18" /></Button></div>
    </div>
  </div>
</template>
