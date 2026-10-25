<script setup lang="ts">
import { RENO_LISTINGS } from "@/data/renoDirectory";
import { renoDirectory, renoGuide } from "@/stores/guide";
import ListingDirectory from "./ListingDirectory.vue";

/** The directory of renovation firms and furniture stores. */
const TABS = [
  { id: "firm", label: "Design firms and contractors", plural: "firms", unit: "Starting price", whereLabel: "Showroom", profileSite: "Qanvast" },
  { id: "furniture", label: "Furniture", plural: "furniture stores", unit: "Price level", profileSite: "the store" },
];

// deep berry and pink, like the guide, with a photo for each list
const THEME = { page: "#e8f6f6", head: "#06363c", headText: "#f2fafa", accent: "#097c87", soft: "#fca47c", line: "#bee0e0", ink: "#06363c", photos: { firm: "swatches", furniture: "showroom-living" } };
</script>

<template>
  <ListingDirectory
    :state="renoDirectory"
    :tabs="TABS"
    :listings="RENO_LISTINGS"
    :under-open="renoGuide.open"
    kicker="The directory"
    title="Firms and furniture"
    dialog-label="Directory of renovation firms and furniture stores"
    search-suffix=" Singapore renovation"
    :theme="THEME"
    sort-note="Starting prices from the sources, not quotes. Ordered by published reviews and popularity. Ask every firm for an itemised quote."
  />
</template>
