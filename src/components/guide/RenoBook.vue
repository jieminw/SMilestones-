<script setup lang="ts">
import { RENO_CHAPTERS, RENO_PAGES } from "@/data/renoGuide";
import { renoDirectory, renoGuide } from "@/stores/guide";
import FlipBook from "./FlipBook.vue";
import RenoPage from "./RenoPage.vue";

/** The renovation guide: the shared flipbook, filled with the renovation pages. */
</script>

<template>
  <FlipBook :count="RENO_PAGES.length" :chapters="RENO_CHAPTERS" :state="renoGuide" :blocked="renoDirectory.open" label="The renovation guide" dialog-label="Renovation guide for new homes in Singapore" backdrop="bg-[#0a1624]/94" light="#e3c476" dark="#14283f">
    <template #page="{ index, side, compact, go }">
      <RenoPage :page="RENO_PAGES[index]" :no="index" :side="side as 'left' | 'right' | 'single'" :compact="compact" class="min-h-full flex-1" @jump="go" />
    </template>
  </FlipBook>
</template>
