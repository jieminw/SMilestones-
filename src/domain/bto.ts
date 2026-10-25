/**
 * BTO cost engine — the single source of truth for every BTO number in the app.
 *
 * Rules encoded here (as of Oct 2026 — verify against HDB before relying on them):
 *  - HDB loan: max 75% loan-to-value (since 20 Aug 2024), 2.6% p.a., so total downpayment = 25%.
 *  - Downpayment due at Agreement for Lease (AFL) signing:
 *      10%  standard
 *       5%  Staggered Downpayment Scheme (SDS)
 *     2.5%  SDS for young first-timer couples (younger applicant applies by age 30; from Jun 2024 BTO)
 *    The rest of the 25% is due at key collection.
 *  - Option fee paid at booking (cash) is deducted from the downpayment due at AFL
 *    (HDB's own sample calculation: "Less: Option fee paid during booking of flat").
 *  - Buyer's stamp duty: residential tiers on the price.
 *  - Conveyancing (HDB as solicitor): per $100 or part — $0.135 first $30k, $0.108 next $30k,
 *    $0.09 remainder, plus 9% GST, rounded up to the dollar.
 *  - Enhanced CPF Housing Grant (EHG) by average monthly household income (Aug 2024 table).
 *    Modelled as applied at key collection, reducing the downpayment due then, and the loan if larger.
 *  - CPF Ordinary Account savings can pay downpayment, stamp duty and legal fees, but not the option fee.
 */
import type { Cents } from "./money";
import type { FlatTypeId } from "./bto-data";

export const HDB_LOAN_LTV = 0.75;
export const HDB_LOAN_RATE = 0.026;
export const FAMILY_INCOME_CEILING = 14_000; // dollars / month
export const RULES_AS_OF = "Oct 2026";

// ---------- Fees ----------

export function optionFee(type: FlatTypeId): Cents {
  if (type === "2R40" || type === "2R48") return 500_00;
  if (type === "3R") return 1_000_00;
  return 2_000_00;
}

const BSD_TIERS: [number, number][] = [
  [180_000, 0.01],
  [180_000, 0.02],
  [640_000, 0.03],
  [500_000, 0.04],
  [1_500_000, 0.05],
  [Infinity, 0.06],
];

/** Buyer's stamp duty in cents. $385,000 → $6,150. */
export function buyersStampDuty(price: Cents): Cents {
  let remaining = price / 100;
  let duty = 0;
  for (const [band, rate] of BSD_TIERS) {
    const portion = Math.min(remaining, band);
    duty += portion * rate;
    remaining -= portion;
    if (remaining <= 0) break;
  }
  return Math.round(duty * 100);
}

/** HDB conveyancing fee estimate in cents. $385,000 → $399. */
export function conveyancingFee(price: Cents): Cents {
  const p = price / 100;
  const units = (amount: number) => Math.ceil(amount / 100);
  const t1 = Math.min(p, 30_000);
  const t2 = Math.min(Math.max(p - 30_000, 0), 30_000);
  const t3 = Math.max(p - 60_000, 0);
  // work in tenths of a cent to avoid float drift, then GST and round up
  const base = units(t1) * 0.135 + units(t2) * 0.108 + units(t3) * 0.09;
  const withGst = Math.max(base, 20) * 1.09;
  return Math.ceil(Math.round(withGst * 1000) / 1000) * 100;
}

// ---------- Grants & eligibility ----------

const EHG_FAMILY: [number, number][] = [
  [1_500, 120_000], [2_000, 110_000], [2_500, 105_000], [3_000, 95_000], [3_500, 90_000],
  [4_000, 80_000], [4_500, 70_000], [5_000, 65_000], [5_500, 55_000], [6_000, 50_000],
  [6_500, 40_000], [7_000, 30_000], [7_500, 25_000], [8_000, 20_000], [8_500, 10_000], [9_000, 5_000],
];
const EHG_SINGLES: [number, number][] = [
  [750, 60_000], [1_000, 55_000], [1_250, 52_500], [1_500, 47_500], [1_750, 45_000], [2_000, 40_000],
  [2_250, 35_000], [2_500, 32_500], [2_750, 27_500], [3_000, 25_000], [3_250, 20_000], [3_500, 15_000],
  [3_750, 12_500], [4_000, 10_000], [4_250, 5_000], [4_500, 2_500],
];

const lookup = (table: [number, number][], income: number) => {
  for (const [ceiling, amount] of table) if (income <= ceiling) return amount;
  return 0;
};

export type FirstTimerStatus = "both" | "one" | "none";

export interface Household {
  ageA: number;
  ageB: number;
  firstTimers: FirstTimerStatus;
  /** Combined average gross monthly income, dollars. */
  monthlyIncome: number;
}

export type DownpaymentScheme = "standard" | "sds" | "sds-young";

export const SCHEME_RATE: Record<DownpaymentScheme, number> = {
  standard: 0.1,
  sds: 0.05,
  "sds-young": 0.025,
};

export const SCHEME_LABEL: Record<DownpaymentScheme, string> = {
  standard: "Standard · 10% at signing",
  sds: "Staggered Downpayment · 5% at signing",
  "sds-young": "Staggered Downpayment (young couples) · 2.5% at signing",
};

export interface EligibilityResult {
  canApply: boolean;
  blockers: string[];
  ehg: Cents;
  ehgReason: string;
  scheme: DownpaymentScheme;
  schemeReason: string;
  hdbLoan: boolean;
  hdbLoanReason: string;
}

export function checkEligibility(h: Household): EligibilityResult {
  const blockers: string[] = [];
  if (Math.min(h.ageA, h.ageB) < 21) blockers.push("Both of you must be at least 21 to apply under the Fiancé/Fiancée Scheme.");
  if (h.monthlyIncome > FAMILY_INCOME_CEILING)
    blockers.push(`Your combined income is above the $${FAMILY_INCOME_CEILING.toLocaleString()} ceiling for families buying a BTO flat.`);

  let ehg = 0;
  let ehgReason: string;
  if (h.firstTimers === "both") {
    ehg = lookup(EHG_FAMILY, h.monthlyIncome);
    ehgReason = ehg
      ? `First-timer couple earning $${h.monthlyIncome.toLocaleString()}/month.`
      : "EHG is only for household incomes up to $9,000/month.";
  } else if (h.firstTimers === "one") {
    ehg = lookup(EHG_SINGLES, h.monthlyIncome / 2);
    ehgReason = ehg
      ? "One first-timer: EHG (Singles) based on half your household income."
      : "EHG (Singles) needs half your household income to be $4,500 or less.";
  } else {
    ehgReason = "EHG is for first-timer households.";
  }

  const younger = Math.min(h.ageA, h.ageB);
  let scheme: DownpaymentScheme = "standard";
  let schemeReason = "Second-timer households pay the standard 10% at signing.";
  if (h.firstTimers !== "none") {
    if (younger <= 30) {
      scheme = "sds-young";
      schemeReason = "You're a first-timer couple and the younger of you is 30 or below, so only 2.5% is due at signing.";
    } else {
      scheme = "sds";
      schemeReason = "First-timer couples can stagger the downpayment: 5% at signing, the rest at key collection.";
    }
  }

  const hdbLoan = h.monthlyIncome <= FAMILY_INCOME_CEILING;
  const hdbLoanReason = hdbLoan
    ? "Income within the $14,000 ceiling: up to 75% HDB loan at 2.6%."
    : "Above the income ceiling for an HDB loan; you'd need a bank loan.";

  return { canApply: blockers.length === 0, blockers, ehg: ehg * 100, ehgReason, scheme, schemeReason, hdbLoan, hdbLoanReason };
}

// ---------- The plan ----------

export interface CostLine {
  label: string;
  cents: Cents;
  cpfPayable: boolean;
  note?: string;
}

export interface BtoStagePlan {
  key: "book" | "lease" | "keys";
  name: string;
  due: string;
  lines: CostLine[];
  total: Cents;
  cpfUsed: Cents;
  /** Cash the couple must save for this stage = what the pot targets. */
  cash: Cents;
}

export interface BtoPlanInput {
  price: Cents;
  flatType: FlatTypeId;
  scheme: DownpaymentScheme;
  ehg: Cents;
  /** Combined CPF OA balance the couple plans to put towards the flat today. */
  cpfOa: Cents;
  /**
   * Combined OA available on a given date (balance + projected contributions + interest). When given,
   * each stage may use what has accumulated by its due date, less what earlier stages already used.
   * Without it the plan falls back to the single lump `cpfOa`.
   */
  oaAt?: (isoDate: string) => Cents;
  bookingDate: string;
  leaseDate: string;
  keysDate: string;
  loanYears?: number;
}

export interface BtoPlan {
  stages: BtoStagePlan[];
  totalCash: Cents;
  totalUpfront: Cents;
  downpayment: Cents;
  loan: { principal: Cents; monthly: Cents; years: number; rate: number };
  grantApplied: Cents;
  cpfUnused: Cents;
}

export function monthlyRepayment(principal: Cents, years: number, rate = HDB_LOAN_RATE): Cents {
  if (principal <= 0) return 0;
  const r = rate / 12;
  const n = years * 12;
  return Math.round((principal * r) / (1 - Math.pow(1 + r, -n)));
}

export function buildBtoPlan(i: BtoPlanInput): BtoPlan {
  const years = i.loanYears ?? 25;
  const rate = SCHEME_RATE[i.scheme];
  const downpayment = Math.round(i.price * (1 - HDB_LOAN_LTV));
  const opt = optionFee(i.flatType);
  const dpAtSigning = Math.round(i.price * rate);
  const dpAtKeysGross = downpayment - dpAtSigning;
  const grantToDp = Math.min(i.ehg, dpAtKeysGross);
  const grantToLoan = i.ehg - grantToDp;
  const dpAtKeys = dpAtKeysGross - grantToDp;

  let cpfLeft = i.cpfOa;
  let cpfSpent = 0;
  const stage = (key: BtoStagePlan["key"], name: string, due: string, lines: CostLine[]): BtoStagePlan => {
    const total = lines.reduce((s, l) => s + l.cents, 0);
    const cpfEligible = lines.filter((l) => l.cpfPayable).reduce((s, l) => s + l.cents, 0);
    // With a projection, the OA on this stage's due date, less what earlier stages already took.
    const available = i.oaAt ? Math.max(i.oaAt(due) - cpfSpent, 0) : cpfLeft;
    const cpfUsed = Math.min(available, cpfEligible);
    cpfLeft -= cpfUsed;
    cpfSpent += cpfUsed;
    return { key, name, due, lines, total, cpfUsed, cash: total - cpfUsed };
  };

  const book = stage("book", "Book your flat", i.bookingDate, [
    { label: "Option fee", cents: opt, cpfPayable: false, note: "Paid in cash at flat selection" },
  ]);
  const lease = stage("lease", "Sign Agreement for Lease", i.leaseDate, [
    {
      label: `${+(rate * 100).toFixed(1)}% downpayment`,
      cents: dpAtSigning - opt,
      cpfPayable: true,
      note: `${fmtD(dpAtSigning)} less the ${fmtD(opt)} option fee already paid`,
    },
    { label: "Buyer's stamp duty", cents: buyersStampDuty(i.price), cpfPayable: true },
    { label: "Legal fees (est.)", cents: conveyancingFee(i.price), cpfPayable: true, note: "HDB conveyancing, incl. GST" },
  ]);
  const keysLines: CostLine[] = [
    {
      label: `Remaining ${+((0.25 - rate) * 100).toFixed(1)}% downpayment`,
      cents: dpAtKeys,
      cpfPayable: true,
      note: grantToDp > 0 ? `${fmtD(dpAtKeysGross)} less ${fmtD(grantToDp)} EHG grant` : undefined,
    },
  ];
  const keys = stage("keys", "Collect your keys", i.keysDate, keysLines);

  const principal = Math.max(Math.round(i.price * HDB_LOAN_LTV) - grantToLoan, 0);
  const stages = [book, lease, keys];
  return {
    stages,
    totalCash: stages.reduce((s, x) => s + x.cash, 0),
    totalUpfront: stages.reduce((s, x) => s + x.total, 0),
    downpayment,
    loan: { principal, monthly: monthlyRepayment(principal, years), years, rate: HDB_LOAN_RATE },
    grantApplied: i.ehg,
    cpfUnused: i.oaAt ? Math.max(i.oaAt(i.keysDate) - cpfSpent, 0) : cpfLeft,
  };
}

const fmtD = (c: Cents) => `$${Math.round(c / 100).toLocaleString("en-SG")}`;

/** Mortgage Servicing Ratio: HDB flat repayments are capped at 30% of gross monthly income. */
export const MSR = 0.3;

export function maxLoanByMsr(monthlyIncome: number, years = 25, rate = HDB_LOAN_RATE): Cents {
  const pay = monthlyIncome * MSR;
  const r = rate / 12;
  const n = years * 12;
  return Math.round(((pay * (1 - Math.pow(1 + r, -n))) / r) * 100);
}
