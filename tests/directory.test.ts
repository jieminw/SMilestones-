import { describe, expect, it } from "vitest";
import { LISTINGS } from "@/data/directory";
import { applyFilters, bandOf, emptyFilters, isRestaurant, isWellReviewed, REGIONS, score, topPicks, type Listing } from "@/domain/directory";

const L = (o: Partial<Listing> & Pick<Listing, "name">): Listing => ({ category: "hotel", area: "", region: "Orchard & Tanglin", type: "Hotel", priceNote: "", note: "", source: "t", ...o });

describe("directory data", () => {
  it("has at least 30 listings in every section", () => {
    for (const [cat, list] of Object.entries(LISTINGS)) expect(list.length, cat).toBeGreaterThanOrEqual(30);
  });

  it("uses known regions, sane ratings, and no duplicate names within a section", () => {
    for (const [cat, list] of Object.entries(LISTINGS)) {
      const seen = new Set<string>();
      for (const l of list) {
        expect(REGIONS, `${cat}: ${l.name}`).toContain(l.region);
        if (l.rating !== undefined) {
          expect(l.rating).toBeGreaterThanOrEqual(1);
          expect(l.rating).toBeLessThanOrEqual(5);
          expect(l.votes, `${l.name} has a rating but no votes`).toBeGreaterThan(0);
        }
        expect(seen.has(l.name), `duplicate ${l.name}`).toBe(false);
        seen.add(l.name);
        expect(l.source, l.name).not.toBe("");
      }
    }
  });
});

describe("hotels versus restaurants", () => {
  it("keeps at least 30 actual hotels once the Chinese restaurants are set aside", () => {
    const hotels = LISTINGS.hotel.filter((l) => !isRestaurant(l));
    expect(hotels.length).toBeGreaterThanOrEqual(30);
    expect(LISTINGS.hotel.length - hotels.length).toBeGreaterThan(0);
    for (const l of hotels) expect(l.type, l.name).not.toMatch(/restaurant/i);
  });
});

describe("price bands", () => {
  it("sorts a table price into four bands and leaves unpriced ones undefined", () => {
    expect(bandOf({ category: "hotel", cost: 1100 })).toBe(1);
    expect(bandOf({ category: "hotel", cost: 1300 })).toBe(2);
    expect(bandOf({ category: "hotel", cost: 2000 })).toBe(3);
    expect(bandOf({ category: "hotel", cost: 4292 })).toBe(4);
    expect(bandOf({ category: "hotel", cost: undefined })).toBeUndefined();
  });
});

describe("ranking", () => {
  it("does not let a high rating from a handful of votes beat a strong rating from many", () => {
    expect(score({ rating: 4.8, votes: 3 })).toBeLessThan(score({ rating: 4.3, votes: 900 }));
    expect(score({ rating: undefined, votes: undefined })).toBe(0);
  });

  it("puts unrated listings last in the default order", () => {
    const list = [L({ name: "none" }), L({ name: "good", rating: 4.5, votes: 200 })];
    expect(topPicks(list, 2).map((l) => l.name)).toEqual(["good", "none"]);
  });
});

describe("filters", () => {
  const list = [
    L({ name: "A", region: "Orchard & Tanglin", cost: 1000, rating: 4.4, votes: 100 }),
    L({ name: "B", region: "East", cost: 2000, rating: 4.0, votes: 100 }),
    L({ name: "C", region: "East", cost: undefined, rating: 4.6, votes: 100 }),
    L({ name: "D", region: "West", cost: 3000 }),
  ];
  const names = (f: Partial<ReturnType<typeof emptyFilters>>) => applyFilters(list, { ...emptyFilters(), ...f }).map((l) => l.name).sort();

  it("filters by location, and by several locations at once", () => {
    expect(names({ regions: ["East"] })).toEqual(["B", "C"]);
    expect(names({ regions: ["East", "West"] })).toEqual(["B", "C", "D"]);
  });

  it("filters by price band, keeping unpriced listings only when asked", () => {
    expect(names({ bands: [1] })).toEqual(["A", "C"]);
    expect(names({ bands: [1], keepUnpriced: false })).toEqual(["A"]);
    expect(names({ bands: [1, 3] })).toEqual(["A", "B", "C"]);
  });

  it("flags a listing as well reviewed only with a high rating and enough votes", () => {
    expect(isWellReviewed({ rating: 4.5, votes: 200 })).toBe(true);
    expect(isWellReviewed({ rating: 4.8, votes: 12 })).toBe(false);
    expect(isWellReviewed({ rating: 4.0, votes: 900 })).toBe(false);
    expect(isWellReviewed({})).toBe(false);
  });

  it("filters to well-reviewed listings and by search text", () => {
    expect(names({ wellReviewed: true })).toEqual(["A", "C"]);
    expect(names({ q: "b" })).toEqual(["B"]);
  });

  it("sorts by price with unpriced last, either way", () => {
    const low = applyFilters(list, { ...emptyFilters(), sort: "low" }).map((l) => l.name);
    const high = applyFilters(list, { ...emptyFilters(), sort: "high" }).map((l) => l.name);
    expect(low).toEqual(["A", "B", "D", "C"]);
    expect(high).toEqual(["D", "B", "A", "C"]);
  });
});
