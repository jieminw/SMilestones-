import { describe, expect, it } from "vitest";
import { applyMutations, run, DomainError, type Command } from "@/domain/engine";
import { createDemoState, DEMO_DEPHANY, DEMO_JULIAN } from "@/data/seed";
import { angbaoSummary, validateWedding } from "@/domain/wedding";
import { potBudget, potOffset, potTarget, requiredMonthly } from "@/domain/selectors";
import { dollars } from "@/domain/money";
import type { CoupleState, WeddingMeta } from "@/domain/types";

const NOW = new Date("2026-10-20T10:00:00+08:00");
let n = 0;
const ctx = (userId: string) => ({ userId, now: NOW, newId: () => `w${++n}` });
const exec = (s: CoupleState, who: string, cmd: Command) => applyMutations(s, run(s, cmd, ctx(who)).mutations);
const wedding = (s: CoupleState) => s.pots.find((p) => p.name === "Our wedding")!;

const SPEC: WeddingMeta = { tables: 25, price_per_table: dollars(1_600), guests_per_table: 10, avg_angbao: dollars(120), categories: [] };

describe("ang bao offset", () => {
  it("matches the worked example: $40,000 banquet less $30,000 ang bao is $10,000", () => {
    const r = angbaoSummary(SPEC);
    expect(r.guests).toBe(250);
    expect(r.banquetGross).toBe(dollars(40_000));
    expect(r.expectedAngbao).toBe(dollars(30_000));
    expect(r.banquetNet).toBe(dollars(10_000));
  });

  it("never lets the net banquet cost go below zero", () => {
    const r = angbaoSummary({ ...SPEC, avg_angbao: dollars(500) });
    expect(r.expectedAngbao).toBe(dollars(125_000));
    expect(r.offset).toBe(dollars(40_000));
    expect(r.banquetNet).toBe(0);
  });

  it("weights by guest group when groups are set", () => {
    const r = angbaoSummary({ ...SPEC, categories: [{ name: "Family", guests: 100, avg: dollars(150) }, { name: "Friends", guests: 150, avg: dollars(100) }] });
    expect(r.guests).toBe(250);
    expect(r.expectedAngbao).toBe(dollars(100 * 150 + 150 * 100));
  });

  it("validates figures", () => {
    expect(validateWedding(SPEC)).toBeNull();
    expect(validateWedding({ ...SPEC, tables: -1 })).not.toBeNull();
    expect(validateWedding({ ...SPEC, tables: 2.5 })).not.toBeNull();
    expect(validateWedding({ ...SPEC, categories: [{ name: " ", guests: 1, avg: 1 }] })).not.toBeNull();
  });
});

describe("wedding pot target", () => {
  it("uses the net cost for the savings target while the full budget stays visible", () => {
    const s = createDemoState(NOW);
    const p = wedding(s);
    // seed: $40,000 budget, 20 tables × $1,400 = $28,000 banquet, 200 guests × $60 = $12,000 ang bao
    expect(potBudget(s, p.id)).toBe(dollars(40_000));
    expect(potOffset(s, p.id)).toBe(dollars(12_000));
    expect(potTarget(s, p.id)).toBe(dollars(28_000));
  });

  it("lowers the monthly target", () => {
    const s = createDemoState(NOW);
    const p = wedding(s);
    const withOffset = requiredMonthly(s, p, "2026-10-20");
    const without = requiredMonthly({ ...s, pots: s.pots.map((x) => (x.id === p.id ? { ...x, wedding: null } : x)) }, p, "2026-10-20");
    expect(withOffset).toBeLessThan(without);
  });

  it("setWedding updates the pot and rejects bad numbers and non-wedding pots", () => {
    const s = createDemoState(NOW);
    const next = exec(s, DEMO_JULIAN, { type: "setWedding", potId: wedding(s).id, wedding: SPEC });
    expect(wedding(next).wedding).toEqual(SPEC);
    expect(() => exec(s, DEMO_JULIAN, { type: "setWedding", potId: wedding(s).id, wedding: { ...SPEC, tables: -3 } })).toThrow(DomainError);
    const bto = s.pots.find((p) => p.name === "Our BTO")!;
    expect(() => exec(s, DEMO_DEPHANY, { type: "setWedding", potId: bto.id, wedding: SPEC })).toThrow(DomainError);
  });

  it("refuses an ang bao estimate that would leave a live pot over-funded", () => {
    let s = createDemoState(NOW);
    const p = wedding(s);
    s = exec(s, DEMO_DEPHANY, { type: "logContribution", potId: p.id, amount: dollars(18_000), occurred_on: "2026-10-20", note: "" });
    // a much bigger offset shrinks the target well below the money already saved
    expect(() => exec(s, DEMO_JULIAN, { type: "setWedding", potId: p.id, wedding: { ...SPEC, avg_angbao: dollars(150) } })).toThrow(DomainError);
  });
});
