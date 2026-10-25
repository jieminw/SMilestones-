import { describe, expect, it } from "vitest";
import { RENO_LISTINGS } from "@/data/renoDirectory";
import { applyFilters, bandLabel, bandOf, emptyFilters, REGIONS } from "@/domain/directory";

describe("renovation directory data", () => {
  it("has at least 30 firms and 30 furniture stores", () => {
    expect(RENO_LISTINGS.firm.length).toBeGreaterThanOrEqual(30);
    expect(RENO_LISTINGS.furniture.length).toBeGreaterThanOrEqual(30);
  });

  it("uses known regions, sane ratings, a source on every row, and no duplicate names", () => {
    for (const [cat, list] of Object.entries(RENO_LISTINGS)) {
      const seen = new Set<string>();
      for (const l of list) {
        expect(REGIONS, `${cat}: ${l.name}`).toContain(l.region);
        expect(l.category).toBe(cat);
        expect(l.source, l.name).not.toBe("");
        if (l.rating !== undefined) {
          expect(l.rating).toBeGreaterThanOrEqual(1);
          expect(l.rating).toBeLessThanOrEqual(5);
          expect(l.votes, `${l.name} has a rating but no votes`).toBeGreaterThan(0);
        }
        expect(seen.has(l.name), `duplicate ${l.name}`).toBe(false);
        seen.add(l.name);
      }
    }
  });

  it("gives every furniture store a price level, and puts firms with a published starting price in a band", () => {
    for (const l of RENO_LISTINGS.furniture) expect(bandOf(l), l.name).toBeDefined();
    const priced = RENO_LISTINGS.firm.filter((l) => l.cost !== undefined);
    expect(priced.length).toBeGreaterThan(5);
    for (const l of priced) expect(bandOf(l)).toBeDefined();
    expect(bandLabel("furniture", 1)).toBe("Budget");
    expect(bandLabel("firm", 1)).toMatch(/^Under \$/);
  });

  it("filters furniture by price level and orders firms by weighted reviews", () => {
    const premium = applyFilters(RENO_LISTINGS.furniture, { ...emptyFilters(), bands: [4], keepUnpriced: false });
    expect(premium.length).toBeGreaterThan(0);
    expect(premium.every((l) => l.band === 4)).toBe(true);
    const top = applyFilters(RENO_LISTINGS.firm, emptyFilters())[0];
    expect(top.rating).toBeGreaterThanOrEqual(4.8);
    expect(top.votes ?? 0).toBeGreaterThan(200);
  });
});
