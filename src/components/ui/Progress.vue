<script setup lang="ts">
import { computed } from "vue";
import { cx, omitClass } from "@/lib/cx";

defineOptions({ inheritAttrs: false });
// "terra" is the first partner's colour (terracotta) and "navy" the second's (slate), matching the avatars.
const props = withDefaults(defineProps<{ value: number; tone?: "navy" | "terra" | "ok" | "gold"; height?: number }>(), { tone: "navy", height: 8 });
const v = computed(() => Math.max(0, Math.min(100, props.value)));
</script>

<template>
  <div
    v-bind="omitClass($attrs)"
    :class="cx('w-full overflow-hidden bg-ink/10', $attrs.class)"
    :style="{ height: Math.min(props.height, 6) + 'px' }"
    role="progressbar"
    :aria-valuenow="v"
    aria-valuemin="0"
    aria-valuemax="100"
  >
    <div
      :class="cx('h-full transition-[width] duration-500', tone === 'navy' && 'bg-who-b', tone === 'terra' && 'bg-who-a', tone === 'ok' && 'bg-ok', tone === 'gold' && 'bg-gold')"
      :style="{ width: v + '%' }"
    />
  </div>
</template>
