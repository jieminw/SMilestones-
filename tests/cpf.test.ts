import { describe, expect, it } from "vitest";
import { monthlyOaContribution, oaRatio, OW_CEILING, projectCoupleOa, projectOa } from "@/domain/cpf";
import { buildBtoPlan } from "@/domain/bto";
import { monthsBetween } from "@/domain/dates";
import { dollars } from "@/domain/money";

describe("CPF OA projection", () => {
  it("credits about 23% of wages to the OA for someone aged 35 or below", () => {
    // $7,500 × 37% × 0.6217 = $1,725.2
    const c = monthlyOaContribution(7_500, 30);
    expect(c).toBeGreaterThanOrEqual(dollars(1_725));
    expect(c).toBeLessThan(dollars(1_726));
    expect(oaRatio(30)).toBe(0.6217);
    expect(oaRatio(40)).toBeLessThan(oaRatio(30));
    expect(oaRatio(52)).toBeLessThan(oaRatio(47));
  });

  it("caps the wage at the Ordinary Wage ceiling", () => {
    expect(monthlyOaContribution(12_000, 28)).toBe(monthlyOaContribution(OW_CEILING, 28));
    expect(monthlyOaContribution(0, 28)).toBe(0);
  });

  it("matches the worked example: 42 months of $7,500 wages is about $72,450 before interest", () => {
    const projected = projectOa({ balance: 0, monthlyWage: 7_500, age: 30, months: 42 });
    expect(projected).toBeGreaterThan(dollars(72_450));
    // interest at 2.5% adds a few thousand dollars at most over 3.5 years
    expect(projected).toBeLessThan(dollars(72_450 + 4_500));
  });

  it("adds interest on an existing balance and never goes negative", () => {
    expect(projectOa({ balance: dollars(10_000), monthlyWage: 0, age: 30, months: 12 })).toBeGreaterThan(dollars(10_240));
    expect(projectOa({ balance: dollars(10_000), monthlyWage: 0, age: 30, months: 0 })).toBe(dollars(10_000));
    expect(projectOa({ balance: -5, monthlyWage: 0, age: 30, months: 3 })).toBe(0);
  });

  it("sums both partners", () => {
    const a = { balance: dollars(5_000), monthlyWage: 3_750, age: 28 };
    const b = { balance: dollars(5_000), monthlyWage: 3_750, age: 29 };
    expect(projectCoupleOa([a, b], 24)).toBe(projectOa({ ...a, months: 24 }) + projectOa({ ...b, months: 24 }));
  });
});

describe("plan with projected OA", () => {
  const base = {
    price: dollars(385_000), flatType: "4R" as const, scheme: "sds-young" as const, ehg: 0, cpfOa: 0,
    bookingDate: "2026-12-01", leaseDate: "2027-06-01", keysDate: "2030-06-01",
  };
  const people = [
    { balance: dollars(5_000), monthlyWage: 3_750, age: 28 },
    { balance: dollars(5_000), monthlyWage: 3_750, age: 29 },
  ];
  const oaAt = (iso: string) => projectCoupleOa(people, Math.max(monthsBetween("2026-10-01", iso), 0));

  it("cuts the cash needed at key collection sharply compared with a flat balance", () => {
    const flat = buildBtoPlan({ ...base, cpfOa: dollars(10_000) });
    const projected = buildBtoPlan({ ...base, cpfOa: dollars(10_000), oaAt });
    expect(projected.stages[2].cash).toBeLessThan(flat.stages[2].cash - dollars(50_000));
    expect(projected.totalCash).toBeLessThan(flat.totalCash);
  });

  it("uses OA available by each stage's due date, less what earlier stages already took", () => {
    // $20,000 by lease signing, $110,000 by key collection
    const stepped = (iso: string) => (iso < "2028-01-01" ? dollars(20_000) : dollars(110_000));
    const plan = buildBtoPlan({ ...base, oaAt: stepped });
    const [, lease, keys] = plan.stages;
    expect(lease.cpfUsed).toBe(lease.total); // $14,174 fits inside $20,000
    expect(keys.cpfUsed).toBe(keys.total); // $86,625 fits inside $110,000 − $14,174
    expect(lease.cpfUsed + keys.cpfUsed).toBeLessThanOrEqual(dollars(110_000));
    expect(plan.cpfUnused).toBe(dollars(110_000) - lease.cpfUsed - keys.cpfUsed);
  });

  it("limits the keys stage to what is left once lease costs were paid", () => {
    const plan = buildBtoPlan({ ...base, oaAt: (iso) => (iso < "2028-01-01" ? dollars(14_174) : dollars(40_000)) });
    expect(plan.stages[1].cpfUsed).toBe(dollars(14_174));
    expect(plan.stages[2].cpfUsed).toBe(dollars(40_000 - 14_174));
  });

  it("never pays the option fee from CPF", () => {
    const plan = buildBtoPlan({ ...base, oaAt: () => dollars(1_000_000) });
    expect(plan.stages[0].cpfUsed).toBe(0);
    expect(plan.stages[0].cash).toBe(dollars(2_000));
  });
});
