<script setup lang="ts">
import { onBeforeUnmount, onMounted } from "vue";

withDefaults(defineProps<{ tone?: "dark" | "light" }>(), { tone: "light" });

const QUOTES = [
  { text: "A journey of a thousand miles begins with a single step.", by: "Lao Tzu" },
  { text: "The best time to start saving was yesterday. The next best time is this month.", by: "" },
  { text: "A home is not bought in a day. It is built a little at a time, by two people who keep showing up.", by: "" },
  { text: "Small, steady deposits beat one heroic effort every time.", by: "" },
  { text: "Plan together, decide together, and the big milestones stop feeling so big.", by: "" },
];

/** Index of the quote on show. Bind it with v-model to sync something else, like a background photo. */
const i = defineModel<number>({ default: 0 });
let t: ReturnType<typeof setInterval>;
onMounted(() => (t = setInterval(() => (i.value = (i.value + 1) % QUOTES.length), 7000)));
onBeforeUnmount(() => clearInterval(t));
</script>

<template>
  <figure class="min-h-[8.5rem]">
    <Transition name="q" mode="out-in">
      <div :key="i">
        <blockquote class="font-serif text-[30px] leading-[1.25]">“{{ QUOTES[i].text }}”</blockquote>
        <figcaption v-if="QUOTES[i].by" :class="tone === 'dark' ? 'text-white/70' : 'text-muted'" class="mt-4 text-[12px] font-medium tracking-[0.2em] uppercase">{{ QUOTES[i].by }}</figcaption>
      </div>
    </Transition>
    <div class="mt-6 flex gap-2">
      <button v-for="(_, n) in QUOTES" :key="n" type="button" :aria-label="`Quote ${n + 1}`" :class="['h-1 cursor-pointer rounded-full transition-all', n === i ? 'w-8 bg-terra' : tone === 'dark' ? 'w-4 bg-white/5' : 'w-4 bg-ink/20']" @click="i = n" />
    </div>
  </figure>
</template>

<style scoped>
.q-enter-active,
.q-leave-active {
  transition: opacity 0.4s ease, transform 0.4s ease;
}
.q-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.q-leave-to {
  opacity: 0;
}
</style>
