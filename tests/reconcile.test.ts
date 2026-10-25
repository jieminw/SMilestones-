import { describe, expect, it } from "vitest";
import { applyMutations, run, DomainError, type Command } from "@/domain/engine";
import { createDemoState, DEMO_DEPHANY, DEMO_JULIAN } from "@/data/seed";
import { detectColumns, emptyMapping, headerSignature, parseAmount, parseCsv, parseDate, parseStatement, payeeKey, reconcile, type StatementLine } from "@/domain/reconcile";
import { dollars } from "@/domain/money";
import type { CoupleState, Transaction } from "@/domain/types";

const NOW = new Date("2026-10-20T10:00:00+08:00");
let n = 0;
const exec = (s: CoupleState, who: string, cmd: Command) => applyMutations(s, run(s, cmd, { userId: who, now: NOW, newId: () => `r${++n}` }).mutations);

describe("CSV parsing", () => {
  it("handles quotes, commas inside quotes, escaped quotes, CRLF and a BOM", () => {
    const rows = parseCsv('﻿Date,Description,Amount\r\n05/10/2026,"FAST PAYMENT, DBS ""Joint""",-720.00\r\n\r\n06/10/2026,GIRO,-50\r\n');
    expect(rows).toEqual([
      ["Date", "Description", "Amount"],
      ["05/10/2026", 'FAST PAYMENT, DBS "Joint"', "-720.00"],
      ["06/10/2026", "GIRO", "-50"],
    ]);
  });

  it("keeps newlines that sit inside a quoted field", () => {
    expect(parseCsv('a,"line1\nline2",c')).toEqual([["a", "line1\nline2", "c"]]);
  });

  it("does not assume a fixed format: different banks map to different columns", () => {
    expect(detectColumns(["Transaction Date", "Transaction Details", "Withdrawals", "Deposits", "Balance"])).toMatchObject({ date: 0, description: 1, amountMode: "split", debit: 2, credit: 3 });
    expect(detectColumns(["Date", "Narrative", "Amount"])).toMatchObject({ date: 0, description: 1, amountMode: "signed", amount: 2 });
    expect(headerSignature(["Date", "Narrative", "Amount"])).toBe(headerSignature(["DATE", "narrative", " Amount "]));
  });
});

describe("values", () => {
  it("reads common date formats", () => {
    expect(parseDate("2026-10-05")).toBe("2026-10-05");
    expect(parseDate("05/10/2026")).toBe("2026-10-05"); // day first by default
    expect(parseDate("05/10/2026", "mdy")).toBe("2026-05-10");
    expect(parseDate("5-Oct-2026")).toBe("2026-10-05");
    expect(parseDate("05 Oct 26")).toBe("2026-10-05");
    expect(parseDate("31/02/2026")).toBeNull();
    expect(parseDate("not a date")).toBeNull();
  });

  it("reads amounts with symbols, thousands separators, brackets and DR/CR", () => {
    expect(parseAmount("1,234.50")).toBe(123_450);
    expect(parseAmount("S$ 720")).toBe(72_000);
    expect(parseAmount("-45.00")).toBe(-4_500);
    expect(parseAmount("(45.00)")).toBe(-4_500);
    expect(parseAmount("45.00 DR")).toBe(-4_500);
    expect(parseAmount("45.00 CR")).toBe(4_500);
    expect(parseAmount("")).toBeNull();
    expect(parseAmount("n/a")).toBeNull();
  });

  it("builds statement lines from a signed column or from debit and credit columns", () => {
    const signed = parseStatement(parseCsv("Date,Desc,Amount\n05/10/2026,SAVINGS,-720\n06/10/2026,SALARY,3500\nbad,row,x"), { ...emptyMapping(), amount: 2 });
    expect(signed.lines.map((l) => l.amount)).toEqual([-72_000, 350_000]);
    expect(signed.skipped).toBe(1);
    const split = parseStatement(parseCsv("Date,Desc,Debit,Credit\n05/10/2026,SAVINGS,720.00,\n06/10/2026,SALARY,,3500.00"), { ...emptyMapping(), amountMode: "split", debit: 2, credit: 3 });
    expect(split.lines.map((l) => l.amount)).toEqual([-72_000, 350_000]);
  });
});

const tx = (id: string, amount: number, date: string, user = "u", verified: string | null = null): Transaction => ({
  id, couple_id: "c", pot_id: "p", kind: "contribution", amount: dollars(amount), user_id: user, note: "", occurred_on: date, created_at: "", edited_at: null, voided_at: null, request_id: null, verified_at: verified,
});
const line = (index: number, date: string, amount: number, description = "SAVINGS"): StatementLine => ({ index, date, description, amount: dollars(amount) });
const withTx = (...t: Transaction[]): CoupleState => ({ ...createDemoState(NOW), transactions: t });

describe("matching", () => {
  it("matches an exact amount on the same day", () => {
    const r = reconcile(withTx(tx("a", 720, "2026-10-05")), [line(0, "2026-10-05", -720)], { userId: "u" });
    expect(r.matched).toHaveLength(1);
    expect(r.matched[0]).toMatchObject({ txId: "a", offsetDays: 0 });
    expect(r.notFound).toEqual([]);
  });

  it("allows the date to be up to three days apart and no more", () => {
    const s = withTx(tx("a", 720, "2026-10-05"), tx("b", 300, "2026-10-05"));
    const r = reconcile(s, [line(0, "2026-10-08", -720), line(1, "2026-10-09", -300)], { userId: "u" });
    expect(r.matched.map((m) => m.txId)).toEqual(["a"]); // 3 days: yes
    expect(r.matched[0].offsetDays).toBe(3);
    expect(r.notFound.map((t) => t.id)).toEqual(["b"]); // 4 days: no
    const early = reconcile(withTx(tx("a", 720, "2026-10-05")), [line(0, "2026-10-02", -720)], { userId: "u" });
    expect(early.matched).toHaveLength(1);
  });

  it("matches duplicate amounts one-to-one, closest date first", () => {
    const s = withTx(tx("a", 500, "2026-10-05"), tx("b", 500, "2026-10-06"));
    const both = reconcile(s, [line(0, "2026-10-05", -500), line(1, "2026-10-06", -500)], { userId: "u" });
    expect(both.matched).toHaveLength(2);
    expect(new Set(both.matched.map((m) => m.line.index)).size).toBe(2);
    // one debit can only vouch for one contribution
    const one = reconcile(s, [line(0, "2026-10-05", -500)], { userId: "u" });
    expect(one.matched).toHaveLength(1);
    expect(one.notFound).toHaveLength(1);
    expect(one.matched[0].txId).toBe("a");
  });

  it("flags a logged contribution with no matching debit", () => {
    const r = reconcile(withTx(tx("a", 720, "2026-10-05")), [line(0, "2026-10-05", -721), line(1, "2026-10-05", 720)], { userId: "u" });
    expect(r.matched).toEqual([]);
    expect(r.notFound.map((t) => t.id)).toEqual(["a"]); // wrong amount, and a credit is not a debit
  });

  it("only checks the statement owner's contributions, and skips voided entries", () => {
    const partners = { ...tx("p", 720, "2026-10-05", "other") };
    const voided = { ...tx("v", 720, "2026-10-05"), voided_at: "2026-10-06T00:00:00Z" };
    const r = reconcile(withTx(partners, voided), [line(0, "2026-10-05", -720)], { userId: "u" });
    expect(r.matched).toEqual([]);
    expect(r.notFound).toEqual([]);
  });

  it("suggests unlogged transfers to a payee that already matched", () => {
    const s = withTx(tx("a", 720, "2026-10-05"));
    const r = reconcile(s, [
      line(0, "2026-10-05", -720, "FAST PAYMENT TO JOINT SAVINGS 8841"),
      line(1, "2026-11-05", -720, "FAST PAYMENT TO JOINT SAVINGS 9120"),
      line(2, "2026-11-06", -35, "NETS GRAB FOOD"),
    ], { userId: "u" });
    expect(r.suggestions.map((l) => l.index)).toEqual([1]);
    expect(payeeKey("FAST PAYMENT TO JOINT SAVINGS 8841")).toBe(payeeKey("FAST PAYMENT TO JOINT SAVINGS 9120"));
  });

  it("remembers what was already verified", () => {
    const r = reconcile(withTx(tx("a", 720, "2026-10-05", "u", "2026-10-06T00:00:00Z")), [line(0, "2026-10-05", -720)], { userId: "u" });
    expect(r.alreadyVerified).toEqual(["a"]);
  });
});

describe("verification flag", () => {
  const mine = (s: CoupleState) => s.transactions.filter((t) => t.user_id === DEMO_JULIAN && t.kind === "contribution" && !t.verified_at);

  it("stores only a timestamp on the contributions the user made", () => {
    const s = createDemoState(NOW);
    const t = mine(s)[0];
    const next = exec(s, DEMO_JULIAN, { type: "markVerified", txIds: [t.id] });
    expect(next.transactions.find((x) => x.id === t.id)!.verified_at).toBe(NOW.toISOString());
  });

  it("refuses someone else's contribution, a non-contribution or nothing at all", () => {
    const s = createDemoState(NOW);
    const theirs = s.transactions.find((t) => t.user_id === DEMO_DEPHANY && t.kind === "contribution" && !t.verified_at)!;
    expect(() => exec(s, DEMO_JULIAN, { type: "markVerified", txIds: [theirs.id] })).toThrow(DomainError);
    expect(() => exec(s, DEMO_JULIAN, { type: "markVerified", txIds: [] })).toThrow(DomainError);
    expect(() => exec(s, DEMO_JULIAN, { type: "markVerified", txIds: ["nope"] })).toThrow(DomainError);
  });

  it("clears the flag when the amount or date is edited, but not when only the note changes", () => {
    let s = createDemoState(NOW);
    const t = mine(s)[0];
    s = exec(s, DEMO_JULIAN, { type: "markVerified", txIds: [t.id] });
    const sameNote = exec(s, DEMO_JULIAN, { type: "editContribution", txId: t.id, amount: t.amount, occurred_on: t.occurred_on, note: "renamed" });
    expect(sameNote.transactions.find((x) => x.id === t.id)!.verified_at).toBeTruthy();
    const newAmount = exec(s, DEMO_JULIAN, { type: "editContribution", txId: t.id, amount: t.amount - dollars(10), occurred_on: t.occurred_on, note: t.note });
    expect(newAmount.transactions.find((x) => x.id === t.id)!.verified_at).toBeNull();
  });

  it("the demo seed has some contributions already verified", () => {
    const s = createDemoState(NOW);
    expect(s.transactions.some((t) => t.verified_at)).toBe(true);
    expect(s.transactions.some((t) => t.kind === "contribution" && !t.verified_at)).toBe(true);
  });
});
