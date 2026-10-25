import type { ResourceId } from "./weddingResources";
import type { Category } from "@/domain/directory";

/**
 * The couples' guide, laid out as a book of 18 pages. Page 0 is the cover, then pages 1 and 2 face each other, and so
 * on, so a spread is (odd, even). The "top picks" pages come from the directory (best rated, weighted by votes), the
 * other lists from `weddingResources.ts`, and the explanations and tips are written here. Venues come first, then the
 * photoshoot, gowns, make-up and honeymoon, then the basics. Everything is general guidance from published sources,
 * not endorsements.
 */
export type PageSpec =
  | { kind: "cover" }
  | { kind: "contents" }
  | { kind: "steps" }
  | { kind: "questions" }
  | { kind: "opener"; chapter: number; title: string; intro: string; facts: { h: string; b: string }[]; image?: string }
  | { kind: "hotels" }
  | { kind: "top"; category: Category; chapter: number; title: string; intro: string; continued?: boolean }
  | { kind: "list"; group: ResourceId; chapter: number; title: string; intro?: string; image?: string; continued?: boolean }
  | { kind: "tips"; chapter: number; title: string; tips: string[]; group: ResourceId }
  | { kind: "links" }
  | { kind: "back" };

export const CHAPTERS = [
  { n: 1, title: "Hotel banquets", blurb: "How they are priced and paid, and each hotel's price per table.", page: 2 },
  { n: 2, title: "Small venues", blurb: "Restaurants, gardens and heritage houses for 20 to 60 guests.", page: 4 },
  { n: 3, title: "Photoshoot", blurb: "The best-rated photographers, and what to ask them.", page: 6 },
  { n: 4, title: "Wedding gowns", blurb: "Boutiques for rental and bespoke, with prices.", page: 8 },
  { n: 5, title: "Hair and make-up", blurb: "Artists, rough prices, and how to book a trial.", page: 10 },
  { n: 6, title: "Honeymoon", blurb: "Where couples go, from the Maldives to Switzerland.", page: 12 },
  { n: 7, title: "The basics", blurb: "The order to plan in, and what to ask every vendor.", page: 14 },
  { n: 8, title: "Links and fine print", blurb: "The official site, and how to read the prices.", page: 16 },
];

/** Where each part of the guide starts, for the links in the planner. */
export const PAGE_OF = { hotelPrices: 3, smallVenues: 5 };

export const QUESTIONS = [
  "What exactly is included in this price, and what costs extra?",
  "Is the price with service charge and GST (++) or nett?",
  "How much is the deposit, and when is the balance due?",
  "What happens if we change the date or cancel?",
  "Is there a minimum spend, or a minimum number of tables?",
  "What are the overtime charges, and the cut-off time?",
  "Can we see a full album or a recent event, not only highlights?",
  "Who exactly turns up on the day, and who is the backup?",
];

export const PAGES: PageSpec[] = [
  { kind: "cover" },
  { kind: "contents" },
  {
    kind: "opener",
    chapter: 1,
    title: "Hotel banquets, explained",
    intro: "The traditional route: a ballroom and round tables of ten.",
    facts: [
      { h: "Priced by the table", b: "A table seats 10, so 150 guests is 15 tables." },
      { h: "Read the ++", b: "Prices often leave out 10% service charge and 9% GST, about 20% more. Nett means all-in." },
      { h: "Deposit now, balance after", b: "A deposit holds the date. Most of the bill is paid after the dinner, so ang bao often covers it." },
      { h: "Minimum tables", b: "Many hotels will not sell fewer than 20 or 30 tables. See the next page." },
      { h: "Book about a year ahead", b: "Guides advise about a year ahead. Weekends and auspicious dates go first, and peak seasons fill fast." },
      { h: "Weekdays and lunches", b: "Weekday dinners and Sunday lunches can cost $100 to $300 less a table." },
    ],
  },
  { kind: "hotels" },
  {
    kind: "opener",
    chapter: 2,
    title: "You do not need 30 tables",
    intro: "A smaller wedding is not a lesser one. It is often the better party.",
    image: "/images/rustic-table.jpg",
    facts: [
      { h: "More of the budget on what you notice", b: "With fewer guests, more goes into the food, the place and the photos." },
      { h: "No table minimum", b: "Restaurants and gardens usually price per person. Guides put lunch packages for about 30 guests at roughly $55 to $170++ a person." },
      { h: "Ask about the extras", b: "A minimum spend, the solemnisation setup, a rain plan for gardens, and whether you may bring outside vendors." },
      { h: "Keep it to the people you love", b: "Under 60 guests, you can speak to everyone." },
    ],
  },
  { kind: "top", category: "venue", chapter: 2, title: "Small venues", intro: "Non-hotel places, ordered by published reviews and popularity.", continued: true },
  { kind: "top", category: "photo", chapter: 3, title: "Photographers", intro: "Ordered by published reviews and popularity. Compare what each package covers." },
  {
    kind: "tips",
    chapter: 3,
    title: "Before you book a photographer",
    group: "photo",
    tips: [
      "Book once your date is fixed. Popular photographers go early.",
      "Ask for a full wedding album, not just the best shots.",
      "Ask what the package includes: hours, edited photos, delivery time and prints.",
      "Ask about overtime and travel fees before you sign.",
      "For a pre-wedding shoot, choose the location first and the outfits second.",
    ],
  },
  { kind: "top", category: "gown", chapter: 4, title: "Gown boutiques", intro: "Ordered by published reviews and popularity. Prices are rental, from." },
  {
    kind: "tips",
    chapter: 4,
    title: "Before you choose a gown",
    group: "gowns",
    tips: [
      "Ask how long a bespoke gown takes, and start early.",
      "Ask what a rental price includes: alterations, dry cleaning, a second gown.",
      "Quotes are usually before 9% GST, and deposits are often extra.",
      "Try at least three silhouettes, and bring one honest friend.",
      "Evening gowns and a kua for the tea ceremony are separate rentals.",
    ],
  },
  { kind: "list", group: "beauty", chapter: 5, title: "Hair and make-up", intro: "Most artists bundle hair and make-up. Prices below are from 2024 guides." },
  {
    kind: "tips",
    chapter: 5,
    title: "Before you book an artist",
    group: "beauty",
    tips: [
      "Book a trial, and bring photos of looks you like.",
      "Ask for two looks if you have a ceremony and a dinner.",
      "Check if hair is included, and the price for family and bridesmaids.",
      "Ask about the early-call or travel fee on the day.",
      "Tell the artist about any skin concerns before the trial.",
    ],
  },
  { kind: "list", group: "honeymoon", chapter: 6, title: "Honeymoon", intro: "Flight times are rough, from Singapore.", image: "/images/trip.jpg" },
  {
    kind: "tips",
    chapter: 6,
    title: "Before you book the trip",
    group: "honeymoon",
    tips: [
      "Fix the banquet date first, then choose the trip around it.",
      "Leave a few days to rest after the banquet before you fly.",
      "Check that your passports are valid for at least six months. Many countries ask for it.",
      "Check visa rules for your destination and dates.",
      "Buy travel insurance when you book.",
    ],
  },
  { kind: "steps" },
  { kind: "questions" },
  { kind: "links" },
  { kind: "back" },
];
