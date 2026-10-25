/**
 * Derived values. Nothing here is stored: balances, progress, stage status and the
 * pet's XP are all recomputed from the transaction list, so an edit or delete
 * updates every view at once ("one ledger, every view in sync").
 */
import type { ApprovalRequest, CoupleState, Pot, Profile, RequestStatus, SplitProposal, Stage, Transaction } from "./types";
import type { Cents } from "./money";
import { contributionMonths, parseDate, todayISO } from "./dates";
import { angbaoSummary } from "./wedding";

export const liveTx = (s: CoupleState) => s.transactions.filter((t) => !t.voided_at);

export function signed(t: Transaction): Cents {
  return t.kind === "contribution" || t.kind === "transfer_in" ? t.amount : -t.amount;
}

export function potBalance(s: CoupleState, potId: string): Cents {
  return liveTx(s).filter((t) => t.pot_id === potId).reduce((sum, t) => sum + signed(t), 0);
}

export function effectiveStatus(r: ApprovalRequest, now: Date = new Date()): RequestStatus {
  if (r.status === "pending" && new Date(r.expires_at).getTime() <= now.getTime()) return "expired";
  return r.status;
}

export function pendingRequests(s: CoupleState, now = new Date()) {
  return s.requests.filter((r) => effectiveStatus(r, now) === "pending");
}

/** Money already promised to a pending request can't be requested twice. */
export function heldAmount(s: CoupleState, potId: string, now = new Date()): Cents {
  return pendingRequests(s, now).filter((r) => r.pot_id === potId).reduce((sum, r) => sum + r.amount, 0);
}

export const availableBalance = (s: CoupleState, potId: string, now = new Date()) =>
  potBalance(s, potId) - heldAmount(s, potId, now);

export const potStages = (s: CoupleState, potId: string) =>
  s.stages.filter((x) => x.pot_id === potId).sort((a, b) => a.idx - b.idx);

/** The pot's full budget before any ang bao offset: what must be paid, mostly before the wedding. */
export const potBudget = (s: CoupleState, potId: string): Cents =>
  potStages(s, potId).reduce((sum, x) => sum + x.target, 0);

/** Expected ang bao that lowers a wedding pot's savings target (0 for every other pot). */
export function potOffset(s: CoupleState, potId: string): Cents {
  const w = s.pots.find((p) => p.id === potId)?.wedding;
  return w ? Math.min(angbaoSummary(w).offset, potBudget(s, potId)) : 0;
}

/** What the couple actually save for: budget less expected ang bao. */
export const potTarget = (s: CoupleState, potId: string): Cents => potBudget(s, potId) - potOffset(s, potId);

export interface StageProgress {
  stage: Stage;
  saved: Cents;
  remaining: Cents;
  pct: number;
  status: "done" | "current" | "upcoming";
}

/** Sequential pots fill stage 1 first, then stage 2... (a waterfall). */
export function stageProgress(s: CoupleState, pot: Pot): StageProgress[] {
  const stages = potStages(s, pot.id);
  let left = Math.max(potBalance(s, pot.id), 0);
  let currentFound = false;
  return stages.map((stage) => {
    const saved = pot.sequential ? Math.min(left, stage.target) : 0;
    if (pot.sequential) left -= saved;
    // A $0 stage (e.g. fully covered by CPF) counts as done once everything before it is.
    const done = pot.sequential && !currentFound && saved >= stage.target;
    let status: StageProgress["status"] = "upcoming";
    if (done) status = "done";
    else if (!currentFound) {
      status = "current";
      currentFound = true;
    }
    return {
      stage,
      saved,
      remaining: stage.target - saved,
      pct: stage.target ? Math.round((saved / stage.target) * 100) : 100,
      status,
    };
  });
}

export function currentStage(s: CoupleState, pot: Pot): StageProgress | undefined {
  const sp = stageProgress(s, pot);
  return sp.find((x) => x.status === "current") ?? sp[sp.length - 1];
}

/**
 * Monthly saving needed to hit every deadline.
 * For each stage with a due date, (cumulative target − balance) / months left;
 * the binding constraint is the largest of these.
 * Example: $0 saved, $2,000 due in 2 months and $16,174 total due in 14 months
 *   → max(2000/2, 16174/14) = $1,155.29/month.
 */
export function requiredMonthly(s: CoupleState, pot: Pot, today = todayISO()): Cents {
  const offset = potOffset(s, pot.id);
  const items = pot.sequential
    ? potStages(s, pot.id).map((st) => ({ amount: st.target, due: st.due_date }))
    : offset > 0
      ? [{ amount: potTarget(s, pot.id), due: null }]
      : potStages(s, pot.id).map((st) => ({ amount: st.target, due: null }));
  return monthlyNeeded(
    items,
    pot.target_date,
    potBalance(s, pot.id),
    today,
  );
}

/** Pure version used before a pot exists (BTO Navigator, pot setup). */
export function monthlyNeeded(items: { amount: Cents; due: string | null }[], finalDate: string, saved: Cents, today = todayISO()): Cents {
  let cumulative = 0;
  const checkpoints: { cum: Cents; due: string }[] = [];
  for (const it of items) {
    cumulative += it.amount;
    if (it.due) checkpoints.push({ cum: cumulative, due: it.due });
  }
  checkpoints.push({ cum: cumulative, due: finalDate });
  let need = 0;
  for (const c of checkpoints) {
    const short = c.cum - saved;
    if (short <= 0) continue;
    const months = parseDate(c.due) < parseDate(today) ? 1 : contributionMonths(today, c.due);
    need = Math.max(need, Math.ceil(short / months));
  }
  // Round up to a whole dollar: nobody sets up a $1,569.09 standing order.
  return Math.ceil(need / 100) * 100;
}

export function contributionsBy(s: CoupleState, potId: string): Record<string, Cents> {
  const out: Record<string, Cents> = {};
  for (const t of liveTx(s)) {
    if (t.pot_id !== potId || t.kind !== "contribution") continue;
    out[t.user_id] = (out[t.user_id] ?? 0) + t.amount;
  }
  return out;
}

export const activeSplit = (s: CoupleState, potId: string): SplitProposal | undefined =>
  s.proposals.find((p) => p.pot_id === potId && p.status === "accepted");

export const pendingSplit = (s: CoupleState, potId: string): SplitProposal | undefined =>
  s.proposals.find((p) => p.pot_id === potId && p.status === "pending");

export const partnerOf = (s: CoupleState, me: string): Profile | undefined => s.profiles.find((p) => p.id !== me);
/** A partner, or a contributor shown by the name the couple gave them. Contributors carry no private details. */
export function profileOf(s: CoupleState, id: string): Profile | undefined {
  const partner = s.profiles.find((p) => p.id === id);
  if (partner) return partner;
  const m = (s.potMembers ?? []).find((x) => x.user_id === id);
  return m ? { id, couple_id: null, display_name: m.display_name, monthly_income: null, age: null, first_timer: null, cpf_oa: null, created_at: m.created_at } : undefined;
}

/** The pots a contributor may see and give to. */
export const contributorPots = (s: CoupleState, userId: string) =>
  (s.potMembers ?? []).filter((m) => m.user_id === userId && m.role === "contributor").map((m) => m.pot_id);
export const isPartner = (s: CoupleState, userId: string) => s.profiles.some((p) => p.id === userId);
export const firstName = (p?: Profile) => (p?.display_name ?? "Partner").split(" ")[0];
export const initial = (p?: Profile) => (p?.display_name ?? "?").trim().charAt(0).toUpperCase();

export function walletTotal(s: CoupleState): Cents {
  return s.pots.reduce((sum, p) => sum + potBalance(s, p.id), 0);
}

/** Everything that needs *this* user to act. */
export function inboxFor(s: CoupleState, me: string, now = new Date()) {
  const requests = pendingRequests(s, now).filter((r) => r.requested_by !== me);
  const proposals = s.proposals.filter((p) => p.status === "pending" && p.proposed_by !== me);
  const covers = (s.covers ?? []).filter((c) => c.status === "pending" && c.for_user_id === me);
  return { requests, proposals, covers, count: requests.length + proposals.length + covers.length };
}

export function potTx(s: CoupleState, potId: string) {
  return s.transactions
    .filter((t) => t.pot_id === potId && !t.voided_at)
    .sort((a, b) => (b.occurred_on + b.created_at).localeCompare(a.occurred_on + a.created_at));
}
