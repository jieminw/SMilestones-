import type { CoupleState } from "@/domain/types";
import type { FlatTypeId } from "@/domain/bto-data";
import { getProject, BTO_PROJECTS } from "@/domain/bto-data";
import { buildBtoPlan, checkEligibility, type DownpaymentScheme, type Household } from "@/domain/bto";
import { addMonths, monthsBetween, todayISO } from "@/domain/dates";
import { projectCoupleOa } from "@/domain/cpf";
import { dollars } from "@/domain/money";

/** What the couple is exploring in the BTO Navigator. Persisted per browser. */
export interface BtoDraft {
  projectId: string;
  flatType: FlatTypeId;
  price: number; // dollars
  household: Household;
  /** Each partner's gross monthly wage, dollars. Their sum is the household income used for grants. */
  wageA: number;
  wageB: number;
  /** Each partner's current CPF OA balance, dollars. */
  oaA: number;
  oaB: number;
  /** Project future OA contributions up to each stage's due date (on by default). */
  includeFutureCpf: boolean;
  bookingDate: string;
  leaseMonths: number;
  keysDate: string | null; // null = booking + project waiting time
  loanYears: number;
  scheme: DownpaymentScheme | "auto";
}

export const DRAFT_KEY = "smilestones-bto-draft";

export function defaultDraft(s?: CoupleState | null): BtoDraft {
  const p = BTO_PROJECTS[0];
  const f = p.flats.find((x) => x.type === "4R")!;
  const [a, b] = s?.profiles ?? [];
  const wageA = a?.monthly_income ?? 4_000;
  const wageB = b?.monthly_income ?? 4_000;
  const firsts = [a?.first_timer, b?.first_timer];
  return {
    projectId: p.id,
    flatType: "4R",
    price: Math.round((f.minPrice + f.maxPrice) / 2 / 1000) * 1000,
    household: {
      ageA: a?.age ?? 28,
      ageB: b?.age ?? 29,
      firstTimers: firsts.every((x) => x !== false) ? "both" : firsts.some((x) => x) ? "one" : "none",
      monthlyIncome: wageA + wageB,
    },
    wageA,
    wageB,
    oaA: a?.cpf_oa != null ? Math.round(a.cpf_oa / 100) : 5_000,
    oaB: b?.cpf_oa != null ? Math.round(b.cpf_oa / 100) : 5_000,
    includeFutureCpf: true,
    bookingDate: addMonths(todayISO(), 2),
    leaseMonths: 6,
    keysDate: null,
    loanYears: 25,
    scheme: "auto",
  };
}

export const cpfBalance = (d: Pick<BtoDraft, "oaA" | "oaB">) => d.oaA + d.oaB;

export function resolveDraft(d: BtoDraft) {
  const project = getProject(d.projectId) ?? BTO_PROJECTS[0];
  const flat = project.flats.find((f) => f.type === d.flatType) ?? project.flats[project.flats.length - 1];
  const price = Math.min(Math.max(d.price, flat.minPrice), flat.maxPrice);
  const eligibility = checkEligibility(d.household);
  const scheme = d.scheme === "auto" ? eligibility.scheme : d.scheme;
  const leaseDate = addMonths(d.bookingDate, d.leaseMonths);
  const keysDate = d.keysDate ?? addMonths(d.bookingDate, project.waitingMonths);
  const people = [
    { balance: dollars(d.oaA), monthlyWage: d.wageA, age: d.household.ageA },
    { balance: dollars(d.oaB), monthlyWage: d.wageB, age: d.household.ageB },
  ];
  const today = todayISO();
  const oaAt = d.includeFutureCpf ? (iso: string) => projectCoupleOa(people, Math.max(monthsBetween(today, iso), 0)) : undefined;
  const plan = buildBtoPlan({
    price: dollars(price), flatType: flat.type, scheme, ehg: eligibility.ehg, cpfOa: dollars(cpfBalance(d)), oaAt,
    bookingDate: d.bookingDate, leaseDate, keysDate, loanYears: d.loanYears,
  });
  const oaAtKeys = oaAt ? oaAt(keysDate) : dollars(cpfBalance(d));
  return { project, flat, price, eligibility, scheme, leaseDate, keysDate, plan, oaAtKeys };
}
