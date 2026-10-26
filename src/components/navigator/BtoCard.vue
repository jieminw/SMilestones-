<script setup lang="ts">
import { ArrowUpRight, Check, Clock, Zap } from "lucide-vue-next";
import { btoPhoto, FLAT_TYPE_SHORT, type BtoProject, type FlatTypeId } from "@/domain/bto-data";
import { fmtShort } from "@/domain/money";
import { cx } from "@/lib/cx";
import { CASH_COLOUR, CLASS_COLOUR, CPF_COLOUR, whole, yrs } from "@/lib/btoUi";
import Blocks from "@/components/art/Blocks.vue";

/** One launch: the official artist's impression, the price against every other project, and (when asked) whether the couple could afford it. */
const props = defineProps<{
  project: BtoProject;
  offer: { min: number; max: number; units: number; type: FlatTypeId; sqm: number };
  scale: { lo: number; hi: number };
  lowest?: boolean;
  quickest?: boolean;
  inPlan?: boolean;
  hovered?: boolean;
  reach?: { status: "ready" | "tight" | "short"; title: string; detail: string; split?: { cash: number; cpf: number } } | null;
}>();
defineEmits<{ open: []; hover: [id: string | null] }>();

const at = (v: number) => `${Math.round(((v - props.scale.lo) / (props.scale.hi - props.scale.lo || 1)) * 100)}%`;
const cashShare = (r: { cash: number; cpf: number }) => Math.min(Math.max(Math.round((r.cash / (r.cash + r.cpf || 1)) * 100), 3), 97);
const TONE = { ready: "border-ok/40 bg-ok-soft text-ok", tight: "border-warn/40 bg-warn-soft text-warn", short: "border-who-a/35 bg-who-a-soft text-who-a" };
</script>

<template>
  <button type="button" class="group h-full w-full cursor-pointer text-left" @click="$emit('open')" @mouseenter="$emit('hover', project.id)" @mouseleave="$emit('hover', null)">
    <article :class="cx('flex h-full flex-col overflow-hidden rounded-[10px] bg-navy shadow-[var(--shadow-card)] transition duration-300 group-hover:-translate-y-1 group-hover:shadow-[var(--shadow-pop)]', inPlan && 'ring-2 ring-who-a', hovered && 'shadow-[var(--shadow-pop)]')">
      <div :class="cx('relative shrink-0 overflow-hidden', btoPhoto(project.id) ? 'h-[200px]' : 'h-[150px]')">
        <img v-if="btoPhoto(project.id)" :src="btoPhoto(project.id)!" :alt="`Artist's impression of ${project.name}`" loading="lazy" class="size-full object-cover transition-transform duration-700 group-hover:scale-105" />
        <Blocks v-else :seed="project.id" :classification="project.classification" class="h-full w-full transition-transform duration-700 group-hover:scale-105" />
        <div class="absolute inset-0 bg-gradient-to-t from-[#1d1e1f] via-transparent to-black/25" />
        <p v-if="btoPhoto(project.id)" class="absolute right-3 bottom-2.5 text-[10px] tracking-wide text-white/70">Artist's impression · HDB</p>
        <div class="absolute top-3 left-3 flex gap-1.5">
          <span class="rounded-[3px] px-2 py-0.5 font-mono text-[10.5px] font-semibold tracking-wide text-[#2b2b2b] uppercase" :style="{ background: CLASS_COLOUR[project.classification] }">{{ project.classification }}</span>
          <span class="rounded-[3px] bg-black/55 px-2 py-0.5 font-mono text-[10.5px] tracking-wide text-white uppercase backdrop-blur-sm">{{ project.launch }}</span>
        </div>
        <div class="absolute top-3 right-3 flex flex-col items-end gap-1.5">
          <span v-if="lowest" class="flex items-center gap-1 rounded-[3px] bg-lime px-2 py-0.5 text-[10.5px] font-semibold text-[#2b2b2b]"><Zap :size="11" /> Lowest price</span>
          <span v-if="quickest" class="flex items-center gap-1 rounded-[3px] bg-white px-2 py-0.5 text-[10.5px] font-semibold text-[#2b2b2b]"><Clock :size="11" /> Quickest</span>
          <span v-if="inPlan" class="rounded-[3px] bg-who-a px-2 py-0.5 text-[10.5px] font-semibold text-[#2b2b2b]">In your plan</span>
        </div>
        <p class="absolute bottom-3 left-5 font-mono text-[11px] tracking-[0.22em] text-white/80 uppercase">{{ project.town }} · {{ project.region }}</p>
      </div>

      <div class="flex flex-1 flex-col p-5 pt-3">
        <div class="flex items-start justify-between gap-3">
          <h3 class="font-serif text-[26px] leading-tight">{{ project.name }}</h3>
          <span class="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full border border-line text-muted transition group-hover:border-who-a group-hover:bg-who-a group-hover:text-[#2b2b2b]"><ArrowUpRight :size="16" /></span>
        </div>
        <p class="mt-3 font-mono text-[10.5px] tracking-[0.14em] text-faint uppercase">{{ FLAT_TYPE_SHORT[offer.type] }} · excl. grants</p>
        <div class="tabular mt-0.5 flex items-baseline gap-2">
          <span class="text-[30px] leading-none font-semibold">{{ fmtShort(offer.min * 100) }}</span>
          <span class="text-[15px] text-muted">to {{ fmtShort(offer.max * 100) }}</span>
        </div>

        <!-- where this sits on the price scale of every project -->
        <div class="relative mt-4 h-1.5 rounded-full bg-white/10">
          <div class="absolute inset-y-0 rounded-full" :style="{ left: at(offer.min), right: `calc(100% - ${at(offer.max)})`, background: CLASS_COLOUR[project.classification] }" />
        </div>
        <div class="tabular mt-1.5 flex justify-between text-[11px] text-faint"><span>{{ fmtShort(scale.lo * 100) }}</span><span>{{ fmtShort(scale.hi * 100) }}</span></div>

        <div class="mt-4 grid grid-cols-3 border-t border-line pt-3.5 text-center">
          <div><p class="tabular text-[17px] font-semibold">{{ offer.units }}</p><p class="text-[11.5px] text-muted">flats</p></div>
          <div class="border-x border-line"><p class="tabular text-[17px] font-semibold">{{ yrs(project.waitingMonths) }}<span class="text-[12px] font-normal text-muted"> yrs</span></p><p class="text-[11.5px] text-muted">wait</p></div>
          <div><p class="tabular text-[17px] font-semibold">{{ offer.sqm }}<span class="text-[12px] font-normal text-muted"> m²</span></p><p class="text-[11.5px] text-muted">inside</p></div>
        </div>

        <div v-if="reach" :class="cx('mt-auto rounded-[6px] border px-3.5 py-2.5', TONE[reach.status])" :style="{ marginTop: '16px' }">
          <p class="flex items-center gap-1.5 text-[13px] font-semibold"><Check v-if="reach.status === 'ready'" :size="14" />{{ reach.title }}</p>
          <p class="mt-0.5 text-[12px] leading-snug opacity-85">{{ reach.detail }}</p>
          <div v-if="reach.split" class="mt-2.5">
            <div class="flex h-1.5 overflow-hidden rounded-full bg-black/30"><div class="h-full" :style="{ width: cashShare(reach.split) + '%', background: CASH_COLOUR }" /><div class="h-full flex-1" :style="{ background: CPF_COLOUR }" /></div>
            <p class="mt-1.5 flex justify-between gap-3 text-[11px] opacity-90">
              <span class="flex items-center gap-1.5"><span class="size-1.5 rounded-full" :style="{ background: CASH_COLOUR }" />Cash {{ whole(reach.split.cash) }}</span>
              <span class="flex items-center gap-1.5"><span class="size-1.5 rounded-full" :style="{ background: CPF_COLOUR }" />CPF &amp; grants {{ whole(reach.split.cpf) }}</span>
            </p>
          </div>
        </div>
      </div>
    </article>
  </button>
</template>
