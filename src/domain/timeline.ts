/**
 * Crunch-month detector. Pools what the couple has agreed to save each month against what falls due,
 * month by month, so overlapping deadlines (lease signing and a wedding deposit, say) show up before
 * they arrive.
 *
 * Model (kept deliberately simple, and pooled across pots as one household cash view):
 *  - Supply: each active pot's agreed monthly split, counted from the current month through the month of
 *    the pot's target date. Money already in a pot is not added again, because it has already been
 *    allocated to that pot's stages (see `stageProgress`).
 *  - Demand: what is still unfunded on each stage, due in the month of its due date (or the pot's target
 *    date when a stage has none). Past-due amounts count in the current month. Budget-style pots (trip,
 *    wedding, custom) are due as one amount on their target date.
 *  - A month is a crunch when cumulative demand exceeds cumulative supply.
 */
import type { CoupleState, Pot } from "./types";
import type { Cents } from "./money";
import { fmt } from "./money";
import { contributionMonths, fmtMonth, todayISO } from "./dates";
import { activeSplit, potBalance, potTarget, stageProgress } from "./selectors";

export interface DueItem {
  potId: string;
  potName: string;
  label: string;
  amount: Cents;
}

export interface TimelineMonth {
  /** First day of the month, ISO. */
  month: string;
  /** Agreed monthly savings that arrive this month. */
  savings: Cents;
  due: DueItem[];
  dueTotal: Cents;
  cumSavings: Cents;
  cumDue: Cents;
  /** Cash left once earlier months' payments were made (never below zero). */
  cashBefore: Cents;
  shortfall: Cents;
  crunch: boolean;
}

export interface Crunch {
  month: TimelineMonth;
  message: string;
  /** Extra monthly saving that would clear this crunch, spread from now until the month. */
  extraPerMonth: Cents;
  /** The pot to open to change its dates: the one with the largest item due that month. */
  potId: string;
}

const monthStart = (iso: string) => iso.slice(0, 7) + "-01";
const addMonthStart = (iso: string, n: number) => {
  const [y, m] = iso.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
};

function demandOf(s: CoupleState, pot: Pot, firstMonth: string): { month: string; item: DueItem }[] {
  const out: { month: string; item: DueItem }[] = [];
  const place = (due: string | null, label: string, amount: Cents) => {
    if (amount <= 0) return;
    const m = monthStart(due ?? pot.target_date);
    out.push({ month: m < firstMonth ? firstMonth : m, item: { potId: pot.id, potName: pot.name, label, amount } });
  };
  if (pot.sequential) {
    for (const x of stageProgress(s, pot)) place(x.stage.due_date, x.stage.name, x.remaining);
  } else {
    const target = potTarget(s, pot.id);
    place(pot.target_date, pot.name, Math.max(target - Math.max(potBalance(s, pot.id), 0), 0));
  }
  return out;
}

export function cashflowTimeline(s: CoupleState, horizonMonths = 36, today = todayISO()): TimelineMonth[] {
  const first = monthStart(today);
  const active = s.pots.filter((p) => p.status === "active");
  const demand = active.flatMap((p) => demandOf(s, p, first));

  const months: TimelineMonth[] = [];
  let cumSavings = 0;
  let cumDue = 0;
  for (let i = 0; i < horizonMonths; i++) {
    const month = addMonthStart(first, i);
    const savings = active.reduce((sum, p) => (month <= monthStart(p.target_date) ? sum + (activeSplit(s, p.id)?.monthly_total ?? 0) : sum), 0);
    const due = demand.filter((d) => d.month === month).map((d) => d.item);
    const dueTotal = due.reduce((sum, d) => sum + d.amount, 0);
    const cashBefore = Math.max(cumSavings - cumDue, 0);
    cumSavings += savings;
    cumDue += dueTotal;
    const shortfall = Math.max(cumDue - cumSavings, 0);
    months.push({ month, savings, due, dueTotal, cumSavings, cumDue, cashBefore, shortfall, crunch: shortfall > 0 });
  }
  return months;
}

/** Crunch months with a plain-language message and the numbers behind it. */
export function findCrunches(s: CoupleState, horizonMonths = 36, today = todayISO()): Crunch[] {
  return cashflowTimeline(s, horizonMonths, today)
    .filter((m) => m.crunch && m.dueTotal > 0)
    .map((m) => {
      const parts = m.due.map((d) => `${d.label.toLowerCase()} (${fmt(d.amount)})`).join(" + ");
      const available = m.cashBefore + m.savings;
      const message = `${fmtMonth(m.month)}: ${parts} = ${fmt(m.dueTotal)} due; you'll have ${fmt(available)}. Short by ${fmt(m.shortfall)}.`;
      const months = contributionMonths(today, m.month);
      const biggest = [...m.due].sort((a, b) => b.amount - a.amount)[0];
      return { month: m, message, extraPerMonth: Math.ceil(m.shortfall / months / 100) * 100, potId: biggest.potId };
    });
}

/** The first crunch inside the next `months` months, if any. */
export const nextCrunch = (s: CoupleState, months = 12, today = todayISO()) => findCrunches(s, months, today)[0];
