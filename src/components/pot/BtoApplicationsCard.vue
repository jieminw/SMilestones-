<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { Plus, RefreshCw } from "lucide-vue-next";
import { useCouple } from "@/stores/app";
import type { ApplicationResult, Pot } from "@/domain/types";
import { getProject, FLAT_TYPE_SHORT } from "@/domain/bto-data";
import { fmtDay } from "@/domain/dates";
import { inputCls } from "@/lib/cx";
import Badge from "@/components/ui/Badge.vue";
import Button from "@/components/ui/Button.vue";
import Card from "@/components/ui/Card.vue";
import SectionTitle from "@/components/ui/SectionTitle.vue";
import LogApplicationModal from "./LogApplicationModal.vue";

/** Applications history on a BTO pot, with a one-click retarget when the latest ballot was missed. */
const props = defineProps<{ pot: Pot }>();
const { app, s } = useCouple();
const router = useRouter();
const logging = ref(false);

const rows = computed(() => s.value.btoApplications.filter((a) => a.pot_id === props.pot.id).sort((a, b) => b.applied_on.localeCompare(a.applied_on) || b.created_at.localeCompare(a.created_at)));
const latest = computed(() => rows.value[0]);
const canRetarget = computed(() => latest.value?.result === "unsuccessful");
const TONE = { pending: "sand", successful: "ok", unsuccessful: "bad", declined: "warn" } as const;
const LABEL: Record<ApplicationResult, string> = { pending: "Waiting", successful: "Successful", unsuccessful: "Unsuccessful", declined: "Declined" };

function setResult(id: string, result: ApplicationResult, queue: number | null) {
  void app.dispatch({ type: "updateApplication", applicationId: id, result, queue_number: queue }, { success: "Application updated." });
}
const retarget = () => router.push(`/navigator?tab=explore&retarget=${props.pot.id}`);
</script>

<template>
  <Card class="p-6">
    <SectionTitle>
      Applications
      <template #action><Button variant="ghost" size="sm" @click="logging = true"><Plus :size="15" /> Log</Button></template>
    </SectionTitle>
    <p v-if="!rows.length" class="text-sm text-muted">No applications logged yet. Add each ballot you enter so the history stays in one place.</p>
    <ul v-else class="flex flex-col divide-y divide-line">
      <li v-for="a in rows" :key="a.id" class="py-3">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="truncate text-sm font-medium">{{ (a.project_id && getProject(a.project_id)?.name) || "Project not set" }}</div>
            <div class="text-[13px] text-muted">{{ a.exercise }} · {{ FLAT_TYPE_SHORT[a.flat_type] }} · {{ fmtDay(a.applied_on) }}<template v-if="a.queue_number"> · queue {{ a.queue_number }}</template></div>
          </div>
          <Badge :tone="TONE[a.result]">{{ LABEL[a.result] }}</Badge>
        </div>
        <select :class="inputCls + ' mt-2 h-8 text-xs'" :value="a.result" :aria-label="`Result for ${a.exercise}`" @change="setResult(a.id, ($event.target as HTMLSelectElement).value as ApplicationResult, a.queue_number)">
          <option v-for="(l, k) in LABEL" :key="k" :value="k">{{ l }}</option>
        </select>
      </li>
    </ul>
    <div v-if="canRetarget" class="mt-4 rounded-lg bg-surface-2 p-4">
      <p class="text-sm">Didn't get the flat? Keep everything you have saved and aim at the next exercise.</p>
      <Button size="sm" class="mt-3 w-full" @click="retarget"><RefreshCw :size="14" /> Retarget to next exercise</Button>
    </div>
    <LogApplicationModal v-if="logging" :pot="pot" @close="logging = false" />
  </Card>
</template>
