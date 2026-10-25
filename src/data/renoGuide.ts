import type { RenoCategory } from "@/domain/directory";

/**
 * The renovation guide, laid out as a book of 16 pages. Page 0 is the cover, then pages 1 and 2 face each other, and
 * so on, so a spread is (odd, even). Everything is general guidance from published sources, not endorsements: the cost
 * figures come from 2026 guides, and the HDB points should be checked against HDB's own pages before any work starts.
 */
export type RenoPageSpec =
  | { kind: "cover" }
  | { kind: "contents" }
  | { kind: "opener"; chapter: number; title: string; intro: string; facts: { h: string; b: string }[]; image?: string }
  | { kind: "costs" }
  | { kind: "top"; category: RenoCategory; chapter: number; title: string; intro: string; continued?: boolean }
  | { kind: "list"; chapter: number; title: string; intro: string; items: { name: string; note: string; tag?: string; url?: string }[]; continued?: boolean }
  | { kind: "tips"; chapter: number; title: string; tips: string[]; image?: string }
  | { kind: "steps"; chapter: number; title: string; intro: string; steps: { h: string; b: string }[] }
  | { kind: "questions"; chapter: number; title: string; intro: string; questions: string[] }
  | { kind: "split" | "plan" | "result" | "examples" | "flags" | "walls"; chapter: number; title: string; intro: string; image?: string }
  | { kind: "links" }
  | { kind: "back" };

export const RENO_CHAPTERS = [
  { n: 1, title: "What it costs", blurb: "Costs by flat, a map of the money, and what to spend on.", page: 2 },
  { n: 2, title: "Designers and contractors", blurb: "How to choose, the red flags in a quote, and 37 firms.", page: 8 },
  { n: 3, title: "HDB rules and permits", blurb: "What needs approval, and which walls can change.", page: 11 },
  { n: 4, title: "Furniture", blurb: "Where to buy, from budget to designer.", page: 14 },
  { n: 5, title: "Appliances", blurb: "Where to buy, and what to check.", page: 16 },
  { n: 6, title: "The works, in order", blurb: "What happens when, and what to ask.", page: 18 },
  { n: 7, title: "Links and fine print", blurb: "HDB's own pages, and how to read the prices.", page: 20 },
];

/** Typical works cost by flat, in dollars, as published by Terris (August 2026). Furniture and appliances are extra. */
export const COST_TABLE: { flat: string; bto: [number, number]; resale: [number, number | null] }[] = [
  { flat: "3-room", bto: [25_000, 45_000], resale: [35_000, 60_000] },
  { flat: "4-room", bto: [35_000, 60_000], resale: [50_000, 85_000] },
  { flat: "5-room", bto: [45_000, 70_000], resale: [60_000, null] },
];

export const QUESTIONS = [
  "What exactly is in this quote, and what is extra?",
  "How is the payment split, and what is the final payment held back for?",
  "Who is on site every day, and who do I call when something goes wrong?",
  "Which works do you subcontract, and to whom?",
  "How are changes priced after I sign?",
  "How long is the warranty on carpentry and on the works, in writing?",
  "How long will it take, and what happens if it runs late?",
  "Will you handle the HDB permits, and what are they based on?",
];

export const RENO_PAGES: RenoPageSpec[] = [
  { kind: "cover" },
  { kind: "contents" },
  {
    kind: "opener",
    chapter: 1,
    title: "What a renovation costs",
    intro: "Set the budget before you meet a single designer.",
    image: "keys",
    facts: [
      { h: "A 4-room BTO is about $35,000 to $60,000", b: "For the works alone. Other 2026 guides put the middle at $40,000 to $56,000." },
      { h: "Resale costs more", b: "Guides put a resale flat 20% to 40% higher, for hacking out old fittings and rewiring." },
      { h: "Carpentry is the biggest line", b: "Around 30% of the budget in most breakdowns." },
      { h: "Furniture and appliances are extra", b: "Most cost guides leave them out. Budget them separately." },
      { h: "Keep 10% to 15% spare", b: "For hidden defects and the changes you decide on halfway." },
    ],
  },
  { kind: "costs" },
  { kind: "split", chapter: 1, title: "Where the money goes", intro: "Pick a flat and a finish. The house shows where the works money goes.", image: "living" },
  { kind: "plan", chapter: 1, title: "Your plan", intro: "", image: "bedroom" },
  { kind: "result", chapter: 1, title: "Where to spend, where to save", intro: "", image: "living-warm" },
  { kind: "examples", chapter: 1, title: "Three example flats", intro: "What a budget can look like for different homes.", image: "interior" },
  {
    kind: "opener",
    chapter: 2,
    title: "Choosing who to hire",
    intro: "A designer coordinates everything. A contractor does the work.",
    image: "plans",
    facts: [
      { h: "Get three itemised quotes", b: "A quote that lists every item is easier to compare than one lump sum." },
      { h: "Look for the registrations", b: "Ask whether the firm is HDB-registered and CaseTrust accredited, and check it." },
      { h: "Read the reviews and the portfolio", b: "Look at flats like yours, and read the three-star reviews too." },
      { h: "Pay in stages", b: "Never in full up front. Hold back the final payment until the defects are fixed." },
      { h: "Get the warranty in writing", b: "How long, and what it covers." },
    ],
  },
  { kind: "top", category: "firm", chapter: 2, title: "Design firms and contractors", intro: "Ordered by published reviews and popularity. Ask each for a quote.", continued: true },
  { kind: "flags", chapter: 2, title: "Red flags in a quote", intro: "A made-up quote. Tap the numbered lines to see what to question.", image: "keys" },
  {
    kind: "opener",
    chapter: 3,
    title: "HDB rules and permits",
    intro: "General guidance from published sources. Check HDB's own pages before you start.",
    image: "living-bright",
    facts: [
      { h: "Read your floor plan first", b: "Guides say bold lines mark structural walls you cannot hack." },
      { h: "Walls need approval", b: "Guides say HDB approval is needed before demolishing or hacking a wall." },
      { h: "Use a registered contractor", b: "HDB keeps a Directory of Renovation Contractors, with an online lookup." },
      { h: "New BTO bathrooms", b: "Guides say to wait about three years before removing waterproofed finishes. Tile over them instead." },
      { h: "Noisy work has set hours", b: "Ask your contractor for HDB's current schedule, and check the deadline to finish." },
    ],
  },
  { kind: "walls", chapter: 3, title: "Which walls can change?", intro: "A typical flat. Tap a wall to see how freely it can change.", image: "plans" },
  {
    kind: "tips",
    chapter: 3,
    title: "Before the work starts",
    tips: [
      "Check your floor plan for structural walls before you plan the layout.",
      "Ask the firm which works need a permit, and who applies for it.",
      "Look the contractor up in HDB's directory, not just on their own website.",
      "Tell your neighbours about the noise before it starts.",
      "Keep copies of the permit and the contract on site.",
    ],
  },
  { kind: "top", category: "furniture", chapter: 4, title: "Furniture", intro: "From budget to designer. Ordered by published popularity." },
  {
    kind: "tips",
    chapter: 4,
    title: "Before you buy furniture",
    image: "bedroom",
    tips: [
      "Measure the room, the doors and the lift before you order anything large.",
      "Order made-to-order pieces early. They can take several weeks.",
      "Ask about delivery and assembly fees, and whether returns are free.",
      "Match your sofa and bed to your carpentry, so nothing blocks a door or a drawer.",
      "Time the delivery after the final clean, not during the works.",
    ],
  },
  {
    kind: "list",
    chapter: 5,
    title: "Appliances",
    intro: "Chains that sell fridges, washers, hobs and hoods. Compare more than one outlet.",
    items: [
      { name: "Gain City", note: "Appliances across brands, including Samsung, Mayer, Electrolux, Bosch and Sharp.", tag: "Appliances", url: "https://gaincity.com" },
      { name: "Courts", note: "Furniture and appliances together, with instalment plans of up to three years.", tag: "Furniture and appliances", url: "https://courts.com.sg" },
      { name: "Harvey Norman", note: "Appliances and furniture. Discounts differ by outlet, so ask several.", tag: "Furniture and appliances", url: "https://harveynorman.com.sg" },
      { name: "Robinsons", note: "Appliances, bedding and accessories, sold online.", tag: "Online", url: "https://robinsons.com.sg" },
    ],
  },
  {
    kind: "tips",
    chapter: 5,
    title: "Before you buy appliances",
    image: "kitchen",
    tips: [
      "Decide the kitchen layout first, then buy appliances that fit it.",
      "Check that the warranty is honoured by a local service centre.",
      "Ask when delivery and installation can be done, and match it to your works.",
      "Compare the same model across a few outlets before you pay.",
      "Ask whether your old appliances can be taken away.",
    ],
  },
  {
    kind: "steps",
    chapter: 6,
    title: "The works, in order",
    intro: "A typical order of work, from quotes to move-in.",
    steps: [
      { h: "Agree the scope and budget", b: "Decide what you need, and what can wait." },
      { h: "Collect three quotes", b: "From HDB-registered firms, itemised." },
      { h: "Sign and apply for permits", b: "The firm usually submits them." },
      { h: "Collect keys and inspect", b: "Note defects in a new flat early." },
      { h: "Hacking, plumbing and electrical", b: "The noisy, messy part." },
      { h: "Flooring, then carpentry", b: "Waterproofing first, built-ins after." },
      { h: "Painting, windows, air-conditioning", b: "Then a defects walkthrough." },
      { h: "Deep clean, furniture, move in", b: "Hold back the final payment until it is right." },
    ],
  },
  { kind: "questions", chapter: 6, title: "Ask every contractor", intro: "Eight questions that save couples money. Get the answers in writing.", questions: QUESTIONS },
  { kind: "links" },
  { kind: "back" },
];

export const PAGE_OF = { costs: 3, plan: 5, firms: 9, links: 20 };
