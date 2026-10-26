<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { LogOut, RotateCcw, Settings } from "lucide-vue-next";
import { useApp } from "@/stores/app";
import { cx } from "@/lib/cx";
import { firstName, inboxFor } from "@/domain/selectors";
import Avatar from "@/components/ui/Avatar.vue";
import Logo from "@/components/art/Logo.vue";
import PairingScreen from "@/components/PairingScreen.vue";

const app = useApp();
const route = useRoute();
const router = useRouter();

const NAV = [
  { href: "/home", label: "Home" },
  { href: "/navigator", label: "BTO" },
  { href: "/wedding", label: "Wedding" },
  { href: "/renovation", label: "Renovation" },
  { href: "/wallet", label: "Wallet" },
  { href: "/timeline", label: "Timeline" },
  { href: "/inbox", label: "Approvals" },
];
// What an unpaired person can still use.
const OPEN = ["/home", "/navigator", "/wedding", "/renovation"];

const unpaired = computed(() => !app.state);
const inboxCount = computed(() => (app.state ? inboxFor(app.state, app.meId).count : 0));
const showPairing = computed(() => unpaired.value && !["/navigator", "/wedding", "/renovation", "/settings"].some((p) => route.path.startsWith(p)));

// a wedding goal being set up belongs to the Wedding tab, not the Wallet
const fromWedding = computed(() => route.path.startsWith("/pots") && (route.query.from === "wedding" || route.query.kind === "wedding"));
const fromReno = computed(() => route.path.startsWith("/pots") && (route.query.from === "renovation" || route.query.kind === "renovation"));
const isActive = (href: string) => {
  if (href === "/renovation" && fromReno.value) return true;
  if (href === "/wedding" && fromWedding.value) return true;
  if (href === "/wallet" && route.path.startsWith("/pots") && !fromWedding.value && !fromReno.value) return true;
  return route.path === href || route.path.startsWith(href + "/");
};

async function leave() {
  if (app.mode === "demo") app.leaveDemo();
  else await app.signOut();
  await router.push("/");
}
</script>

<template>
  <div v-if="!app.ready" class="flex min-h-screen items-center justify-center">
    <div class="flex items-center gap-3 text-muted">
      <Logo /> <span class="animate-pulse">Loading your milestones…</span>
    </div>
  </div>
  <div v-else class="min-h-screen">
    <header class="sticky top-0 z-40 border-b border-ink/10 bg-cream/85 backdrop-blur-md">
      <div class="mx-auto flex max-w-[1360px] flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 lg:h-[68px] lg:flex-nowrap lg:px-6 lg:py-0">
        <RouterLink to="/home" class="flex shrink-0 items-center gap-2.5" aria-label="SMilestones home">
          <Logo :size="30" />
          <span class="font-serif hidden text-[21px] 2xl:inline"><span class="text-who-a">S</span>Milestones</span>
        </RouterLink>

        <nav class="order-3 flex w-full items-center gap-1 overflow-x-auto pb-1 lg:order-none lg:mx-auto lg:w-auto lg:overflow-visible lg:pb-0">
          <RouterLink
            v-for="item in NAV"
            :key="item.href"
            :to="item.href"
            :aria-current="isActive(item.href) ? 'page' : undefined"
            :class="
              cx(
                'flex h-9 shrink-0 items-center rounded-[3px] px-3 text-[13.5px] whitespace-nowrap xl:px-3.5 xl:text-[14px] font-medium transition-colors',
                isActive(item.href) ? 'bg-ink text-white' : 'text-ink/75 hover:bg-ink/8 hover:text-ink',
                unpaired && !OPEN.includes(item.href) && 'pointer-events-none opacity-35',
              )
            "
          >
            {{ item.label }}
            <span v-if="item.href === '/inbox' && inboxCount > 0" class="ml-1.5 flex min-w-5 items-center justify-center rounded-[3px] bg-who-a px-1 text-[11px] leading-5 font-semibold text-white">{{ inboxCount }}</span>
          </RouterLink>
        </nav>

        <div class="ml-auto flex shrink-0 items-center gap-2 lg:ml-0">
          <div v-if="app.mode === 'demo' && app.state" class="flex items-center gap-1 rounded-full bg-surface-2 p-0.5" title="Demo: view as">
            <button
              v-for="(p, i) in app.demoPeople"
              :key="p.id"
              type="button"
              :class="cx('flex cursor-pointer items-center gap-1.5 rounded-[3px] py-0.5 pr-2.5 pl-0.5 text-xs font-medium transition-colors', p.id === app.meId ? 'bg-ink text-white' : 'text-ink hover:bg-white/10')"
              @click="app.switchUser(p.id)"
            >
              <Avatar :name="p.display_name" :who="i === 0 ? 'a' : 'b'" :size="22" />
              <span class="hidden 2xl:inline">{{ firstName(p) }}</span>
            </button>
            <button type="button" title="Reset demo data" class="cursor-pointer rounded-full p-1.5 text-muted hover:bg-white/10" @click="app.resetDemo()"><RotateCcw :size="13" /></button>
          </div>
          <RouterLink to="/settings" title="Settings" class="flex size-10 items-center justify-center rounded-[4px] text-ink/75 hover:bg-ink/8"><Settings :size="17" /></RouterLink>
          <button type="button" :title="app.mode === 'demo' ? 'Leave demo' : 'Sign out'" class="flex size-10 cursor-pointer items-center justify-center rounded-[4px] text-ink/75 hover:bg-ink/8" @click="leave"><LogOut :size="17" /></button>
        </div>
      </div>
    </header>

    <main class="min-w-0">
      <PairingScreen v-if="showPairing" />
      <RouterView v-else :key="route.path" />
    </main>
  </div>
</template>
