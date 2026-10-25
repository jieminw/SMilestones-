<script setup lang="ts">
import { useId } from "vue";

defineProps<{ label: string; hint?: string; error?: string | null }>();
const id = useId();
</script>

<template>
  <div>
    <label :for="id" class="mb-1.5 block font-mono text-[11px] font-medium tracking-[0.08em] text-muted uppercase">{{ label }}</label>
    <slot :id="id" />
    <p v-if="error" class="mt-1.5 text-[13px] text-bad">{{ error }}</p>
    <p v-else-if="hint" class="mt-1.5 text-[13px] text-faint">{{ hint }}</p>
  </div>
</template>
