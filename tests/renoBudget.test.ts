import { describe, expect, it } from "vitest";
import { blankRenoLines, buildRenoLines, buildRenoStages, defaultRenoForm, defaultRenoItems, itemEstimate, RENO_CATALOG, renoItemsFor, renoTotal, worksTotal, type RenoForm } from "@/domain/renoBudget";

const form = (o: Partial<RenoForm> = {}): RenoForm => ({ ...defaultRenoForm(), ...o });
const dollars = (c: number) => c / 100;

describe("renovation totals", () => {
  it("starts a 4-room BTO at the middle of the published range, and a resale flat 30% higher", () => {
    expect(worksTotal({ home: "bto", rooms: 4, finish: "mid" })).toBe(48_000);
    expect(worksTotal({ home: "resale", rooms: 4, finish: "mid" })).toBe(62_400);
    expect(worksTotal({ home: "bto", rooms: 4, finish: "basic" })).toBeLessThan(worksTotal({ home: "bto", rooms: 4, finish: "premium" }));
  });

  it("makes bigger flats cost more", () => {
    expect(worksTotal({ home: "bto", rooms: 3, finish: "mid" })).toBeLessThan(worksTotal({ home: "bto", rooms: 5, finish: "mid" }));
  });

  it("splits the works across lines that add up to the works total, for a BTO and a resale flat", () => {
    for (const home of ["bto", "resale"] as const) {
      const f = form({ home });
      const works = renoItemsFor(home).filter((i) => i.share).reduce((a, i) => a + itemEstimate(i, f), 0);
      // rounded to the nearest $100 per line, so allow a small drift
      expect(Math.abs(works - worksTotal(f))).toBeLessThanOrEqual(600);
    }
  });

  it("offers hacking only for a resale flat, and sets contingency at 10% of the works", () => {
    expect(renoItemsFor("bto").map((i) => i.id)).not.toContain("hack");
    expect(renoItemsFor("resale").map((i) => i.id)).toContain("hack");
    const buffer = RENO_CATALOG.find((i) => i.id === "buffer")!;
    expect(itemEstimate(buffer, form())).toBe(4_800);
  });

  it("puts carpentry as the largest works line", () => {
    const f = form();
    const lines = renoItemsFor("bto").filter((i) => i.share).map((i) => [i.id, itemEstimate(i, f)] as const);
    const top = [...lines].sort((a, b) => b[1] - a[1])[0];
    expect(top[0]).toBe("carpentry");
  });
});

describe("renovation lines", () => {
  it("builds the tracked lines with starting figures, and a blank plan has names but no figures", () => {
    const lines = buildRenoLines(form(), []);
    expect(lines.map((l) => l.id)).toEqual(defaultRenoItems("bto"));
    expect(lines.find((l) => l.id === "carpentry")!.budget).toBe("14900");
    expect(blankRenoLines().every((l) => l.budget === "")).toBe(true);
  });

  it("uses the couple's own estimate over the starting figure", () => {
    const f = form({ amounts: { carpentry: "20000" } });
    expect(buildRenoLines(f, []).find((l) => l.id === "carpentry")!.budget).toBe("20000");
  });

  it("moves untouched placeholder figures when the flat changes, but keeps edited ones and money already paid", () => {
    const first = buildRenoLines(form(), []);
    first.find((l) => l.id === "floor")!.budget = "9999";
    first.find((l) => l.id === "elec")!.paid = "500";
    first.find((l) => l.id === "elec")!.quote = "5200";
    const next = buildRenoLines(form({ rooms: 5, finish: "premium" }), first);
    expect(Number(next.find((l) => l.id === "carpentry")!.budget)).toBeGreaterThan(14_900);
    expect(next.find((l) => l.id === "floor")!.budget).toBe("9999");
    expect(next.find((l) => l.id === "elec")).toMatchObject({ paid: "500", quote: "5200" });
  });

  it("keeps the couple's own lines when the form is edited", () => {
    const first = buildRenoLines(form(), []);
    first.push({ id: "c1", name: "Smart lock", vendor: "", budget: "400", quote: "", paid: "" });
    expect(buildRenoLines(form({ rooms: 3 }), first).find((l) => l.id === "c1")).toBeDefined();
  });

  it("adds up to a sensible total for a 4-room BTO including furniture and appliances", () => {
    const total = dollars(renoTotal(buildRenoLines(form(), []).map((l) => ({ ...l, budget: l.budget }))) );
    expect(total).toBeGreaterThan(48_000);
    expect(total).toBeLessThan(90_000);
  });
});

describe("renovation milestones", () => {
  const lines = () => buildRenoLines(form(), []);

  it("lists the stages in the order the work happens, each with a cost", () => {
    const s = buildRenoStages(lines(), 0);
    expect(s.map((x) => x.def.id)).toEqual(["plan", "wet", "carpentry", "finish", "furnish", "buffer"]);
    expect(s.every((x) => x.cost > 0)).toBe(true);
    expect(s[0].unlocked).toBe(true);
    expect(s[1].unlocked).toBe(false);
  });

  it("opens the next stage only when the one before is funded, and measures progress inside the open one", () => {
    const base = buildRenoStages(lines(), 0);
    const funded = buildRenoStages(lines(), base[0].cost);
    expect(funded[0].funded).toBe(true);
    expect(funded[1].unlocked).toBe(true);
    expect(funded[2].unlocked).toBe(false);
    const half = buildRenoStages(lines(), base[0].cost + base[1].cost / 2);
    expect(half[1].progress).toBeCloseTo(0.5);
  });

  it("adds the couple's own milestones at the end, and puts custom lines in the contingency stage", () => {
    const ls = lines();
    ls.push({ id: "c1", name: "Smart lock", vendor: "", budget: "400", quote: "", paid: "" });
    const s = buildRenoStages(ls, 0, [{ id: "x1", title: "Balcony", cost: "1500" }]);
    expect(s[s.length - 1].def.title).toBe("Balcony");
    expect(s[s.length - 1].cost).toBe(150_000);
    expect(s.find((x) => x.def.id === "buffer")!.lines.map((l) => l.id)).toContain("c1");
  });
});
