import { describe, expect, it } from "vitest";
import { applyMutations, run, DomainError, type Command } from "@/domain/engine";
import { emptyState, createDemoState, DEMO_DEPHANY, DEMO_JULIAN } from "@/data/seed";
import { creditedIn, expectedShare, paybacks, whosAhead } from "@/domain/covers";
import { inboxFor, potBalance } from "@/domain/selectors";
import { dollars } from "@/domain/money";
import type { CoupleState, Pot, SplitProposal, Stage } from "@/domain/types";

const A = "a";
const B = "b";
let n = 0;
const at = (iso: string) => new Date(`${iso}T10:00:00+08:00`);
const exec = (s: CoupleState, who: string, cmd: Command, iso: string) => applyMutations(s, run(s, cmd, { userId: who, now: at(iso), newId: () => `c${++n}` }).mutations);

function base(): CoupleState {
  const people = [
    { id: A, couple_id: "c", display_name: "Eloise", monthly_income: 3600, age: 26, first_timer: true, cpf_oa: null, created_at: "" },
    { id: B, couple_id: "c", display_name: "Caleb", monthly_income: 3900, age: 27, first_timer: true, cpf_oa: null, created_at: "" },
  ];
  const s = emptyState("c", people, "E & C");
  const pot: Pot = { id: "p", couple_id: "c", kind: "custom", name: "Savings", subtitle: "", status: "active", sequential: false, target_date: "2028-12-01", created_by: A, created_at: "", bto: null, wedding: null };
  const stage: Stage = { id: "st", pot_id: "p", idx: 0, name: "Target", description: "", target: dollars(100_000), due_date: null };
  const split: SplitProposal = {
    id: "sp", pot_id: "p", couple_id: "c", proposed_by: A, mode: "custom", shares: { [A]: dollars(720), [B]: dollars(780) }, monthly_total: dollars(1_500),
    status: "accepted", response_note: null, responded_at: null, created_at: "",
  };
  s.pots = [pot];
  s.stages = [stage];
  s.proposals = [split];
  return s;
}

/** March: Caleb pays his share, Eloise misses hers. Caleb offers to cover $720 over 3 months and she accepts. */
function covered(): CoupleState {
  let s = base();
  s = exec(s, B, { type: "logContribution", potId: "p", amount: dollars(780), occurred_on: "2027-03-03", note: "" }, "2027-03-03");
  s = exec(s, B, { type: "proposeCover", potId: "p", month: "2027-03-01", amount: dollars(720), months: 3 }, "2027-03-20");
  const id = s.covers[0].id;
  return exec(s, A, { type: "respondCover", coverId: id, accept: true }, "2027-03-21");
}

describe("cover me", () => {
  it("logs the payer's contribution and credits it to the covered partner's share", () => {
    const s = covered();
    expect(s.covers[0].status).toBe("accepted");
    expect(potBalance(s, "p")).toBe(dollars(780 + 720));
    expect(creditedIn(s, "p", A, "2027-03")).toBe(dollars(720));
    expect(creditedIn(s, "p", B, "2027-03")).toBe(dollars(780)); // the cover does not count towards his own share
  });

  it("raises her expected share by a third for the next three months", () => {
    const s = covered();
    // worked example: $720 missed, spread over 3 months = $240 a month on top of $720
    for (const month of ["2027-04", "2027-05", "2027-06"]) expect(expectedShare(s, "p", A, month)).toBe(dollars(960));
    expect(expectedShare(s, "p", A, "2027-03")).toBe(dollars(720));
    expect(expectedShare(s, "p", A, "2027-07")).toBe(dollars(720));
    expect(expectedShare(s, "p", B, "2027-04")).toBe(dollars(780));
  });

  it("tracks who is ahead until the payback is complete", () => {
    let s = covered();
    expect(whosAhead(s)).toEqual({ leaderId: B, amount: dollars(720) });
    s = exec(s, A, { type: "logContribution", potId: "p", amount: dollars(960), occurred_on: "2027-04-05", note: "" }, "2027-04-05");
    expect(paybacks(s)[0].repaid).toBe(dollars(240));
    expect(whosAhead(s).amount).toBe(dollars(480));
    s = exec(s, A, { type: "logContribution", potId: "p", amount: dollars(960), occurred_on: "2027-05-05", note: "" }, "2027-05-05");
    s = exec(s, A, { type: "logContribution", potId: "p", amount: dollars(960), occurred_on: "2027-06-05", note: "" }, "2027-06-05");
    expect(paybacks(s)[0].outstanding).toBe(0);
    expect(whosAhead(s)).toEqual({ leaderId: null, amount: 0 });
    expect(expectedShare(s, "p", A, "2027-06")).toBe(dollars(720)); // nothing left to pay back
  });

  it("only the covered partner can answer, and the payer can withdraw while pending", () => {
    let s = base();
    s = exec(s, B, { type: "proposeCover", potId: "p", month: "2027-03-01", amount: dollars(300), months: 2 }, "2027-03-20");
    const id = s.covers[0].id;
    expect(inboxFor(s, A, at("2027-03-20")).covers).toHaveLength(1);
    expect(inboxFor(s, B, at("2027-03-20")).covers).toHaveLength(0);
    expect(() => exec(s, B, { type: "respondCover", coverId: id, accept: true }, "2027-03-21")).toThrow(DomainError);
    const declined = exec(s, A, { type: "respondCover", coverId: id, accept: false }, "2027-03-21");
    expect(declined.covers[0].status).toBe("declined");
    expect(potBalance(declined, "p")).toBe(0);
    const cancelled = exec(s, B, { type: "cancelCover", coverId: id }, "2027-03-21");
    expect(cancelled.covers[0].status).toBe("cancelled");
    expect(() => exec(s, A, { type: "cancelCover", coverId: id }, "2027-03-21")).toThrow(DomainError);
  });

  it("rejects amounts above what is actually missing, bad terms and duplicates", () => {
    let s = base();
    const cmd = (amount: number, months = 3, month = "2027-03-01"): Command => ({ type: "proposeCover", potId: "p", month, amount, months });
    expect(() => exec(s, B, cmd(dollars(800)), "2027-03-20")).toThrow(/short/);
    expect(() => exec(s, B, cmd(0), "2027-03-20")).toThrow(DomainError);
    expect(() => exec(s, B, cmd(dollars(100), 9), "2027-03-20")).toThrow(DomainError);
    expect(() => exec(s, B, cmd(dollars(100), 3, "2027-05-01"), "2027-03-20")).toThrow(/started/);
    s = exec(s, B, cmd(dollars(100)), "2027-03-20");
    expect(() => exec(s, B, cmd(dollars(100)), "2027-03-21")).toThrow(/already/);
    // a partner who already paid in full needs no cover
    const paid = exec(base(), A, { type: "logContribution", potId: "p", amount: dollars(720), occurred_on: "2027-03-02", note: "" }, "2027-03-02");
    expect(() => exec(paid, B, cmd(dollars(100)), "2027-03-20")).toThrow(/already/);
  });

  it("shows a cover in the demo seed with a payback under way", () => {
    const s = createDemoState(new Date("2026-10-20T10:00:00+08:00"));
    const p = paybacks(s);
    expect(p).toHaveLength(1);
    expect(p[0].cover.payer_id).toBe(DEMO_JULIAN);
    expect(p[0].cover.for_user_id).toBe(DEMO_DEPHANY);
    expect(whosAhead(s).leaderId).toBe(DEMO_JULIAN);
  });
});
