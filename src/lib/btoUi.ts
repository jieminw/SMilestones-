import { SG_AREAS } from "@/data/sgAreas";
import { ceilDollar, fmt } from "@/domain/money";

/** Colours and small helpers shared by the BTO Navigator's cards, map and planner. */
export const CLASS_COLOUR: Record<string, string> = { Standard: "#86aeb4", Plus: "#e3c476", Prime: "#e8906a" };

/** The map's region colours, so a town shows the same colour wherever it appears. */
export const REGION_COLOUR: Record<string, string> = { Central: "#5b86ad", North: "#5c9c82", "North-East": "#8a74b8", East: "#b98d58", West: "#4fa3ae" };
export const townColour = (town: string) => REGION_COLOUR[SG_AREAS.find((a) => a.name === town)?.region ?? ""] ?? "#86aeb4";

/** The three payments of a BTO, and cash against CPF. */
export const STAGE_COLOUR: Record<string, string> = { book: "#e3c476", lease: "#86aeb4", keys: "#e8906a" };
export const CASH_COLOUR = "#e8906a";
export const CPF_COLOUR = "#86aeb4";

/** Months as years, to one decimal: 33 -> "2.8". */
export const yrs = (months: number) => `${Math.round((months / 12) * 10) / 10}`;

export type FlatChoice = "2R" | "3R" | "4R" | "5R";
export const FLAT_CHOICE_LABEL: Record<FlatChoice, string> = { "2R": "2-room", "3R": "3-room", "4R": "4-room", "5R": "5-room" };

/** Dollars from cents, rounded up to a whole dollar: a plan's amounts are estimates, so cents would only mislead. */
export const whole = (cents: number) => fmt(ceilDollar(cents));
