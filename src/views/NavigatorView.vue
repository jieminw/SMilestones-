<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Calculator, Home, Users } from "lucide-vue-next";
import { BTO_PROJECTS, type FlatTypeId } from "@/domain/bto-data";
import { RULES_AS_OF } from "@/domain/bto";
import { useBtoDraft } from "@/composables/useBtoDraft";
import { useApp } from "@/stores/app";
import { UPCOMING_EXERCISE } from "@/domain/bto-data";
import Notice from "@/components/ui/Notice.vue";
import { cx } from "@/lib/cx";
import Page from "@/layouts/Page.vue";
import PageHeader from "@/layouts/PageHeader.vue";
import ExploreTab from "@/components/navigator/ExploreTab.vue";
import EligibilityTab from "@/components/navigator/EligibilityTab.vue";
import FinancesTab from "@/components/navigator/FinancesTab.vue";

type Tab = "explore" | "eligibility" | "finances";

const route = useRoute();
const router = useRouter();
const draft = useBtoDraft();
const app = useApp();

const tab = computed<Tab>(() => (["explore", "eligibility", "finances"].includes(route.query.tab as string) ? (route.query.tab as Tab) : "explore"));
const retargetId = computed(() => (typeof route.query.retarget === "string" ? route.query.retarget : null));
const setTab = (t: Tab) => router.replace({ path: "/navigator", query: { tab: t, ...(retargetId.value ? { retarget: retargetId.value } : {}) } });
const retargetPot = computed(() => (retargetId.value ? app.state?.pots.find((p) => p.id === retargetId.value) : undefined));

const tabs = [
  { t: "explore" as const, icon: Home, label: "Explore", sub: `${BTO_PROJECTS.length} projects`, colour: "#e8906a" },
  { t: "eligibility" as const, icon: Users, label: "Eligibility", sub: "Grants & schemes", colour: "#86aeb4" },
  { t: "finances" as const, icon: Calculator, label: "Finances", sub: "What's due, when", colour: "#e3c476" },
];

function plan(projectId: string, flatType: FlatTypeId, price: number, bookingDate?: string) {
  draft.value = { ...draft.value, projectId, flatType, price, keysDate: null, ...(bookingDate ? { bookingDate } : {}) };
  setTab("finances");
}
</script>

<template>
  <Page wide>
    <PageHeader title="BTO Navigator" :subtitle="`Real prices from HDB's Feb & Jun 2026 exercises · rules as of ${RULES_AS_OF}`" />
    <Notice v-if="retargetPot" tone="peach" class="mb-6">
      <strong>Retargeting {{ retargetPot.name }}.</strong> Pick a project, then set your flat selection date on the Finances tab. Everything you have saved stays in the pot.
      Prices for the {{ UPCOMING_EXERCISE.label }} exercise are not published yet, so choose a current project as a stand-in and update it after launch.
    </Notice>
    <div class="mb-8 grid grid-cols-3 gap-4">
      <button
        v-for="x in tabs"
        :key="x.t"
        type="button"
        :class="cx('flex cursor-pointer items-center gap-4 rounded-[6px] border px-5 py-4 text-left transition-colors', tab === x.t ? 'border-navy bg-navy text-white' : 'border-line bg-surface hover:bg-white')"
        :style="tab === x.t ? { boxShadow: `inset 0 -3px 0 ${x.colour}`, borderColor: x.colour } : undefined"
        @click="setTab(x.t)"
      >
        <span :class="cx('flex size-11 items-center justify-center rounded-2xl', tab === x.t ? 'bg-white/12' : 'bg-surface-2')" :style="{ color: x.colour }"><component :is="x.icon" :size="21" /></span>
        <span>
          <span class="block font-semibold">{{ x.label }}</span>
          <span :class="cx('block text-sm', tab === x.t ? 'text-white/70' : 'text-muted')">{{ x.sub }}</span>
        </span>
      </button>
    </div>
    <ExploreTab v-if="tab === 'explore'" @plan="plan" />
    <EligibilityTab v-else-if="tab === 'eligibility'" @next="setTab('finances')" />
    <FinancesTab v-else />
  </Page>
</template>
