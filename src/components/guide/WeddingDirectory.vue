<script setup lang="ts">
import { LISTINGS } from "@/data/directory";
import { isRestaurant } from "@/domain/directory";
import { directory, guide } from "@/stores/guide";
import ListingDirectory from "./ListingDirectory.vue";

/** The directory of hotels, small venues, photographers and gown shops. */
const TABS = [
  { id: "hotel", label: "Hotels", plural: "hotels", unit: "Per table of 10", profileSite: "SingaporeBrides" },
  { id: "venue", label: "Small venues", plural: "small venues", unit: "For about 30 guests", profileSite: "SingaporeBrides" },
  { id: "photo", label: "Photographers", plural: "photographers", unit: "From, main package", whereLabel: "Base", whereNote: "Most photographers travel to your venue, so their sources rarely name a studio.", profileSite: "SingaporeBrides" },
  { id: "gown", label: "Wedding gowns", plural: "gown boutiques", unit: "Rental, from", profileSite: "SingaporeBrides" },
];
// navy and wine, like the guide, with a photo for each list
const THEME = { page: "#e8f6f6", head: "#06363c", headText: "#f2fafa", accent: "#06606a", soft: "#f9d779", line: "#bee0e0", ink: "#06363c", photos: { hotel: "banquet-table", venue: "rustic-table", photo: "palm-couple", gown: "rings-hands" } };
// the hotel list leaves the Chinese restaurants out unless asked for
const TOGGLES = [
  { id: "restaurants", category: "hotel", label: "Add {n} Chinese restaurants", title: "Chinese restaurants that sell banquet tables by the table of 10, like a hotel", hiddenWhenOff: isRestaurant },
];
</script>

<template>
  <ListingDirectory :state="directory" :tabs="TABS" :listings="LISTINGS" :toggles="TOGGLES" :theme="THEME" :under-open="guide.open" kicker="The directory" title="Venues and vendors" dialog-label="Directory of venues and vendors" />
</template>
