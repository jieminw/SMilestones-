/**
 * CPF Ordinary Account (OA) projection.
 *
 * Sources (verify again before relying on them):
 *  - Total contribution rate for employees aged 55 and below: 37% of wages (17% employer + 20% employee).
 *    https://www.cpf.gov.sg/employer/employer-obligations/how-much-cpf-contribution-to-pay
 *  - Ordinary Wage (OW) ceiling: $8,000 a month from 1 Jan 2026.
 *    https://www.cpf.gov.sg/service/article/what-is-the-ordinary-wage-ow-ceiling
 *  - Allocation of each contribution to the OA (ratio of contribution), private sector, no change
 *    between 2026 and 2027 for these bands:
 *      35 & below 0.6217 · above 35 to 45 0.5677 · above 45 to 50 0.5136 · above 50 to 55 0.4055
 *    https://www.cpf.gov.sg/content/dam/web/employer/employer-obligations/documents/jan2027cpfallocationrates.pdf
 *  - OA interest: 2.5% a year (the statutory floor). https://www.cpf.gov.sg/member/growing-your-savings
 *
 * Simplifications (so the projection is an estimate, not a CPF statement):
 *  - Wages stay flat and are capped at the OW ceiling; no bonuses (Additional Wages).
 *  - Interest is compounded monthly on the opening balance. CPF actually calculates it monthly on the
 *    lowest balance and credits it once a year, so this slightly overstates growth.
 *  - The allocation band follows the person's age as it rises through the projection.
 *  - Only Singapore citizens and PRs in their third year onwards are modelled, and no one is above 55.
 *  - Other withdrawals from the OA (education, insurance, other property) are ignored.
 */
import type { Cents } from "./money";

export const CPF_AS_OF = "Jan 2026";
export const CPF_TOTAL_RATE_UNDER_55 = 0.37;
export const OW_CEILING = 8_000; // dollars / month
export const OA_INTEREST = 0.025; // per year

/** Share of each contribution allocated to the OA, by age (private sector, aged 55 and below). */
export function oaRatio(age: number): number {
  if (age <= 35) return 0.6217;
  if (age <= 45) return 0.5677;
  if (age <= 50) return 0.5136;
  return 0.4055;
}

/** OA credit per month from one person's wage, in cents. The wage is capped at the OW ceiling. */
export function monthlyOaContribution(monthlyWage: number, age: number): Cents {
  const insurable = Math.min(Math.max(monthlyWage, 0), OW_CEILING);
  return Math.round(insurable * CPF_TOTAL_RATE_UNDER_55 * oaRatio(age) * 100);
}

export interface OaInput {
  /** Current OA balance in cents. */
  balance: Cents;
  /** Gross monthly wage in dollars. */
  monthlyWage: number;
  age: number;
  months: number;
}

/** OA balance in cents after `months` months of contributions and interest. */
export function projectOa({ balance, monthlyWage, age, months }: OaInput): Cents {
  let bal = Math.max(balance, 0);
  for (let m = 0; m < Math.max(Math.floor(months), 0); m++) {
    bal += Math.round((bal * OA_INTEREST) / 12);
    bal += monthlyOaContribution(monthlyWage, age + Math.floor(m / 12));
  }
  return bal;
}

export interface OaPerson {
  balance: Cents;
  monthlyWage: number;
  age: number;
}

/** Combined OA of a couple after `months` months. */
export const projectCoupleOa = (people: OaPerson[], months: number): Cents => people.reduce((sum, p) => sum + projectOa({ ...p, months }), 0);
