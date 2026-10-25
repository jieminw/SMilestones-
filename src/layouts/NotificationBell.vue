<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { Bell } from "lucide-vue-next";
import { useApp } from "@/stores/app";
import { relativeTime } from "@/domain/dates";
import { cx } from "@/lib/cx";

const app = useApp();
const open = ref(false);
const root = ref<HTMLElement | null>(null);

const onDown = (e: MouseEvent) => root.value && !root.value.contains(e.target as Node) && (open.value = false);
onMounted(() => document.addEventListener("mousedown", onDown));
onBeforeUnmount(() => document.removeEventListener("mousedown", onDown));

const mine = computed(() => (app.state?.notifications ?? []).filter((n) => n.user_id === app.meId).sort((a, b) => b.created_at.localeCompare(a.created_at)));
const unread = computed(() => mine.value.filter((n) => !n.read));

function toggle() {
  open.value = !open.value;
  if (open.value && unread.value.length) void app.dispatch({ type: "markRead", ids: unread.value.map((n) => n.id) });
}
</script>

<template>
  <div v-if="app.state" ref="root" class="relative">
    <button
      type="button"
      :aria-label="`Notifications${unread.length ? `, ${unread.length} unread` : ''}`"
      class="relative flex size-11 cursor-pointer items-center justify-center rounded-[4px] border border-ink/25 bg-transparent text-ink hover:bg-ink hover:text-white"
      @click="toggle"
    >
      <Bell :size="19" />
      <span v-if="unread.length" class="absolute top-2 right-2.5 size-2.5 rounded-full bg-who-a ring-2 ring-cream" />
    </button>
    <div v-if="open" class="anim-rise absolute top-13 right-0 z-40 w-[360px] overflow-hidden rounded-2xl bg-surface shadow-[var(--shadow-card)]">
      <div class="border-b border-line px-5 py-3.5 text-sm font-semibold">Notifications</div>
      <ul class="max-h-[420px] overflow-y-auto">
        <li v-if="mine.length === 0" class="px-5 py-8 text-center text-sm text-muted">You're all caught up.</li>
        <li v-for="n in mine.slice(0, 25)" :key="n.id">
          <RouterLink :to="n.href" class="flex gap-3 px-5 py-3 hover:bg-surface-2" @click="open = false">
            <span :class="cx('mt-1.5 size-2 shrink-0 rounded-full', unread.some((u) => u.id === n.id) ? 'bg-terra' : 'bg-transparent')" />
            <span class="min-w-0 flex-1">
              <span class="block text-sm leading-snug text-ink">{{ n.text }}</span>
              <span class="mt-0.5 block text-xs text-faint">{{ relativeTime(n.created_at) }}</span>
            </span>
          </RouterLink>
        </li>
      </ul>
    </div>
  </div>
</template>
