<script setup lang="ts">
import { AlertCircle, CheckCircle2 } from "lucide-vue-next";
import { useApp } from "@/stores/app";

const app = useApp();
</script>

<template>
  <div aria-live="polite" class="pointer-events-none fixed bottom-6 left-1/2 z-[60] flex -translate-x-1/2 flex-col items-center gap-2">
    <div v-for="t in app.toasts" :key="t.id" class="anim-rise pointer-events-auto flex items-center gap-3 rounded-[3px] bg-navy py-2.5 pr-3 pl-4 text-sm text-white shadow-[var(--shadow-pop)]">
      <CheckCircle2 v-if="t.tone === 'ok'" :size="17" class="text-peach" />
      <AlertCircle v-else :size="17" class="text-[#ffb4a6]" />
      <span class="max-w-[460px]">{{ t.text }}</span>
      <button
        v-if="t.action"
        type="button"
        class="cursor-pointer rounded-[3px] bg-white/15 px-3 py-1 font-semibold hover:bg-white/25"
        @click="
          t.action.run();
          app.dismissToast(t.id);
        "
      >
        {{ t.action.label }}
      </button>
      <span v-else class="w-1" />
    </div>
  </div>
</template>
