<script setup lang="ts">
import { Building2, Gem, Hammer, PiggyBank, Plane } from "lucide-vue-next";
import type { PotKind } from "@/domain/types";

withDefaults(defineProps<{ kind: PotKind; size?: number }>(), { size: 22 });
</script>

<template>
  <Building2 v-if="kind === 'bto'" :size="size" />
  <Hammer v-else-if="kind === 'renovation'" :size="size" />
  <Plane v-else-if="kind === 'trip'" :size="size" />
  <Gem v-else-if="kind === 'wedding'" :size="size" />
  <PiggyBank v-else :size="size" />
</template>
