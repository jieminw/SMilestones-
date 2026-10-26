/**
 * "Could we afford this, and when?" for a BTO flat.
 *
 * The cash needed comes from `buildBtoPlan` (option fee, signing, keys, after CPF and grants). Savings grow every month,
 * and the three payments fall due at different times, so a plan is judged against what the couple will have saved by each
 * due date, not only today. For a flat a few years away, the price is grown by a yearly assumption, which is an estimate.
 */
import { buildBtoPlan, checkEligibility, type BtoPlan } from "./bto";
import type { FlatTypeId } from "./bto-data";
import { projectCoupleOa } from "./cpf";
import { addMonths, monthsBetween, todayISO } from "./dates";
import { dollars, type Cents } from "./money";
import type { BtoDraft } from "@/lib/bto-draft";

/**
 * How much BTO prices are assumed to rise each year while a couple saves. This is an estimate, not an HDB figure: real prices are
 * set at each launch. Planning ahead needs some number, so it is one fixed assumption rather than something the couple tunes.
 */
export const ASSUMED_PRICE_GROWTH = 0.03;

export type PlanInputs = Pick<BtoDraft, "household" | "wageA" | "wageB" | "oaA" | "oaB" | "includeFutureCpf" | "leaseMonths" | "loanYears" | "scheme">;

/** The flat being aimed for. `price` is today's price in dollars. */
export interface Target {
  flatType: FlatTypeId;
  price: number;
  waitingMonths: number;
}

/** What the couple has and can add, in dollars. CPF is counted separately from the plan inputs. */
export interface Savings {
  cash: number;
  monthly: number;
}

/**
 * Applying does not cost anything. The option fee is paid when the couple chooses their flat, which comes a few months after
 * the application, and they keep saving until then. So for a launch that is open now, "booking" is this many months away.
 */
export const APPLY_TO_SELECTION_MONTHS = 3;

export type Reach = "ready" | "tight" | "short";

export interface Assessment {
  /** ready: every payment is covered. tight: booking and signing are covered but the keys payment is not. short: not yet. */
  status: Reach;
  plan: BtoPlan;
  /** Months from today to the booking date this was judged at. */
  months: number;
  bookingDate: string;
  /** The price used, in dollars, after growth. */
  price: number;
  /** Cumulative cash needed by each payment (after CPF and grants). */
  bookNeed: Cents;
  signNeed: Cents;
  keysNeed: Cents;
  bookHave: Cents;
  signHave: Cents;
  keysHave: Cents;
  /** How far the savings fall short of the option fee when the flat is chosen. */
  bookShort: Cents;
  signShort: Cents;
  keysShort: Cents;
  /** Extra to save each month, from today, to close the largest shortfall. */
  extraMonthly: Cents;
}

export function planAt(d: PlanInputs, t: Target, bookingDate: string, today = todayISO()): BtoPlan {
  const eligibility = checkEligibility(d.household);
  const scheme = d.scheme === "auto" ? eligibility.scheme : d.scheme;
  const people = [
    { balance: dollars(d.oaA), monthlyWage: d.wageA, age: d.household.ageA },
    { balance: dollars(d.oaB), monthlyWage: d.wageB, age: d.household.ageB },
  ];
  const oaAt = d.includeFutureCpf ? (iso: string) => projectCoupleOa(people, Math.max(monthsBetween(today, iso), 0)) : undefined;
  return buildBtoPlan({
    price: dollars(t.price), flatType: t.flatType, scheme, ehg: eligibility.ehg, cpfOa: dollars(d.oaA + d.oaB), oaAt,
    bookingDate, leaseDate: addMonths(bookingDate, d.leaseMonths), keysDate: addMonths(bookingDate, t.waitingMonths), loanYears: d.loanYears,
  });
}

/** `growth` is a yearly rate, e.g. 0.03. */
export const grownPrice = (price: number, months: number, growth: number) => Math.round(price * Math.pow(1 + growth, months / 12));

/** Judge booking `months` from now. */
export function assess(d: PlanInputs, t: Target, s: Savings, months = 0, growth = 0, today = todayISO()): Assessment {
  const price = grownPrice(t.price, months, growth);
  const bookingDate = addMonths(today, months);
  const plan = planAt(d, { ...t, price }, bookingDate, today);
  const [book, lease] = plan.stages;
  const bookNeed = book.cash;
  const signNeed = book.cash + lease.cash;
  const keysNeed = plan.totalCash;
  const have = (k: number): Cents => dollars(s.cash + s.monthly * k);
  const bookHave = have(months);
  const signHave = have(months + d.leaseMonths);
  const keysHave = have(months + t.waitingMonths);
  const bookOk = bookHave >= bookNeed;
  const signOk = signHave >= signNeed;
  const keysOk = keysHave >= keysNeed;
  const per = (need: Cents, got: Cents, k: number) => (need > got ? Math.ceil((need - got) / Math.max(months + k, 1)) : 0);
  const extraMonthly = Math.max(per(bookNeed, bookHave, 0), per(signNeed, signHave, d.leaseMonths), per(keysNeed, keysHave, t.waitingMonths));
  return {
    status: bookOk && signOk && keysOk ? "ready" : bookOk && signOk ? "tight" : "short",
    plan, months, bookingDate, price,
    bookNeed, signNeed, keysNeed, bookHave, signHave, keysHave,
    bookShort: Math.max(bookNeed - bookHave, 0),
    signShort: Math.max(signNeed - signHave, 0),
    keysShort: Math.max(keysNeed - keysHave, 0),
    extraMonthly,
  };
}

export interface Earliest {
  /** The first month a booking is fully covered, or null within the horizon. */
  ready: Assessment | null;
  /** The first month booking and signing are covered (the keys payment may still be short). */
  canBook: Assessment | null;
}

/** Scan forward month by month for when the couple could book, starting `from` months out. */
export function earliest(d: PlanInputs, t: Target, s: Savings, growth = 0, horizon = 240, today = todayISO(), from = 0): Earliest {
  let canBook: Assessment | null = null;
  for (let m = from; m <= horizon; m++) {
    const a = assess(d, t, s, m, growth, today);
    if (!canBook && a.status !== "short") canBook = a;
    if (a.status === "ready") return { ready: a, canBook };
  }
  return { ready: null, canBook };
}

/** The monthly saving that makes a booking `months` from now fully covered, given the cash already saved. */
export function monthlyNeeded(d: PlanInputs, t: Target, cash: number, months: number, growth = 0, today = todayISO()): Cents {
  return assess(d, t, { cash, monthly: 0 }, months, growth, today).extraMonthly;
}
