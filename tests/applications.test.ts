import { describe, expect, it } from "vitest";
import { applyMutations, run, DomainError, type Command } from "@/domain/engine";
import { createDemoState, DEMO_DEPHANY, DEMO_JULIAN } from "@/data/seed";
import { potBalance, potStages, requiredMonthly } from "@/domain/selectors";
import { buildBtoPlan, checkEligibility } from "@/domain/bto";
import { addMonths } from "@/domain/dates";
import { getProject } from "@/domain/bto-data";
import { dollars } from "@/domain/money";
import type { BtoMeta, CoupleState } from "@/domain/types";

const NOW = new Date("2026-10-20T10:00:00+08:00");
let n = 0;
const ctx = (userId: string) => ({ userId, now: NOW, newId: () => `a${++n}` });
const exec = (s: CoupleState, who: string, cmd: Command) => applyMutations(s, run(s, cmd, ctx(who)).mutations);
const bto = (s: CoupleState) => s.pots.find((p) => p.name === "Our BTO")!;

/** A retarget payload for another project, with a later key date. */
function retargetCmd(s: CoupleState, keysMonthsLater = 6): Extract<Command, { type: "retargetBto" }> {
  const project = getProject("tampines-nova")!;
  const flat = project.flats.find((f) => f.type === "4R")!;
  const household = { firstTimers: "both" as const, monthlyIncome: 7500, ageA: 26, ageB: 27 };
  const el = checkEligibility(household);
  const booking = addMonths("2027-02-01", 0);
  const price = Math.round((flat.minPrice + flat.maxPrice) / 2 / 1000) * 1000;
  const old = bto(s);
  const keys = addMonths(old.target_date, keysMonthsLater);
  const plan = buildBtoPlan({ price: dollars(price), flatType: "4R", scheme: el.scheme, ehg: el.ehg, cpfOa: dollars(8_000), bookingDate: booking, leaseDate: addMonths(booking, 6), keysDate: keys });
  const meta: BtoMeta = {
    project_id: project.id, project_name: project.name, town: project.town, flat_type: "4R", price: dollars(price), scheme: el.scheme, ehg: el.ehg,
    cpf_oa: dollars(8_000), waiting_months: project.waitingMonths, loan_monthly: plan.loan.monthly, household,
  };
  return {
    type: "retargetBto", potId: old.id, subtitle: `${project.name} · 4-room`, target_date: keys, bto: meta,
    stages: plan.stages.map((st) => ({ name: st.name, description: "", target: st.cash, due_date: st.due })),
  };
}

describe("BTO applications", () => {
  it("seeds a history and logs a new application", () => {
    const s = createDemoState(NOW);
    expect(s.btoApplications.map((a) => a.result).sort()).toEqual(["successful", "unsuccessful"]);
    const next = exec(s, DEMO_JULIAN, { type: "logApplication", potId: bto(s).id, exercise: "Nov 2026", project_id: null, flat_type: "4R", applied_on: "2026-11-20", result: "pending", queue_number: null });
    expect(next.btoApplications).toHaveLength(3);
    expect(s.btoApplications).toHaveLength(2); // the previous state is untouched
  });

  it("updates a result and validates input", () => {
    const s = createDemoState(NOW);
    const a = s.btoApplications.find((x) => x.result === "successful")!;
    const next = exec(s, DEMO_DEPHANY, { type: "updateApplication", applicationId: a.id, result: "unsuccessful", queue_number: 1500 });
    expect(next.btoApplications.find((x) => x.id === a.id)).toMatchObject({ result: "unsuccessful", queue_number: 1500 });
    expect(() => exec(s, DEMO_DEPHANY, { type: "updateApplication", applicationId: a.id, result: "successful", queue_number: -4 })).toThrow(DomainError);
    expect(() => exec(s, DEMO_DEPHANY, { type: "logApplication", potId: s.pots.find((p) => p.kind === "trip")!.id, exercise: "Jun 2026", project_id: null, flat_type: "4R", applied_on: "2026-06-01", result: "pending", queue_number: null })).toThrow(DomainError);
  });
});

describe("retarget BTO", () => {
  it("refuses while a withdrawal or transfer is pending on the pot", () => {
    const s = createDemoState(NOW);
    expect(s.requests.some((r) => r.status === "pending" && (r.to_pot_id === bto(s).id || r.pot_id === bto(s).id))).toBe(true);
    expect(() => exec(s, DEMO_JULIAN, retargetCmd(s))).toThrow(/pending/i);
  });

  it("replaces the stages and dates but keeps every contribution", () => {
    let s = createDemoState(NOW);
    const req = s.requests.find((r) => r.status === "pending")!;
    s = exec(s, DEMO_DEPHANY, { type: "respondRequest", requestId: req.id, approve: true });
    const balance = potBalance(s, bto(s).id);
    const txCount = s.transactions.length;
    const next = exec(s, DEMO_JULIAN, retargetCmd(s));
    expect(potBalance(next, bto(next).id)).toBe(balance);
    expect(next.transactions).toHaveLength(txCount);
    expect(bto(next).bto?.project_id).toBe("tampines-nova");
    expect(potStages(next, bto(next).id)).toHaveLength(3);
    expect(potStages(next, bto(next).id).every((st) => st.id.startsWith("a"))).toBe(true); // new stage rows
  });

  it("a later key date lowers the monthly target", () => {
    let s = createDemoState(NOW);
    const req = s.requests.find((r) => r.status === "pending")!;
    s = exec(s, DEMO_DEPHANY, { type: "respondRequest", requestId: req.id, approve: true });
    const soon = exec(s, DEMO_JULIAN, retargetCmd(s, 0));
    const later = exec(s, DEMO_JULIAN, retargetCmd(s, 18));
    expect(requiredMonthly(later, bto(later), "2026-10-20")).toBeLessThanOrEqual(requiredMonthly(soon, bto(soon), "2026-10-20"));
  });

  it("only works on a BTO pot", () => {
    const s = createDemoState(NOW);
    const trip = s.pots.find((p) => p.kind === "trip")!;
    expect(() => exec(s, DEMO_JULIAN, { ...retargetCmd(s), potId: trip.id })).toThrow(DomainError);
  });
});
