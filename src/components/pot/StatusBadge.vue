<script setup lang="ts">
import type { CoupleState, Pot } from "@/domain/types";
import { pendingSplit } from "@/domain/selectors";
import Badge from "@/components/ui/Badge.vue";

const props = defineProps<{ s: CoupleState; pot: Pot; meId: string }>();
const pr = () => pendingSplit(props.s, props.pot.id);
</script>

<template>
  <Badge v-if="pot.status === 'draft'" tone="sand">Draft</Badge>
  <template v-else-if="pot.status === 'pending_split'">
    <Badge v-if="pr() && pr()!.proposed_by !== meId" tone="warn">Needs your answer</Badge>
    <Badge v-else tone="warn">Awaiting partner</Badge>
  </template>
  <Badge v-else-if="pot.status === 'completed'" tone="ok">Funded</Badge>
</template>
