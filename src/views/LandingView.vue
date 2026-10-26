<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { ArrowUpRight, Check, TriangleAlert } from "lucide-vue-next";
import { useApp } from "@/stores/app";
import { cloudEnabled } from "@/lib/config";
import { BTO_PROJECTS } from "@/domain/bto-data";
import { createDemoState } from "@/data/seed";
import { walletTotal } from "@/domain/selectors";
import { fmt } from "@/domain/money";
import { cx } from "@/lib/cx";
import Logo from "@/components/art/Logo.vue";
import QuoteRotator from "@/components/QuoteRotator.vue";

const app = useApp();
const router = useRouter();
const flats = BTO_PROJECTS.reduce((s, p) => s + p.flats.reduce((a, f) => a + f.units, 0), 0);
const total = walletTotal(createDemoState());

const IMG = {
  hero: "/images/hero.jpg", keys: "/images/keys.jpg", wedding: "/images/wedding.jpg", interior: "/images/interior.jpg",
  living: "/images/living.jpg", bedroom: "/images/bedroom.jpg", trip: "/images/trip.jpg", reno: "/images/reno.jpg",
};
const quoteIdx = ref(0);
const quoteImages = [IMG.wedding, IMG.trip, IMG.interior, IMG.reno, IMG.bedroom];

const stats = [
  { n: flats.toLocaleString(), l: "BTO flats priced from HDB's own tables" },
  { n: String(BTO_PROJECTS.length), l: "projects from the Feb and Jun 2026 launches" },
  { n: "3", l: "stages worked out: booking, lease and keys" },
  { n: "$0", l: "ever held by us. Your money stays yours" },
];

// Example numbers for a 4-room flat at $385,000 (young first-timer couple, 2.5% scheme).
const stages = [
  { name: "Book your flat", when: "Dec 2026", amt: "$2,000", note: "Option fee, cash only" },
  { name: "Sign Agreement for Lease", when: "Jun 2027", amt: "$14,174", note: "Mostly payable from CPF" },
  { name: "Collect your keys", when: "Jun 2030", amt: "$86,625", note: "Less any EHG grant" },
];
const bars = [28, 34, 30, 44, 38, 100, 36, 30, 42, 33, 28, 31];
const months = ["O", "N", "D", "J", "F", "M", "A", "M", "J", "J", "A", "S"];

function openDemo(path = "/home") {
  app.enterDemo();
  void router.push(path);
}
</script>

<template>
  <div class="min-h-screen overflow-x-hidden text-ink">
    <header class="mx-auto flex max-w-[1280px] items-center justify-between px-5 py-5 md:px-8 md:py-7">
      <div class="flex items-center gap-2.5">
        <Logo :size="32" />
        <span class="font-serif text-[23px]"><span class="text-who-a">S</span>Milestones</span>
      </div>
      <nav class="hidden items-center gap-9 text-[14.5px] text-ink/70 md:flex">
        <a href="#product" class="transition-colors hover:text-ink">Product</a>
        <a href="#features" class="transition-colors hover:text-ink">Features</a>
        <a href="#start" class="transition-colors hover:text-ink">Start</a>
      </nav>
      <div class="flex items-center gap-4">
        <RouterLink v-if="cloudEnabled" to="/login" class="text-[14.5px] text-ink/70 hover:text-ink">Log in</RouterLink>
        <button type="button" class="inline-flex h-11 cursor-pointer items-center rounded-[4px] bg-ink px-6 text-[14.5px] font-medium text-white transition-colors hover:bg-navy-2" @click="openDemo()">Try the demo</button>
      </div>
    </header>

    <!-- hero -->
    <section class="mx-auto max-w-[1280px] px-5 pt-8 md:px-8 md:pt-14">
      <p v-reveal class="font-mono text-[11px] tracking-[0.14em] text-terra uppercase">Money, planned for two</p>
      <h1 v-reveal="80" class="font-serif mt-6 max-w-[1000px] text-[clamp(58px,10.4vw,136px)] leading-[0.9] tracking-[-0.025em]">Plan the big things <em class="text-terra">together.</em></h1>
      <div v-reveal="160" class="mt-8 flex flex-col gap-8 md:mt-10 md:flex-row md:items-end md:justify-between md:gap-12">
        <p class="max-w-[520px] text-[19px] leading-[1.6] text-muted">
          One calm workspace for the BTO, the wedding and the renovation. See what's due, who has put in what, and where you stand, without the spreadsheet.
        </p>
        <div class="flex items-center gap-4">
          <button type="button" class="inline-flex h-14 cursor-pointer items-center gap-2 rounded-[4px] bg-ink px-9 text-[16px] font-medium text-white transition-colors hover:bg-navy-2" @click="openDemo()">Open the demo <ArrowUpRight :size="17" /></button>
          <RouterLink v-if="cloudEnabled" to="/login?signup=1" class="inline-flex h-14 items-center rounded-[4px] border border-ink/30 px-9 text-[16px] font-medium transition-colors hover:bg-white/10">Create an account</RouterLink>
        </div>
      </div>
    </section>

    <!-- product -->
    <section id="product" class="relative mx-auto mt-12 max-w-[1280px] px-5 pb-16 md:mt-20 md:px-8 md:pb-52">
      <div v-reveal class="relative h-[320px] overflow-hidden rounded-[6px] md:h-[520px] md:rounded-[6px]">
        <img :src="IMG.hero" alt="A modern home at dusk" class="size-full object-cover sepia-[0.3] saturate-[0.85]" />
        <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/10" />
      </div>

      <!-- the app, drawn from the same pieces as the real one -->
      <div v-reveal="120" class="absolute inset-x-[7%] top-[330px] hidden md:block rounded-[6px] bg-cream p-3 shadow-[0_30px_60px_-30px_rgba(42,32,26,0.55)] ring-1 ring-ink/30">
        <div class="rounded-[6px] bg-surface p-6 ring-1 ring-ink/8">
          <div class="mb-5 flex items-center justify-between">
            <div class="flex items-center gap-2.5"><Logo :size="22" /><span class="font-serif text-[16px]">Good evening, Dephany</span></div>
            <div class="flex gap-1.5"><span v-for="n in 3" :key="n" class="size-2 rounded-full bg-sand" /></div>
          </div>
          <div class="grid grid-cols-[1.25fr_1fr_1fr] gap-5">
            <div class="rounded-[6px] bg-navy p-6 text-white">
              <p class="text-[10.5px] font-medium tracking-[0.18em] text-white/55 uppercase">Total saved together</p>
              <p class="font-serif tabular mt-2 text-[44px] leading-none">{{ fmt(total) }}</p>
              <div class="mt-5 flex h-2 overflow-hidden rounded-full bg-white/15"><div class="h-full w-[46%] bg-who-a" /><div class="h-full w-[32%] bg-[#8fa0b3]" /></div>
              <div class="mt-3 flex gap-4 text-[11.5px] text-white/65"><span class="flex items-center gap-1.5"><span class="size-1.5 rounded-full bg-who-a" />Dephany $4,180</span><span class="flex items-center gap-1.5"><span class="size-1.5 rounded-full bg-[#8fa0b3]" />Julian $3,590</span></div>
            </div>
            <div v-for="g in [{ img: IMG.trip, t: 'Graduation trip', a: '$1,750', p: 35, x: 20, y: 15 }, { img: IMG.keys, t: 'Our BTO', a: '$5,220', p: 7, x: 4, y: 3 }]" :key="g.t" class="overflow-hidden rounded-[6px] bg-surface ring-1 ring-ink/10">
              <div class="relative h-24"><img :src="g.img" alt="" class="size-full object-cover sepia-[0.3]" /><div class="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" /><p class="font-serif absolute bottom-2.5 left-4 text-[17px] text-white">{{ g.t }}</p></div>
              <div class="p-4"><p class="font-serif tabular text-[22px] leading-none">{{ g.a }}</p><div class="mt-3 flex h-1.5 overflow-hidden rounded-full bg-sand/80"><div class="h-full bg-who-a" :style="{ width: g.x + '%' }" /><div class="h-full bg-who-b" :style="{ width: g.y + '%' }" /></div></div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- stats -->
    <section class="mx-auto max-w-[1280px] px-5 pb-20 md:px-8 md:pb-28">
      <div class="grid grid-cols-4 border-y border-ink/15 max-md:grid-cols-2 max-md:[&>*]:border-l-0 max-md:[&>*]:border-b">
        <div v-for="(s, i) in stats" :key="s.l" v-reveal="i * 90" :class="cx('px-7 py-10', i > 0 && 'border-l border-ink/15')">
          <p class="font-serif tabular text-[58px] leading-none">{{ s.n }}</p>
          <p class="mt-4 max-w-[220px] text-[14.5px] leading-[1.55] text-muted">{{ s.l }}</p>
        </div>
      </div>
    </section>

    <!-- features -->
    <section id="features" class="mx-auto max-w-[1280px] px-5 pb-20 md:px-8 md:pb-28">
      <div v-reveal class="max-w-[820px]">
        <p class="font-mono text-[11px] tracking-[0.14em] text-terra uppercase">What's inside</p>
        <h2 class="font-serif mt-5 text-[clamp(44px,5.6vw,76px)] leading-[0.98] tracking-[-0.02em]">Everything the two of you need to <em class="text-terra">agree on.</em></h2>
      </div>

      <div class="mt-14 grid grid-cols-12 gap-6">
        <!-- BTO -->
        <article v-reveal class="col-span-7 overflow-hidden rounded-[6px] bg-surface shadow-[var(--shadow-card)]">
          <div class="grid grid-cols-[0.9fr_1.1fr]">
            <div class="flex flex-col justify-between p-9">
              <div>
                <p class="font-mono text-[11px] tracking-[0.14em] text-muted uppercase">BTO Navigator</p>
                <h3 class="font-serif mt-4 text-[34px] leading-[1.08]">Know the cost of every stage</h3>
                <p class="mt-4 text-[15.5px] leading-[1.65] text-muted">Grants, stamp duty, legal fees and your CPF are worked in for you, so each deadline comes with a number.</p>
              </div>
              <p class="mt-8 text-[12.5px] text-faint">Example: 4-room, $385,000, young first-time couple.</p>
            </div>
            <div class="bg-surface-2 p-7">
              <ul class="flex flex-col gap-3">
                <li v-for="(s, i) in stages" :key="s.name" class="flex items-center gap-4 rounded-[4px] bg-surface p-4 ring-1 ring-ink/8">
                  <span class="font-serif flex size-9 shrink-0 items-center justify-center rounded-full bg-peach text-[15px] text-terra-2">{{ i + 1 }}</span>
                  <div class="min-w-0 flex-1"><p class="truncate text-[14.5px] font-medium">{{ s.name }}</p><p class="text-[12.5px] text-muted">{{ s.when }} · {{ s.note }}</p></div>
                  <p class="font-serif tabular text-[19px]">{{ s.amt }}</p>
                </li>
              </ul>
            </div>
          </div>
        </article>

        <!-- split -->
        <article v-reveal="100" class="col-span-5 rounded-[6px] bg-navy p-9 text-white">
          <p class="font-mono text-[11px] tracking-[0.14em] text-white/55 uppercase">Monthly split</p>
          <h3 class="font-serif mt-4 text-[34px] leading-[1.08]">Split it the way that feels fair</h3>
          <div class="mt-7 inline-flex gap-1 rounded-full bg-white/10 p-1 text-[13px] font-medium">
            <span class="rounded-[4px] px-4 py-1.5 text-white/65">Equal</span><span class="rounded-[4px] bg-white px-4 py-1.5 text-[#2b2b2b]">By income</span><span class="rounded-[4px] px-4 py-1.5 text-white/65">Custom</span>
          </div>
          <div class="mt-6 flex h-2.5 overflow-hidden rounded-full bg-white/15"><div class="h-full w-[48%] bg-who-a" /><div class="h-full w-[52%] bg-[#8fa0b3]" /></div>
          <div class="mt-4 grid grid-cols-2 gap-4">
            <div><p class="text-[12.5px] text-white/60">Dephany</p><p class="font-serif tabular text-[28px]">$720<span class="text-[14px] text-white/55">/mo</span></p></div>
            <div><p class="text-[12.5px] text-white/60">Julian</p><p class="font-serif tabular text-[28px]">$780<span class="text-[14px] text-white/55">/mo</span></p></div>
          </div>
        </article>

        <!-- approval -->
        <article v-reveal class="col-span-5 rounded-[6px] bg-peach-2 p-9 ring-1 ring-ink/8">
          <p class="font-mono text-[11px] tracking-[0.14em] text-muted uppercase">Approvals</p>
          <h3 class="font-serif mt-4 text-[34px] leading-[1.08]">Money out needs both of you</h3>
          <div class="mt-7 rounded-[4px] bg-surface p-5 shadow-[var(--shadow-card)]">
            <div class="flex items-center gap-3">
              <span class="font-serif flex size-9 items-center justify-center rounded-full bg-who-b text-white">J</span>
              <div><p class="text-[14.5px] font-medium">Julian asks to move $200</p><p class="text-[12.5px] text-muted">Graduation trip to Our BTO · 23h left</p></div>
            </div>
            <div class="mt-4 flex gap-2.5"><span class="rounded-[4px] bg-ink px-5 py-2 text-[13.5px] font-medium text-white">Approve</span><span class="rounded-[4px] border border-ink/25 px-5 py-2 text-[13.5px] font-medium">Decline</span></div>
          </div>
        </article>

        <!-- crunch -->
        <article v-reveal="100" class="col-span-7 rounded-[6px] bg-surface p-9 shadow-[var(--shadow-card)]">
          <div class="flex items-start justify-between gap-8">
            <div class="max-w-[330px]">
              <p class="font-mono text-[11px] tracking-[0.14em] text-muted uppercase">Timeline</p>
              <h3 class="font-serif mt-4 text-[34px] leading-[1.08]">See the crunch months coming</h3>
              <p class="mt-4 text-[15.5px] leading-[1.65] text-muted">When the lease, the wedding and the trip all land in one month, you'll know a year ahead.</p>
            </div>
            <div class="flex-1">
              <div class="flex h-[150px] items-end gap-2">
                <div v-for="(h, i) in bars" :key="i" class="flex h-full flex-1 items-end">
                  <div :class="cx('w-full rounded-t-md', h === 100 ? 'bg-bad' : 'bg-sand')" :style="{ height: h + '%' }" />
                </div>
              </div>
              <div class="mt-2 flex gap-2 text-center text-[11px] text-faint"><span v-for="(m, i) in months" :key="i" class="flex-1">{{ m }}</span></div>
              <p class="mt-4 flex items-center gap-2 rounded-xl bg-bad-soft px-3.5 py-2.5 text-[13px] text-bad"><TriangleAlert :size="15" /> Mar: lease + trip + wedding due. Short by $3,764.</p>
            </div>
          </div>
        </article>
      </div>
    </section>

    <!-- quote -->
    <section class="mx-auto max-w-[1280px] px-5 pb-20 md:px-8 md:pb-28">
      <div v-reveal class="relative overflow-hidden rounded-[6px] text-white md:rounded-[6px]">
        <img v-for="(src, n) in quoteImages" :key="src" :src="src" alt="" :class="['absolute inset-0 size-full object-cover sepia-[0.35] transition-opacity duration-[1400ms]', n === quoteIdx ? 'opacity-100' : 'opacity-0']" />
        <div class="absolute inset-0 bg-black/65" />
        <div class="relative px-6 py-16 md:px-16 md:py-28"><QuoteRotator v-model="quoteIdx" tone="dark" class="[&_blockquote]:max-w-[900px] [&_blockquote]:text-[clamp(26px,4vw,44px)] [&_blockquote]:leading-[1.15]" /></div>
      </div>
    </section>

    <!-- close -->
    <section id="start" class="mx-auto max-w-[1280px] px-5 pb-16 md:px-8 md:pb-24">
      <div v-reveal class="grid grid-cols-[1.2fr_1fr] items-center gap-8 rounded-[6px] bg-surface-2 p-7 ring-1 ring-ink/8 md:gap-12 md:rounded-[6px] md:p-14">
        <div>
          <h2 class="font-serif text-[clamp(44px,5.6vw,72px)] leading-[0.98] tracking-[-0.02em]">Start with one goal. <em class="text-terra">The rest follows.</em></h2>
          <div class="mt-9 flex items-center gap-4">
            <button type="button" class="inline-flex h-14 cursor-pointer items-center gap-2 rounded-[4px] bg-ink px-9 text-[16px] font-medium text-white transition-colors hover:bg-navy-2" @click="openDemo()">Open the demo <ArrowUpRight :size="17" /></button>
          </div>
        </div>
        <ul class="flex flex-col gap-4 text-[16px]">
          <li v-for="t in ['No bank logins, ever', 'Built on real HDB and CPF numbers', 'Free to try with sample data']" :key="t" class="flex items-center gap-3 border-b border-ink/10 pb-4 last:border-0"><span class="flex size-6 items-center justify-center rounded-full bg-ink text-white"><Check :size="13" /></span>{{ t }}</li>
        </ul>
      </div>
    </section>

    <footer class="mx-auto flex max-w-[1280px] flex-col items-start justify-between gap-6 border-t border-ink/15 px-5 py-10 md:flex-row md:gap-12 md:px-8 text-[12.5px] leading-relaxed text-muted">
      <div class="flex items-center gap-2.5 text-ink"><Logo :size="26" /><span class="font-serif text-[19px]"><span class="text-who-a">S</span>Milestones</span></div>
      <p class="max-w-2xl">SMilestones keeps a record of money you set aside in your own accounts. It never holds or moves your money. The numbers are estimates from public HDB and CPF rules, not financial advice, and your HDB Flat Eligibility letter has the final say. Photos from Unsplash.</p>
    </footer>
  </div>
</template>
