/**
 * The monthly money date: a short guided check-in the couple do once a calendar month, each marking it done.
 * Doing it together is the main way to grow the pet's streak and earns a bonus.
 */
import type { CoupleState, MoneyDate } from "./types";
import type { Cents } from "./money";
import { fmt } from "./money";
import { fmtMonth, todayISO } from "./dates";
import { partnerOf, requiredMonthly, activeSplit } from "./selectors";
import { creditedIn, expectedShare, monthKey, paybacks, whosAhead } from "./covers";
import { nextCrunch, type Crunch } from "./timeline";

export const MONEY_DATE_XP = 40;
export const MONEY_DATE_COINS = 20;

export const moneyDateOf = (s: CoupleState, month: string): MoneyDate | undefined => (s.moneyDates ?? []).find((m) => monthKey(m.month) === month);

export interface MoneyDateStatus {
  month: string;
  record?: MoneyDate;
  doneByMe: boolean;
  doneByPartner: boolean;
  /** Both partners marked it done. */
  complete: boolean;
}

export function moneyDateStatus(s: CoupleState, me: string, today = todayISO()): MoneyDateStatus {
  const month = monthKey(today);
  const record = moneyDateOf(s, month);
  const by = record?.completed_by ?? [];
  const partner = partnerOf(s, me);
  return { month, record, doneByMe: by.includes(me), doneByPartner: !!partner && by.includes(partner.id), complete: s.profiles.length > 0 && s.profiles.every((p) => by.includes(p.id)) };
}

/** Months in which both partners completed the money date. */
export const completedMonths = (s: CoupleState): string[] =>
  (s.moneyDates ?? []).filter((m) => s.profiles.length > 0 && s.profiles.every((p) => m.completed_by.includes(p.id))).map((m) => monthKey(m.month));

// ------------------------------------------------------------------ step 1: what we saved

export interface SavedRow {
  potId: string;
  potName: string;
  perPerson: { userId: string; done: Cents; expected: Cents }[];
}

export function savedThisMonth(s: CoupleState, month = monthKey(todayISO())): SavedRow[] {
  return s.pots
    .filter((p) => p.status === "active")
    .map((p) => ({
      potId: p.id,
      potName: p.name,
      perPerson: s.profiles.map((pr) => ({ userId: pr.id, done: creditedIn(s, p.id, pr.id, month), expected: expectedShare(s, p.id, pr.id, month) })),
    }));
}

// ------------------------------------------------------------------ step 3: one decision

export type Decision =
  | { kind: "crunch"; crunch: Crunch; title: string; detail: string }
  | { kind: "offtrack"; potId: string; potName: string; need: Cents; agreed: Cents; title: string; detail: string }
  | { kind: "payback"; potId: string; title: string; detail: string }
  | { kind: "none"; title: string; detail: string };

/**
 * The single most important thing to decide this month. Order: a crunch month in the next year, then a pot whose
 * agreed saving no longer meets its deadlines, then a cover payback still running.
 */
export function pickDecision(s: CoupleState, today = todayISO()): Decision {
  const crunch = nextCrunch(s, 12, today);
  if (crunch) return { kind: "crunch", crunch, title: `A crunch is coming in ${fmtMonth(crunch.month.month)}`, detail: `${crunch.message} Saving about ${fmt(crunch.extraPerMonth)} more a month would clear it.` };

  for (const p of s.pots.filter((x) => x.status === "active")) {
    const split = activeSplit(s, p.id);
    if (!split) continue;
    const need = requiredMonthly(s, p, today);
    if (need > split.monthly_total)
      return {
        kind: "offtrack", potId: p.id, potName: p.name, need, agreed: split.monthly_total,
        title: `${p.name} is off track`, detail: `Keeping every deadline needs ${fmt(need)} a month, and you have agreed ${fmt(split.monthly_total)}.`,
      };
  }

  const open = paybacks(s).filter((x) => x.outstanding > 0);
  if (open.length) {
    const lead = whosAhead(s);
    return { kind: "payback", potId: open[0].cover.pot_id, title: "A cover is still being paid back", detail: `${fmt(lead.amount)} is still to come back from earlier months. Check it is on schedule.` };
  }
  return { kind: "none", title: "Nothing needs deciding", detail: "Your savings are on track, nothing is due soon that you can't cover, and no payback is running." };
}

/** True while this month's money date still needs one or both partners. */
export const moneyDateReady = (s: CoupleState, me: string, today = todayISO()) => !moneyDateStatus(s, me, today).complete;
