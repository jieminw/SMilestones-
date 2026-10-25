import { parseMoney, type Cents } from "./money";

/**
 * The wedding budget form: what kind of wedding, how many guests, where, and which costs to track. Pure functions, so
 * the page only has to call them. Every starting figure is a placeholder for the couple to replace with a real quote.
 */
export type Style = "hotel" | "intimate" | "undecided";

export interface WeddingDates { banquet: string; photoshoot: string; rom: string; honeymoon: string }

export interface BudgetForm {
  style: Style;
  guests: number;
  /** Venue name, or "" when not decided. */
  venue: string;
  /** Hotel banquet price per table of 10, in dollars. */
  perTable: string;
  /** The fewest tables the chosen hotel will sell, or 0 for none. */
  minTables: number;
  /** Small venue price per guest, in dollars. */
  perHead: string;
  /** Hotel banquets only: what each guest is expected to give in ang bao, in dollars. */
  angbaoPerGuest: string;
  /** Share of the expected ang bao to treat as not coming, 0 to 100. */
  angbaoBuffer: number;
  /** Share of the banquet paid before the day as a deposit, 0 to 100. The rest is paid after the dinner. */
  depositPct: number;
  /** The couple's own estimate for each cost line, in dollars, by line id. Overrides the starting figure. */
  amounts?: Record<string, string>;
  /** Ids of the cost lines to track (the venue line is always there). */
  items: string[];
}

export interface Line { id: string; name: string; vendor: string; budget: string; quote: string; paid: string }

export interface Item {
  id: string;
  name: string;
  hint: string;
  /** Placeholder budget in dollars for each style. */
  hotel: number;
  intimate: number;
  /** Shown only for this style (undecided shows the hotel set). */
  only?: "hotel" | "intimate";
  /** Ticked by default. */
  on: boolean;
}

export const CATALOG: Item[] = [
  { id: "photo", name: "Photography and videography", hint: "Photographer for the day", hotel: 4500, intimate: 2500, on: true },
  { id: "attire", name: "Attire and bridal", hint: "Gown, suit, alterations", hotel: 5000, intimate: 2500, on: true },
  { id: "beauty", name: "Hair and make-up", hint: "Usually bundled, with a trial", hotel: 1800, intimate: 1000, on: true },
  { id: "rings", name: "Rings", hint: "Bands for both", hotel: 4000, intimate: 3000, on: true },
  { id: "decor", name: "Florals and décor", hint: "Bouquet, tables, backdrop", hotel: 3000, intimate: 2000, on: true },
  { id: "entertain", name: "Emcee, band or entertainment", hint: "Hosting and music", hotel: 2500, intimate: 500, on: true },
  { id: "fees", name: "Registration and solemnisation", hint: "Registry fees and solemniser", hotel: 500, intimate: 500, on: true },
  { id: "favours", name: "Invitations, favours and door gifts", hint: "Printed or digital", hotel: 1500, intimate: 500, on: true },
  { id: "rentals", name: "Rentals: chairs, tables and sound", hint: "When the venue is bare", hotel: 0, intimate: 800, only: "intimate", on: true },
  { id: "weather", name: "Wet-weather backup", hint: "A tent or an indoor fallback for outdoor spaces", hotel: 0, intimate: 600, only: "intimate", on: true },
  { id: "transport", name: "Guest transport and parking", hint: "Shuttle or parking for a venue off the MRT line", hotel: 0, intimate: 300, only: "intimate", on: false },
  { id: "honeymoon", name: "Honeymoon", hint: "Flights and stay", hotel: 6000, intimate: 4000, on: false },
  { id: "buffer", name: "Contingency", hint: "For what nobody plans for", hotel: 3000, intimate: 1500, on: true },
];

export const itemsFor = (style: Style): Item[] => CATALOG.filter((i) => !i.only || i.only === (style === "intimate" ? "intimate" : "hotel"));
export const defaultItems = (style: Style): string[] => itemsFor(style).filter((i) => i.on).map((i) => i.id);
export const itemBudget = (i: Item, style: Style): number => (style === "intimate" ? i.intimate : i.hotel);

export const defaultForm = (): BudgetForm => ({ style: "undecided", guests: 150, venue: "", perTable: "1288", minTables: 0, perHead: "120", angbaoPerGuest: "150", angbaoBuffer: 40, depositPct: 30, items: defaultItems("undecided") });

/** The lines for a plan nobody has filled in yet: the usual names, no amounts. */
export const blankLines = (): Line[] => [
  { id: "venue", name: venueLineName("undecided"), vendor: "", budget: "", quote: "", paid: "" },
  ...defaultItems("undecided").map((id) => ({ id, name: CATALOG.find((i) => i.id === id)!.name, vendor: "", budget: "", quote: "", paid: "" })),
];

/** A form with every figure empty, for a plan nobody has filled in yet. */
export const blankForm = (): BudgetForm => ({ ...defaultForm(), guests: 0, perTable: "", perHead: "", angbaoPerGuest: "" });

export const tablesFor = (guests: number) => Math.ceil(Math.max(guests || 0, 0) / 10);

/** Tables the hotel bills: your guests need this many, but the hotel may insist on a minimum. */
export const billedTables = (f: BudgetForm) => Math.max(tablesFor(f.guests), f.minTables || 0);

const cents = (v: string): Cents => parseMoney(v) ?? 0;

/** What the venue should cost, before service charge and GST. */
export function venueEstimate(f: BudgetForm): Cents {
  return f.style === "intimate" ? Math.max(f.guests || 0, 0) * cents(f.perHead) : billedTables(f) * cents(f.perTable);
}

export const venueLineName = (style: Style) => (style === "intimate" ? "Venue and catering" : "Banquet and venue");

/**
 * Turn the form into budget lines. Lines the couple already worked on keep their vendor, quote and paid figures; ticking
 * something new adds it, unticking removes it unless money is already recorded against it. Custom lines are left alone.
 */
export function buildLines(f: BudgetForm, existing: Line[]): Line[] {
  const by = new Map(existing.map((l) => [l.id, l]));
  const venueOld = by.get("venue");
  const venue: Line = {
    id: "venue",
    name: venueLineName(f.style),
    vendor: f.venue || venueOld?.vendor || "",
    budget: String(venueEstimate(f) / 100),
    quote: venueOld?.quote ?? "",
    paid: venueOld?.paid ?? "",
  };
  const catalogIds = new Set(CATALOG.map((i) => i.id));
  const picked: Line[] = [];
  for (const i of itemsFor(f.style)) {
    const old = by.get(i.id);
    // An untouched placeholder (still one of the two starting figures, nothing quoted or paid) follows the style.
    const untouched = old && !cents(old.quote) && !cents(old.paid) && ["", String(i.hotel), String(i.intimate)].includes(old.budget.trim());
    const given = f.amounts && i.id in f.amounts ? f.amounts[i.id].trim() : undefined;
    const fresh = { id: i.id, name: i.name, vendor: "", budget: given ?? String(itemBudget(i, f.style)), quote: "", paid: "" };
    // The couple's own estimate wins. Without one, an untouched placeholder follows the style.
    if (f.items.includes(i.id)) picked.push(!old ? fresh : given !== undefined ? { ...old, budget: given } : untouched ? { ...old, budget: fresh.budget } : old);
    else if (old && (cents(old.quote) || cents(old.paid))) picked.push(old);
  }
  // A line from a style the couple has since left, with money against it, is kept rather than dropped.
  const kept = new Set(picked.map((l) => l.id));
  const stray = existing.filter((l) => l.id !== "venue" && catalogIds.has(l.id) && !kept.has(l.id) && (cents(l.quote) || cents(l.paid)));
  const custom = existing.filter((l) => l.id !== "venue" && !catalogIds.has(l.id));
  return [venue, ...picked, ...stray, ...custom];
}

export const totalOf = (lines: Line[]): Cents => lines.reduce((a, l) => a + (cents(l.quote) || cents(l.budget)), 0);

/** Ang bao only comes into it when the couple chose a hotel banquet: the balance is paid after the dinner. */
export const usesAngbao = (f: BudgetForm) => f.style === "hotel";

export interface CashPlan {
  deposit: Cents;
  /** The part of the banquet paid after the dinner. */
  balanceAfter: Cents;
  /** Expected ang bao before any buffer. */
  gross: Cents;
  /** Held back because ang bao is never certain. */
  held: Cents;
  /** The ang bao we are willing to count on. */
  counted: Cents;
  covered: Cents;
  /** What the ang bao is not expected to cover, paid from savings after the dinner. */
  shortfall: Cents;
  /** Cash to pay before the banquet: everything except the balance paid after it. */
  upfront: Cents;
  /** Upfront plus any shortfall: the most you should plan to pay from your own money. */
  ownTotal: Cents;
}

const clampPct = (n: number) => Math.min(Math.max(Number(n) || 0, 0), 100);

/** Split a banquet into what is paid before and after the day, and set the counted ang bao against the after part. */
export function cashPlan(f: BudgetForm, venueCost: Cents, totalCost: Cents): CashPlan {
  const deposit = Math.round((venueCost * clampPct(f.depositPct)) / 100);
  const balanceAfter = venueCost - deposit;
  const gross = Math.max(f.guests || 0, 0) * cents(f.angbaoPerGuest);
  const held = Math.round((gross * clampPct(f.angbaoBuffer)) / 100);
  const counted = gross - held;
  const covered = Math.min(counted, balanceAfter);
  const shortfall = balanceAfter - covered;
  const upfront = totalCost - balanceAfter;
  return { deposit, balanceAfter, gross, held, counted, covered, shortfall, upfront, ownTotal: upfront + shortfall };
}

// ---------------------------------------------------------------- milestones
/**
 * The wedding as a run of stages. Each stage has a cost, and the costs stack up: a stage is funded once the couple's
 * savings reach everything up to and including it, and the next stage unlocks when the one before it is funded.
 */
export interface StageDef {
  id: string;
  title: string;
  blurb: string;
  /** Cost lines that belong to this stage. Custom lines go to the last stage that takes them. */
  lineIds: string[];
  /** A checklist for when the stage is open. */
  tasks: string[];
  custom?: boolean;
}

export const STAGE_DEFS: StageDef[] = [
  { id: "venue", title: "Lock in the venue", blurb: "Choose where, and pay to hold the date.", lineIds: ["venue", "fees"], tasks: ["Visit at least three venues and ask for written quotes", "Pay the deposit to hold your date", "Book your registration with the Registry of Marriages"] },
  { id: "capture", title: "Capture it", blurb: "Photographers book out early.", lineIds: ["photo"], tasks: ["Shortlist photographers and ask to see full albums", "Book the photoshoot and pick a location", "Book the photographer for the day itself"] },
  { id: "look", title: "The look", blurb: "Outfits, rings and getting ready.", lineIds: ["attire", "beauty", "rings"], tasks: ["Choose gown, suits and attire vendors", "Book hair and make-up, with a trial", "Order the rings"] },
  { id: "details", title: "The details", blurb: "The things that make it feel like yours.", lineIds: ["decor", "entertain", "favours", "rentals", "weather", "transport"], custom: true, tasks: ["Order invitations and open RSVPs", "Confirm florals, décor and the run of show", "Plan the seating and the programme"] },
  { id: "extras", title: "Honeymoon and buffer", blurb: "The trip, and a cushion for surprises.", lineIds: ["honeymoon", "buffer"], tasks: ["Book flights and the stay", "Leave the contingency untouched until the final week"] },
];

export interface Stage {
  def: StageDef;
  lines: Line[];
  /** What this stage asks you to have saved. */
  cost: Cents;
  /** Savings needed before this stage starts, and once it is funded. */
  from: Cents;
  to: Cents;
  funded: boolean;
  unlocked: boolean;
  /** 0 to 1: how much of this stage's cost is saved. */
  progress: number;
}

/** What a line asks for in cash before the day. A hotel venue only needs its deposit up front. */
export function lineCost(f: BudgetForm, l: Line, venueDeposit: Cents): Cents {
  if (l.id === "venue" && usesAngbao(f)) return venueDeposit;
  return cents(l.quote) || cents(l.budget);
}

/** A milestone the couple added themselves, after the built-in ones. The cost is in dollars. */
export interface ExtraMilestone {
  id: string;
  title: string;
  cost: string;
}

export function buildStages(f: BudgetForm, lines: Line[], saved: Cents, extras: ExtraMilestone[] = []): Stage[] {
  const venue = lines.find((l) => l.id === "venue");
  const venueCost = venue ? cents(venue.quote) || cents(venue.budget) : 0;
  const deposit = Math.round((venueCost * clampPct(f.depositPct)) / 100);
  const known = new Set(STAGE_DEFS.flatMap((d) => d.lineIds));
  const lastCustom = STAGE_DEFS.map((d) => d.custom).lastIndexOf(true);
  let from = 0;
  let prevFunded = true;
  const out: Stage[] = [];
  STAGE_DEFS.forEach((def, i) => {
    const mine = lines.filter((l) => def.lineIds.includes(l.id) || (i === lastCustom && !known.has(l.id)));
    const cost = mine.reduce((a, l) => a + lineCost(f, l, deposit), 0);
    const to = from + cost;
    const unlocked = prevFunded;
    const funded = unlocked && saved >= to;
    const progress = cost === 0 ? (funded ? 1 : 0) : unlocked ? Math.min(Math.max((saved - from) / cost, 0), 1) : 0;
    out.push({ def, lines: mine, cost, from, to, funded, unlocked, progress });
    prevFunded = funded;
    from = to;
  });
  for (const x of extras) {
    const def: StageDef = { id: x.id, title: x.title || "Your milestone", blurb: "Added by you.", lineIds: [], tasks: [] };
    const cost = cents(x.cost);
    const to = from + cost;
    const unlocked: boolean = prevFunded;
    const funded: boolean = unlocked && saved >= to;
    const progress = cost === 0 ? (funded ? 1 : 0) : unlocked ? Math.min(Math.max((saved - from) / cost, 0), 1) : 0;
    out.push({ def, lines: [], cost, from, to, funded, unlocked, progress });
    prevFunded = funded;
    from = to;
  }
  return out;
}
