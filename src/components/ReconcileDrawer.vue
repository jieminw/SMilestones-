<script setup lang="ts">
import { computed, ref } from "vue";
import { Check, ShieldCheck, TriangleAlert } from "lucide-vue-next";
import { useCouple } from "@/stores/app";
import {
  detectColumns, emptyMapping, headerSignature, parseCsv, parseStatement, reconcile, type ColumnMapping, type DateFormat,
} from "@/domain/reconcile";
import { fmt, type Cents } from "@/domain/money";
import { fmtDay, todayISO } from "@/domain/dates";
import { liveTx } from "@/domain/selectors";
import { inputCls } from "@/lib/cx";
import Button from "@/components/ui/Button.vue";
import Drawer from "@/components/ui/Drawer.vue";
import Notice from "@/components/ui/Notice.vue";

/**
 * Check your logged contributions against a bank statement CSV. The file is read and parsed in this browser
 * only. It is never uploaded or stored; the only thing saved is a "verified" mark on matching contributions.
 */
const emit = defineEmits<{ close: [] }>();
const { app, s } = useCouple();

const PRESET_KEY = "smilestones-bank-presets";
type Presets = Record<string, { name: string; mapping: ColumnMapping }>;
const loadPresets = (): Presets => {
  try {
    return JSON.parse(localStorage.getItem(PRESET_KEY) ?? "{}");
  } catch {
    return {};
  }
};

const step = ref<"upload" | "map" | "results">("upload");
const rows = ref<string[][]>([]);
const map = ref<ColumnMapping>(emptyMapping());
const presetName = ref("");
const usedPreset = ref<string | null>(null);
const error = ref<string | null>(null);
const busy = ref(false);

const header = computed(() => rows.value[0] ?? []);
const cols = computed(() => (map.value.hasHeader ? header.value : header.value.map((_, i) => `Column ${i + 1}`)));
const preview = computed(() => rows.value.slice(map.value.hasHeader ? 1 : 0, 6));
const parsed = computed(() => parseStatement(rows.value, map.value));
const result = computed(() => reconcile(s.value, parsed.value.lines, { userId: app.meId }));
const toVerify = computed(() => result.value.matched.filter((m) => !result.value.alreadyVerified.includes(m.txId)).map((m) => m.txId));
const potName = (id: string) => s.value.pots.find((p) => p.id === id)?.name ?? "";
const txOf = (id: string) => s.value.transactions.find((t) => t.id === id)!;

async function onFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) load(await file.text());
}

function load(text: string) {
  error.value = null;
  const r = parseCsv(text);
  if (r.length < 2) {
    error.value = "That file has no rows we can read. Export your statement as CSV and try again.";
    return;
  }
  rows.value = r;
  const presets = loadPresets();
  const hit = presets[headerSignature(r[0])];
  usedPreset.value = hit?.name ?? null;
  map.value = hit ? { ...hit.mapping } : detectColumns(r[0]);
  step.value = "map";
}

/** Demo only: a statement built from this person's own contributions, with one missing and one extra transfer. */
function useSample() {
  const mine = liveTx(s.value).filter((t) => t.user_id === app.meId && t.kind === "contribution").sort((a, b) => a.occurred_on.localeCompare(b.occurred_on));
  const lines = mine.slice(0, -1).map((t, i) => {
    const d = new Date(t.occurred_on + "T00:00:00");
    d.setDate(d.getDate() + (i % 2));
    return `${d.toISOString().slice(0, 10)},FAST PAYMENT TO JOINT SAVINGS ${8800 + i},-${t.amount / 100}`;
  });
  const extra = mine.length ? `${todayISO()},FAST PAYMENT TO JOINT SAVINGS 9999,-${mine[0].amount / 100}` : "";
  load(["Date,Description,Amount", ...lines, extra, `${todayISO()},NETS GRAB FOOD,-23.40`].filter(Boolean).join("\n"));
}

function savePreset() {
  if (!presetName.value.trim()) return;
  const presets = loadPresets();
  presets[headerSignature(header.value)] = { name: presetName.value.trim(), mapping: { ...map.value } };
  try {
    localStorage.setItem(PRESET_KEY, JSON.stringify(presets));
  } catch {
    /* storage blocked: the mapping just isn't remembered */
  }
}

function next() {
  if (presetName.value.trim()) savePreset();
  step.value = "results";
}

async function verify() {
  busy.value = true;
  const r = await app.dispatch({ type: "markVerified", txIds: toVerify.value }, { success: `${toVerify.value.length} contribution${toVerify.value.length === 1 ? "" : "s"} marked as verified.` });
  busy.value = false;
  if (r.ok) emit("close");
}

async function logIt(line: { date: string; amount: Cents }, potId: string) {
  await app.dispatch({ type: "logContribution", potId, amount: -line.amount, occurred_on: line.date, note: "From bank statement" }, { success: "Contribution logged." });
}
const activePots = computed(() => s.value.pots.filter((p) => p.status === "active"));
const pick = ref<Record<number, string>>({});
</script>

<template>
  <Drawer open title="Check against your bank statement" :width="620" @close="emit('close')">
    <Notice class="mb-5">
      <template #icon><ShieldCheck :size="15" /></template>
      Your statement stays on this device. It is read in your browser and never uploaded or saved. Only a verified mark is stored on matching contributions.
    </Notice>

    <div v-if="step === 'upload'" class="flex flex-col gap-4">
      <p class="text-sm text-muted">Download a CSV of your account's transactions from your bank, then choose it here. Only your own contributions are checked.</p>
      <input type="file" accept=".csv,text/csv" :class="inputCls + ' h-auto py-2.5'" @change="onFile" />
      <p v-if="error" class="text-sm text-bad">{{ error }}</p>
      <Button v-if="app.mode === 'demo'" variant="secondary" @click="useSample">Use a sample statement</Button>
    </div>

    <div v-else-if="step === 'map'" class="flex flex-col gap-4">
      <Notice v-if="usedPreset" tone="ok">Using your saved layout "{{ usedPreset }}". Change anything that looks wrong.</Notice>
      <p v-else class="text-sm text-muted">Tell us which column is which. We made a guess from the header row.</p>
      <label class="flex items-center gap-2 text-sm"><input v-model="map.hasHeader" type="checkbox" class="size-4" /> First row is a header</label>
      <div class="grid grid-cols-2 gap-4">
        <label class="text-[13px] text-muted">Date column
          <select v-model.number="map.date" :class="inputCls + ' mt-1'"><option v-for="(c, i) in cols" :key="i" :value="i">{{ c }}</option></select>
        </label>
        <label class="text-[13px] text-muted">Date order
          <select v-model="map.dateFormat" :class="inputCls + ' mt-1'">
            <option v-for="o in [{ v: 'dmy', l: 'Day / month / year' }, { v: 'mdy', l: 'Month / day / year' }, { v: 'ymd', l: 'Year first' }] as { v: DateFormat; l: string }[]" :key="o.v" :value="o.v">{{ o.l }}</option>
          </select>
        </label>
        <label class="text-[13px] text-muted">Description column
          <select v-model.number="map.description" :class="inputCls + ' mt-1'"><option v-for="(c, i) in cols" :key="i" :value="i">{{ c }}</option></select>
        </label>
        <label class="text-[13px] text-muted">Amounts are in
          <select v-model="map.amountMode" :class="inputCls + ' mt-1'"><option value="signed">One column (money out is negative)</option><option value="split">Separate out and in columns</option></select>
        </label>
        <template v-if="map.amountMode === 'signed'">
          <label class="text-[13px] text-muted">Amount column
            <select v-model.number="map.amount" :class="inputCls + ' mt-1'"><option v-for="(c, i) in cols" :key="i" :value="i">{{ c }}</option></select>
          </label>
        </template>
        <template v-else>
          <label class="text-[13px] text-muted">Money out column
            <select v-model.number="map.debit" :class="inputCls + ' mt-1'"><option v-for="(c, i) in cols" :key="i" :value="i">{{ c }}</option></select>
          </label>
          <label class="text-[13px] text-muted">Money in column
            <select v-model.number="map.credit" :class="inputCls + ' mt-1'"><option v-for="(c, i) in cols" :key="i" :value="i">{{ c }}</option></select>
          </label>
        </template>
      </div>
      <div class="overflow-x-auto rounded-lg border border-line">
        <table class="w-full text-xs">
          <thead v-if="map.hasHeader"><tr class="bg-surface-2 text-left"><th v-for="(c, i) in header" :key="i" class="px-2.5 py-1.5 font-medium">{{ c }}</th></tr></thead>
          <tbody><tr v-for="(r, ri) in preview" :key="ri" class="border-t border-line/60"><td v-for="(c, ci) in r" :key="ci" class="px-2.5 py-1.5 whitespace-nowrap">{{ c }}</td></tr></tbody>
        </table>
      </div>
      <p class="text-sm" :class="parsed.lines.length ? 'text-muted' : 'text-bad'">{{ parsed.lines.length }} rows read{{ parsed.skipped ? `, ${parsed.skipped} skipped` : "" }}.</p>
      <label v-if="!usedPreset" class="text-[13px] text-muted">Remember this layout as (optional)
        <input v-model="presetName" :class="inputCls + ' mt-1'" placeholder="e.g. DBS/POSB, OCBC or UOB" maxlength="30" />
      </label>
      <div class="flex gap-3">
        <Button variant="secondary" class="flex-1" @click="step = 'upload'">Back</Button>
        <Button class="flex-1" :disabled="!parsed.lines.length" @click="next">Check my contributions</Button>
      </div>
    </div>

    <div v-else class="flex flex-col gap-6">
      <section>
        <h3 class="mb-2 flex items-center gap-2 font-semibold"><Check :size="16" class="text-ok" /> Found on your statement ({{ result.matched.length }})</h3>
        <ul v-if="result.matched.length" class="divide-y divide-line rounded-lg border border-line text-sm">
          <li v-for="m in result.matched" :key="m.txId" class="flex items-center justify-between px-3 py-2">
            <span>{{ potName(txOf(m.txId).pot_id) }} · {{ fmtDay(txOf(m.txId).occurred_on) }}<span v-if="m.offsetDays" class="text-muted"> (bank date {{ m.offsetDays }} day{{ m.offsetDays === 1 ? "" : "s" }} apart)</span></span>
            <span class="tabular font-medium">{{ fmt(txOf(m.txId).amount) }}</span>
          </li>
        </ul>
        <p v-else class="text-sm text-muted">Nothing matched. Check the column layout and the date order.</p>
      </section>

      <section v-if="result.notFound.length">
        <h3 class="mb-2 flex items-center gap-2 font-semibold"><TriangleAlert :size="16" class="text-warn" /> Logged but not found ({{ result.notFound.length }})</h3>
        <ul class="divide-y divide-line rounded-lg border border-line text-sm">
          <li v-for="t in result.notFound" :key="t.id" class="flex items-center justify-between px-3 py-2">
            <span>{{ potName(t.pot_id) }} · {{ fmtDay(t.occurred_on) }}</span><span class="tabular font-medium">{{ fmt(t.amount) }}</span>
          </li>
        </ul>
        <p class="mt-2 text-[13px] text-muted">These have no debit of the same amount within 3 days. Check the amount and date you logged, or whether the transfer came from another account.</p>
      </section>

      <section v-if="result.suggestions.length">
        <h3 class="mb-2 font-semibold">Did you mean to log this? ({{ result.suggestions.length }})</h3>
        <ul class="divide-y divide-line rounded-lg border border-line text-sm">
          <li v-for="l in result.suggestions" :key="l.index" class="flex flex-col gap-2 px-3 py-2.5">
            <div class="flex items-center justify-between"><span class="truncate">{{ fmtDay(l.date) }} · {{ l.description }}</span><span class="tabular font-medium">{{ fmt(-l.amount) }}</span></div>
            <div class="flex gap-2">
              <select v-model="pick[l.index]" :class="inputCls + ' h-8 text-xs'"><option value="" disabled>Choose a pot</option><option v-for="p in activePots" :key="p.id" :value="p.id">{{ p.name }}</option></select>
              <Button size="sm" variant="secondary" :disabled="!pick[l.index]" @click="logIt(l, pick[l.index])">Log it</Button>
            </div>
          </li>
        </ul>
        <p class="mt-2 text-[13px] text-muted">Outgoing transfers to the same payee as your matched savings.</p>
      </section>

      <div class="flex gap-3">
        <Button variant="secondary" class="flex-1" @click="step = 'map'">Back</Button>
        <Button class="flex-1" :disabled="!toVerify.length" :loading="busy" @click="verify">Mark {{ toVerify.length }} as verified</Button>
      </div>
    </div>
  </Drawer>
</template>
