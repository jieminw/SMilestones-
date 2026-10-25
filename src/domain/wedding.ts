/**
 * Banquet cost and ang bao offset for a wedding pot.
 *
 * Net banquet cost = tables × price per table − expected ang bao, never below $0. Ang bao arrives on
 * the day, so it lowers what the couple finally bear (the pot's savings target) but not the cash
 * they need beforehand: deposits and vendors are paid first. The figures a couple types in are their
 * own estimates; the defaults below are only examples.
 */
import type { Cents } from "./money";
import { dollars } from "./money";
import type { WeddingMeta } from "./types";

export const EXAMPLE_WEDDING: WeddingMeta = {
  tables: 25,
  price_per_table: dollars(1_600),
  guests_per_table: 10,
  avg_angbao: dollars(120),
  categories: [],
};

export interface AngbaoSummary {
  guests: number;
  /** tables × price per table */
  banquetGross: Cents;
  /** Expected ang bao, before it is capped at the banquet cost. */
  expectedAngbao: Cents;
  /** The part of the ang bao that offsets the banquet (never more than the banquet itself). */
  offset: Cents;
  banquetNet: Cents;
}

export function angbaoSummary(w: WeddingMeta): AngbaoSummary {
  const cats = w.categories ?? [];
  const guests = cats.length ? cats.reduce((a, c) => a + c.guests, 0) : w.tables * w.guests_per_table;
  const expectedAngbao = cats.length ? cats.reduce((a, c) => a + c.guests * c.avg, 0) : guests * w.avg_angbao;
  const banquetGross = w.tables * w.price_per_table;
  const offset = Math.min(expectedAngbao, banquetGross);
  return { guests, banquetGross, expectedAngbao, offset, banquetNet: banquetGross - offset };
}

/** Returns an error message when the numbers can't be right, otherwise null. */
export function validateWedding(w: WeddingMeta): string | null {
  const ints = [w.tables, w.price_per_table, w.guests_per_table, w.avg_angbao];
  if (ints.some((n) => !Number.isInteger(n) || n < 0)) return "Check the guest and ang bao figures.";
  if (w.tables > 500 || w.guests_per_table > 30) return "That's more tables or guests per table than we can plan for.";
  for (const c of w.categories ?? []) {
    if (!c.name.trim()) return "Name each guest group.";
    if (!Number.isInteger(c.guests) || c.guests < 0 || !Number.isInteger(c.avg) || c.avg < 0) return `Check the figures for "${c.name}".`;
  }
  return null;
}
