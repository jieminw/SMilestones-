import { describe, expect, it } from "vitest";
import { buildBtoPlan, buyersStampDuty, checkEligibility, conveyancingFee, monthlyRepayment, optionFee } from "@/domain/bto";
import { dollars } from "@/domain/money";
import { splitShares } from "@/domain/split";

describe("fees", () => {
  it("stamp duty follows the residential tiers", () => {
    // 1% of 180k + 2% of 180k + 3% of 25k
    expect(buyersStampDuty(dollars(385_000))).toBe(dollars(6_150));
    expect(buyersStampDuty(dollars(180_000))).toBe(dollars(1_800));
    expect(buyersStampDuty(dollars(1_000_000))).toBe(dollars(1_800 + 3_600 + 19_200));
  });

  it("conveyancing fee matches the HDB formula incl. GST", () => {
    // 300×0.135 + 300×0.108 + 3250×0.09 = 365.40; ×1.09 = 398.29 → $399
    expect(conveyancingFee(dollars(385_000))).toBe(dollars(399));
  });

  it("option fee depends on flat type", () => {
    expect(optionFee("2R48")).toBe(dollars(500));
    expect(optionFee("3R")).toBe(dollars(1_000));
    expect(optionFee("4R")).toBe(dollars(2_000));
  });

  it("HDB loan repayment at 2.6% over 25 years", () => {
    // $288,750 loan → ≈ $1,310/month
    expect(Math.round(monthlyRepayment(dollars(288_750), 25) / 100)).toBe(1_310);
  });
});

describe("eligibility", () => {
  it("young first-timer couple gets SDS 2.5% and EHG by income", () => {
    const r = checkEligibility({ ageA: 26, ageB: 27, firstTimers: "both", monthlyIncome: 7_500 });
    expect(r.canApply).toBe(true);
    expect(r.scheme).toBe("sds-young");
    expect(r.ehg).toBe(dollars(25_000));
  });

  it("first-timers above 30 get the 5% SDS", () => {
    expect(checkEligibility({ ageA: 32, ageB: 34, firstTimers: "both", monthlyIncome: 9_500 }).scheme).toBe("sds");
  });

  it("one first-timer uses EHG (Singles) on half the income", () => {
    expect(checkEligibility({ ageA: 28, ageB: 29, firstTimers: "one", monthlyIncome: 6_000 }).ehg).toBe(dollars(25_000));
  });

  it("income above $14k blocks the application", () => {
    const r = checkEligibility({ ageA: 28, ageB: 29, firstTimers: "both", monthlyIncome: 15_000 });
    expect(r.canApply).toBe(false);
    expect(r.hdbLoan).toBe(false);
  });
});

describe("plan", () => {
  const base = {
    price: dollars(385_000), flatType: "4R" as const, scheme: "sds-young" as const, ehg: 0, cpfOa: 0,
    bookingDate: "2026-12-01", leaseDate: "2027-06-01", keysDate: "2030-06-01",
  };

  it("deducts the option fee from the downpayment at lease signing (fixes the Figma's $16,075)", () => {
    const plan = buildBtoPlan(base);
    const [book, lease, keys] = plan.stages;
    expect(book.total).toBe(dollars(2_000));
    // 9,625 − 2,000 + 6,150 + 399
    expect(lease.total).toBe(dollars(14_174));
    // 22.5% of 385k
    expect(keys.total).toBe(dollars(86_625));
    // option fee + signing downpayment + keys downpayment == 25%
    expect(book.total + lease.lines[0].cents + keys.total).toBe(dollars(96_250));
  });

  it("applies EHG at key collection and spills any excess into the loan", () => {
    const plan = buildBtoPlan({ ...base, ehg: dollars(120_000) });
    expect(plan.stages[2].total).toBe(0);
    expect(plan.loan.principal).toBe(dollars(288_750 - (120_000 - 86_625)));
  });

  it("uses CPF OA for lease costs first, never for the option fee", () => {
    const plan = buildBtoPlan({ ...base, cpfOa: dollars(20_000) });
    expect(plan.stages[0].cash).toBe(dollars(2_000));
    expect(plan.stages[1].cash).toBe(0);
    expect(plan.stages[2].cpfUsed).toBe(dollars(20_000 - 14_174));
    expect(plan.totalCash).toBe(dollars(2_000 + 86_625 - (20_000 - 14_174)));
  });
});

describe("split", () => {
  it("equal split rounds each share up to a whole dollar", () => {
    expect(splitShares("equal", dollars(1_149), null, null)).toEqual([dollars(575), dollars(575)]);
  });
  it("income split is proportional and never falls short", () => {
    const [a, b] = splitShares("income", dollars(1_149), 3_600, 3_900);
    expect(a).toBe(dollars(552));
    expect(a + b).toBeGreaterThanOrEqual(dollars(1_149));
  });
  it("falls back to equal when incomes are missing", () => {
    expect(splitShares("income", dollars(1_000), null, 5_000)).toEqual([dollars(500), dollars(500)]);
  });
});
