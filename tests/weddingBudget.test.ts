import { describe, expect, it } from "vitest";
import { HOTEL_NAMES, HOTEL_PRICES, allInPrice } from "@/data/weddingResources";
import { billedTables, buildStages, blankForm, blankLines, buildLines, cashPlan, usesAngbao, defaultForm, defaultItems, itemsFor, tablesFor, venueEstimate, type BudgetForm } from "@/domain/weddingBudget";

const form = (o: Partial<BudgetForm> = {}): BudgetForm => ({ ...defaultForm(), ...o });

describe("wedding budget form", () => {
  it("prices a hotel banquet by the table and a small venue by the guest", () => {
    expect(tablesFor(150)).toBe(15);
    expect(venueEstimate(form({ style: "hotel", guests: 150, perTable: "1288" }))).toBe(15 * 128_800);
    expect(venueEstimate(form({ style: "intimate", guests: 30, perHead: "120" }))).toBe(30 * 12_000);
  });

  it("offers small-wedding costs only for the intimate style", () => {
    expect(itemsFor("intimate").map((i) => i.id)).toContain("rentals");
    expect(itemsFor("hotel").map((i) => i.id)).not.toContain("rentals");
    expect(defaultItems("intimate")).toContain("weather");
  });

  it("builds a venue line first, named for the style, with the chosen venue as vendor", () => {
    const lines = buildLines(form({ style: "intimate", guests: 40, perHead: "100", venue: "The Summerhouse", items: ["photo"] }), []);
    expect(lines[0]).toMatchObject({ id: "venue", name: "Venue and catering", vendor: "The Summerhouse", budget: "4000" });
    expect(lines.map((l) => l.id)).toEqual(["venue", "photo"]);
  });

  it("keeps quotes and payments when the form is edited, and drops only untouched unticked lines", () => {
    const first = buildLines(form({ style: "hotel", items: ["photo", "rings", "decor"] }), []);
    first.find((l) => l.id === "photo")!.quote = "4000";
    first.find((l) => l.id === "rings")!.budget = "9999";
    first.push({ id: "c1", name: "Custom", vendor: "", budget: "100", quote: "", paid: "" });
    const next = buildLines(form({ style: "hotel", items: ["photo", "rings"] }), first);
    expect(next.find((l) => l.id === "photo")!.quote).toBe("4000");
    expect(next.find((l) => l.id === "rings")!.budget).toBe("9999");
    expect(next.find((l) => l.id === "decor")).toBeUndefined();
    expect(next.find((l) => l.id === "c1")).toBeDefined();
  });

  it("does not drop an unticked line that already has a payment against it", () => {
    const first = buildLines(form({ items: ["photo"] }), []);
    first[1].paid = "500";
    const next = buildLines(form({ items: [] }), first);
    expect(next.map((l) => l.id)).toEqual(["venue", "photo"]);
  });

  it("moves untouched placeholder figures to the new style but leaves edited ones", () => {
    const first = buildLines(form({ style: "hotel", items: ["photo", "rings"] }), []);
    first.find((l) => l.id === "rings")!.budget = "3500";
    const next = buildLines(form({ style: "intimate", items: ["photo", "rings"] }), first);
    expect(next.find((l) => l.id === "photo")!.budget).toBe("2500");
    expect(next.find((l) => l.id === "rings")!.budget).toBe("3500");
  });

  it("counts only part of the ang bao against the balance paid after the dinner", () => {
    // 150 guests at $150 = $22,500; hold back 40%, so count $13,500. Venue $20,000, 30% deposit, $14,000 after.
    const f = form({ style: "hotel", guests: 150, angbaoPerGuest: "150", angbaoBuffer: 40, depositPct: 30 });
    const c = cashPlan(f, 2_000_000, 4_500_000);
    expect(c).toMatchObject({ deposit: 600_000, balanceAfter: 1_400_000, gross: 2_250_000, held: 900_000, counted: 1_350_000 });
    expect(c.shortfall).toBe(50_000);
    expect(c.upfront).toBe(3_100_000);
    expect(c.ownTotal).toBe(3_150_000);
  });

  it("never counts more ang bao than the balance, and never goes negative", () => {
    const c = cashPlan(form({ guests: 300, angbaoPerGuest: "500", angbaoBuffer: 0, depositPct: 50 }), 1_000_000, 1_500_000);
    expect(c.covered).toBe(500_000);
    expect(c.shortfall).toBe(0);
    expect(c.upfront).toBe(1_000_000);
  });

  it("applies ang bao only when a hotel banquet is chosen", () => {
    expect(usesAngbao(form({ style: "hotel" }))).toBe(true);
    expect(usesAngbao(form({ style: "undecided" }))).toBe(false);
    expect(usesAngbao(form({ style: "intimate" }))).toBe(false);
  });

  it("starts a skipped plan with names but no figures, and fills them in on the first save", () => {
    const blank = blankLines();
    expect(blank.every((l) => l.budget === "" && l.quote === "" && l.paid === "")).toBe(true);
    expect(blankForm().guests).toBe(0);
    const lines = buildLines(form({ style: "intimate", guests: 30, perHead: "100" }), blank);
    expect(lines.find((l) => l.id === "venue")!.budget).toBe("3000");
    expect(lines.find((l) => l.id === "photo")!.budget).toBe("2500");
  });

  describe("milestone stages", () => {
    const base = () => {
      const f = form({ style: "intimate", guests: 30, perHead: "100", items: ["photo", "attire", "beauty", "rings"] });
      return { f, lines: buildLines(f, []) };
    };

    it("stacks stage costs and unlocks the next stage only when the one before is funded", () => {
      const { f, lines } = base();
      const none = buildStages(f, lines, 0);
      expect(none[0].unlocked).toBe(true);
      expect(none[1].unlocked).toBe(false);
      const costs = none.map((s) => s.cost);
      const funded = buildStages(f, lines, costs[0]);
      expect(funded[0].funded).toBe(true);
      expect(funded[1].unlocked).toBe(true);
      expect(funded[2].unlocked).toBe(false);
    });

    it("measures progress inside the open stage from what earlier stages already took", () => {
      const { f, lines } = base();
      const s = buildStages(f, lines, 0);
      const half = s[0].cost + s[1].cost / 2;
      const r = buildStages(f, lines, half);
      expect(r[1].progress).toBeCloseTo(0.5);
      expect(r[1].from).toBe(s[0].cost);
    });

    it("asks a hotel banquet only for its deposit up front", () => {
      const f = form({ style: "hotel", guests: 100, perTable: "1000", depositPct: 30, items: [] });
      const lines = buildLines(f, []);
      const [venue] = buildStages(f, lines, 0);
      // 10 tables x $1,000 = $10,000; 30% deposit = $3,000, plus the $500 registration line is not ticked here.
      expect(venue.lines.find((l) => l.id === "venue")).toBeDefined();
      expect(venue.cost).toBe(300_000);
    });

    it("puts custom lines in the details stage", () => {
      const { f, lines } = base();
      lines.push({ id: "c1", name: "Extra", vendor: "", budget: "250", quote: "", paid: "" });
      const details = buildStages(f, lines, 0).find((s) => s.def.id === "details")!;
      expect(details.lines.map((l) => l.id)).toContain("c1");
    });
  });

  describe("hotel prices", () => {
    it("has a published price for every hotel in the list", () => {
      for (const n of HOTEL_NAMES) expect(HOTEL_PRICES[n], n).toBeDefined();
    });

    it("adds service charge and GST to a ++ price, and leaves a nett price alone", () => {
      expect(allInPrice(HOTEL_PRICES["Marina Bay Sands"])).toBe(Math.round(2588 * 1.1 * 1.09));
      expect(allInPrice(HOTEL_PRICES["Holiday Inn Singapore Atrium"])).toBe(1758);
    });

    it("bills the hotel minimum when the guest list is smaller", () => {
      const f = form({ style: "hotel", guests: 100, perTable: "3000", minTables: 30 });
      expect(billedTables(f)).toBe(30);
      expect(venueEstimate(f)).toBe(30 * 300_000);
      expect(billedTables(form({ guests: 400, minTables: 30 }))).toBe(40);
    });
  });

  it("uses the couple's own estimates over the starting figures, on a new plan and on an edit", () => {
    const f = form({ style: "hotel", items: ["photo", "rings"], amounts: { photo: "3200", rings: "" } });
    const lines = buildLines(f, []);
    expect(lines.find((l) => l.id === "photo")!.budget).toBe("3200");
    expect(lines.find((l) => l.id === "rings")!.budget).toBe("");
    const again = buildLines({ ...f, amounts: { photo: "2800", rings: "5000" } }, lines);
    expect(again.find((l) => l.id === "photo")!.budget).toBe("2800");
    expect(again.find((l) => l.id === "rings")!.budget).toBe("5000");
  });
});
