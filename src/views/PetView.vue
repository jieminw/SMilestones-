<script setup lang="ts">
import { computed, ref } from "vue";
import { Carrot, Check, Coins, Flame, Heart, HeartPulse, Moon, Pencil, Puzzle, Shirt, Sprout } from "lucide-vue-next";
import { useCouple } from "@/stores/app";
import { CARE, OUTFITS, contributionReward, petStatus } from "@/domain/pet";
import type { CareAction } from "@/domain/types";
import { liveTx, potBalance, potTarget, stageProgress } from "@/domain/selectors";
import { pct } from "@/domain/money";
import { cx, inputCls } from "@/lib/cx";
import Page from "@/layouts/Page.vue";
import PageHeader from "@/layouts/PageHeader.vue";
import Button from "@/components/ui/Button.vue";
import Card from "@/components/ui/Card.vue";
import Field from "@/components/ui/Field.vue";
import Modal from "@/components/ui/Modal.vue";
import Progress from "@/components/ui/Progress.vue";
import SectionTitle from "@/components/ui/SectionTitle.vue";
import PetAlcove from "@/components/art/PetAlcove.vue";
import PotIcon from "@/components/art/PotIcon.vue";

const ICONS = { food: Carrot, outfit: Shirt, play: Puzzle, rest: Moon } as const;
const ACTIONS: CareAction[] = ["food", "outfit", "play", "rest"];

const { app, s } = useCouple();
const pet = computed(() => petStatus(s.value));
const renaming = ref(false);
const name = ref(pet.value.name);
const speech = ref("Hello, you!");

const mood = computed(() => (pet.value.happiness >= 50 ? "happy" : pet.value.happiness >= 20 ? "content" : "sad"));
const quests = computed(() => {
  const month = new Date().toISOString().slice(0, 7);
  const thisMonth = liveTx(s.value).filter((t) => t.kind === "contribution" && t.occurred_on.startsWith(month));
  return [
    { label: "Log a contribution this month", done: thisMonth.length > 0 },
    { label: "Both of you contribute this month", done: s.value.profiles.every((p) => thisMonth.some((t) => t.user_id === p.id)) },
    { label: "Agree a split on a new pot", done: s.value.proposals.some((p) => p.status === "accepted") },
    { label: "Fully fund a stage or pot", done: pet.value.stagesDone > 0 },
  ];
});
const reward = contributionReward(15000);

const cant = (a: CareAction) => pet.value.coins < CARE[a].cost || (a === "outfit" && pet.value.outfits >= OUTFITS.length);
const shelf = computed(() =>
  s.value.pots.map((p) => {
    const done = p.sequential ? stageProgress(s.value, p).filter((x) => x.status === "done").length : 0;
    return { p, text: p.sequential ? `${done} stage${done === 1 ? "" : "s"}` : `${pct(potBalance(s.value, p.id), potTarget(s.value, p.id))}%` };
  }),
);

async function care(a: CareAction) {
  const r = await app.dispatch({ type: "petCare", action: a }, { success: a === "outfit" ? `${pet.value.name} unlocked: ${OUTFITS[pet.value.outfits]}!` : `${CARE[a].label}: ${CARE[a].effect.split(" · ")[0]}` });
  if (r.ok) speech.value = a === "food" ? "Yum, thank you!" : a === "play" ? "Again, again!" : a === "rest" ? "Zzz… so cosy." : "Do I look dashing?";
}

async function rename() {
  const r = await app.dispatch({ type: "renamePet", name: name.value }, { success: `Say hi to ${name.value.trim()}!` });
  if (r.ok) renaming.value = false;
}
</script>

<template>
  <Page wide>
    <PageHeader :title="`${pet.name}'s room`" :subtitle="`${s.couple.name}'s companion grows every time you save.`">
      <template #actions>
        <Button variant="secondary" size="sm" @click="renaming = true"><Pencil :size="14" /> Rename</Button>
      </template>
    </PageHeader>

    <div class="grid grid-cols-[minmax(0,1fr)_380px] gap-7">
      <div class="flex flex-col gap-6">
        <!-- HUD -->
        <Card class="grid grid-cols-[auto_1fr_auto_auto] items-center gap-6 px-6 py-5">
          <div class="flex size-16 flex-col items-center justify-center rounded-full bg-navy text-white">
            <span class="text-[10px] tracking-widest text-white/70">LV</span>
            <span class="-mt-1 font-serif text-2xl">{{ pet.level }}</span>
          </div>
          <div>
            <div class="flex justify-between text-sm">
              <span class="font-medium">{{ pet.levelXp }} / {{ pet.levelNeed }} XP</span>
              <span class="text-muted">{{ pet.levelNeed - pet.levelXp }} XP to level {{ pet.level + 1 }}</span>
            </div>
            <Progress class="mt-1.5" :value="(pet.levelXp / pet.levelNeed) * 100" tone="terra" :height="10" />
          </div>
          <div class="flex items-center gap-2 rounded-[3px] bg-warn-soft px-4 py-2 font-semibold text-warn"><Coins :size="18" /> {{ pet.coins }}</div>
          <div class="flex items-center gap-2 rounded-[3px] bg-peach px-4 py-2 font-semibold text-terra-2"><Flame :size="18" /> {{ pet.streakMonths }}-month streak</div>
        </Card>

        <!-- Room -->
        <Card class="relative overflow-hidden p-0">
          <div class="relative h-[460px]" style="background: repeating-linear-gradient(90deg, #e8f6f6 0 22px, #f1e2cd 22px 44px)">
            <div class="absolute top-8 left-8 rounded-xl border-2 border-[#b85a30] bg-[#e0764a] px-5 py-2.5 text-center text-white shadow-md">
              <div class="font-serif text-xl">{{ pet.name }}'s room</div>
              <div class="text-xs text-white/80">{{ s.couple.name }}</div>
            </div>
            <div class="absolute top-10 right-12 h-[120px] w-[96px] rounded-t-[48px] border-[6px] border-[#e0764a] bg-gradient-to-b from-[#f2c7a5] to-[#e7a283]">
              <div class="absolute inset-x-0 top-1/2 h-1 bg-[#e0764a]" />
              <div class="absolute inset-y-0 left-1/2 w-1 bg-[#e0764a]" />
              <div class="absolute top-4 right-4 size-6 rounded-full bg-[#f4895a]" />
            </div>
            <div class="absolute bottom-0 h-[110px] w-full bg-[#f6965f]" style="background: repeating-linear-gradient(0deg, #f6965f 0 26px, #bd8d66 26px 28px)" />
            <div class="absolute bottom-6 left-1/2 h-12 w-[360px] -translate-x-1/2 rounded-[50%] bg-[#e0764a]/85" />
            <div class="absolute bottom-[42px] left-1/2 -translate-x-1/2">
              <div :key="speech" class="anim-rise absolute -top-10 left-1/2 -translate-x-1/2 rounded-[3px] bg-surface px-4 py-1.5 text-sm font-medium whitespace-nowrap shadow-md">{{ speech }}</div>
              <PetAlcove :size="250" :mood="mood" :outfit="pet.outfits" />
            </div>
            <div class="absolute bottom-[118px] left-8 flex items-end gap-2">
              <RouterLink v-for="p in s.pots.slice(0, 4)" :key="p.id" :to="`/pots/${p.id}`" :title="p.name" class="flex size-11 items-center justify-center rounded-xl bg-navy text-white shadow hover:bg-navy-2">
                <PotIcon :kind="p.kind" :size="18" />
              </RouterLink>
            </div>
            <div class="absolute bottom-[110px] left-6 h-2 w-[200px] rounded bg-[#b85a30]" />
            <div class="absolute right-8 bottom-[126px] flex items-center gap-2 rounded-[3px] bg-navy/90 px-3.5 py-1.5 text-sm text-white">
              <span :class="cx('size-2 rounded-full', pet.happiness >= 50 ? 'bg-[#7ed3a5]' : pet.happiness >= 20 ? 'bg-gold' : 'bg-[#ff9b8a]')" /> {{ pet.mood }}
            </div>
          </div>
        </Card>

        <!-- Care dock -->
        <div class="grid grid-cols-4 gap-4">
          <button
            v-for="a in ACTIONS"
            :key="a"
            type="button"
            :disabled="cant(a)"
            class="group cursor-pointer rounded-[6px] border-2 border-[#d7b897] bg-surface p-4 text-center transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
            @click="care(a)"
          >
            <span class="mx-auto flex size-12 items-center justify-center rounded-2xl bg-navy text-white"><component :is="ICONS[a]" :size="22" /></span>
            <span class="mt-2 block font-semibold">{{ CARE[a].label }}</span>
            <span class="block text-xs text-muted">{{ CARE[a].effect.split(" · ")[0] }}</span>
            <span class="mt-2 inline-flex items-center gap-1 rounded-[3px] bg-warn-soft px-2.5 py-0.5 text-xs font-semibold text-warn"><Coins :size="12" /> {{ CARE[a].cost === 0 ? "Free" : CARE[a].cost }}</span>
          </button>
        </div>
      </div>

      <aside class="flex flex-col gap-6">
        <Card class="p-6">
          <SectionTitle>Wellbeing</SectionTitle>
          <div class="flex flex-col gap-4">
            <div>
              <div class="mb-1.5 flex items-center gap-2 text-sm"><Heart :size="17" /><span class="font-medium">Happiness</span><span class="tabular ml-auto font-semibold">{{ pet.happiness }}%</span></div>
              <Progress :value="pet.happiness" tone="terra" :height="10" />
              <p class="mt-1 text-xs text-faint">Rises when you both save regularly.</p>
            </div>
            <div>
              <div class="mb-1.5 flex items-center gap-2 text-sm"><HeartPulse :size="17" /><span class="font-medium">Health</span><span class="tabular ml-auto font-semibold">{{ pet.health }}%</span></div>
              <Progress :value="pet.health" tone="navy" :height="10" />
              <p class="mt-1 text-xs text-faint">Food and rest keep it up.</p>
            </div>
          </div>
        </Card>

        <Card class="p-6">
          <div class="flex items-start gap-3">
            <span class="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-ok-soft text-ok"><Sprout :size="20" /></span>
            <div>
              <h3 class="font-semibold">How {{ pet.name }} earns</h3>
              <p class="mt-1 text-sm text-muted">
                Coins come <strong class="text-ink">only from saving</strong>. A $150 contribution earns {{ reward.coins }} coins and {{ reward.xp }} XP; funding a stage adds 50 XP. Edit or delete a contribution and the rewards adjust too.
              </p>
            </div>
          </div>
        </Card>

        <Card class="p-6">
          <SectionTitle>Quests this month</SectionTitle>
          <ul class="flex flex-col gap-3">
            <li v-for="q in quests" :key="q.label" class="flex items-center gap-3 text-sm">
              <span :class="cx('flex size-6 items-center justify-center rounded-full', q.done ? 'bg-ok text-white' : 'border-2 border-line')"><Check v-if="q.done" :size="14" /></span>
              <span :class="q.done ? 'text-muted line-through' : ''">{{ q.label }}</span>
            </li>
          </ul>
        </Card>

        <Card id="wardrobe" class="p-6">
          <SectionTitle>Wardrobe</SectionTitle>
          <div class="flex flex-wrap gap-2">
            <span v-for="(o, i) in OUTFITS" :key="o" :class="cx('rounded-[3px] px-3 py-1.5 text-sm', i < pet.outfits ? 'bg-navy text-white' : 'bg-surface-2 text-faint')">{{ i < pet.outfits ? o : "🔒 " + o }}</span>
          </div>
          <p class="mt-3 text-sm text-muted">Unlock the next outfit for {{ CARE.outfit.cost }} coins.</p>
        </Card>

        <Card class="p-6">
          <SectionTitle>Goals on the shelf</SectionTitle>
          <ul class="flex flex-col gap-3">
            <li v-for="g in shelf" :key="g.p.id">
              <RouterLink :to="`/pots/${g.p.id}`" class="flex items-center gap-3 text-sm hover:underline">
                <PotIcon :kind="g.p.kind" :size="16" /> <span class="flex-1">{{ g.p.name }}</span>
                <span class="tabular text-muted">{{ g.text }}</span>
              </RouterLink>
            </li>
          </ul>
        </Card>
      </aside>
    </div>

    <Modal :open="renaming" title="Rename your companion" :width="400" @close="renaming = false">
      <Field v-slot="{ id }" label="Name"><input :id="id" v-model="name" :class="inputCls" maxlength="20" autofocus /></Field>
      <Button class="mt-5 w-full" @click="rename">Save</Button>
    </Modal>
  </Page>
</template>
