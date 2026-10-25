import { describe, expect, it } from "vitest";
import { applyMutations, run, DomainError, type Command } from "@/domain/engine";
import { createDemoState, DEMO_DEPHANY, DEMO_JULIAN } from "@/data/seed";
import { completedMonths, MONEY_DATE_XP, moneyDateReady, moneyDateStatus, pickDecision, savedThisMonth } from "@/domain/moneyDate";
import { petStatus } from "@/domain/pet";
import { dollars } from "@/domain/money";
import type { CoupleState } from "@/domain/types";

const NOW = new Date("2026-10-20T10:00:00+08:00");
let n = 0;
const exec = (s: CoupleState, who: string, cmd: Command) => applyMutations(s, run(s, cmd, { userId: who, now: NOW, newId: () => `d${++n}` }).mutations);
const fresh = () => createDemoState(NOW);

describe("monthly money date", () => {
  it("is ready in the demo: last month was done together, this month is not", () => {
    const s = fresh();
    expect(completedMonths(s)).toEqual(["2026-09"]);
    const st = moneyDateStatus(s, DEMO_DEPHANY, "2026-10-20");
    expect(st).toMatchObject({ month: "2026-10", doneByMe: false, doneByPartner: false, complete: false });
    expect(moneyDateReady(s, DEMO_DEPHANY, "2026-10-20")).toBe(true);
  });

  it("needs both partners, and each can do it once a month", () => {
    let s = fresh();
    s = exec(s, DEMO_DEPHANY, { type: "completeMoneyDate" });
    expect(moneyDateStatus(s, DEMO_DEPHANY, "2026-10-20")).toMatchObject({ doneByMe: true, doneByPartner: false, complete: false });
    expect(() => exec(s, DEMO_DEPHANY, { type: "completeMoneyDate" })).toThrow(/already done/);
    // Julian is told it is his turn
    expect(s.notifications.some((x) => x.user_id === DEMO_JULIAN && /money date/i.test(x.text))).toBe(true);
    s = exec(s, DEMO_JULIAN, { type: "completeMoneyDate" });
    expect(moneyDateStatus(s, DEMO_JULIAN, "2026-10-20")).toMatchObject({ doneByMe: true, doneByPartner: true, complete: true });
    expect(moneyDateReady(s, DEMO_JULIAN, "2026-10-20")).toBe(false);
    expect(s.moneyDates.filter((m) => m.month === "2026-10-01")).toHaveLength(1); // one row for the month, not two
  });

  it("grows the streak and gives bonus XP only when both have done it", () => {
    const base = fresh();
    const before = petStatus(base, NOW);
    const one = exec(base, DEMO_DEPHANY, { type: "completeMoneyDate" });
    expect(petStatus(one, NOW).xp).toBe(before.xp); // one partner alone changes nothing
    const both = exec(one, DEMO_JULIAN, { type: "completeMoneyDate" });
    const after = petStatus(both, NOW);
    expect(after.xp).toBe(before.xp + MONEY_DATE_XP);
    expect(after.moneyDates).toBe(before.moneyDates + 1);
    expect(after.streakMonths).toBe(before.streakMonths + 1);
  });

  it("does not reset an existing contribution streak before the first money date", () => {
    const s = fresh();
    const withoutDates = { ...s, moneyDates: [] };
    expect(petStatus(withoutDates, NOW).streakMonths).toBeGreaterThan(0);
  });

  it("summarises what each person put in this month against what was agreed", () => {
    const rows = savedThisMonth(fresh(), "2026-10");
    const bto = rows.find((r) => r.potName === "Our BTO")!;
    const dephany = bto.perPerson.find((p) => p.userId === DEMO_DEPHANY)!;
    expect(dephany.done).toBe(dollars(720));
    expect(dephany.expected).toBe(dollars(720));
    const julian = bto.perPerson.find((p) => p.userId === DEMO_JULIAN)!;
    expect(julian.done).toBe(0);
  });

  it("picks the crunch month as the one decision when there is one", () => {
    const d = pickDecision(fresh(), "2026-10-20");
    expect(d.kind).toBe("crunch");
    expect(d.detail).toContain("Jun 2027");
  });

  it("falls back to an off-track pot, then a payback, then nothing", () => {
    let s = fresh();
    // drop the crunch by removing the wedding pot's money pressure: a very small trip and wedding
    s = { ...s, pots: s.pots.filter((p) => p.name === "Our BTO"), stages: s.stages.filter((x) => x.pot_id === s.pots.find((p) => p.name === "Our BTO")!.id) };
    const d = pickDecision(s, "2026-10-20");
    expect(["offtrack", "payback", "none"]).toContain(d.kind);
    const quiet = { ...s, covers: [], proposals: s.proposals.map((p) => ({ ...p, monthly_total: dollars(100_000) })) };
    expect(pickDecision(quiet, "2026-10-20").kind).toBe("none");
  });

  it("is for the couple only", () => {
    expect(() => run(fresh(), { type: "completeMoneyDate" }, { userId: "demo-mum", now: NOW, newId: () => "x" })).toThrow(DomainError);
  });
});
