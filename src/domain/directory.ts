/**
 * The directories of hotels, small venues, photographers and gown shops, and of renovation firms and furniture stores. Pure functions: filtering, sorting and the
 * "how good is it" score, so the page only has to call them.
 *
 * Nothing here is our own review. Each listing carries the star rating and vote count its source showed (where it
 * showed one), and the lists are built from published rankings and reader-rated directories.
 */
export type Category = "hotel" | "venue" | "photo" | "gown";
/** The renovation directory's lists: design firms and contractors, and furniture stores. */
export type RenoCategory = "firm" | "furniture";
export type AnyCategory = Category | RenoCategory;

/** Most hotels and boutiques are in the centre, so the centre is split into the areas people actually think in. */
export const REGIONS = [
  "Orchard & Tanglin",
  "Marina Bay & CBD",
  "City Hall, Bras Basah & Bugis",
  "Chinatown & Tanjong Pagar",
  "Riverside & Novena",
  "Botanic Gardens & Dempsey",
  "East",
  "West",
  "North & North-East",
  "South & Sentosa",
  "Not listed",
] as const;
export type Region = (typeof REGIONS)[number];

export interface Listing {
  category: AnyCategory;
  name: string;
  /** Neighbourhood or address, as the source gave it. */
  area: string;
  region: Region;
  /** e.g. "Hotel", "Garden restaurant", "Photo and video". */
  type: string;
  /** The number the price band is worked out from, in dollars. See `bandOf`. */
  cost?: number;
  /** A price level given directly (1 cheapest to 4 dearest), for lists where sources give a level, not a figure. */
  band?: 1 | 2 | 3 | 4;
  /** What the price means, in words: "from $2,588++ a table, min 30 tables". */
  priceNote: string;
  /** Star rating out of 5 and how many people voted, from the source. */
  rating?: number;
  votes?: number;
  /** Where the rating comes from. */
  ratingSource?: string;
  note: string;
  /** The business's own website, when we could confirm it loads. */
  url?: string;
  /** Its page on a directory site (SingaporeBrides, Qanvast), which carries details and an enquiry form. */
  profile?: string;
  /** Which published list it came from. */
  source: string;
}

export const BAND_RULES: Record<AnyCategory, { limits: [number, number, number]; unit: string }> = {
  hotel: { limits: [1300, 1900, 2500], unit: "a table of 10" },
  venue: { limits: [5000, 10000, 20000], unit: "for about 30 guests" },
  photo: { limits: [1300, 2300, 3500], unit: "from, for the main package" },
  gown: { limits: [800, 1400, 2500], unit: "rental, from" },
  firm: { limits: [35000, 45000, 60000], unit: "starting price" },
  furniture: { limits: [0, 0, 0], unit: "price level" },
};

/** For lists priced by level, not by figure. */
const LEVELS: Partial<Record<AnyCategory, [string, string, string, string]>> = {
  furniture: ["Budget", "Mid-range", "Premium", "Designer and luxury"],
};

/** 1 to 4, or undefined when the source gave no figure. */
export function bandOf(l: Pick<Listing, "category" | "cost" | "band">): 1 | 2 | 3 | 4 | undefined {
  if (l.band) return l.band;
  if (l.cost === undefined) return undefined;
  const [a, b, c] = BAND_RULES[l.category].limits;
  return l.cost < a ? 1 : l.cost < b ? 2 : l.cost < c ? 3 : 4;
}

/** What each band means for a category, e.g. "Under $1,300". */
export function bandLabel(category: AnyCategory, band: 1 | 2 | 3 | 4): string {
  const named = LEVELS[category];
  if (named) return named[band - 1];
  const [a, b, c] = BAND_RULES[category].limits;
  const f = (n: number) => "$" + n.toLocaleString("en-SG");
  return band === 1 ? `Under ${f(a)}` : band === 2 ? `${f(a)} to ${f(b - 1)}` : band === 3 ? `${f(b)} to ${f(c - 1)}` : `${f(c)} and up`;
}

const PRIOR_MEAN = 4.0;
const PRIOR_VOTES = 50;
/**
 * A rating, pulled towards 4.0 when few people voted. 4.8 from 3 votes should not beat 4.3 from 900. Listings with no
 * rating score zero and sort last.
 */
export function score(l: Pick<Listing, "rating" | "votes">): number {
  if (l.rating === undefined || !l.votes) return 0;
  return (l.votes / (l.votes + PRIOR_VOTES)) * l.rating + (PRIOR_VOTES / (l.votes + PRIOR_VOTES)) * PRIOR_MEAN;
}

/**
 * A listing worth flagging as well reviewed: a high rating from a real number of people. The numbers themselves are not
 * shown to couples; this is the only signal that reaches the screen.
 */
export const isWellReviewed = (l: Pick<Listing, "rating" | "votes">): boolean => (l.rating ?? 0) >= 4.3 && (l.votes ?? 0) >= 100;

/** The Vows.sg price list mixes Chinese restaurants in with hotels. They sell banquet tables too, but they are not hotels. */
export const isRestaurant = (l: Pick<Listing, "type">): boolean => /restaurant/i.test(l.type);

export type Sort = "best" | "reviewed" | "low" | "high";

export interface Filters {
  regions: Region[];
  bands: (1 | 2 | 3 | 4)[];
  /** Keep listings whose price is unknown when a price band is chosen. */
  keepUnpriced: boolean;
  /** Only listings that are well reviewed. */
  wellReviewed: boolean;
  q: string;
  sort: Sort;
}

export const emptyFilters = (): Filters => ({ regions: [], bands: [], keepUnpriced: true, wellReviewed: false, q: "", sort: "best" });

export function applyFilters(all: Listing[], f: Filters): Listing[] {
  const q = f.q.trim().toLowerCase();
  const out = all.filter((l) => {
    if (f.regions.length && !f.regions.includes(l.region)) return false;
    if (f.bands.length) {
      const b = bandOf(l);
      if (b === undefined ? !f.keepUnpriced : !f.bands.includes(b)) return false;
    }
    if (f.wellReviewed && !isWellReviewed(l)) return false;
    if (q && !`${l.name} ${l.area} ${l.type} ${l.note}`.toLowerCase().includes(q)) return false;
    return true;
  });
  const byPrice = (a: Listing, b: Listing, dir: 1 | -1) => {
    // listings with no price go last either way
    if (a.cost === undefined && b.cost === undefined) return 0;
    if (a.cost === undefined) return 1;
    if (b.cost === undefined) return -1;
    return (a.cost - b.cost) * dir;
  };
  return [...out].sort((a, b) => {
    if (f.sort === "low") return byPrice(a, b, 1) || score(b) - score(a);
    if (f.sort === "high") return byPrice(a, b, -1) || score(b) - score(a);
    if (f.sort === "reviewed") return (b.votes ?? 0) - (a.votes ?? 0) || score(b) - score(a);
    return score(b) - score(a) || (b.votes ?? 0) - (a.votes ?? 0);
  });
}

/** The best few in a category, for the printed guide. */
export const topPicks = (all: Listing[], n: number): Listing[] => applyFilters(all, emptyFilters()).slice(0, n);

/** A hotel's price for a table of 10, worked out from its price note. */
export interface TableQuote {
  /** Dollars for one table of 10. */
  amount: number;
  /** True when the source quoted "++" (plus service charge and GST). */
  plus: boolean;
  /** True when the source gave a range or "from", so this is the lowest figure. */
  from: boolean;
  /** True when the source priced per person and this is that figure times 10. */
  derived: boolean;
  /** The per-person figure it was worked out from, e.g. "$178++". */
  perPerson?: string;
  /** The minimum number of tables, when the source gave one. */
  minTables?: number;
}

/**
 * Hotels are compared by the price of a table of 10. Where a source quoted a table price, that is used as it is; where it
 * quoted per person, the figure is multiplied by 10 and marked as worked out. Notes that give neither (a minimum spend,
 * "basis not given") return undefined, and the page shows the source's own words.
 */
export function tableQuote(l: Pick<Listing, "category" | "priceNote">): TableQuote | undefined {
  if (l.category !== "hotel") return undefined;
  const note = l.priceNote;
  const table = /\b(?:a|per)\s+table\b/i.exec(note);
  const person = /\b(?:a|per)\s+(?:person|head|guest|pax)\b/i.exec(note);
  const hit = table && person ? (table.index < person.index ? table : person) : (table ?? person);
  if (!hit) return undefined;
  const figures = [...note.slice(0, hit.index).matchAll(/\$([\d,]+)(\+\+)?/g)].map((m) => ({ n: Number(m[1].replace(/,/g, "")), plus: !!m[2], raw: m[0] }));
  if (!figures.length) return undefined;
  const low = figures.reduce((a, b) => (b.n < a.n ? b : a));
  const derived = hit === person && hit !== table;
  const min = /min(?:imum)?\.?\s*(\d+)\s*tables?/i.exec(note);
  return {
    amount: derived ? low.n * 10 : low.n,
    plus: low.plus,
    from: figures.length > 1 || /\bfrom\b/i.test(note.slice(0, hit.index)),
    derived,
    perPerson: derived ? low.raw : undefined,
    minTables: min ? Number(min[1]) : undefined,
  };
}
