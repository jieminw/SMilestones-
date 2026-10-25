/**
 * Starting points for couples planning a wedding for the first time. Names and figures come from published
 * Singapore wedding guides (2024 to 2026) and are NOT endorsements or verified quotes: prices move, packages change
 * and reviews matter more than any list. Venue links go to each hotel's own wedding or events page, where you send an enquiry. Nothing here books for you.
 */
import { VENUES } from "./directory";
import { topPicks } from "@/domain/directory";

export type ResourceId = "basics" | "venues" | "intimate" | "gowns" | "photo" | "beauty" | "honeymoon";

export interface Resource {
  name: string;
  note: string;
  /** Short label, e.g. "Hotel ballroom". */
  tag?: string;
  /** A known page for it. Without one, the row links to a web search for the name. */
  url?: string;
  /** Link text, when "Visit" is too vague. */
  cta?: string;
}

export interface ResourceGroup {
  id: ResourceId;
  label: string;
  intro: string;
  items: Resource[];
  /** Published guides worth reading for this category. */
  guides?: { label: string; url: string }[];
}

export const search = (q: string) => `https://www.google.com/search?q=${encodeURIComponent(q + " Singapore wedding")}`;

export const RESOURCES: ResourceGroup[] = [
  {
    id: "basics",
    label: "Start here",
    intro: "If you have never planned a wedding, do these in this order.",
    items: [
      { name: "1. Agree a total budget first", note: "Decide together what you can spend and who pays what. Everything else is a slice of that number." },
      { name: "2. Choose the banquet date, then book the venue", note: "Popular weekend and auspicious dates go first. Photographers, makeup artists and the emcee are all booked around this date." },
      { name: "3. Ask every vendor for a written quote", note: "Check what is included: service charge, GST, corkage, deposit amount and the cancellation terms." },
      { name: "4. Register your marriage", note: "Our Marriage Journey is the Registry of Marriages (MSF) site for civil marriages: apply online, then book your solemnisation.", tag: "Official", url: "https://www.marriage.gov.sg/", cta: "Open Our Marriage Journey" },
      { name: "5. Keep a buffer", note: "Set aside part of the budget for things nobody plans for: alterations, extra tables, overtime, transport." },
    ],
  },
  {
    id: "venues",
    label: "Hotels",
    intro: "Top hotel banquet venues in Singapore. Each link goes to the hotel's own wedding or events page. Ask for a written package from at least three.",
    items: [
      { name: "Marina Bay Sands", note: "", tag: "Hotel banquet", url: "https://www.marinabaysands.com/weddings", cta: "Wedding page" },
      { name: "Raffles Singapore", note: "", tag: "Hotel banquet", url: "https://www.raffles.com/singapore/occasions/weddings", cta: "Wedding page" },
      { name: "Capella Singapore", note: "", tag: "Hotel banquet", url: "https://www.capellahotels.com/en/capella-singapore", cta: "Wedding page" },
      { name: "The St. Regis Singapore", note: "", tag: "Hotel banquet", url: "https://www.marriott.com/en-us/hotels/sinxr-the-st-regis-singapore/events/", cta: "Wedding page" },
      { name: "Mandarin Oriental, Singapore", note: "", tag: "Hotel banquet", url: "https://www.mandarinoriental.com/en/singapore/marina-bay/celebrate/request-for-proposal", cta: "Wedding page" },
      { name: "Pan Pacific Singapore", note: "", tag: "Hotel banquet", url: "https://www.panpacific.com/en/hotels-and-resorts/pp-marina/celebrations.html", cta: "Wedding page" },
      { name: "Grand Copthorne Waterfront", note: "", tag: "Hotel banquet", url: "https://www.millenniumhotels.com/en/meetings-events/asia/singapore/grand-copthorne-waterfront-weddings/", cta: "Wedding page" },
      { name: "Holiday Inn Singapore Atrium", note: "", tag: "Hotel banquet", url: "https://www.singaporeatrium.holidayinn.com/weddings", cta: "Wedding page" },
    ],
    guides: [
      { label: "Top hotels for weddings (Little Steps)", url: "https://www.littlestepsasia.com/singapore/party/venues/top-hotels-for-wedding/" },
      { label: "5 wedding ballrooms in Singapore (Tatler)", url: "https://www.tatlerasia.com/style/bridal/5-wedding-ballroom-venues-in-singapore" },
      { label: "Wedding venues in Singapore (Honeycombers)", url: "https://thehoneycombers.com/singapore/wedding-venues-in-singapore/" },
    ],
  },
  {
    id: "intimate",
    label: "Small venues",
    intro: "You do not need 30 tables. These are non-hotel places that suit about 20 to 60 guests: restaurants, gardens and heritage spaces. Published guides put a lunch package for about 30 guests at roughly $55 to $170++ a person, so ask each place for its minimum spend and what the solemnisation setup costs.",
    // the venues themselves live in the directory (src/data/directory.ts), where each one was checked
    items: [],
    guides: [
      { label: "Intimate wedding venues in Singapore (SingaporeBrides)", url: "https://singaporebrides.com/featured/intimate-wedding-venues-in-singapore/" },
      { label: "Small wedding venues for 20 guests (Venuerific)", url: "https://blog.venuerific.com/small-wedding-venues-20-guests-singapore/" },
      { label: "8 garden cafés for weddings (Women's Weekly)", url: "https://www.womensweekly.com.sg/food/8-garden-cafes-fairytale-weddings" },
      { label: "Heritage wedding venues (SingaporeBrides)", url: "https://singaporebrides.com/featured/heritage-wedding-venues-singapore/" },
    ],
  },
  {
    id: "photo",
    label: "Photoshoot",
    intro: "Photographers and studios named in recent roundups. Ask to see a full wedding album, not just the highlight reel.",
    items: [
      { name: "Peppermint Studios 65", note: "Wedding and pre-wedding photography.", tag: "Photographer" },
      { name: "BV Wedding", note: "Pre-wedding and wedding shoots in Singapore and overseas. One guide quoted pre-wedding packages from about $999.", tag: "Studio" },
      { name: "Lydia K Photography", note: "Natural light, a light and airy documentary style.", tag: "Photographer" },
      { name: "Alex Goh Photography", note: "A rich, filmic look. Takes pre-wedding bookings in Singapore or abroad.", tag: "Photographer" },
      { name: "Just Married Films", note: "Photo and video, including pre-wedding video concepts.", tag: "Photo and video" },
    ],
    guides: [
      { label: "Wedding photographers in Singapore (Women's Weekly)", url: "https://www.womensweekly.com.sg/family/singapore-wedding-photographers-dreamy-dramatic-style" },
      { label: "Wedding photography guide (Honeycombers)", url: "https://thehoneycombers.com/singapore/wedding-photography-singapore/" },
      { label: "Pre-wedding photoshoot locations (Venuerific)", url: "https://blog.venuerific.com/perfect-pre-wedding-photoshoot-locations-in-singapore/" },
    ],
  },
  {
    id: "gowns",
    label: "Gowns",
    intro: "Boutiques for rental, purchase and bespoke gowns. Browse the full directory for ratings, locations and prices.",
    items: [],
    guides: [
      { label: "30+ bridal boutiques in Singapore (SingaporeBrides)", url: "https://singaporebrides.com/featured/wedding-dresses-singapore/" },
      { label: "25 bridal boutiques you cannot miss (OneThreeOneFour)", url: "https://www.onethreeonefour.com/blog/25-bridal-boutiques-singapore-you-cannot-miss-out-on/" },
      { label: "Wedding dress and gown rates, 2026 (Moneybees)", url: "https://themoneybees.co/blog/wedding-dress-wedding-gown-rates" },
    ],
  },
  {
    id: "beauty",
    label: "Makeup",
    intro: "Most bridal artists bundle hair and makeup. Ask for a trial and two looks (ceremony and dinner). Prices below are from 2024 guides.",
    items: [
      { name: "Ling's Palette", note: "A package from about $450 covering trials, day and night looks and transport.", tag: "From ~$450" },
      { name: "Farfalla Perlata", note: "About $500 with morning and evening looks and a free trial.", tag: "~$500" },
      { name: "Lynda Low", note: "About $650 for two makeups and two hairdos at your location.", tag: "~$650" },
      { name: "Beauty without Filter", note: "A team of five artists, which helps if your bridal party also needs makeup.", tag: "Team" },
      { name: "Joyce Yeo Makeup", note: "Wedding makeup and hairstyling.", tag: "Artist" },
      { name: "Clarence Lee", note: "One of Singapore's best known artists. A day of bridal makeup was reported at about $2,000.", tag: "Premium" },
    ],
    guides: [
      { label: "Best bridal makeup artists, and the average price (Daily Vanity)", url: "https://dailyvanity.sg/weddings/best-bridal-makeup-artists-singapore/" },
      { label: "Wedding makeup artist rates (SingaporeBrides)", url: "https://singaporebrides.com/featured/wedding-makeup-artist-singapore-rates/" },
      { label: "Makeup artists for every budget (OneThreeOneFour)", url: "https://www.onethreeonefour.com/blog/top-wedding-makeup-artists-mua-for-every-budget/" },
    ],
  },
  {
    id: "honeymoon",
    label: "Honeymoon",
    intro: "Honeymoon places couples most often choose. Flight times are rough, from Singapore: check the airlines and your dates.",
    items: [
      { name: "The Maldives", note: "Overwater villas on a private island. Singapore Airlines and Scoot both fly direct to Male.", tag: "~4h30 direct" },
      { name: "Bali: Uluwatu and Ubud", note: "Clifftop private-pool villas in Uluwatu, rice-terrace retreats in Ubud.", tag: "~2h45" },
      { name: "Kyoto and Osaka, Japan", note: "Temples, ryokan stays and food. Best in spring or autumn.", tag: "~7h direct" },
      { name: "Switzerland", note: "Lakes, trains and alpine hotels. Singapore Airlines flies direct to Zurich.", tag: "~13h direct" },
      { name: "Paris and the French Riviera", note: "Singapore Airlines flies direct to Paris. Add Nice or Provence by train.", tag: "~13h direct" },
      { name: "Santorini, Greece", note: "Caldera views and white-washed villages. Usually one stop, via Athens or a Gulf hub.", tag: "~16h+, 1 stop" },
      { name: "Bora Bora, French Polynesia", note: "The classic overwater bungalow trip. No direct flight, so allow two days each way.", tag: "~24h+, 1 to 2 stops" },
    ],
    guides: [
      { label: "Honeymoon destinations for 2026 (Aluxe)", url: "https://www.aluxe.com/sg-en/blog/honeymoon-travel-destinations-2026/" },
      { label: "Maldives vs Bora Bora, from Singapore (ShopBack)", url: "https://www.shopback.sg/blog/travel/maldives-vs-bora-bora-vs-langkawi-sg-2026-honeymoon" },
    ],
  },
];

/** Names for the budget form's venue step. */
export const HOTEL_NAMES = RESOURCES.find((g) => g.id === "venues")!.items.map((i) => i.name);
/** The best-reviewed small venues from the directory, for the budget form's venue step. */
export const SMALL_VENUES = topPicks(VENUES, 12).map((l) => ({ name: l.name, tag: l.type }));

/**
 * Banquet price per table of 10 for each hotel, so the budget form can start from the hotel's own figure. These are
 * "starting from" prices from published sources, not quotes: they move with the day, season and package.
 */
export interface HotelPrice {
  /** Listed price per table of 10, in dollars. */
  perTable: number;
  /** The fewest tables the hotel will sell, as published. */
  minTables: number;
  /** "++" means before 10% service charge and 9% GST. "nett" is all-in. */
  basis: "++" | "nett";
  source: string;
  sourceUrl: string;
  note?: string;
}

const VOWS = { source: "Vows.sg price list, March 2026", sourceUrl: "https://www.vows.sg/guides/wedding-banquet-price-list-singapore-2026" };
const NOTE = "A starting price. Weekend dinners and peak dates cost more.";

export const HOTEL_PRICES: Record<string, HotelPrice> = {
  "Marina Bay Sands": { perTable: 2588, minTables: 30, basis: "++", ...VOWS, note: NOTE },
  "Raffles Singapore": { perTable: 2488, minTables: 20, basis: "++", ...VOWS, note: NOTE },
  "Capella Singapore": { perTable: 4292, minTables: 15, basis: "++", ...VOWS, note: "The top of the range in that list. Older guides quoted lower weekend prices, so ask for a current quote." },
  "The St. Regis Singapore": { perTable: 2388, minTables: 20, basis: "++", ...VOWS, note: NOTE },
  "Mandarin Oriental, Singapore": { perTable: 2188, minTables: 22, basis: "++", ...VOWS, note: NOTE },
  "Pan Pacific Singapore": { perTable: 1688, minTables: 25, basis: "++", ...VOWS, note: NOTE },
  "Grand Copthorne Waterfront": { perTable: 1338, minTables: 20, basis: "++", ...VOWS, note: "The lowest starting price here. Another 2026 guide quoted weekend dinners at roughly $2,743 to $2,863 a table." },
  "Holiday Inn Singapore Atrium": {
    perTable: 1758,
    minTables: 8,
    basis: "nett",
    source: "The hotel's 2026 offer page (weekday dinner)",
    sourceUrl: "https://singaporeatrium.holidayinn.com/offers/enchanted-wedding-showcase-2026",
    note: "Weekend dinner is listed at $1,958 nett.",
  },
};

/** What a table really costs: a "++" price plus 10% service charge, then 9% GST on top of that. */
export const allInPrice = (p: HotelPrice) => Math.round(p.basis === "++" ? p.perTable * 1.1 * 1.09 : p.perTable);
