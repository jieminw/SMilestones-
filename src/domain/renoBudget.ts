import { parseMoney, type Cents } from "./money";
import type { ExtraMilestone, Line, Stage, StageDef } from "./weddingBudget";

/**
 * The renovation planning form: what kind of home, how big, how fine a finish, and which costs to track. Every starting
 * figure is a placeholder for the couple to replace with a real quote. Pure functions, so the pages only call them.
 *
 * The totals come from published 2026 cost guides (see RENO_SOURCES): a 4-room BTO is roughly $35,000 to $60,000 for the
 * works, a resale flat 20% to 40% more, with carpentry the largest line. Those guides leave out furniture and
 * appliances, so those are separate lines here.
 */
export type Home = "bto" | "resale";
export type Rooms = 3 | 4 | 5;
export type Finish = "basic" | "mid" | "premium";

export interface RenoDates {
  keys: string;
  movein: string;
}

export interface RenoForm {
  home: Home;
  rooms: Rooms;
  finish: Finish;
  /** The couple's own estimate for each cost line, in dollars, by line id. Overrides the starting figure. */
  amounts?: Record<string, string>;
  /** Ids of the cost lines to track. */
  items: string[];
}

export const RENO_SOURCES = [
  { label: "Terris: best HDB BTO interior design firms (Aug 2026)", url: "https://terris.sg/blog/best-hdb-bto-interior-design-singapore" },
  { label: "SmartCalculator: HDB renovation cost, 2026", url: "https://www.smartcalculator.sg/articles/hdb-renovation-cost-singapore-2026" },
  { label: "ShopBack: HDB renovation cost", url: "https://www.shopback.sg/blog/finance/hdb-renovation-cost" },
  { label: "MoneySmart: 3, 4 and 5-room HDB renovation cost", url: "https://www.moneysmart.sg/personal-loan/3-4-and-5-room-hdb-renovation-cost-ms" },
];

export const HOME_LABEL: Record<Home, string> = { bto: "New BTO flat", resale: "Resale flat" };
/** The home as it reads mid-sentence: "new BTO flat", "resale flat". */
export const homeNoun = (h: Home): string => (h === "bto" ? "new BTO flat" : "resale flat");
export const FINISH_LABEL: Record<Finish, string> = { basic: "Simple", mid: "Mid-range", premium: "Designer" };
export const SQM: Record<Rooms, number> = { 3: 65, 4: 90, 5: 110 };

/** Works only, for a new BTO flat, in dollars: the low end, the middle and the high end of the published ranges. */
const BASE: Record<Rooms, Record<Finish, number>> = {
  3: { basic: 25_000, mid: 35_000, premium: 55_000 },
  4: { basic: 35_000, mid: 48_000, premium: 75_000 },
  5: { basic: 45_000, mid: 58_000, premium: 90_000 },
};
/** A resale flat costs 20% to 40% more, mostly for hacking and rewiring: the middle of that range. */
const RESALE_UPLIFT = 1.3;

export interface RenoItem {
  id: string;
  name: string;
  hint: string;
  /** Share of the works total, for the works lines. Extras use `fixed` instead. */
  share?: number;
  /** Fixed placeholder by flat size, for the lines outside the works total. */
  fixed?: Record<Rooms, number>;
  /** Shown only for this kind of home. */
  only?: Home;
  on: boolean;
}

/** The works lines. With a resale flat, hacking takes 12% and the rest scale down so the shares still sum to 100%. */
export const RENO_CATALOG: RenoItem[] = [
  { id: "hack", name: "Hacking and disposal", hint: "Taking out old walls, tiles and fixtures", share: 0.12, only: "resale", on: true },
  { id: "carpentry", name: "Carpentry and built-ins", hint: "Wardrobes, shoe cabinet, TV console", share: 0.31, on: true },
  { id: "wet", name: "Kitchen and bathrooms", hint: "Cabinets, worktop, vanity, fittings", share: 0.22, on: true },
  { id: "floor", name: "Flooring and tiling", hint: "Tiling over existing tiles, or new flooring", share: 0.13, on: true },
  { id: "elec", name: "Electrical and lighting", hint: "Points, wiring and lights", share: 0.1, on: true },
  { id: "paint", name: "Painting", hint: "Walls, ceiling and touch-ups", share: 0.06, on: true },
  { id: "window", name: "Windows, grilles and gate", hint: "Window grilles, laundry rack, gate", share: 0.05, on: true },
  { id: "plumb", name: "Plumbing", hint: "Pipes, water heater point, taps", share: 0.04, on: true },
  { id: "ceil", name: "Ceiling and partitions", hint: "False ceiling, light troughs, partitions", share: 0.04, on: true },
  { id: "misc", name: "Permits, cleaning and sundries", hint: "Renovation permit, final clean, haulage", share: 0.05, on: true },
  { id: "aircon", name: "Air-conditioning", hint: "Units and installation", fixed: { 3: 4_000, 4: 5_500, 5: 7_000 }, on: true },
  { id: "furniture", name: "Furniture and soft furnishings", hint: "Sofa, beds, dining set, curtains. Not in the works figures", fixed: { 3: 8_000, 4: 12_000, 5: 15_000 }, on: true },
  { id: "appliances", name: "Appliances", hint: "Fridge, washer, hob, hood, heater. Not in the works figures", fixed: { 3: 5_000, 4: 7_000, 5: 9_000 }, on: true },
  { id: "buffer", name: "Contingency", hint: "10% of the works, for hidden defects and changes", on: true },
];

const WORKS_IDS = RENO_CATALOG.filter((i) => i.share).map((i) => i.id);
const cents = (v: string): Cents => parseMoney(v) ?? 0;

/** The works total for this flat, in dollars. */
export function worksTotal(f: Pick<RenoForm, "home" | "rooms" | "finish">): number {
  return Math.round(BASE[f.rooms][f.finish] * (f.home === "resale" ? RESALE_UPLIFT : 1));
}

export const defaultRenoForm = (): RenoForm => ({ home: "bto", rooms: 4, finish: "mid", items: defaultRenoItems("bto") });

export const renoItemsFor = (home: Home): RenoItem[] => RENO_CATALOG.filter((i) => !i.only || i.only === home);
export const defaultRenoItems = (home: Home): string[] => renoItemsFor(home).filter((i) => i.on).map((i) => i.id);

function shareOf(i: RenoItem, home: Home): number {
  const s = i.share ?? 0;
  return home === "resale" ? (i.id === "hack" ? s : s * 0.88) : s;
}

/** A starting estimate for one line, in dollars, rounded to the nearest $100. */
export function itemEstimate(i: RenoItem, f: Pick<RenoForm, "home" | "rooms" | "finish">): number {
  if (i.id === "buffer") return Math.round((worksTotal(f) * 0.1) / 100) * 100;
  if (i.fixed) return i.fixed[f.rooms];
  return Math.round((worksTotal(f) * shareOf(i, f.home)) / 100) * 100;
}

/** Turn the form into budget lines, keeping vendors, quotes and payments already recorded. */
export function buildRenoLines(f: RenoForm, existing: Line[]): Line[] {
  const by = new Map(existing.map((l) => [l.id, l]));
  const known = new Set(RENO_CATALOG.map((i) => i.id));
  const out: Line[] = [];
  for (const i of renoItemsFor(f.home)) {
    const old = by.get(i.id);
    const given = f.amounts && i.id in f.amounts ? f.amounts[i.id].trim() : undefined;
    const fresh: Line = { id: i.id, name: i.name, vendor: "", budget: given ?? String(itemEstimate(i, f)), quote: "", paid: "" };
    const touched = !!old && (cents(old.quote) || cents(old.paid));
    if (f.items.includes(i.id)) {
      if (!old) out.push(fresh);
      else if (given !== undefined) out.push({ ...old, budget: given });
      else if (!touched && isPlaceholder(old.budget, i)) out.push({ ...old, budget: fresh.budget });
      else out.push(old);
    } else if (old && touched) out.push(old);
  }
  // lines from the other kind of home that already have money against them stay, and so do the couple's own
  const kept = new Set(out.map((l) => l.id));
  const stray = existing.filter((l) => known.has(l.id) && !kept.has(l.id) && (cents(l.quote) || cents(l.paid)));
  const custom = existing.filter((l) => !known.has(l.id));
  return [...out, ...stray, ...custom];
}

/** True when a budget is still one of the starting figures, for any flat size, finish or home. */
function isPlaceholder(budget: string, i: RenoItem): boolean {
  const b = budget.trim();
  if (b === "") return true;
  const homes: Home[] = ["bto", "resale"];
  for (const home of homes) for (const rooms of [3, 4, 5] as Rooms[]) for (const finish of ["basic", "mid", "premium"] as Finish[]) if (String(itemEstimate(i, { home, rooms, finish })) === b) return true;
  return false;
}

export const blankRenoLines = (): Line[] => defaultRenoItems("bto").map((id) => ({ id, name: RENO_CATALOG.find((i) => i.id === id)!.name, vendor: "", budget: "", quote: "", paid: "" }));
export const blankRenoForm = (): RenoForm => ({ ...defaultRenoForm(), items: defaultRenoItems("bto") });

export const renoTotal = (lines: Line[]): Cents => lines.reduce((a, l) => a + (cents(l.quote) || cents(l.budget)), 0);
export const worksIds = WORKS_IDS;

// ---------------------------------------------------------------- milestones
/**
 * The renovation as a run of stages, in the order the work happens. Each stage has a cost, and the costs stack up: a
 * stage is funded once the couple's savings reach everything up to and including it, and the next one unlocks then.
 */
export const RENO_STAGE_DEFS: StageDef[] = [
  { id: "plan", title: "Plan and permits", blurb: "Quotes, the contract and the permit, before any work starts.", lineIds: ["misc"], tasks: ["Collect three itemised quotes from HDB-registered firms", "Check your floor plan: bold lines are walls you cannot hack", "Sign the contract and let the firm submit the permits"] },
  { id: "wet", title: "Hacking and wet works", blurb: "The noisy, messy part: walls, pipes, wiring and bathrooms.", lineIds: ["hack", "plumb", "wet", "elec"], tasks: ["Confirm the works schedule and hours with your contractor", "Check waterproofing is done before tiling", "Walk the site after the wet works"] },
  { id: "carpentry", title: "Carpentry and flooring", blurb: "Built-ins, flooring and ceiling. Usually the biggest bill.", lineIds: ["carpentry", "floor", "ceil"], tasks: ["Approve the carpentry drawings before cutting starts", "Check the hardware brand and warranty in writing", "Inspect flooring for gaps and hollow tiles"] },
  { id: "finish", title: "Finishing touches", blurb: "Paint, windows and air-conditioning.", lineIds: ["paint", "window", "aircon"], tasks: ["Do a defects walkthrough and list everything to fix", "Hold back the final payment until the list is cleared", "Deep clean before the furniture arrives"] },
  { id: "furnish", title: "Furnish and move in", blurb: "Furniture and appliances, timed to the work ending.", lineIds: ["furniture", "appliances"], tasks: ["Order made-to-order furniture early: it takes weeks", "Book delivery after the final clean", "Keep every warranty and receipt in one place"] },
  { id: "buffer", title: "Contingency", blurb: "A cushion for what nobody plans for.", lineIds: ["buffer"], custom: true, tasks: ["Leave the contingency untouched until the final week"] },
];

export function buildRenoStages(lines: Line[], saved: Cents, extras: ExtraMilestone[] = []): Stage[] {
  const known = new Set(RENO_STAGE_DEFS.flatMap((d) => d.lineIds));
  const lastCustom = RENO_STAGE_DEFS.map((d) => d.custom).lastIndexOf(true);
  let from = 0;
  let prevFunded = true;
  const out: Stage[] = [];
  const push = (def: StageDef, mine: Line[], cost: Cents) => {
    const to = from + cost;
    const unlocked: boolean = prevFunded;
    const funded: boolean = unlocked && saved >= to;
    const progress = cost === 0 ? (funded ? 1 : 0) : unlocked ? Math.min(Math.max((saved - from) / cost, 0), 1) : 0;
    out.push({ def, lines: mine, cost, from, to, funded, unlocked, progress });
    prevFunded = funded;
    from = to;
  };
  RENO_STAGE_DEFS.forEach((def, i) => {
    const mine = lines.filter((l) => def.lineIds.includes(l.id) || (i === lastCustom && !known.has(l.id)));
    push(def, mine, mine.reduce((a, l) => a + (cents(l.quote) || cents(l.budget)), 0));
  });
  for (const x of extras) push({ id: x.id, title: x.title || "Your milestone", blurb: "Added by you.", lineIds: [], tasks: [] }, [], cents(x.cost));
  return out;
}
