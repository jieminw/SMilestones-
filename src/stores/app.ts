/**
 * App store. Screens call `app.dispatch(command)` and never care where data lives:
 *  - demo  → the engine runs in the browser, state persists in localStorage
 *  - cloud → a Vercel function runs the same engine against Supabase Postgres
 */
import { computed, reactive, ref } from "vue";
import { applyMutations, run, DomainError, type Command } from "@/domain/engine";
import type { CoupleState, Profile } from "@/domain/types";
import { createDemoState, DEMO_DEPHANY } from "@/data/seed";
import { fetchSnapshot, runCommandAction } from "@/lib/api";
import { contributorPots, isPartner, profileOf } from "@/domain/selectors";
import { MODE_KEY, cloudEnabled } from "@/lib/config";
import { supabase } from "@/lib/supabase";

export type Mode = "demo" | "cloud";
export type DispatchResult = { ok: true; createdId?: string } | { ok: false; error: string };
export interface Toast {
  id: number;
  text: string;
  tone: "ok" | "bad";
  action?: { label: string; run: () => void };
}

// Bump when the sample data changes shape, so an old saved demo isn't loaded with missing tables.
const DEMO_KEY = "smilestones-demo-v3";

const mode = ref<Mode>("demo");
const state = ref<CoupleState | null>(null);
const cloudMe = ref<Profile | null>(null);
const cloudRole = ref<"partner" | "contributor">("partner");
const viewAs = ref<string>(DEMO_DEPHANY);
const ready = ref(false);
const toasts = ref<Toast[]>([]);
let booted = false;
let poll: ReturnType<typeof setInterval> | null = null;

const readMode = (): Mode => {
  try {
    if (localStorage.getItem(MODE_KEY) === "demo") return "demo";
  } catch {
    /* storage blocked → fall through */
  }
  return cloudEnabled ? "cloud" : "demo";
};

const persist = (s: CoupleState, who: string) => {
  try {
    localStorage.setItem(DEMO_KEY, JSON.stringify({ state: s, viewAs: who }));
  } catch {
    /* storage full or blocked: the demo still works for this session */
  }
};

function toast(text: string, tone: Toast["tone"] = "ok", action?: Toast["action"]) {
  const id = Date.now() + Math.random();
  toasts.value = [...toasts.value.slice(-2), { id, text, tone, action }];
  setTimeout(() => dismissToast(id), action ? 7000 : 3800);
}
const dismissToast = (id: number) => (toasts.value = toasts.value.filter((t) => t.id !== id));

async function refresh() {
  if (mode.value !== "cloud") return;
  const snap = await fetchSnapshot();
  if (snap) {
    state.value = snap.state;
    cloudMe.value = snap.me;
    cloudRole.value = snap.role ?? "partner";
  }
}

function startPolling() {
  stopPolling();
  const tick = () => document.visibilityState === "visible" && void refresh();
  poll = setInterval(tick, 15_000);
  window.addEventListener("focus", tick);
  stopFocus = () => window.removeEventListener("focus", tick);
}
let stopFocus: (() => void) | null = null;
function stopPolling() {
  if (poll) clearInterval(poll);
  stopFocus?.();
  poll = null;
  stopFocus = null;
}

/** Picks demo or cloud and loads state once. Returns false when cloud mode has no session. */
async function boot(): Promise<boolean> {
  if (booted) return mode.value === "demo" || !!cloudMe.value;
  mode.value = readMode();
  if (mode.value === "demo") {
    let loaded: { state: CoupleState; viewAs: string } | null = null;
    try {
      const raw = localStorage.getItem(DEMO_KEY);
      if (raw) loaded = JSON.parse(raw);
    } catch {
      /* corrupted or blocked storage → fresh demo */
    }
    state.value = loaded?.state ?? createDemoState();
    viewAs.value = loaded?.viewAs ?? DEMO_DEPHANY;
    ready.value = true;
    booted = true;
    return true;
  }
  const { data } = await supabase().auth.getSession();
  const snap = data.session ? await fetchSnapshot() : null;
  if (!snap) return false; // not booted: the next attempt (after sign-in) tries again
  state.value = snap.state;
  cloudMe.value = snap.me;
  cloudRole.value = snap.role ?? "partner";
  ready.value = true;
  booted = true;
  startPolling();
  return true;
}

function reset() {
  stopPolling();
  booted = false;
  ready.value = false;
  state.value = null;
  cloudMe.value = null;
  viewAs.value = DEMO_DEPHANY;
}

const meId = computed(() => (mode.value === "demo" ? viewAs.value : (cloudMe.value?.id ?? "")));
const me = computed(() => (mode.value === "demo" ? ((state.value && profileOf(state.value, viewAs.value)) ?? null) : cloudMe.value));
/** A partner has the whole workspace; a contributor sees only the pot they were invited to. */
const role = computed<"partner" | "contributor">(() => {
  if (mode.value !== "demo") return cloudRole.value;
  const s = state.value;
  return s && !isPartner(s, viewAs.value) && contributorPots(s, viewAs.value).length ? "contributor" : "partner";
});
/** Who the demo can be viewed as: both partners, plus any contributor. */
const demoPeople = computed(() => {
  const s = state.value;
  if (!s) return [];
  const ids = [...s.profiles.map((p) => p.id), ...new Set((s.potMembers ?? []).filter((x) => x.role === "contributor").map((x) => x.user_id))];
  return ids.map((id) => profileOf(s, id)!).filter(Boolean);
});

async function exec(cmd: Command): Promise<DispatchResult> {
  if (mode.value === "demo") {
    const s = state.value;
    if (!s) return { ok: false, error: "Still loading…" };
    try {
      const r = run(s, cmd, { userId: viewAs.value, now: new Date(), newId: () => crypto.randomUUID() });
      const next = applyMutations(s, r.mutations);
      next.couple = { ...next.couple, version: next.couple.version + 1 };
      state.value = next;
      persist(next, viewAs.value);
      return { ok: true, createdId: r.createdId };
    } catch (e) {
      if (e instanceof DomainError) return { ok: false, error: e.message };
      console.error(e);
      return { ok: false, error: "Something went wrong." };
    }
  }
  const r = await runCommandAction(cmd);
  if (r.snapshot) {
    state.value = r.snapshot.state;
    cloudMe.value = r.snapshot.me;
    cloudRole.value = r.snapshot.role ?? "partner";
  }
  return r.ok ? { ok: true, createdId: r.createdId } : { ok: false, error: r.error };
}

async function dispatch(cmd: Command, opts?: { success?: string; undo?: { label?: string; cmd: Command } }): Promise<DispatchResult> {
  const r = await exec(cmd);
  if (!r.ok) toast(r.error, "bad");
  else if (opts?.success) {
    const undo = opts.undo;
    toast(opts.success, "ok", undo ? { label: undo.label ?? "Undo", run: () => void exec(undo.cmd).then((u) => !u.ok && toast(u.error, "bad")) } : undefined);
  }
  return r;
}

function switchUser(id: string) {
  viewAs.value = id;
  if (state.value) persist(state.value, id);
}

function resetDemo() {
  const s = createDemoState();
  state.value = s;
  viewAs.value = DEMO_DEPHANY;
  persist(s, DEMO_DEPHANY);
  toast("Demo reset to a fresh start.");
}

function enterDemo() {
  try {
    localStorage.setItem(MODE_KEY, "demo");
  } catch {
    /* ignore */
  }
  reset();
}

function leaveDemo() {
  try {
    localStorage.removeItem(MODE_KEY);
  } catch {
    /* ignore */
  }
  reset();
}

async function signOut() {
  if (cloudEnabled) await supabase().auth.signOut();
  leaveDemo();
}

const app = reactive({
  mode, state, me, meId, role, demoPeople, ready, toasts,
  boot, refresh, dispatch, switchUser, resetDemo, toast, dismissToast, enterDemo, leaveDemo, signOut, reset,
});

export const useApp = () => app;

/** For screens that need a paired couple (the shell only renders them when one exists). */
export const useCouple = () => ({ app, s: computed(() => app.state as CoupleState) });
