import { describe, expect, it } from "vitest";
import { applyMutations, run, DomainError, type Command } from "@/domain/engine";
import { createDemoState, DEMO_JULIAN, DEMO_DEPHANY } from "@/data/seed";
import { availableBalance, inboxFor, potBalance, requiredMonthly, stageProgress } from "@/domain/selectors";
import { petStatus } from "@/domain/pet";
import { dollars } from "@/domain/money";
import type { CoupleState } from "@/domain/types";

const NOW = new Date("2026-10-20T10:00:00+08:00");
let n = 0;
const ctx = (userId: string, now = NOW) => ({ userId, now, newId: () => `t${++n}` });
const exec = (s: CoupleState, who: string, cmd: Command, now = NOW) => applyMutations(s, run(s, cmd, ctx(who, now)).mutations);

const fresh = () => createDemoState(NOW);
const potNamed = (s: CoupleState, name: string) => s.pots.find((p) => p.name === name)!;

describe("demo seed", () => {
  it("builds a valid state through the engine", () => {
    const s = fresh();
    expect(s.pots.map((p) => p.status).sort()).toEqual(["active", "active", "active"]);
    expect(potBalance(s, potNamed(s, "Our BTO").id)).toBe(dollars(720 * 4 + 780 * 3));
    // Dephany has a transfer request to answer
    expect(inboxFor(s, DEMO_DEPHANY, NOW).count).toBe(1);
    expect(inboxFor(s, DEMO_JULIAN, NOW).count).toBe(0);
  });

  it("fills BTO stages in order", () => {
    const s = fresh();
    const sp = stageProgress(s, potNamed(s, "Our BTO"));
    expect(sp[0].status).toBe("done"); // $2,000 option fee
    expect(sp[1].status).toBe("current");
    expect(sp[1].saved).toBe(dollars(720 * 4 + 780 * 3 - 2_000));
  });
});

describe("contributions", () => {
  it("blocks contributions to a pot that isn't active", () => {
    let s = fresh();
    const r = run(s, { type: "createPot", kind: "custom", name: "Sofa", subtitle: "", target_date: "2027-12-01", bto: null, stages: [{ name: "Sofa", description: "", target: 200_000, due_date: null }] }, ctx(DEMO_DEPHANY));
    s = applyMutations(s, r.mutations);
    expect(() => run(s, { type: "logContribution", potId: r.createdId!, amount: 100, occurred_on: "2026-10-20", note: "" }, ctx(DEMO_DEPHANY))).toThrow(DomainError);
  });

  it("blocks over-funding a pot", () => {
    const s = fresh();
    const trip = potNamed(s, "Graduation trip");
    expect(() => run(s, { type: "logContribution", potId: trip.id, amount: dollars(10_000), occurred_on: "2026-10-20", note: "" }, ctx(DEMO_DEPHANY))).toThrow(/more than/);
  });

  it("edit, delete and undo all flow through to balances and the pet", () => {
    let s = fresh();
    const trip = potNamed(s, "Graduation trip");
    const before = potBalance(s, trip.id);
    const xpBefore = petStatus(s, NOW).xp;
    const tx = s.transactions.find((t) => t.pot_id === trip.id && t.user_id === DEMO_DEPHANY && t.note === "Angpao money")!;
    s = exec(s, DEMO_DEPHANY, { type: "editContribution", txId: tx.id, amount: dollars(100), occurred_on: tx.occurred_on, note: "Angpao money" });
    expect(potBalance(s, trip.id)).toBe(before - dollars(50));
    s = exec(s, DEMO_DEPHANY, { type: "deleteContribution", txId: tx.id });
    expect(potBalance(s, trip.id)).toBe(before - dollars(150));
    expect(petStatus(s, NOW).xp).toBeLessThan(xpBefore);
    s = exec(s, DEMO_DEPHANY, { type: "restoreContribution", txId: tx.id });
    expect(potBalance(s, trip.id)).toBe(before - dollars(50));
  });

  it("you can't edit your partner's contribution", () => {
    const s = fresh();
    const tx = s.transactions.find((t) => t.user_id === DEMO_JULIAN && t.kind === "contribution")!;
    expect(() => run(s, { type: "editContribution", txId: tx.id, amount: 100, occurred_on: tx.occurred_on, note: "" }, ctx(DEMO_DEPHANY))).toThrow(/your own/);
  });
});

describe("approvals", () => {
  it("transfer only moves money after the partner approves", () => {
    let s = fresh();
    const trip = potNamed(s, "Graduation trip");
    const bto = potNamed(s, "Our BTO");
    const req = s.requests.find((r) => r.status === "pending")!;
    const [tripBefore, btoBefore] = [potBalance(s, trip.id), potBalance(s, bto.id)];
    // the $200 is held while pending
    expect(availableBalance(s, trip.id, NOW)).toBe(tripBefore - dollars(200));
    expect(() => run(s, { type: "respondRequest", requestId: req.id, approve: true }, ctx(DEMO_JULIAN))).toThrow(/partner/);
    s = exec(s, DEMO_DEPHANY, { type: "respondRequest", requestId: req.id, approve: true });
    expect(potBalance(s, trip.id)).toBe(tripBefore - dollars(200));
    expect(potBalance(s, bto.id)).toBe(btoBefore + dollars(200));
  });

  it("can't request more than is available, counting held money", () => {
    const s = fresh();
    const trip = potNamed(s, "Graduation trip");
    const avail = availableBalance(s, trip.id, NOW);
    expect(() => run(s, { type: "requestWithdrawal", potId: trip.id, amount: avail + 1, reason: "" }, ctx(DEMO_DEPHANY))).toThrow(/available/);
  });

  it("requests expire after 24 hours", () => {
    const s = fresh();
    const req = s.requests.find((r) => r.status === "pending")!;
    const later = new Date(NOW.getTime() + 25 * 3600_000);
    expect(() => run(s, { type: "respondRequest", requestId: req.id, approve: true }, ctx(DEMO_DEPHANY, later))).toThrow(/expired/);
    expect(inboxFor(s, DEMO_DEPHANY, later).requests.length).toBe(0);
  });

  it("accepting a split activates the pot", () => {
    let s = fresh();
    const made = run(s, { type: "createPot", kind: "custom", name: "Sofa", subtitle: "", target_date: "2027-12-01", bto: null, stages: [{ name: "Sofa", description: "", target: 200_000, due_date: null }] }, ctx(DEMO_JULIAN));
    s = applyMutations(s, made.mutations);
    const prop = run(s, { type: "proposeSplit", potId: made.createdId!, mode: "equal", shares: { [DEMO_DEPHANY]: 10_000, [DEMO_JULIAN]: 10_000 } }, ctx(DEMO_JULIAN));
    s = applyMutations(s, prop.mutations);
    expect(s.pots.find((p) => p.id === made.createdId)!.status).toBe("pending_split");
    s = exec(s, DEMO_DEPHANY, { type: "respondSplit", proposalId: prop.createdId!, accept: true });
    expect(s.pots.find((p) => p.id === made.createdId)!.status).toBe("active");
  });
});

describe("planning maths", () => {
  it("monthly target is driven by the tightest deadline", () => {
    const s = fresh();
    const bto = potNamed(s, "Our BTO");
    const need = requiredMonthly(s, bto, "2026-10-20");
    expect(need).toBeGreaterThan(0);
  });

  it("pet coins only come from saving", () => {
    let s = fresh();
    const coins = petStatus(s, NOW).coins;
    // spend everything on play, then the next play fails
    for (let i = 0; i < Math.floor(coins / 5); i++) s = exec(s, DEMO_DEPHANY, { type: "petCare", action: "play" });
    expect(() => run(s, { type: "petCare", action: "play" }, ctx(DEMO_DEPHANY))).toThrow(/coins/);
  });
});
