<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { ArrowLeft } from "lucide-vue-next";
import { TEMPLATES } from "@/domain/templates";
import type { PotKind } from "@/domain/types";
import Page from "@/layouts/Page.vue";
import PageHeader from "@/layouts/PageHeader.vue";
import Badge from "@/components/ui/Badge.vue";
import Card from "@/components/ui/Card.vue";
import IconTile from "@/components/ui/IconTile.vue";
import PotIcon from "@/components/art/PotIcon.vue";
import PotForm from "@/components/pot/PotForm.vue";

const route = useRoute();
const kinds = Object.keys(TEMPLATES) as PotKind[];
const editId = computed(() => (typeof route.query.edit === "string" ? route.query.edit : null));
const kind = computed(() => {
  const k = route.query.kind as PotKind | undefined;
  return k && TEMPLATES[k] ? k : null;
});
</script>

<template>
  <PotForm v-if="editId || kind" :key="`${editId}-${kind}`" :kind="kind" :edit-id="editId" />
  <Page v-else>
    <PageHeader title="Add a joint milestone" subtitle="What are you two saving for?">
      <template #back>
        <RouterLink to="/home" class="mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink"><ArrowLeft :size="16" /> Back</RouterLink>
      </template>
    </PageHeader>
    <div class="grid grid-cols-2 gap-5">
      <RouterLink v-for="k in kinds" :key="k" :to="`/pots/new?kind=${k}`" class="group">
        <Card class="flex h-full items-start gap-5 p-7 transition-shadow group-hover:shadow-[var(--shadow-pop)]">
          <IconTile :size="56"><PotIcon :kind="k" :size="26" /></IconTile>
          <div>
            <h3 class="font-serif text-2xl">{{ TEMPLATES[k].title }}</h3>
            <p class="mt-1 text-muted">{{ TEMPLATES[k].blurb }}</p>
            <Badge v-if="k === 'bto'" tone="peach" class="mt-3">Uses real HDB prices</Badge>
          </div>
        </Card>
      </RouterLink>
    </div>
  </Page>
</template>
