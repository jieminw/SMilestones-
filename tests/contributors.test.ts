import { describe, expect, it } from "vitest";
import { applyMutations, run, DomainError, type Command } from "@/domain/engine";
import { createDemoState, DEMO_DEPHANY, DEMO_JULIAN, DEMO_MUM } from "@/data/seed";
import { contributorPots, potBalance, profileOf } from "@/domain/selectors";
import { dollars } from "@/domain/money";
import type { CoupleState } from "@/domain/types";

const NOW = new Date("2026-10-20T10:00:00+08:00");
let n = 0;
const ctx = (userId: string) => ({ userId, now: NOW, newId: () => `m${++n}` });
const exec = (s: CoupleState, who: string, cmd: Command) => applyMutations(s, run(s, cmd, ctx(who)).mutations);
/** The sample app has no contributor, so these tests add one: Mum, invited to the wedding pot with a $5,000 gift. */
function fresh(): CoupleState {
  let s = createDemoState(NOW);
  const wedding = s.pots.find((p) => p.name === "Our wedding")!;
  s = { ...s, potMembers: [{ id: "pm1", couple_id: s.couple.id, pot_id: wedding.id, user_id: DEMO_MUM, role: "contributor", display_name: "Mum", created_at: NOW.toISOString() }] };
  return exec(s, DEMO_MUM, { type: "logContribution", potId: wedding.id, amount: dollars(5_000), occurred_on: "2026-10-01", note: "" });
}
const pot = (s: CoupleState, name: string) => s.pots.find((p) => p.name === name)!;

describe("parents as limited contributors", () => {
  it("a contributor sees one pot and her gift is named", () => {
    const s = fresh();
    const wedding = pot(s, "Our wedding");
    expect(contributorPots(s, DEMO_MUM)).toEqual([wedding.id]);
    const gifts = s.transactions.filter((t) => t.user_id === DEMO_MUM);
    expect(gifts).toHaveLength(1);
    expect(gifts[0].amount).toBe(dollars(5_000));
    expect(gifts[0].note).toBe("Gift from Mum");
    expect(profileOf(s, DEMO_MUM)?.display_name).toBe("Mum");
    expect(profileOf(s, DEMO_MUM)?.monthly_income).toBeNull();
    // she is not one of the two partners
    expect(s.profiles.some((p) => p.id === DEMO_MUM)).toBe(false);
  });

  it("lets a contributor log a gift to their pot, and tells both partners", () => {
    const s = fresh();
    const wedding = pot(s, "Our wedding");
    const before = potBalance(s, wedding.id);
    const next = exec(s, DEMO_MUM, { type: "logContribution", potId: wedding.id, amount: dollars(500), occurred_on: "2026-10-20", note: "" });
    expect(potBalance(next, wedding.id)).toBe(before + dollars(500));
    const gift = next.transactions.find((t) => t.amount === dollars(500) && t.user_id === DEMO_MUM)!;
    expect(gift.note).toBe("Gift from Mum");
    const told = next.notifications.filter((x) => x.text.startsWith("Mum gave $500 ")).map((x) => x.user_id).sort();
    expect(told).toEqual([DEMO_DEPHANY, DEMO_JULIAN].sort());
  });

  it("refuses a gift to any other pot", () => {
    const s = fresh();
    expect(() => exec(s, DEMO_MUM, { type: "logContribution", potId: pot(s, "Our BTO").id, amount: dollars(100), occurred_on: "2026-10-20", note: "" })).toThrow(/invited/);
    expect(() => exec(s, DEMO_MUM, { type: "logContribution", potId: pot(s, "Graduation trip").id, amount: dollars(100), occurred_on: "2026-10-20", note: "" })).toThrow(DomainError);
  });

  it("refuses to over-fund the pot or give a future-dated gift", () => {
    const s = fresh();
    const wedding = pot(s, "Our wedding");
    expect(() => exec(s, DEMO_MUM, { type: "logContribution", potId: wedding.id, amount: dollars(500_000), occurred_on: "2026-10-20", note: "" })).toThrow(DomainError);
    expect(() => exec(s, DEMO_MUM, { type: "logContribution", potId: wedding.id, amount: dollars(10), occurred_on: "2027-01-01", note: "" })).toThrow(DomainError);
  });

  it("cannot approve or request withdrawals, change splits or dates, or edit anything", () => {
    const s = fresh();
    const wedding = pot(s, "Our wedding");
    const req = s.requests.find((r) => r.status === "pending")!;
    const bto = pot(s, "Our BTO");
    const forbidden: Command[] = [
      { type: "respondRequest", requestId: req.id, approve: true },
      { type: "cancelRequest", requestId: req.id },
      { type: "requestWithdrawal", potId: wedding.id, amount: dollars(100), reason: "x" },
      { type: "requestTransfer", fromPotId: wedding.id, toPotId: bto.id, amount: dollars(100), reason: "x" },
      { type: "proposeSplit", potId: wedding.id, mode: "equal", shares: { [DEMO_DEPHANY]: 100, [DEMO_JULIAN]: 100 } },
      { type: "changeDates", potId: wedding.id, target_date: "2028-01-01", stageDates: {} },
      { type: "setWedding", potId: wedding.id, wedding: wedding.wedding! },
      { type: "deletePot", potId: wedding.id },
      { type: "renameCouple", name: "Hacked" },
      { type: "petCare", action: "food" },
      { type: "proposeCover", potId: wedding.id, month: "2026-10-01", amount: dollars(100), months: 3 },
    ];
    for (const cmd of forbidden) expect(() => run(s, cmd, ctx(DEMO_MUM)), cmd.type).toThrow(DomainError);
    // and nothing about the pending request changed
    expect(s.requests.find((r) => r.id === req.id)!.status).toBe("pending");
  });

  it("cannot edit or delete the ledger, even their own gift", () => {
    const s = fresh();
    const gift = s.transactions.find((t) => t.user_id === DEMO_MUM)!;
    expect(() => run(s, { type: "deleteContribution", txId: gift.id }, ctx(DEMO_MUM))).toThrow(DomainError);
    expect(() => run(s, { type: "editContribution", txId: gift.id, amount: 1, occurred_on: "2026-10-01", note: "" }, ctx(DEMO_MUM))).toThrow(DomainError);
  });

  it("rejects strangers who are neither a partner nor a contributor", () => {
    const s = fresh();
    expect(() => run(s, { type: "logContribution", potId: pot(s, "Our wedding").id, amount: 100, occurred_on: "2026-10-20", note: "" }, ctx("nobody"))).toThrow(/not part/);
  });

  it("partners keep full rights", () => {
    const s = fresh();
    expect(() => exec(s, DEMO_JULIAN, { type: "logContribution", potId: pot(s, "Our wedding").id, amount: dollars(100), occurred_on: "2026-10-20", note: "" })).not.toThrow();
  });
});
