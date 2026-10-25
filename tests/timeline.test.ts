import { describe, expect, it } from "vitest";
import { emptyState } from "@/data/seed";
import { cashflowTimeline, findCrunches, nextCrunch } from "@/domain/timeline";
import { dollars } from "@/domain/money";
import type { CoupleState, Pot, SplitProposal, Stage } from "@/domain/types";

const TODAY = "2026-10-15";
const profiles = [
  { id: "a", couple_id: "c", display_name: "A", monthly_income: 4000, age: 28, first_timer: true, cpf_oa: null, created_at: "" },
  { id: "b", couple_id: "c", display_name: "B", monthly_income: 4000, age: 28, first_timer: true, cpf_oa: null, created_at: "" },
];

function pot(id: string, name: string, sequential: boolean, target_date: string): Pot {
  return { id, couple_id: "c", kind: sequential ? "bto" : "wedding", name, subtitle: "", status: "active", sequential, target_date, created_by: "a", created_at: "", bto: null, wedding: null };
}
const stage = (potId: string, idx: number, name: string, target: number, due: string | null): Stage => ({ id: `${potId}-${idx}`, pot_id: potId, idx, name, description: "", target: dollars(target), due_date: due });
const split = (potId: string, monthly: number): SplitProposal => ({
  id: `sp-${potId}`, pot_id: potId, couple_id: "c", proposed_by: "a", mode: "equal", shares: { a: dollars(monthly / 2), b: dollars(monthly / 2) },
  monthly_total: dollars(monthly), status: "accepted", response_note: null, responded_at: null, created_at: "",
});

function state(opts: { bto: number; wedding: number; btoPerMonth: number; weddingPerMonth: number }): CoupleState {
  const s = emptyState("c", profiles, "A & B");
  s.pots = [pot("bto", "Our BTO", true, "2029-06-01"), pot("wed", "Wedding", false, "2027-06-20")];
  s.stages = [
    stage("bto", 0, "Option fee", 2_000, "2026-12-01"),
    stage("bto", 1, "Lease signing", opts.bto, "2027-06-01"),
    stage("wed", 0, "Banquet deposit", opts.wedding, null),
  ];
  s.proposals = [split("bto", opts.btoPerMonth), split("wed", opts.weddingPerMonth)];
  return s;
}

describe("cashflow timeline", () => {
  it("flags overlapping deadlines as a crunch with the numbers behind it", () => {
    // Jun 2027: lease $12,000 + wedding $8,000 due; saving $1,000 + $500 a month from Oct 2026.
    const s = state({ bto: 12_000, wedding: 8_000, btoPerMonth: 1_000, weddingPerMonth: 500 });
    const crunches = findCrunches(s, 36, TODAY);
    const jun = crunches.find((c) => c.month.month === "2027-06-01");
    expect(jun).toBeDefined();
    expect(jun!.month.dueTotal).toBe(dollars(20_000));
    expect(jun!.month.shortfall).toBeGreaterThan(0);
    expect(jun!.message).toContain("Jun 2027");
    expect(jun!.message).toContain("lease signing");
    expect(jun!.message).toContain("Short by");
    expect(jun!.extraPerMonth).toBeGreaterThan(0);
  });

  it("reports no crunch when savings keep ahead of every deadline", () => {
    const s = state({ bto: 4_000, wedding: 3_000, btoPerMonth: 1_500, weddingPerMonth: 800 });
    expect(findCrunches(s, 36, TODAY)).toEqual([]);
    expect(nextCrunch(s, 12, TODAY)).toBeUndefined();
  });

  it("clears the crunch once the monthly split is high enough", () => {
    const tight = state({ bto: 12_000, wedding: 8_000, btoPerMonth: 1_000, weddingPerMonth: 500 });
    const crunch = findCrunches(tight, 36, TODAY).find((c) => c.month.month === "2027-06-01")!;
    const fixed = state({ bto: 12_000, wedding: 8_000, btoPerMonth: 1_000 + crunch.extraPerMonth, weddingPerMonth: 500 });
    expect(findCrunches(fixed, 36, TODAY).find((c) => c.month.month === "2027-06-01")).toBeUndefined();
  });

  it("counts past-due amounts in the current month and stops saving after a pot's last month", () => {
    const s = state({ bto: 12_000, wedding: 8_000, btoPerMonth: 1_000, weddingPerMonth: 500 });
    const months = cashflowTimeline(s, 12, TODAY);
    expect(months[0].month).toBe("2026-10-01");
    expect(months[0].savings).toBe(dollars(1_500));
    // the wedding pot ends in Jun 2027, so only the BTO split is saved in Jul 2027
    const all = cashflowTimeline(s, 14, TODAY);
    expect(all.find((m) => m.month === "2027-07-01")!.savings).toBe(dollars(1_000));
  });
});
