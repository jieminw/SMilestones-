/**
 * The command engine. Every write in the app goes through `run(state, command, ctx)`:
 *   1. validate against the current state (throws DomainError with a user-facing message)
 *   2. return a list of Mutations (inserts / updates / deletes)
 * The same function runs in the browser (demo mode) and on the server (Supabase mode),
 * and the stores apply the mutations atomically. Business rules live in exactly one place.
 */
import type {
  ApprovalRequest, CareAction, PetCare, CoupleState, Mutation, Notification, Pot, PotKind, SplitMode,
  SplitProposal, Stage, TableName, Transaction, BtoMeta, WeddingMeta, ApplicationResult, BtoApplication, Cover, MoneyDate,
} from "./types";
import { COVER_MONTHS_MAX, COVER_MONTHS_MIN, creditedIn, monthKey, shortfallIn } from "./covers";
import type { FlatTypeId } from "./bto-data";
import { STATE_KEY } from "./types";
import type { Cents } from "./money";
import { fmt } from "./money";
import {
  availableBalance, contributorPots, effectiveStatus, firstName, partnerOf, potBalance, potBudget, potTarget, profileOf,
} from "./selectors";
import { angbaoSummary, validateWedding } from "./wedding";
import { CARE, OUTFITS, petStatus } from "./pet";

export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DomainError";
  }
}

export interface Ctx {
  userId: string;
  now: Date;
  newId: () => string;
}

export interface StageInput {
  name: string;
  description: string;
  target: Cents;
  due_date: string | null;
}

export type Command =
  | { type: "createPot"; kind: PotKind; name: string; subtitle: string; target_date: string; stages: StageInput[]; bto: BtoMeta | null; wedding?: WeddingMeta | null }
  | { type: "updatePot"; potId: string; name: string; subtitle: string; target_date: string; stages: StageInput[]; bto: BtoMeta | null; wedding?: WeddingMeta | null }
  | { type: "setWedding"; potId: string; wedding: WeddingMeta }
  | { type: "logApplication"; potId: string; exercise: string; project_id: string | null; flat_type: FlatTypeId; applied_on: string; result: ApplicationResult; queue_number: number | null }
  | { type: "updateApplication"; applicationId: string; result: ApplicationResult; queue_number: number | null }
  | { type: "markVerified"; txIds: string[] }
  | { type: "completeMoneyDate" }
  | { type: "proposeCover"; potId: string; month: string; amount: Cents; months: number }
  | { type: "respondCover"; coverId: string; accept: boolean; note?: string }
  | { type: "cancelCover"; coverId: string }
  | { type: "retargetBto"; potId: string; subtitle: string; target_date: string; stages: StageInput[]; bto: BtoMeta }
  | { type: "deletePot"; potId: string }
  | { type: "proposeSplit"; potId: string; mode: SplitMode; shares: Record<string, Cents> }
  | { type: "respondSplit"; proposalId: string; accept: boolean; note?: string }
  | { type: "cancelSplit"; proposalId: string }
  | { type: "logContribution"; potId: string; amount: Cents; occurred_on: string; note: string }
  | { type: "editContribution"; txId: string; amount: Cents; occurred_on: string; note: string }
  | { type: "deleteContribution"; txId: string }
  | { type: "restoreContribution"; txId: string }
  | { type: "requestWithdrawal"; potId: string; amount: Cents; reason: string }
  | { type: "requestTransfer"; fromPotId: string; toPotId: string; amount: Cents; reason: string }
  | { type: "respondRequest"; requestId: string; approve: boolean; note?: string }
  | { type: "cancelRequest"; requestId: string }
  | { type: "changeDates"; potId: string; target_date: string; stageDates: Record<string, string | null> }
  | { type: "petCare"; action: CareAction }
  | { type: "renamePet"; name: string }
  | { type: "renameCouple"; name: string }
  | { type: "markRead"; ids: string[] };

export interface RunResult {
  mutations: Mutation[];
  /** Id of the main row created, if any (e.g. the new pot). */
  createdId?: string;
}

export const REQUEST_TTL_HOURS = 24;
const MAX_AMOUNT = 10_000_000_00; // $10M sanity cap

// ---------------------------------------------------------------------------

export function run(s: CoupleState, cmd: Command, ctx: Ctx): RunResult {
  const me = ctx.userId;
  const partnerRole = s.profiles.some((p) => p.id === me);
  // A contributor is invited to one pot and may only give to it (see the guard before the switch below).
  const contributing = !partnerRole && (s.potMembers ?? []).some((x) => x.user_id === me && x.role === "contributor");
  if (!partnerRole && !contributing) throw new DomainError("You're not part of this couple.");
  const nowIso = ctx.now.toISOString();
  const m: Mutation[] = [];
  const partner = partnerOf(s, me);
  const myName = firstName(profileOf(s, me));

  const insert = (table: TableName, row: { id: string }) => m.push({ table, op: "insert", row });
  const update = (table: TableName, id: string, patch: Record<string, unknown>) => m.push({ table, op: "update", id, patch });
  const notify = (text: string, href: string) => {
    if (!partner) return;
    const n: Notification = { id: ctx.newId(), couple_id: s.couple.id, user_id: partner.id, text, href, read: false, created_at: nowIso };
    insert("notifications", n);
  };

  // Lazily expire stale approval requests on every write.
  for (const r of s.requests) {
    if (r.status === "pending" && effectiveStatus(r, ctx.now) === "expired") update("requests", r.id, { status: "expired" });
  }

  const pot = (id: string): Pot => {
    const p = s.pots.find((x) => x.id === id);
    if (!p) throw new DomainError("That pot no longer exists.");
    return p;
  };
  const requirePartner = () => {
    if (!partner) throw new DomainError("Pair with your partner first — shared pots need both of you.");
    return partner;
  };
  const amountOk = (a: Cents) => {
    if (!Number.isInteger(a) || a <= 0) throw new DomainError("Enter an amount greater than $0.");
    if (a > MAX_AMOUNT) throw new DomainError("That amount is too large.");
  };
  /** Contributions can't push a pot past its target (design rule from the Figma). */
  const capacityCheck = (p: Pot, extra: Cents, verb = "That") => {
    const room = potTarget(s, p.id) - potBalance(s, p.id);
    if (extra > room)
      throw new DomainError(
        room <= 0 ? `${p.name} is already fully funded.` : `${verb} is ${fmt(extra - room)} more than ${p.name} still needs (${fmt(room)}).`,
      );
  };
  const writeStages = (potId: string, stages: StageInput[]) => {
    if (!stages.length) throw new DomainError("Add at least one budget item.");
    stages.forEach((st, i) => {
      if (!st.name.trim()) throw new DomainError("Every budget item needs a name.");
      if (!Number.isInteger(st.target) || st.target < 0) throw new DomainError(`Check the amount for "${st.name}".`);
      const row: Stage = { id: ctx.newId(), pot_id: potId, idx: i, name: st.name.trim(), description: st.description, target: st.target, due_date: st.due_date };
      insert("stages", row);
    });
    if (stages.reduce((a, b) => a + b.target, 0) <= 0) throw new DomainError("The pot needs a target above $0.");
  };
  const tx = (t: Omit<Transaction, "id" | "couple_id" | "created_at" | "edited_at" | "voided_at">): Transaction => ({
    id: ctx.newId(), couple_id: s.couple.id, created_at: nowIso, edited_at: null, voided_at: null, ...t,
  });
  const maybeComplete = (p: Pot, newBalance: Cents) => {
    const target = potTarget(s, p.id);
    if (p.status === "active" && newBalance >= target) {
      update("pots", p.id, { status: "completed" });
      notify(`🎉 ${p.name} is fully funded!`, `/pots/${p.id}`);
    } else if (p.status === "completed" && newBalance < target) {
      update("pots", p.id, { status: "active" });
    }
  };

  // ---------------------------------------------------------------- contributors
  // Role check, in one place: a contributor can log a gift to a pot they were invited to and mark their own
  // notifications read. Everything else (splits, withdrawals, approvals, dates, other pots) is for the couple.
  if (contributing) {
    if (cmd.type === "markRead") {
      for (const id of cmd.ids) {
        const n = s.notifications.find((x) => x.id === id && x.user_id === me);
        if (n) update("notifications", n.id, { read: true });
      }
      return { mutations: m };
    }
    if (cmd.type !== "logContribution") throw new DomainError("Only the couple can do that. As a contributor you can add gifts to the pot you were invited to.");
    const p = pot(cmd.potId);
    if (!contributorPots(s, me).includes(p.id)) throw new DomainError("You can only give to the pot you were invited to.");
    if (p.status !== "active") throw new DomainError("This pot isn't open for contributions yet.");
    amountOk(cmd.amount);
    if (!cmd.occurred_on || cmd.occurred_on > nowIso.slice(0, 10)) throw new DomainError("Pick today or an earlier date.");
    capacityCheck(p, cmd.amount);
    const label = firstName(profileOf(s, me));
    const t = tx({ pot_id: p.id, kind: "contribution", amount: cmd.amount, user_id: me, note: (cmd.note || `Gift from ${label}`).slice(0, 80), occurred_on: cmd.occurred_on, request_id: null });
    insert("transactions", t);
    maybeComplete(p, potBalance(s, p.id) + cmd.amount);
    // Tell both partners, not just "the other one".
    for (const pr of s.profiles) {
      const n: Notification = { id: ctx.newId(), couple_id: s.couple.id, user_id: pr.id, text: `${label} gave ${fmt(cmd.amount)} to ${p.name}.`, href: `/pots/${p.id}`, read: false, created_at: nowIso };
      insert("notifications", n);
    }
    return { mutations: m, createdId: t.id };
  }

  switch (cmd.type) {
    // ----------------------------------------------------------- pots
    case "createPot": {
      if (!cmd.name.trim()) throw new DomainError("Give your pot a name.");
      if (!cmd.target_date) throw new DomainError("Pick a target date.");
      const row: Pot = {
        id: ctx.newId(), couple_id: s.couple.id, kind: cmd.kind, name: cmd.name.trim(), subtitle: cmd.subtitle,
        status: "draft", sequential: cmd.kind === "bto", target_date: cmd.target_date, created_by: me, created_at: nowIso, bto: cmd.bto, wedding: null,
      };
      if (cmd.wedding) {
        if (cmd.kind !== "wedding") throw new DomainError("Guests and ang bao only apply to wedding pots.");
        const bad = validateWedding(cmd.wedding);
        if (bad) throw new DomainError(bad);
        row.wedding = cmd.wedding;
      }
      insert("pots", row);
      writeStages(row.id, cmd.stages);
      return { mutations: m, createdId: row.id };
    }
    case "updatePot": {
      const p = pot(cmd.potId);
      if (p.status === "active" || p.status === "completed")
        throw new DomainError("This pot is live. Change dates from the tracker, or agree a new split.");
      for (const st of s.stages.filter((x) => x.pot_id === p.id)) m.push({ table: "stages", op: "delete", id: st.id });
      writeStages(p.id, cmd.stages);
      const patch: Record<string, unknown> = { name: cmd.name.trim() || p.name, subtitle: cmd.subtitle, target_date: cmd.target_date, bto: cmd.bto, status: "draft" };
      if (cmd.wedding !== undefined) {
        if (cmd.wedding && p.kind !== "wedding") throw new DomainError("Guests and ang bao only apply to wedding pots.");
        const bad = cmd.wedding ? validateWedding(cmd.wedding) : null;
        if (bad) throw new DomainError(bad);
        patch.wedding = cmd.wedding;
      }
      update("pots", p.id, patch);
      for (const pr of s.proposals.filter((x) => x.pot_id === p.id && x.status === "pending")) update("proposals", pr.id, { status: "superseded" });
      return { mutations: m };
    }
    case "setWedding": {
      const p = pot(cmd.potId);
      if (p.kind !== "wedding") throw new DomainError("Guests and ang bao only apply to wedding pots.");
      const bad = validateWedding(cmd.wedding);
      if (bad) throw new DomainError(bad);
      // A smaller target can't leave the pot over-funded.
      const nextBudget = potBudget(s, p.id);
      const nextOffset = Math.min(angbaoSummary(cmd.wedding).offset, nextBudget);
      const balance = potBalance(s, p.id);
      if (p.status !== "draft" && balance > nextBudget - nextOffset)
        throw new DomainError(`You've already saved ${fmt(balance)}, more than this plan needs (${fmt(nextBudget - nextOffset)}). Lower the ang bao estimate or move money out first.`);
      update("pots", p.id, { wedding: cmd.wedding });
      if (partner) notify(`${myName} updated the guest and ang bao plan for “${p.name}”.`, `/pots/${p.id}`);
      return { mutations: m };
    }
    // ----------------------------------------------------------- BTO applications
    case "logApplication":
    case "updateApplication": {
      const results: ApplicationResult[] = ["pending", "successful", "unsuccessful", "declined"];
      if (!results.includes(cmd.result)) throw new DomainError("Pick a result for the application.");
      if (cmd.queue_number !== null && (!Number.isInteger(cmd.queue_number) || cmd.queue_number <= 0)) throw new DomainError("A queue number is a whole number above 0.");
      if (cmd.type === "logApplication") {
        const p = pot(cmd.potId);
        if (p.kind !== "bto") throw new DomainError("Applications belong to a BTO pot.");
        if (!cmd.exercise.trim() || cmd.exercise.length > 30) throw new DomainError("Name the exercise, for example Jun 2026.");
        if (!cmd.applied_on) throw new DomainError("Pick the date you applied.");
        const row: BtoApplication = {
          id: ctx.newId(), couple_id: s.couple.id, pot_id: p.id, exercise: cmd.exercise.trim(), project_id: cmd.project_id, flat_type: cmd.flat_type,
          applied_on: cmd.applied_on, result: cmd.result, queue_number: cmd.queue_number, created_at: nowIso,
        };
        insert("bto_applications", row);
        return { mutations: m, createdId: row.id };
      }
      const a = s.btoApplications.find((x) => x.id === cmd.applicationId);
      if (!a) throw new DomainError("That application no longer exists.");
      update("bto_applications", a.id, { result: cmd.result, queue_number: cmd.queue_number });
      return { mutations: m };
    }
    // ----------------------------------------------------------- monthly money date
    case "completeMoneyDate": {
      const other = requirePartner();
      const month = nowIso.slice(0, 7);
      const existing = s.moneyDates.find((x) => x.month.slice(0, 7) === month);
      if (existing?.completed_by.includes(me)) throw new DomainError("You've already done this month's money date.");
      if (existing) {
        update("money_dates", existing.id, { completed_by: [...existing.completed_by, me] });
        if (existing.completed_by.includes(other.id)) notify(`${myName} finished the money date. That's ${firstName(other)} and you, together. Fluffy is delighted.`, "/money-date");
      } else {
        const row: MoneyDate = { id: ctx.newId(), couple_id: s.couple.id, month: month + "-01", completed_by: [me], created_at: nowIso };
        insert("money_dates", row);
        notify(`${myName} did this month's money date. Your turn when you're ready.`, "/money-date");
      }
      return { mutations: m };
    }

    // ----------------------------------------------------------- bank statement check
    case "markVerified": {
      if (!cmd.txIds.length) throw new DomainError("Nothing to verify.");
      for (const id of cmd.txIds) {
        const t = s.transactions.find((x) => x.id === id);
        if (!t || t.voided_at) throw new DomainError("One of those entries no longer exists.");
        if (t.kind !== "contribution") throw new DomainError("Only contributions can be checked against a statement.");
        // A statement belongs to one person, so it can only confirm that person's own transfers.
        if (t.user_id !== me) throw new DomainError("You can only verify contributions you made.");
        update("transactions", t.id, { verified_at: nowIso });
      }
      return { mutations: m };
    }

    // ----------------------------------------------------------- cover me
    case "proposeCover": {
      const p = pot(cmd.potId);
      const other = requirePartner();
      if (p.status !== "active") throw new DomainError("Covering a share only works on a live pot.");
      amountOk(cmd.amount);
      if (!Number.isInteger(cmd.months) || cmd.months < COVER_MONTHS_MIN || cmd.months > COVER_MONTHS_MAX)
        throw new DomainError(`Spread the payback over ${COVER_MONTHS_MIN} to ${COVER_MONTHS_MAX} months.`);
      const key = monthKey(cmd.month);
      const thisMonth = monthKey(nowIso.slice(0, 10));
      if (key > thisMonth) throw new DomainError("You can only cover a month that has started.");
      const gap = shortfallIn(s, p.id, other.id, key);
      if (gap <= 0) throw new DomainError(`${firstName(other)} has already covered their share for that month.`);
      if (cmd.amount > gap) throw new DomainError(`${firstName(other)}'s share is only ${fmt(gap)} short for that month.`);
      if (s.covers.some((c) => c.status === "pending" && c.pot_id === p.id && c.for_user_id === other.id && monthKey(c.month) === key))
        throw new DomainError("There is already a cover waiting for an answer for that month.");
      capacityCheck(p, cmd.amount);
      const row: Cover = {
        id: ctx.newId(), couple_id: s.couple.id, pot_id: p.id, payer_id: me, for_user_id: other.id, month: key + "-01", amount: cmd.amount,
        months: cmd.months, status: "pending", response_note: null, responded_at: null, created_at: nowIso,
      };
      insert("covers", row);
      notify(`${myName} offered to cover ${fmt(cmd.amount)} of your share for ${p.name}. You'd pay it back over ${cmd.months} month${cmd.months === 1 ? "" : "s"}.`, "/inbox");
      return { mutations: m, createdId: row.id };
    }
    case "respondCover": {
      const c = s.covers.find((x) => x.id === cmd.coverId);
      if (!c || c.status !== "pending") throw new DomainError("That offer has already been answered.");
      if (c.for_user_id !== me) throw new DomainError("Only the partner being covered can answer this.");
      const p = pot(c.pot_id);
      if (!cmd.accept) {
        update("covers", c.id, { status: "declined", response_note: cmd.note?.trim() || null, responded_at: nowIso });
        notify(`${myName} declined the cover for ${p.name}.`, "/inbox");
        return { mutations: m };
      }
      capacityCheck(p, c.amount);
      update("covers", c.id, { status: "accepted", responded_at: nowIso });
      // The payer's money goes in now, counted towards the covered partner's share for that month.
      const t = tx({ pot_id: p.id, kind: "contribution", amount: c.amount, user_id: c.payer_id, note: `Covering ${firstName(profileOf(s, me))}'s share`, occurred_on: nowIso.slice(0, 10), request_id: null });
      insert("transactions", { ...t, covering: me } as Transaction);
      maybeComplete(p, potBalance(s, p.id) + c.amount);
      notify(`${myName} accepted your cover of ${fmt(c.amount)} for ${p.name}.`, `/pots/${p.id}`);
      return { mutations: m };
    }
    case "cancelCover": {
      const c = s.covers.find((x) => x.id === cmd.coverId);
      if (!c || c.status !== "pending") throw new DomainError("That offer has already been answered.");
      if (c.payer_id !== me) throw new DomainError("Only the partner who offered can withdraw it.");
      update("covers", c.id, { status: "cancelled", responded_at: nowIso });
      return { mutations: m };
    }
    case "retargetBto": {
      const p = pot(cmd.potId);
      if (p.kind !== "bto") throw new DomainError("Only a BTO pot can be retargeted.");
      if (s.requests.some((r) => (r.pot_id === p.id || r.to_pot_id === p.id) && effectiveStatus(r, ctx.now) === "pending"))
        throw new DomainError("Resolve the pending withdrawal or transfer on this pot before retargeting it.");
      if (!cmd.target_date) throw new DomainError("Pick the key collection date.");
      // Contributions stay exactly as they are: only the plan underneath them is replaced.
      for (const st of s.stages.filter((x) => x.pot_id === p.id)) m.push({ table: "stages", op: "delete", id: st.id });
      writeStages(p.id, cmd.stages);
      const target = cmd.stages.reduce((a, b) => a + b.target, 0);
      const balance = potBalance(s, p.id);
      const patch: Record<string, unknown> = { subtitle: cmd.subtitle, target_date: cmd.target_date, bto: cmd.bto };
      if (p.status === "completed" && balance < target) patch.status = "active";
      if (p.status === "active" && balance >= target) patch.status = "completed";
      update("pots", p.id, patch);
      notify(`${myName} moved “${p.name}” to ${cmd.bto.project_name}. Savings are unchanged.`, `/pots/${p.id}`);
      return { mutations: m };
    }
    case "deletePot": {
      const p = pot(cmd.potId);
      if (potBalance(s, p.id) !== 0) throw new DomainError("Withdraw or move the money out before deleting this pot.");
      if (s.requests.some((r) => (r.pot_id === p.id || r.to_pot_id === p.id) && effectiveStatus(r, ctx.now) === "pending"))
        throw new DomainError("Resolve the pending request on this pot first.");
      for (const t of s.transactions.filter((x) => x.pot_id === p.id)) m.push({ table: "transactions", op: "delete", id: t.id });
      for (const st of s.stages.filter((x) => x.pot_id === p.id)) m.push({ table: "stages", op: "delete", id: st.id });
      for (const pr of s.proposals.filter((x) => x.pot_id === p.id)) m.push({ table: "proposals", op: "delete", id: pr.id });
      for (const r of s.requests.filter((x) => x.pot_id === p.id || x.to_pot_id === p.id)) m.push({ table: "requests", op: "delete", id: r.id });
      for (const a of s.btoApplications.filter((x) => x.pot_id === p.id)) m.push({ table: "bto_applications", op: "delete", id: a.id });
      for (const c of s.covers.filter((x) => x.pot_id === p.id)) m.push({ table: "covers", op: "delete", id: c.id });
      m.push({ table: "pots", op: "delete", id: p.id });
      if (p.status !== "draft") notify(`${myName} deleted the empty pot “${p.name}”.`, "/wallet");
      return { mutations: m };
    }

    // ----------------------------------------------------------- split
    case "proposeSplit": {
      const p = pot(cmd.potId);
      const other = requirePartner();
      const ids = [me, other.id];
      for (const id of ids) {
        const v = cmd.shares[id];
        if (!Number.isInteger(v) || v < 0) throw new DomainError("Each share must be $0 or more.");
      }
      const total = ids.reduce((a, id) => a + cmd.shares[id], 0);
      if (total <= 0) throw new DomainError("The monthly total must be above $0.");
      for (const pr of s.proposals.filter((x) => x.pot_id === p.id && x.status === "pending")) update("proposals", pr.id, { status: "superseded" });
      const row: SplitProposal = {
        id: ctx.newId(), pot_id: p.id, couple_id: s.couple.id, proposed_by: me, mode: cmd.mode,
        shares: { [me]: cmd.shares[me], [other.id]: cmd.shares[other.id] }, monthly_total: total,
        status: "pending", response_note: null, responded_at: null, created_at: nowIso,
      };
      insert("proposals", row);
      if (p.status === "draft") update("pots", p.id, { status: "pending_split" });
      notify(`${myName} proposed ${fmt(cmd.shares[other.id])}/month from you for ${p.name}.`, `/inbox`);
      return { mutations: m, createdId: row.id };
    }
    case "respondSplit": {
      const pr = s.proposals.find((x) => x.id === cmd.proposalId);
      if (!pr || pr.status !== "pending") throw new DomainError("This proposal has already been answered.");
      if (pr.proposed_by === me) throw new DomainError("Your partner needs to answer this one.");
      const p = pot(pr.pot_id);
      update("proposals", pr.id, { status: cmd.accept ? "accepted" : "declined", response_note: cmd.note ?? null, responded_at: nowIso });
      if (cmd.accept) {
        for (const old of s.proposals.filter((x) => x.pot_id === p.id && x.status === "accepted")) update("proposals", old.id, { status: "superseded" });
        if (p.status === "pending_split" || p.status === "draft") update("pots", p.id, { status: "active" });
        notify(`${myName} accepted the split for ${p.name}. The pot is live!`, `/pots/${p.id}`);
      } else {
        if (p.status === "pending_split") update("pots", p.id, { status: "draft" });
        notify(`${myName} suggested a change to the ${p.name} split${cmd.note ? `: “${cmd.note}”` : "."}`, `/pots/${p.id}`);
      }
      return { mutations: m };
    }
    case "cancelSplit": {
      const pr = s.proposals.find((x) => x.id === cmd.proposalId);
      if (!pr || pr.status !== "pending") throw new DomainError("Nothing to cancel.");
      if (pr.proposed_by !== me) throw new DomainError("Only the person who proposed it can withdraw it.");
      update("proposals", pr.id, { status: "superseded" });
      const p = pot(pr.pot_id);
      if (p.status === "pending_split") update("pots", p.id, { status: "draft" });
      return { mutations: m };
    }

    // ----------------------------------------------------------- contributions
    case "logContribution": {
      const p = pot(cmd.potId);
      if (p.status !== "active") throw new DomainError("This pot isn't active yet — agree the split first.");
      amountOk(cmd.amount);
      capacityCheck(p, cmd.amount);
      const t = tx({ pot_id: p.id, kind: "contribution", amount: cmd.amount, user_id: me, note: cmd.note.trim(), occurred_on: cmd.occurred_on, request_id: null });
      insert("transactions", t);
      notify(`${myName} added ${fmt(cmd.amount)} to ${p.name}.`, `/pots/${p.id}`);
      maybeComplete(p, potBalance(s, p.id) + cmd.amount);
      return { mutations: m, createdId: t.id };
    }
    case "editContribution": {
      const t = s.transactions.find((x) => x.id === cmd.txId);
      if (!t || t.voided_at || t.kind !== "contribution") throw new DomainError("That contribution no longer exists.");
      if (t.user_id !== me) throw new DomainError("You can only edit your own contributions.");
      amountOk(cmd.amount);
      const p = pot(t.pot_id);
      const delta = cmd.amount - t.amount;
      if (delta > 0) capacityCheck(p, delta, "The new amount");
      if (delta < 0 && potBalance(s, p.id) + delta < 0) throw new DomainError("Some of this money has already been withdrawn, so it can't be reduced that far.");
      // Changing the amount or date means the bank statement no longer vouches for this entry.
      const changed = cmd.amount !== t.amount || cmd.occurred_on !== t.occurred_on;
      update("transactions", t.id, { amount: cmd.amount, occurred_on: cmd.occurred_on, note: cmd.note.trim(), edited_at: nowIso, ...(t.verified_at && changed ? { verified_at: null } : {}) });
      if (delta !== 0) notify(`${myName} changed a contribution to ${p.name}: ${fmt(t.amount)} → ${fmt(cmd.amount)}.`, `/pots/${p.id}`);
      maybeComplete(p, potBalance(s, p.id) + delta);
      return { mutations: m };
    }
    case "deleteContribution": {
      const t = s.transactions.find((x) => x.id === cmd.txId);
      if (!t || t.voided_at || t.kind !== "contribution") throw new DomainError("That contribution no longer exists.");
      if (t.user_id !== me) throw new DomainError("You can only delete your own contributions.");
      const p = pot(t.pot_id);
      if (potBalance(s, p.id) - t.amount < 0) throw new DomainError("This money has already been withdrawn, so the contribution can't be deleted.");
      update("transactions", t.id, { voided_at: nowIso });
      notify(`${myName} removed a ${fmt(t.amount)} contribution from ${p.name}.`, `/pots/${p.id}`);
      maybeComplete(p, potBalance(s, p.id) - t.amount);
      return { mutations: m };
    }
    case "restoreContribution": {
      const t = s.transactions.find((x) => x.id === cmd.txId);
      if (!t || !t.voided_at) throw new DomainError("Nothing to undo.");
      if (t.user_id !== me) throw new DomainError("You can only restore your own contributions.");
      const p = pot(t.pot_id);
      capacityCheck(p, t.amount, "Restoring it");
      update("transactions", t.id, { voided_at: null });
      maybeComplete(p, potBalance(s, p.id) + t.amount);
      return { mutations: m };
    }

    // ----------------------------------------------------------- money out (needs approval)
    case "requestWithdrawal":
    case "requestTransfer": {
      const other = requirePartner();
      const fromId = cmd.type === "requestWithdrawal" ? cmd.potId : cmd.fromPotId;
      const from = pot(fromId);
      amountOk(cmd.amount);
      const avail = availableBalance(s, from.id, ctx.now);
      if (cmd.amount > avail) throw new DomainError(`Only ${fmt(Math.max(avail, 0))} is available in ${from.name}.`);
      let to: Pot | null = null;
      if (cmd.type === "requestTransfer") {
        to = pot(cmd.toPotId);
        if (to.id === from.id) throw new DomainError("Pick a different pot.");
        if (to.status !== "active") throw new DomainError(`${to.name} isn't active yet.`);
        capacityCheck(to, cmd.amount, "That transfer");
      }
      const r: ApprovalRequest = {
        id: ctx.newId(), couple_id: s.couple.id, kind: cmd.type === "requestWithdrawal" ? "withdrawal" : "transfer",
        pot_id: from.id, to_pot_id: to?.id ?? null, amount: cmd.amount, reason: cmd.reason.trim(), requested_by: me,
        status: "pending", response_note: null, responded_at: null, created_at: nowIso,
        expires_at: new Date(ctx.now.getTime() + REQUEST_TTL_HOURS * 3600_000).toISOString(),
      };
      insert("requests", r);
      notify(
        to ? `${myName} wants to move ${fmt(cmd.amount)} from ${from.name} to ${to.name}.` : `${myName} wants to withdraw ${fmt(cmd.amount)} from ${from.name}.`,
        "/inbox",
      );
      void other;
      return { mutations: m, createdId: r.id };
    }
    case "respondRequest": {
      const r = s.requests.find((x) => x.id === cmd.requestId);
      if (!r) throw new DomainError("That request no longer exists.");
      const st = effectiveStatus(r, ctx.now);
      if (st === "expired") throw new DomainError("This request expired. Ask your partner to send it again.");
      if (st !== "pending") throw new DomainError("This request has already been answered.");
      if (r.requested_by === me) throw new DomainError("Your partner needs to approve this one.");
      const from = pot(r.pot_id);
      if (cmd.approve) {
        if (r.amount > potBalance(s, from.id)) throw new DomainError(`${from.name} no longer has ${fmt(r.amount)}.`);
        if (r.kind === "withdrawal") {
          insert("transactions", tx({ pot_id: from.id, kind: "withdrawal", amount: r.amount, user_id: r.requested_by, note: r.reason, occurred_on: nowIso.slice(0, 10), request_id: r.id }));
        } else {
          const to = pot(r.to_pot_id!);
          capacityCheck(to, r.amount, "That transfer");
          insert("transactions", tx({ pot_id: from.id, kind: "transfer_out", amount: r.amount, user_id: r.requested_by, note: `To ${to.name}`, occurred_on: nowIso.slice(0, 10), request_id: r.id }));
          insert("transactions", tx({ pot_id: to.id, kind: "transfer_in", amount: r.amount, user_id: r.requested_by, note: `From ${from.name}`, occurred_on: nowIso.slice(0, 10), request_id: r.id }));
          maybeComplete(to, potBalance(s, to.id) + r.amount);
        }
        maybeComplete(from, potBalance(s, from.id) - r.amount);
      }
      update("requests", r.id, { status: cmd.approve ? "approved" : "declined", response_note: cmd.note?.trim() || null, responded_at: nowIso });
      const what = r.kind === "withdrawal" ? `withdrawal of ${fmt(r.amount)}` : `transfer of ${fmt(r.amount)}`;
      notify(cmd.approve ? `${myName} approved your ${what}.` : `${myName} declined your ${what}${cmd.note ? `: “${cmd.note}”` : "."}`, `/pots/${from.id}`);
      return { mutations: m };
    }
    case "cancelRequest": {
      const r = s.requests.find((x) => x.id === cmd.requestId);
      if (!r || effectiveStatus(r, ctx.now) !== "pending") throw new DomainError("Nothing to cancel.");
      if (r.requested_by !== me) throw new DomainError("Only the person who asked can cancel.");
      update("requests", r.id, { status: "cancelled", responded_at: nowIso });
      return { mutations: m };
    }

    // ----------------------------------------------------------- timeline
    case "changeDates": {
      const p = pot(cmd.potId);
      if (!cmd.target_date) throw new DomainError("Pick a target date.");
      for (const [stageId, due] of Object.entries(cmd.stageDates)) {
        if (!s.stages.some((x) => x.id === stageId && x.pot_id === p.id)) throw new DomainError("Unknown stage.");
        update("stages", stageId, { due_date: due });
      }
      update("pots", p.id, { target_date: cmd.target_date });
      notify(`${myName} updated the timeline for ${p.name}.`, `/pots/${p.id}`);
      return { mutations: m };
    }

    // ----------------------------------------------------------- pet
    case "petCare": {
      const care = CARE[cmd.action];
      const pet = petStatus(s, ctx.now);
      if (pet.coins < care.cost) throw new DomainError(`You need ${care.cost} coins — earn them by adding to a pot.`);
      if (cmd.action === "rest") {
        const last = s.petCare.filter((c) => c.action === "rest").map((c) => c.created_at).sort().pop();
        if (last && ctx.now.getTime() - new Date(last).getTime() < 12 * 3600_000) throw new DomainError(`${pet.name} is still rested. Try again later.`);
      }
      if (cmd.action === "outfit" && pet.outfits >= OUTFITS.length) throw new DomainError("You've unlocked every outfit!");
      const row: PetCare = { id: ctx.newId(), couple_id: s.couple.id, user_id: me, action: cmd.action, coins: care.cost, created_at: nowIso };
      insert("pet_care", row);
      return { mutations: m };
    }
    case "renamePet": {
      const name = cmd.name.trim();
      if (!name || name.length > 20) throw new DomainError("Pick a name up to 20 characters.");
      update("couples", s.couple.id, { pet_name: name });
      return { mutations: m };
    }
    case "renameCouple": {
      const name = cmd.name.trim();
      if (!name || name.length > 40) throw new DomainError("Pick a name up to 40 characters.");
      update("couples", s.couple.id, { name });
      return { mutations: m };
    }
    case "markRead": {
      for (const id of cmd.ids) {
        const n = s.notifications.find((x) => x.id === id && x.user_id === me);
        if (n && !n.read) update("notifications", id, { read: true });
      }
      return { mutations: m };
    }
  }
}

/** Pure: apply mutations to a state snapshot (used by the demo store and for optimistic UI). */
export function applyMutations(s: CoupleState, mutations: Mutation[]): CoupleState {
  const next: CoupleState = { ...s, couple: { ...s.couple } };
  // Copy every list so the previous state is never mutated, including tables added later.
  for (const key of Object.values(STATE_KEY)) if (key !== "couple") (next as unknown as Record<string, unknown[]>)[key] = [...((s as unknown as Record<string, unknown[]>)[key] ?? [])];
  for (const mu of mutations) {
    const key = STATE_KEY[mu.table];
    if (key === "couple") {
      if (mu.op === "update") next.couple = { ...next.couple, ...mu.patch } as CoupleState["couple"];
      continue;
    }
    const list = next[key] as unknown as { id: string }[];
    if (mu.op === "insert") list.push(mu.row);
    else if (mu.op === "update") {
      const i = list.findIndex((r) => r.id === mu.id);
      if (i >= 0) list[i] = { ...list[i], ...mu.patch };
    } else {
      const i = list.findIndex((r) => r.id === mu.id);
      if (i >= 0) list.splice(i, 1);
    }
  }
  return next;
}
