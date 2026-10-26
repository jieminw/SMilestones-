<script setup lang="ts">
import { computed } from "vue";
import { TriangleAlert, CheckCircle2 } from "lucide-vue-next";
import { useCouple } from "@/stores/app";
import { cashflowTimeline, findCrunches } from "@/domain/timeline";
import { fmt } from "@/domain/money";
import { fmtMonth } from "@/domain/dates";
import { cx } from "@/lib/cx";
import Page from "@/layouts/Page.vue";
import PageHeader from "@/layouts/PageHeader.vue";
import Button from "@/components/ui/Button.vue";
import Card from "@/components/ui/Card.vue";
import SectionTitle from "@/components/ui/SectionTitle.vue";

const { s } = useCouple();

const months = computed(() => cashflowTimeline(s.value, 36));
const crunches = computed(() => findCrunches(s.value, 36));
const maxDue = computed(() => Math.max(...months.value.map((m) => m.dueTotal), 1));
const pots = computed(() => s.value.pots.filter((p) => p.status === "active"));
const COLORS = ["#d9dede", "#b07d55", "#e8906a", "#7f93a6", "#9d8e7d", "#5a7a55"];
const colorOf = (potId: string) => COLORS[Math.max(pots.value.findIndex((p) => p.id === potId), 0) % COLORS.length];
const fmtTick = (iso: string) => fmtMonth(iso).split(" ");
const BAR_H = 180;
</script>

<template>
  <Page wide>
    <PageHeader title="Timeline" subtitle="Every payment falling due against what you have agreed to save, month by month." />

    <Card class="mb-8 p-7">
      <SectionTitle>
        Next 36 months
        <template #action>
          <span class="flex flex-wrap items-center gap-4 text-xs text-muted">
            <span v-for="p in pots" :key="p.id" class="flex items-center gap-1.5"><span class="size-2.5 rounded-lg" :style="{ background: colorOf(p.id) }" />{{ p.name }}</span>
            <span class="flex items-center gap-1.5"><span class="size-2.5 rounded-lg bg-bad-soft ring-1 ring-bad" />Crunch month</span>
          </span>
        </template>
      </SectionTitle>
      <div class="overflow-x-auto pb-2">
        <div class="flex min-w-max items-end gap-1">
          <div v-for="m in months" :key="m.month" :class="cx('flex w-[52px] flex-col items-center rounded-lg px-0.5 pt-2 pb-1', m.crunch ? 'bg-bad-soft ring-1 ring-bad/40' : '')" :title="`${fmtMonth(m.month)}: ${fmt(m.dueTotal)} due, ${fmt(m.savings)} saved`">
            <div class="tabular h-4 text-[10px] text-muted">{{ m.dueTotal ? fmt(m.dueTotal).replace(/\.00$/, "") : "" }}</div>
            <div class="flex w-7 flex-col-reverse justify-start" :style="{ height: BAR_H + 'px' }">
              <div class="flex w-full flex-col-reverse">
                <div v-for="d in m.due" :key="d.potId + d.label" class="w-full" :style="{ height: (d.amount / maxDue) * BAR_H + 'px', background: colorOf(d.potId) }" :title="`${d.label}: ${fmt(d.amount)}`" />
              </div>
            </div>
            <div class="mt-2 text-center text-[10px] leading-tight text-muted uppercase">
              <div class="font-medium text-ink">{{ fmtTick(m.month)[0] }}</div>
              <div>{{ fmtTick(m.month)[1] }}</div>
            </div>
            <TriangleAlert v-if="m.crunch && m.dueTotal > 0" :size="12" class="mt-1 text-bad" />
          </div>
        </div>
      </div>
      <p class="mt-3 text-[13px] text-muted">Bars show what falls due each month. A month turns red when everything due so far is more than everything you will have saved by then.</p>
    </Card>

    <SectionTitle>Crunch months</SectionTitle>
    <Card v-if="crunches.length === 0" class="flex items-center gap-4 p-7">
      <CheckCircle2 :size="22" class="text-ok" />
      <div>
        <div class="font-medium">No crunch months in the next 36 months</div>
        <div class="text-sm text-muted">Your agreed monthly savings cover every payment as it falls due.</div>
      </div>
    </Card>
    <div v-else class="flex flex-col gap-4">
      <Card v-for="c in crunches" :key="c.month.month" class="p-6">
        <div class="flex items-start gap-4">
          <TriangleAlert :size="20" class="mt-0.5 shrink-0 text-bad" />
          <div class="flex-1">
            <p class="text-[15px] leading-relaxed">{{ c.message }}</p>
            <div class="mt-4 grid grid-cols-2 gap-4">
              <div class="rounded-lg border border-line p-4">
                <div class="text-[11px] font-medium tracking-[0.14em] text-muted uppercase">Option 1 · Save more</div>
                <p class="mt-1.5 text-sm">Add about <strong>{{ fmt(c.extraPerMonth) }}</strong> a month in total, from now until {{ fmtMonth(c.month.month) }}.</p>
                <RouterLink :to="`/pots/${c.potId}`"><Button variant="secondary" size="sm" class="mt-3">Propose a new split</Button></RouterLink>
              </div>
              <div class="rounded-lg border border-line p-4">
                <div class="text-[11px] font-medium tracking-[0.14em] text-muted uppercase">Option 2 · Move a deadline</div>
                <p class="mt-1.5 text-sm">Push one of these payments later so they no longer land in the same month.</p>
                <RouterLink :to="`/pots/${c.potId}?dates=1`"><Button variant="secondary" size="sm" class="mt-3">Change dates</Button></RouterLink>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  </Page>
</template>
