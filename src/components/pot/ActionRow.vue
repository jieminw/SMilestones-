<script setup lang="ts">
import { ChevronRight } from "lucide-vue-next";
import IconTile from "@/components/ui/IconTile.vue";

defineProps<{ title: string; sub: string; disabled?: boolean }>();
</script>

<template>
  <button type="button" :disabled="disabled" class="flex cursor-pointer items-center gap-3.5 rounded-2xl p-3 text-left hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-45">
    <IconTile tone="sand" :size="40"><slot name="icon" /></IconTile>
    <span class="flex-1">
      <span class="block font-medium">{{ title }}</span>
      <span class="block text-[13px] text-muted">{{ sub }}</span>
    </span>
    <ChevronRight :size="16" class="text-faint" />
  </button>
</template>
