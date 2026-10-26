<script setup lang="ts">
import { CHAPTERS, PAGES } from "@/data/guideBook";
import { directory, guide } from "@/stores/guide";
import FlipBook from "./FlipBook.vue";
import GuidePage from "./GuidePage.vue";

/** The couples' guide to getting married: the shared flipbook, filled with the wedding pages. */
</script>

<template>
  <FlipBook :count="PAGES.length" :chapters="CHAPTERS" :state="guide" :blocked="directory.open" label="The couples' guide" dialog-label="Couples' guide to getting married in Singapore" backdrop="bg-[#2b0a12]/94" light="#f1f1ef" dark="#4a1420">
    <template #page="{ index, side, compact, go }">
      <GuidePage :page="PAGES[index]" :no="index" :side="side as 'left' | 'right' | 'single'" :compact="compact" class="min-h-full flex-1" @jump="go" />
    </template>
  </FlipBook>
</template>
