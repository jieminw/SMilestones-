<script setup lang="ts">
import { computed } from "vue";
import { TriangleAlert } from "lucide-vue-next";
import { useCouple } from "@/stores/app";
import type { Pot } from "@/domain/types";
import { fmt, type Cents } from "@/domain/money";
import { todayISO } from "@/domain/dates";
import { requiredMonthly } from "@/domain/selectors";
import Notice from "@/components/ui/Notice.vue";

const props = defineProps<{ pot: Pot; minus: Cents }>();
const { s } = useCouple();
const before = computed(() => requiredMonthly(s.value, props.pot));
const after = computed(() => {
  const fake = {
    ...s.value,
    transactions: [
      ...s.value.transactions,
      { id: "x", couple_id: "", pot_id: props.pot.id, kind: "withdrawal" as const, amount: props.minus, user_id: "", note: "", occurred_on: todayISO(), created_at: "", edited_at: null, voided_at: null, request_id: null },
    ],
  };
  return requiredMonthly(fake, props.pot);
});
</script>

<template>
  <Notice v-if="after > before" tone="warn" class="mt-4">
    <template #icon><TriangleAlert :size="15" /></template>
    Your monthly target for {{ pot.name }} rises from {{ fmt(before) }} to <strong>{{ fmt(after) }}</strong> to stay on schedule.
  </Notice>
</template>
