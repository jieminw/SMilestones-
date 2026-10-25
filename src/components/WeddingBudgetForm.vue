<script setup lang="ts">
import { computed, ref } from "vue";
import { ArrowLeft, ArrowRight, Camera, Check, GlassWater, Landmark, Plane } from "lucide-vue-next";
import { fmt, parseMoney } from "@/domain/money";
import { CATALOG, billedTables, buildLines, cashPlan, itemBudget, itemsFor, tablesFor, totalOf, usesAngbao, venueEstimate, type BudgetForm, type Line, type Style, type WeddingDates } from "@/domain/weddingBudget";
import { allInPrice, HOTEL_NAMES, HOTEL_PRICES, SMALL_VENUES } from "@/data/weddingResources";
import { todayISO } from "@/domain/dates";
import { cx, inputCls } from "@/lib/cx";
import { directory, guide } from "@/stores/guide";
import { PAGE_OF } from "@/data/guideBook";
import LedgerField from "@/components/LedgerField.vue";

/**
 * The planner's front door: a short form, six or seven steps. It works on a copy, so nothing changes until "Save plan",
 * and "Discard" throws the copy away. Saving again later keeps the quotes and payments already recorded.
 */
const props = defineProps<{ modelValue: BudgetForm; dates: WeddingDates; lines: Line[]; editing: boolean; noDiscard?: boolean }>();
const emit = defineEmits<{ save: [form: BudgetForm, dates: WeddingDates]; discard: [] }>();

// Each cost starts from what the plan already holds, or else a placeholder estimate for the chosen style.
const startAmounts = (): Record<string, string> =>
  Object.fromEntries(
    CATALOG.map((i) => {
      const have = props.lines.find((l) => l.id === i.id)?.budget.trim();
      return [i.id, have || String(itemBudget(i, props.modelValue.style))];
    }),
  );
const draft = ref<BudgetForm>({ ...props.modelValue, items: [...props.modelValue.items], amounts: startAmounts() });
const dates = ref<WeddingDates>({ ...props.dates });

type StepId = "dates" | "style" | "guests" | "venue" | "costs" | "angbao" | "review";
const LABELS: Record<StepId, string> = { dates: "Dates", style: "Style", guests: "Guests", venue: "Venue", costs: "Costs", angbao: "Ang bao", review: "Review" };
const order = computed<StepId[]>(() => ["dates", "style", "guests", "venue", "costs", ...(usesAngbao(draft.value) ? (["angbao"] as const) : []), "review"]);
const at = ref(0);
const current = computed<StepId>(() => order.value[Math.min(at.value, order.value.length - 1)]);
const last = computed(() => at.value >= order.value.length - 1);

const touched = { guests: props.editing, items: props.editing };
const intimate = computed(() => draft.value.style === "intimate");

const DATE_FIELDS = [
  { id: "banquet", label: "Banquet day", hint: "The dinner or lunch with your guests", icon: GlassWater },
  { id: "photoshoot", label: "Photoshoot day", hint: "Pre-wedding or wedding-day shoot", icon: Camera },
  { id: "rom", label: "Registration", hint: "ROM or solemnisation", icon: Landmark },
  { id: "honeymoon", label: "Honeymoon", hint: "When you fly out", icon: Plane },
] as const;

const STYLES: { id: Style; title: string; body: string }[] = [
  { id: "hotel", title: "Hotel banquet", body: "Round tables of ten in a hotel ballroom. Priced per table, and most of it is paid after the dinner." },
  { id: "intimate", title: "Small and intimate", body: "Around 20 to 60 guests at a restaurant, garden or heritage house. Priced per person." },
  { id: "undecided", title: "Not sure yet", body: "Start with a hotel-sized budget. You can switch any time." },
];
function pickStyle(s: Style) {
  draft.value.style = s;
  if (!touched.guests) draft.value.guests = s === "intimate" ? 30 : 150;
  if (!touched.items) draft.value.items = itemsFor(s).filter((i) => i.on).map((i) => i.id);
  // an estimate still sitting on a starting figure follows the new style; one the couple typed stays
  const amounts = (draft.value.amounts ??= {});
  for (const i of CATALOG) if (amounts[i.id] === String(i.hotel) || amounts[i.id] === String(i.intimate)) amounts[i.id] = String(itemBudget(i, s));
  const names = s === "intimate" ? SMALL_VENUES.map((v) => v.name) : HOTEL_NAMES;
  if (draft.value.venue && !names.includes(draft.value.venue) && !custom.value) draft.value.venue = "";
}

const PRESETS = computed(() => (intimate.value ? [12, 20, 30, 40, 60] : [30, 80, 150, 250, 300]));
function setGuests(n: number | string) {
  touched.guests = true;
  draft.value.guests = Number(n) || 0;
}

const venueNames = computed(() => (intimate.value ? SMALL_VENUES : HOTEL_NAMES.map((name) => ({ name, tag: "Hotel banquet" }))));
const custom = ref(!!props.modelValue.venue && ![...HOTEL_NAMES, ...SMALL_VENUES.map((v) => v.name)].includes(props.modelValue.venue));
function pickVenue(name: string) {
  custom.value = false;
  draft.value.venue = name;
  // A hotel brings its own price per table and minimum, so start from those.
  const price = intimate.value ? undefined : HOTEL_PRICES[name];
  if (price) {
    draft.value.perTable = String(allInPrice(price));
    draft.value.minTables = price.minTables;
  } else {
    draft.value.minTables = 0;
  }
}
const hotelPrice = computed(() => (intimate.value ? undefined : HOTEL_PRICES[draft.value.venue]));
const billed = computed(() => billedTables(draft.value));
const forcedTables = computed(() => !intimate.value && draft.value.minTables > tablesFor(draft.value.guests));
const money = (n: number) => fmt(n * 100);

const available = computed(() => itemsFor(draft.value.style));
function toggle(id: string) {
  touched.items = true;
  const i = draft.value.items.indexOf(id);
  if (i >= 0) draft.value.items.splice(i, 1);
  else draft.value.items.push(id);
}

const estimate = computed(() => venueEstimate(draft.value));
const built = computed(() => buildLines(draft.value, props.lines));
const planned = computed(() => totalOf(built.value));
const cash = computed(() => (usesAngbao(draft.value) ? cashPlan(draft.value, estimate.value, planned.value) : null));
const canNext = computed(() => (current.value === "guests" ? draft.value.guests >= 2 : true));
const pct = (v: string | number) => Math.min(Math.max(Number(v) || 0, 0), 100);
const perGuest = computed(() => parseMoney(draft.value.angbaoPerGuest) ?? 0);

function go(i: number) {
  at.value = Math.max(0, Math.min(i, order.value.length - 1));
}
</script>

<template>
  <section class="rounded-[6px] bg-surface shadow-[var(--shadow-card)]">
    <!-- progress -->
    <ol class="keep-grid grid border-b border-line" :style="{ gridTemplateColumns: `repeat(${order.length}, minmax(0, 1fr))` }">
      <li v-for="(id, i) in order" :key="id" class="min-w-0">
        <button type="button" :disabled="i > at" :class="cx('flex w-full cursor-pointer flex-col gap-1 border-b-2 px-3 py-3 text-left transition-colors disabled:cursor-default', i === at ? 'border-ink' : 'border-transparent', i > at && 'opacity-45')" @click="go(i)">
          <span class="flex items-center gap-1.5 font-mono text-[10.5px] tracking-[0.1em] text-muted uppercase">
            <Check v-if="i < at" :size="12" class="text-terra" /><span v-else>{{ String(i + 1).padStart(2, "0") }}</span>
          </span>
          <span class="hidden truncate text-[13px] font-medium md:block">{{ LABELS[id] }}</span>
        </button>
      </li>
    </ol>

    <div class="px-6 py-7 md:px-8">
      <!-- dates -->
      <div v-if="current === 'dates'">
        <h2 class="font-serif text-[34px] leading-none">When is your big day?</h2>
        <p class="mt-3 max-w-[52ch] text-[14.5px] leading-relaxed text-muted">Tell us the dates you have in mind. Your timeline is counted back from them, so you know what to book and when. Nothing is locked: leave any blank and add it later.</p>
        <div class="mt-6 grid grid-cols-2 gap-x-5 gap-y-5">
          <label v-for="d in DATE_FIELDS" :key="d.id" class="flex flex-col gap-1.5">
            <span class="flex items-center gap-1.5 font-mono text-[10.5px] tracking-[0.12em] text-muted uppercase"><component :is="d.icon" :size="13" /> {{ d.label }}</span>
            <input v-model="dates[d.id]" type="date" :min="todayISO()" :class="inputCls" />
            <span class="text-[12.5px] text-faint">{{ d.hint }}</span>
          </label>
        </div>
      </div>

      <!-- style -->
      <div v-else-if="current === 'style'">
        <h2 class="font-serif text-[34px] leading-none">What kind of wedding?</h2>
        <p class="mt-3 max-w-[52ch] text-[14.5px] leading-relaxed text-muted">A big hotel banquet is one way to do it, not the only way. Many couples now choose a smaller guest list at a place that feels like them.</p>
        <div class="mt-6 flex flex-col gap-3">
          <button v-for="s in STYLES" :key="s.id" type="button" :aria-pressed="draft.style === s.id"
            :class="cx('flex cursor-pointer items-start gap-4 rounded-[4px] border px-5 py-4 text-left transition-colors', draft.style === s.id ? 'border-ink bg-ink/[0.05]' : 'border-line hover:border-ink/50')"
            @click="pickStyle(s.id)">
            <span :class="cx('mt-1 flex size-4 shrink-0 items-center justify-center rounded-full border', draft.style === s.id ? 'border-ink' : 'border-faint')"><span v-if="draft.style === s.id" class="size-2 rounded-full bg-ink" /></span>
            <span><span class="block text-[16px] font-medium">{{ s.title }}</span><span class="mt-1 block text-[13.5px] leading-relaxed text-muted">{{ s.body }}</span></span>
          </button>
        </div>
      </div>

      <!-- guests -->
      <div v-else-if="current === 'guests'">
        <h2 class="font-serif text-[34px] leading-none">How many guests?</h2>
        <p class="mt-3 max-w-[52ch] text-[14.5px] leading-relaxed text-muted">
          {{ intimate ? "Smaller means more of the budget goes into the food, the place and the photos. A guest list under 60 keeps it to people you really want there." : "A traditional banquet is about 30 tables, around 300 guests. Fewer tables is a legitimate choice and lowers every other cost." }}
        </p>
        <div class="mt-6 flex flex-wrap gap-2">
          <button v-for="n in PRESETS" :key="n" type="button" :aria-pressed="draft.guests === n"
            :class="cx('cursor-pointer rounded-[4px] border px-4 py-2 text-[14px] font-medium transition-colors', draft.guests === n ? 'border-ink bg-ink text-white' : 'border-line hover:border-ink/50')" @click="setGuests(n)">{{ n }}</button>
        </div>
        <div class="mt-5 grid max-w-[420px] grid-cols-2 divide-x divide-line border-y border-ink/30">
          <LedgerField :model-value="draft.guests" number label="Guests" @update:model-value="setGuests" />
          <div class="px-4 py-3">
            <p class="font-mono text-[10px] tracking-[0.12em] text-faint uppercase">{{ intimate ? "Priced per" : "Tables of 10" }}</p>
            <p class="font-serif tabular mt-1 text-[26px] leading-none">{{ intimate ? "guest" : tablesFor(draft.guests) }}</p>
          </div>
        </div>
      </div>

      <!-- venue -->
      <div v-else-if="current === 'venue'">
        <h2 class="font-serif text-[34px] leading-none">{{ intimate ? "Where would you like to celebrate?" : "Which hotel for the banquet?" }}</h2>
        <p class="mt-3 max-w-[52ch] text-[14.5px] leading-relaxed text-muted">
          {{ intimate ? "Pick a place to start from. The guide has notes on each. You can change this later." : "Pick the hotel you are leaning towards, or leave it open. The guide lists each one's price per table and wedding page." }}
        </p>
        <button type="button" class="mt-3 inline-flex cursor-pointer items-center gap-1.5 text-[13.5px] font-medium text-terra hover:underline" @click="guide.show(intimate ? PAGE_OF.smallVenues : PAGE_OF.hotelPrices)">{{ intimate ? "See the small venues in the guide" : "See hotel prices in the guide" }} <ArrowRight :size="13" /></button>
        <button type="button" class="mt-3 ml-5 inline-flex cursor-pointer items-center gap-1.5 text-[13.5px] font-medium text-terra hover:underline" @click="directory.show(intimate ? 'venue' : 'hotel')">Browse and filter all {{ intimate ? "small venues" : "hotels" }} <ArrowRight :size="13" /></button>
        <ul class="mt-5 border-t border-line">
          <li v-for="v in venueNames" :key="v.name" class="border-b border-line">
            <button type="button" :aria-pressed="draft.venue === v.name && !custom" class="flex w-full cursor-pointer items-center gap-3 px-1 py-3 text-left transition-colors hover:bg-ink/[0.03]" @click="pickVenue(v.name)">
              <span :class="cx('flex size-4 shrink-0 items-center justify-center rounded-full border', draft.venue === v.name && !custom ? 'border-ink' : 'border-faint')"><span v-if="draft.venue === v.name && !custom" class="size-2 rounded-full bg-ink" /></span>
              <span class="flex-1 text-[15px]">{{ v.name }}</span>
              <span v-if="!intimate && HOTEL_PRICES[v.name]" class="text-right font-mono text-[11.5px] text-muted">from {{ money(HOTEL_PRICES[v.name].perTable) }}{{ HOTEL_PRICES[v.name].basis === "++" ? "++" : " nett" }} a table</span>
              <span v-else-if="v.tag" class="font-mono text-[10.5px] tracking-[0.08em] text-muted uppercase">{{ v.tag }}</span>
            </button>
          </li>
          <li class="border-b border-line">
            <button type="button" :aria-pressed="custom" class="flex w-full cursor-pointer items-center gap-3 px-1 py-3 text-left hover:bg-ink/[0.03]" @click="custom = true; draft.venue = ''">
              <span :class="cx('flex size-4 shrink-0 items-center justify-center rounded-full border', custom ? 'border-ink' : 'border-faint')"><span v-if="custom" class="size-2 rounded-full bg-ink" /></span>
              <span class="flex-1 text-[15px]">Somewhere else</span>
            </button>
            <LedgerField v-if="custom" v-model="draft.venue" label="Venue name" placeholder="Type the venue" class="mb-2" />
          </li>
          <li class="border-b border-line">
            <button type="button" :aria-pressed="!draft.venue && !custom" class="flex w-full cursor-pointer items-center gap-3 px-1 py-3 text-left hover:bg-ink/[0.03]" @click="pickVenue('')">
              <span :class="cx('flex size-4 shrink-0 items-center justify-center rounded-full border', !draft.venue && !custom ? 'border-ink' : 'border-faint')"><span v-if="!draft.venue && !custom" class="size-2 rounded-full bg-ink" /></span>
              <span class="flex-1 text-[15px] text-muted">Not decided yet</span>
            </button>
          </li>
        </ul>

        <div v-if="hotelPrice" class="mt-5 rounded-[6px] bg-ink/[0.04] px-5 py-4 text-[13.5px] leading-relaxed">
          <p class="font-medium">{{ draft.venue }}: listed from {{ money(hotelPrice.perTable) }}{{ hotelPrice.basis === "++" ? "++" : " nett" }} a table of 10, minimum {{ hotelPrice.minTables }} tables.</p>
          <p v-if="hotelPrice.basis === '++'" class="mt-1 text-muted">With 10% service charge and 9% GST that is about {{ money(allInPrice(hotelPrice)) }} a table, which is the figure we budget with.</p>
          <p v-if="hotelPrice.note" class="mt-1 text-muted">{{ hotelPrice.note }}</p>
          <p class="mt-2 text-[12px] text-faint">Source: {{ hotelPrice.source }}. Prices are starting points, not quotes. Edit the figure below once the hotel quotes you.</p>
        </div>

        <div class="mt-6 grid max-w-[520px] grid-cols-2 divide-x divide-line border-y border-ink/30">
          <LedgerField v-if="intimate" v-model="draft.perHead" money label="Price per guest" />
          <LedgerField v-else v-model="draft.perTable" money :label="hotelPrice ? 'Per table, with taxes' : 'Price per table of 10'" />
          <div class="px-4 py-3">
            <p class="font-mono text-[10px] tracking-[0.12em] text-faint uppercase">Venue estimate</p>
            <p class="font-serif tabular mt-1 text-[26px] leading-none">{{ fmt(estimate) }}</p>
          </div>
        </div>
        <p v-if="forcedTables" class="mt-3 max-w-[56ch] rounded-[4px] border border-warn/50 px-4 py-3 text-[13px] leading-relaxed">
          {{ draft.venue }} sells at least {{ draft.minTables }} tables. Your {{ draft.guests }} guests fill {{ tablesFor(draft.guests) }}, so you would pay for {{ billed }}. A smaller guest list is much cheaper at a restaurant or garden venue: see the guide's chapter on small venues.
        </p>
        <p v-if="!hotelPrice" class="mt-3 max-w-[56ch] text-[12.5px] leading-relaxed text-muted">
          {{ intimate ? "Guides put lunch packages for about 30 guests at roughly $55 to $170++ a person. Many places also have a minimum spend and charge extra for the solemnisation setup." : "Hotel banquet packages in 2026 guides run from about $1,400 to over $2,000 a table, before service charge and GST." }} Replace this with a real quote when you have one.
        </p>
      </div>

      <!-- costs -->
      <div v-else-if="current === 'costs'">
        <h2 class="font-serif text-[34px] leading-none">What will you spend on?</h2>
        <p class="mt-3 max-w-[52ch] text-[14.5px] leading-relaxed text-muted">Tick what applies. The amounts are only estimates for {{ intimate ? "a small wedding" : "a hotel wedding" }}. Tap one to change it now, or edit it later on the milestones page once you have a quote. {{ intimate ? "The ones marked small venue are extras a small venue often needs." : "" }}</p>
        <ul class="mt-5 border-t border-line">
          <li v-for="i in available" :key="i.id" class="flex items-center gap-3 border-b border-line">
            <button type="button" :aria-pressed="draft.items.includes(i.id)" class="flex min-w-0 flex-1 cursor-pointer items-center gap-4 px-1 py-3 text-left transition-colors hover:bg-ink/[0.03]" @click="toggle(i.id)">
              <span :class="cx('flex size-5 shrink-0 items-center justify-center rounded-[3px] border transition-colors', draft.items.includes(i.id) ? 'border-ink bg-ink text-white' : 'border-faint')"><Check v-if="draft.items.includes(i.id)" :size="13" /></span>
              <span class="min-w-0 flex-1">
                <span class="block text-[15px] font-medium">{{ i.name }} <span v-if="i.only" class="ml-1 rounded-[3px] border border-terra/50 px-1.5 py-[1px] align-middle font-mono text-[10px] tracking-[0.05em] text-terra uppercase">Small venue</span></span>
                <span class="block text-[12.5px] text-muted">{{ i.hint }}</span>
              </span>
            </button>
            <label :class="cx('flex w-32 shrink-0 cursor-text flex-col gap-0.5 border-b border-ink/30 pb-1 transition-colors focus-within:border-terra', !draft.items.includes(i.id) && 'opacity-40')">
              <span class="font-mono text-[9.5px] tracking-[0.12em] text-faint uppercase">Estimate</span>
              <span class="flex items-baseline gap-1">
                <span class="font-mono text-[14px] text-faint">$</span>
                <input
                  inputmode="decimal"
                  :aria-label="`Estimated cost of ${i.name}`"
                  :disabled="!draft.items.includes(i.id)"
                  :value="draft.amounts?.[i.id] ?? ''"
                  placeholder="0"
                  class="w-full min-w-0 border-0 bg-transparent p-0 text-right font-serif text-[20px] leading-none outline-none tabular placeholder:text-faint/70"
                  @input="(draft.amounts ??= {})[i.id] = ($event.target as HTMLInputElement).value.replace(/[^\d.,]/g, '')"
                />
              </span>
            </label>
          </li>
        </ul>
      </div>

      <!-- ang bao (hotel banquets) -->
      <div v-else-if="current === 'angbao' && cash">
        <h2 class="font-serif text-[34px] leading-none">Ang bao and your cash</h2>
        <p class="mt-3 max-w-[52ch] text-[14.5px] leading-relaxed text-muted">A hotel wants a deposit now and the rest after the dinner. Guests' ang bao can pay that rest, so it comes off what you need up front. Ang bao is never certain, so we only count part of it.</p>
        <div class="mt-6 grid grid-cols-3 divide-x divide-line border-y border-ink/30">
          <LedgerField v-model="draft.angbaoPerGuest" money label="Ang bao per guest" />
          <LedgerField :model-value="draft.depositPct" number suffix="%" label="Deposit now" @update:model-value="draft.depositPct = pct($event)" />
          <LedgerField :model-value="draft.angbaoBuffer" number suffix="%" label="Safety buffer" @update:model-value="draft.angbaoBuffer = pct($event)" />
        </div>
        <p class="mt-2 text-[12.5px] leading-relaxed text-muted">Your own guesses. A 40% safety buffer means we plan as if 40% of the ang bao never comes. Ask the hotel for its payment schedule.</p>

        <dl class="mt-6 text-[14.5px]">
          <div v-for="row in [
            ['Total cost', fmt(planned)],
            [`Paid after the dinner, from ang bao (${100 - pct(draft.depositPct)}% of the banquet)`, '−' + fmt(cash.balanceAfter)],
          ]" :key="row[0]" class="flex items-baseline gap-3 border-b border-line py-2.5">
            <dt>{{ row[0] }}</dt><span class="mb-1 flex-1 border-b border-dotted border-faint/60" /><dd class="tabular">{{ row[1] }}</dd>
          </div>
        </dl>

        <div class="mt-4 rounded-[6px] bg-[#06363c] px-6 py-5 text-[#eaf7f7]">
          <p class="font-mono text-[11px] tracking-[0.14em] text-[#eaf7f7]/60 uppercase">Cash needed before the banquet</p>
          <p class="font-serif tabular mt-2 text-[clamp(44px,7vw,68px)] leading-none">{{ fmt(cash.upfront) }}</p>
          <p class="mt-3 text-[13.5px] leading-relaxed text-[#eaf7f7]/70">
            Ang bao guess: {{ draft.guests }} × {{ fmt(perGuest) }} = {{ fmt(cash.gross) }}. We count {{ 100 - pct(draft.angbaoBuffer) }}% of it, {{ fmt(cash.counted) }}.
            {{ cash.shortfall > 0 ? `That is ${fmt(cash.shortfall)} short of the balance, so keep that in savings too.` : "That covers the balance." }}
          </p>
        </div>
      </div>

      <!-- review -->
      <div v-else>
        <h2 class="font-serif text-[34px] leading-none">Check your plan</h2>
        <p class="mt-3 max-w-[52ch] text-[14.5px] leading-relaxed text-muted">Nothing is final. You can edit this form again from the planner, and your quotes and payments are kept.</p>
        <dl class="mt-6 grid grid-cols-2 divide-x divide-y divide-line border border-line sm:grid-cols-4 sm:divide-y-0">
          <div class="px-4 py-3"><dt class="font-mono text-[10px] tracking-[0.12em] text-faint uppercase">Style</dt><dd class="mt-1 text-[15px] font-medium">{{ STYLES.find((s) => s.id === draft.style)?.title }}</dd></div>
          <div class="px-4 py-3"><dt class="font-mono text-[10px] tracking-[0.12em] text-faint uppercase">Guests</dt><dd class="mt-1 text-[15px] font-medium">{{ draft.guests }}{{ intimate ? "" : ` · ${tablesFor(draft.guests)} tables` }}</dd></div>
          <div class="px-4 py-3"><dt class="font-mono text-[10px] tracking-[0.12em] text-faint uppercase">Venue</dt><dd class="mt-1 text-[15px] font-medium">{{ draft.venue || "Not decided" }}</dd></div>
          <div class="px-4 py-3"><dt class="font-mono text-[10px] tracking-[0.12em] text-faint uppercase">Banquet day</dt><dd class="mt-1 text-[15px] font-medium">{{ dates.banquet || "Not set" }}</dd></div>
        </dl>
        <div class="mt-5 flex items-baseline justify-between border-b border-ink/30 pb-3">
          <span class="text-[14.5px] text-muted">{{ draft.items.length + 1 }} cost lines, total</span>
          <span class="font-serif tabular text-[34px] leading-none">{{ fmt(planned) }}</span>
        </div>
        <div v-if="cash" class="mt-3 flex items-baseline justify-between border-b border-ink/30 pb-3">
          <span class="text-[14.5px] text-muted">Cash before the banquet, with the ang bao buffer</span>
          <span class="font-serif tabular text-[34px] leading-none">{{ fmt(cash.upfront) }}</span>
        </div>
      </div>
    </div>

    <div class="flex flex-wrap items-center justify-between gap-3 border-t border-line px-6 py-4 md:px-8">
      <button v-if="!noDiscard" type="button" class="cursor-pointer text-[14px] text-muted underline-offset-4 hover:text-bad hover:underline" @click="emit('discard')">{{ editing ? "Discard changes" : "Skip for now" }}</button>
      <span v-else />
      <div class="flex items-center gap-2">
        <button v-if="at > 0" type="button" class="inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-[4px] border border-ink/30 px-4 text-[14px] font-medium hover:bg-ink/[0.05]" @click="go(at - 1)"><ArrowLeft :size="15" /> Back</button>
        <button v-if="!last" type="button" :disabled="!canNext" class="inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-[4px] bg-ink px-5 text-[14px] font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-35" @click="go(at + 1)">Next <ArrowRight :size="15" /></button>
        <button v-else type="button" class="inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-[4px] bg-ink px-5 text-[14px] font-medium text-white hover:opacity-90" @click="emit('save', draft, dates)">Save the plan</button>
      </div>
    </div>
  </section>
</template>
