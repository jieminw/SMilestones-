/**
 * General renovation advice, in plain words. The priorities drive the "What matters most to you?" pages, and the walls
 * and the quote lines are the examples on the "Which walls" and "Red flags" pages. None of it is a rule: HDB's own pages
 * and a registered contractor have the last word.
 */
export interface Priority {
  id: string;
  label: string;
  /** Where the money earns its keep. */
  spend: string[];
  /** Where a couple with this priority can usually spend less. */
  save: string;
  /** A milestone this priority often adds, with a rough starting cost in dollars. Offered on the pot setup page. */
  milestone?: { name: string; cost: number };
}

export const PRIORITIES: Priority[] = [
  { id: "cook", label: "Cooking at home", spend: ["Hard-wearing cabinets and a worktop that handles heat and water", "A good hood and hob, and power points at counter height", "Lighting over the work area"], save: "A fancy backsplash or a showpiece dining set.", milestone: { name: "Kitchen hood and hob", cost: 2500 } },
  { id: "wfh", label: "Working from home", spend: ["Power and network points where you will actually sit", "A desk nook built into the carpentry", "Good lighting and quiet air-conditioning"], save: "Feature walls in the study.", milestone: { name: "Home office desk and chair", cost: 1500 } },
  { id: "host", label: "Hosting friends", spend: ["A dining table and seating that fit eight", "Dimmable lighting for the living area", "Air-conditioning that covers the whole living space"], save: "Built-ins in rooms guests never see.", milestone: { name: "Dining table and chairs", cost: 2000 } },
  { id: "family", label: "Kids and family", spend: ["Non-slip flooring that is easy to mop", "Closed storage and rounded edges", "Wipe-clean paint in the busiest rooms"], save: "Delicate finishes that scratch or stain.", milestone: { name: "Child-safe flooring and storage", cost: 2500 } },
  { id: "sleep", label: "Sleeping well", spend: ["Blackout curtains and a good mattress", "Quiet air-conditioning in the bedrooms", "Bedside lights and power points"], save: "Elaborate headboard carpentry.", milestone: { name: "Blackout curtains and mattress", cost: 2500 } },
  { id: "storage", label: "Lots of storage", spend: ["Floor-to-ceiling wardrobes", "A shoe cabinet near the door", "A bed with drawers underneath"], save: "Open shelving that collects dust.", milestone: { name: "Extra wardrobes and storage", cost: 3000 } },
  { id: "screen", label: "Movies and games", spend: ["A TV wall with the wiring hidden", "Dimmable lights and blackout curtains", "A comfortable sofa before an expensive screen"], save: "A heavy built-in feature wall around the TV.", milestone: { name: "TV, sound and wiring", cost: 3000 } },
  { id: "light", label: "Light and fresh air", spend: ["Windows and curtains that let the light in", "Fans or air-conditioning placed for a breeze", "Light paint colours"], save: "Bulky partitions that block the light.", milestone: { name: "Curtains and ceiling fans", cost: 1200 } },
  { id: "budget", label: "Keeping it affordable", spend: ["Carpentry only where you need it", "A contingency of 10% to 15% of the works", "Keeping existing tiles and fittings that still work"], save: "Hacking walls you could live with, and designer light fittings." },
];

export interface Wall {
  id: string;
  kind: "keep" | "wet" | "maybe";
  label: string;
  /** SVG path, in the plan's own coordinates. */
  d: string;
  body: string;
}

export const WALLS: Wall[] = [
  { id: "outer", kind: "keep", label: "Outer walls", d: "M20 20H420V235H20Z", body: "The flat's boundary and party walls are structural. Guides say these cannot be hacked." },
  { id: "shelter", kind: "keep", label: "Household shelter", d: "M330 20V95H420", body: "The shelter is built to protect in an emergency, so its walls are reinforced. Leave them as they are." },
  { id: "bath", kind: "wet", label: "Bathroom walls", d: "M150 20V95H230V20", body: "These walls hold pipes and the waterproofing. You can retile them, but moving them is a large and costly job." },
  { id: "kitchen", kind: "maybe", label: "Kitchen to living room", d: "M230 95H330", body: "Often taken out for an open kitchen. It needs HDB approval first, and only works if the wall is not structural." },
  { id: "bedroom", kind: "maybe", label: "Bedroom to living room", d: "M150 95V235", body: "Sometimes removed to join two rooms. Check your floor plan: guides say bold lines mark walls you cannot hack." },
];

export interface QuoteLine {
  label: string;
  price: string;
  flag?: { title: string; body: string };
}

export const QUOTE: QuoteLine[] = [
  { label: "Hacking and disposal", price: "$3,200" },
  { label: "Carpentry, all rooms", price: "$18,000", flag: { title: "One lump sum", body: "Ask for it itemised: each cabinet, its size, the material and the hardware brand. A single figure hides what you are paying for." } },
  { label: "Flooring, living and bedrooms", price: "$6,500" },
  { label: "Electrical works", price: "as required", flag: { title: "No price", body: "Every line needs a figure. \"As required\" lets the bill grow after you sign." } },
  { label: "Painting, 4 rooms", price: "$2,400" },
  { label: "Extras and variations", price: "to be advised", flag: { title: "Open-ended changes", body: "Agree how changes are priced before you sign, and get each change in writing with its price." } },
  { label: "Payment: 100% on signing", price: "", flag: { title: "All the money up front", body: "Pay in stages that follow the work, and hold back the last payment until the defects are fixed." } },
  { label: "Warranty: 1 year", price: "", flag: { title: "A vague warranty", body: "Get it in writing: what it covers, for how long, and who comes back to fix things." } },
];
