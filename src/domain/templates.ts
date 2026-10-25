import type { PotKind } from "./types";

export interface PotTemplate {
  kind: PotKind;
  title: string;
  blurb: string;
  defaultName: string;
  sequential: boolean;
  categories: string[];
}

export const TEMPLATES: Record<PotKind, PotTemplate> = {
  bto: {
    kind: "bto",
    title: "BTO flat",
    blurb: "Option fee, lease signing and key collection, from a real HDB project.",
    defaultName: "BTO pot",
    sequential: true,
    categories: [],
  },
  wedding: {
    kind: "wedding",
    title: "Wedding",
    blurb: "Banquet, photos, attire and everything in between.",
    defaultName: "Wedding pot",
    sequential: false,
    categories: ["Banquet", "Photography & video", "Attire & make-up", "Rings", "Solemnisation & misc."],
  },
  renovation: {
    kind: "renovation",
    title: "Renovation",
    blurb: "Hacking, carpentry, flooring and the furniture to fill it.",
    defaultName: "Renovation pot",
    sequential: false,
    categories: ["Carpentry", "Flooring and tiling", "Electrical and plumbing", "Painting and finishing", "Furniture and appliances"],
  },
  trip: {
    kind: "trip",
    title: "Trip",
    blurb: "Graduation trip, honeymoon or a weekend away.",
    defaultName: "Trip pot",
    sequential: false,
    categories: ["Flights", "Accommodation", "Activities", "Food & transport"],
  },
  custom: {
    kind: "custom",
    title: "Something else",
    blurb: "A car, an emergency fund — you name it.",
    defaultName: "Savings pot",
    sequential: false,
    categories: ["Target"],
  },
};
