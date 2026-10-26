import { describe, expect, it } from "vitest";
import { defaultDraft } from "@/lib/bto-draft";
import { APPLY_TO_SELECTION_MONTHS, assess, earliest, grownPrice, monthlyNeeded, type Target } from "@/domain/btoReadiness";

const d = defaultDraft(null);
const target: Target = { flatType: "4R", price: 400_000, waitingMonths: 36 };
const TODAY = "2026-10-25";
// with no CPF to lean on, nearly everything has to come out of savings
const noCpf = { ...d, oaA: 0, oaB: 0, includeFutureCpf: false };

describe("could we afford this, and when", () => {
  it("is ready now with plenty of cash", () => {
    const a = assess(d, target, { cash: 300_000, monthly: 0 }, 0, 0, TODAY);
    expect(a.status).toBe("ready");
    expect(a.extraMonthly).toBe(0);
    expect(a.signNeed).toBeGreaterThanOrEqual(a.bookNeed);
    expect(a.keysNeed).toBeGreaterThanOrEqual(a.signNeed);
  });

  it("is not ready with nothing saved and nothing coming in", () => {
    const a = assess(d, target, { cash: 0, monthly: 0 }, 0, 0, TODAY);
    expect(a.status).toBe("short");
    expect(a.extraMonthly).toBeGreaterThan(0);
  });

  it("is tight when booking and signing are covered but the keys payment is not", () => {
    const need = assess(noCpf, target, { cash: 0, monthly: 0 }, 0, 0, TODAY);
    const cash = Math.ceil(need.signNeed / 100) + 1;
    const a = assess(noCpf, target, { cash, monthly: 0 }, 0, 0, TODAY);
    expect(need.keysNeed).toBeGreaterThan(need.signNeed);
    expect(a.status).toBe("tight");
    expect(a.keysShort).toBeGreaterThan(0);
  });

  it("finds a booking month that saving more brings earlier", () => {
    const slow = earliest(d, target, { cash: 0, monthly: 800 }, 0, 240, TODAY);
    const fast = earliest(d, target, { cash: 0, monthly: 1_800 }, 0, 240, TODAY);
    expect(slow.ready).not.toBeNull();
    expect(fast.ready).not.toBeNull();
    expect(fast.ready!.months).toBeLessThan(slow.ready!.months);
    expect(slow.canBook!.months).toBeLessThanOrEqual(slow.ready!.months);
  });

  it("takes longer when prices grow while you save", () => {
    const flat = earliest(d, target, { cash: 0, monthly: 1_000 }, 0, 240, TODAY);
    const grow = earliest(d, target, { cash: 0, monthly: 1_000 }, 0.04, 240, TODAY);
    expect(grow.ready!.months).toBeGreaterThanOrEqual(flat.ready!.months);
    expect(grow.ready!.price).toBeGreaterThan(target.price);
  });

  it("gives up cleanly when it can never be afforded", () => {
    expect(earliest(d, target, { cash: 0, monthly: 0 }, 0, 60, TODAY).ready).toBeNull();
  });

  it("says what to save each month to be ready by a date, and that amount works", () => {
    const need = monthlyNeeded(noCpf, target, 5_000, 24, 0.03, TODAY);
    expect(need).toBeGreaterThan(0);
    const a = assess(noCpf, target, { cash: 5_000, monthly: Math.ceil(need / 100) }, 24, 0.03, TODAY);
    expect(a.status).toBe("ready");
  });

  it("does not turn a dollar short of the option fee into 'not ready' while saving continues", () => {
    // the option fee is $2,000, paid when the flat is chosen a few months after applying
    const now = assess(d, target, { cash: 1_999, monthly: 0 }, 0, 0, TODAY);
    expect(now.status).toBe("short");
    expect(now.bookShort).toBeGreaterThan(0);
    const adding = assess(d, target, { cash: 1_999, monthly: 1_500 }, APPLY_TO_SELECTION_MONTHS, 0, TODAY);
    const exact = assess(d, target, { cash: 2_000, monthly: 1_500 }, APPLY_TO_SELECTION_MONTHS, 0, TODAY);
    expect(adding.status).toBe(exact.status);
    expect(adding.bookShort).toBe(0);
  });

  it("can start the scan after the time to flat selection", () => {
    const a = earliest(d, target, { cash: 0, monthly: 1_000 }, 0, 240, TODAY, 5);
    expect(a.ready!.months).toBeGreaterThanOrEqual(5);
  });

  it("grows a price by a yearly rate", () => {
    expect(grownPrice(400_000, 12, 0.03)).toBe(412_000);
    expect(grownPrice(400_000, 0, 0.03)).toBe(400_000);
  });
});
