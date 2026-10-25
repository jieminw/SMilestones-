/**
 * Real BTO project data, transcribed from HDB's official press-release annexes:
 *  - Feb 2026: https://www.hdb.gov.sg/-/media/hdb-pulse/news/2026/hdb-launches-9012-flats-in-february-2026-bto-and-sbf-exercises/Annex-A.pdf
 *  - Jun 2026: https://www.hdb.gov.sg/-/media/hdb-pulse/news/2026/20260617-HDB-Launches-6952-Flats-Across-7-Projects-in-June-2026-BTO-Sales-Exercise/Annex-A.pdf
 * Prices are indicative ranges excluding grants (99-year lease).
 * Waiting time = months from median flat selection to median projected completion.
 */

export type FlatTypeId = "2R40" | "2R48" | "3R" | "4R" | "5R" | "3GEN";
export type Classification = "Standard" | "Plus" | "Prime";

export interface FlatOffer {
  type: FlatTypeId;
  units: number;
  internalSqm: number;
  minPrice: number; // dollars
  maxPrice: number; // dollars
}

export interface BtoProject {
  id: string;
  name: string;
  town: string;
  region: "North" | "North-East" | "East" | "Central" | "West";
  launch: "Feb 2026" | "Jun 2026";
  classification: Classification;
  waitingMonths: number;
  includesFinishes: boolean; // price includes floor finishes, internal doors & sanitary fittings
  flats: FlatOffer[];
  source: string;
}

export const FLAT_TYPE_LABEL: Record<FlatTypeId, string> = {
  "2R40": "2-room Flexi (38 sqm)",
  "2R48": "2-room Flexi (46 sqm)",
  "3R": "3-room",
  "4R": "4-room",
  "5R": "5-room",
  "3GEN": "3Gen",
};

export const FLAT_TYPE_SHORT: Record<FlatTypeId, string> = {
  "2R40": "2-room",
  "2R48": "2-room",
  "3R": "3-room",
  "4R": "4-room",
  "5R": "5-room",
  "3GEN": "3Gen",
};

const FEB = "https://www.hdb.gov.sg/-/media/hdb-pulse/news/2026/hdb-launches-9012-flats-in-february-2026-bto-and-sbf-exercises/Annex-A.pdf";
const JUN = "https://www.hdb.gov.sg/-/media/hdb-pulse/news/2026/20260617-HDB-Launches-6952-Flats-Across-7-Projects-in-June-2026-BTO-Sales-Exercise/Annex-A.pdf";

const f = (type: FlatTypeId, units: number, internalSqm: number, minPrice: number, maxPrice: number): FlatOffer => ({
  type, units, internalSqm, minPrice, maxPrice,
});

export const BTO_PROJECTS: BtoProject[] = [
  // ---------- June 2026 ----------
  {
    id: "woodgrove-acres", name: "Woodgrove Acres", town: "Woodlands", region: "North",
    launch: "Jun 2026", classification: "Standard", waitingMonths: 42, includesFinishes: false, source: JUN,
    flats: [f("2R40", 31, 38, 137_000, 170_000), f("2R48", 126, 46, 164_000, 211_000), f("3R", 80, 66, 260_000, 325_000), f("4R", 162, 90, 353_000, 437_000), f("5R", 257, 110, 472_000, 582_000)],
  },
  {
    id: "sembawang-portico", name: "Sembawang Portico", town: "Sembawang", region: "North",
    launch: "Jun 2026", classification: "Standard", waitingMonths: 31, includesFinishes: true, source: JUN,
    flats: [f("2R40", 50, 38, 142_000, 184_000), f("2R48", 150, 46, 157_000, 225_000), f("3R", 100, 66, 250_000, 344_000), f("4R", 300, 90, 320_000, 437_000), f("5R", 275, 110, 465_000, 579_000)],
  },
  {
    id: "sembawang-brook", name: "Sembawang Brook", town: "Sembawang", region: "North",
    launch: "Jun 2026", classification: "Standard", waitingMonths: 33, includesFinishes: true, source: JUN,
    flats: [f("2R40", 58, 38, 139_000, 187_000), f("2R48", 203, 46, 164_000, 218_000), f("3R", 87, 66, 257_000, 333_000), f("4R", 464, 90, 302_000, 428_000), f("5R", 319, 110, 420_000, 571_000), f("3GEN", 29, 115, 468_000, 567_000)],
  },
  {
    id: "kebun-baru-ridge", name: "Kebun Baru Ridge", town: "Ang Mo Kio", region: "North-East",
    launch: "Jun 2026", classification: "Plus", waitingMonths: 37, includesFinishes: false, source: JUN,
    flats: [f("3R", 95, 63, 380_000, 492_000), f("4R", 390, 86, 543_000, 693_000)],
  },
  {
    id: "kebun-baru-breeze", name: "Kebun Baru Breeze", town: "Ang Mo Kio", region: "North-East",
    launch: "Jun 2026", classification: "Plus", waitingMonths: 52, includesFinishes: false, source: JUN,
    flats: [f("2R40", 261, 36, 191_000, 275_000), f("2R48", 116, 46, 255_000, 349_000), f("4R", 202, 86, 547_000, 746_000)],
  },
  {
    id: "lakeview-cascadia", name: "Lakeview Cascadia", town: "Bishan", region: "Central",
    launch: "Jun 2026", classification: "Prime", waitingMonths: 51, includesFinishes: false, source: JUN,
    flats: [f("2R40", 118, 38, 216_000, 287_000), f("2R48", 358, 46, 257_000, 361_000), f("4R", 745, 86, 534_000, 742_000)],
  },
  {
    id: "berlayar-rise", name: "Berlayar Rise", town: "Bukit Merah", region: "Central",
    launch: "Jun 2026", classification: "Prime", waitingMonths: 54, includesFinishes: false, source: JUN,
    flats: [f("2R40", 172, 38, 247_000, 341_000), f("2R48", 644, 46, 296_000, 406_000), f("3R", 172, 64, 435_000, 591_000), f("4R", 988, 86, 592_000, 810_000)],
  },
  // ---------- February 2026 ----------
  {
    id: "sembawang-voyage", name: "Sembawang Voyage", town: "Sembawang", region: "North",
    launch: "Feb 2026", classification: "Standard", waitingMonths: 44, includesFinishes: false, source: FEB,
    flats: [f("2R40", 81, 38, 150_000, 187_000), f("2R48", 210, 46, 175_000, 228_000), f("4R", 454, 90, 304_000, 422_000), f("5R", 428, 110, 439_000, 582_000)],
  },
  {
    id: "sembawang-deck", name: "Sembawang Deck", town: "Sembawang", region: "North",
    launch: "Feb 2026", classification: "Standard", waitingMonths: 33, includesFinishes: true, source: FEB,
    flats: [f("2R40", 42, 38, 158_000, 190_000), f("2R48", 146, 46, 175_000, 237_000), f("3R", 84, 66, 261_000, 343_000), f("4R", 271, 90, 338_000, 426_000), f("5R", 234, 110, 479_000, 585_000)],
  },
  {
    id: "tampines-bliss", name: "Tampines Bliss", town: "Tampines", region: "East",
    launch: "Feb 2026", classification: "Standard", waitingMonths: 23, includesFinishes: true, source: FEB,
    flats: [f("3R", 80, 66, 363_000, 444_000), f("4R", 204, 90, 481_000, 600_000)],
  },
  {
    id: "tampines-nova", name: "Tampines Nova", town: "Tampines", region: "East",
    launch: "Feb 2026", classification: "Plus", waitingMonths: 32, includesFinishes: true, source: FEB,
    flats: [f("2R40", 24, 38, 197_000, 235_000), f("2R48", 98, 46, 214_000, 292_000), f("4R", 133, 90, 459_000, 602_000)],
  },
  {
    id: "kim-keat-crest", name: "Kim Keat Crest", town: "Toa Payoh", region: "Central",
    launch: "Feb 2026", classification: "Plus", waitingMonths: 37, includesFinishes: false, source: FEB,
    flats: [f("2R40", 58, 38, 203_000, 253_000), f("2R48", 219, 46, 229_000, 304_000), f("3R", 87, 64, 356_000, 450_000), f("4R", 787, 86, 455_000, 624_000)],
  },
  {
    id: "redhill-peaks", name: "Redhill Peaks", town: "Bukit Merah", region: "Central",
    launch: "Feb 2026", classification: "Prime", waitingMonths: 55, includesFinishes: false, source: FEB,
    flats: [f("2R40", 92, 38, 215_000, 295_000), f("2R48", 276, 46, 257_000, 373_000), f("3R", 91, 64, 385_000, 537_000), f("4R", 593, 86, 563_000, 783_000)],
  },
];

export const getProject = (id: string) => BTO_PROJECTS.find((p) => p.id === id);

export const TOWNS = Array.from(new Set(BTO_PROJECTS.map((p) => p.town))).sort();

/** Upcoming exercise announced on HDB Flat Portal (prices not yet released). */
export const UPCOMING_EXERCISE = {
  label: "Nov 2026",
  flats: 7960,
  towns: ["Bedok", "Geylang", "Sembawang", "Tengah", "Toa Payoh", "Yishun"],
  note: "Preliminary. Prices and classifications are released at launch.",
};
