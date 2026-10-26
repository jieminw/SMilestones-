<script setup lang="ts">
import { computed } from "vue";
import { CalendarDays } from "lucide-vue-next";
import type { CoupleState, Pot } from "@/domain/types";
import { contributionsBy, firstName, potBalance, potTarget, potTx, profileOf } from "@/domain/selectors";
import { fmt, pct } from "@/domain/money";
import { fmtMonth, relativeTime } from "@/domain/dates";
import { potLine } from "@/lib/pot";
import PotIcon from "@/components/art/PotIcon.vue";
import StatusBadge from "./StatusBadge.vue";

/** A goal card with a photo, and a progress bar split by who saved what (Dephany one colour, Julian another). */
const props = defineProps<{ s: CoupleState; pot: Pot; meId: string }>();

const PHOTO: Record<string, string> = { bto: "/images/keys.jpg", wedding: "/images/wedding.jpg", trip: "/images/trip.jpg", custom: "/images/reno.jpg" };
const photo = computed(() => PHOTO[props.pot.kind] ?? PHOTO.custom);

const bal = computed(() => potBalance(props.s, props.pot.id));
const target = computed(() => potTarget(props.s, props.pot.id));
const percent = computed(() => pct(bal.value, target.value));
const last = computed(() => potTx(props.s, props.pot.id)[0]);
const lastLine = computed(() => {
  const l = last.value;
  if (l) return `${firstName(profileOf(props.s, l.user_id))} ${l.kind === "contribution" || l.kind === "transfer_in" ? "+" : "−"}${fmt(l.amount)} · ${relativeTime(l.created_at)}`;
  return props.pot.status === "active" ? "No deposits yet" : "Not started";
});

/** Each partner's share of the bar, as a percentage of the target. Anyone else (a parent's gift) is grey. */
const bar = computed(() => {
  const by = contributionsBy(props.s, props.pot.id);
  const t = target.value || 1;
  const [a, b] = props.s.profiles;
  const ca = by[a?.id] ?? 0;
  const cb = by[b?.id] ?? 0;
  const other = Math.max(bal.value - ca - cb, 0);
  const w = (c: number) => Math.min((c / t) * 100, 100);
  return { a: w(ca), b: w(cb), other: w(other), ca, cb, na: firstName(a), nb: firstName(b) };
});
</script>

<template>
  <RouterLink :to="`/pots/${pot.id}`" class="group block">
    <article class="card-paper h-full overflow-hidden rounded-[6px] bg-[#e9e3d8] shadow-[var(--shadow-card)] transition duration-300 group-hover:-translate-y-1 group-hover:shadow-[var(--shadow-pop)]">
      <div class="relative h-44 overflow-hidden">
        <img :src="photo" :alt="pot.name" loading="lazy" class="size-full object-cover sepia-[0.28] saturate-[0.85] transition-transform duration-700 group-hover:scale-105" />
        <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/20" />
        <div class="absolute top-3 left-3"><StatusBadge :s="s" :pot="pot" :me-id="meId" /></div>
        <div class="absolute inset-x-4 bottom-3 text-white">
          <h3 class="font-serif truncate text-[24px] leading-tight">{{ pot.name }}</h3>
          <p class="truncate text-[12.5px] text-white/80">{{ potLine(s, pot) }}</p>
        </div>
      </div>

      <div class="p-5">
        <div class="flex items-end justify-between">
          <div class="tabular">
            <span class="font-serif text-[28px] leading-none">{{ fmt(bal) }}</span>
            <span class="ml-1.5 text-sm text-muted">of {{ fmt(target) }}</span>
          </div>
          <span class="tabular rounded-[3px] bg-surface-2 px-2.5 py-0.5 text-[13px] font-medium">{{ percent }}%</span>
        </div>

        <!-- one bar, two colours -->
        <div class="mt-4 flex h-2.5 overflow-hidden rounded-full bg-sand/80">
          <div class="h-full bg-who-a transition-[width] duration-700" :style="{ width: bar.a + '%' }" />
          <div class="h-full bg-who-b transition-[width] duration-700" :style="{ width: bar.b + '%' }" />
          <div v-if="bar.other > 0" class="h-full bg-faint/60 transition-[width] duration-700" :style="{ width: bar.other + '%' }" />
        </div>
        <div class="tabular mt-2.5 flex items-center gap-4 text-[12.5px] text-muted">
          <span class="flex items-center gap-1.5"><span class="size-2 rounded-full bg-who-a" />{{ bar.na }} {{ fmt(bar.ca) }}</span>
          <span class="flex items-center gap-1.5"><span class="size-2 rounded-full bg-who-b" />{{ bar.nb }} {{ fmt(bar.cb) }}</span>
        </div>

        <div class="mt-4 flex items-center justify-between border-t border-line pt-3 text-[12.5px] text-muted">
          <span class="flex items-center gap-1.5"><CalendarDays :size="13" /> {{ fmtMonth(pot.target_date) }}</span>
          <span class="truncate pl-3">{{ lastLine }}</span>
        </div>
      </div>
    </article>
  </RouterLink>
</template>
