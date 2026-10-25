/**
 * All money in SMilestones is stored as integer cents.
 * Floating point dollars (0.1 + 0.2 !== 0.3) are never used for arithmetic.
 */
export type Cents = number;

export const dollars = (d: number): Cents => Math.round(d * 100);
export const toDollars = (c: Cents): number => c / 100;

/** Parse user input like "1,250.50" or "$300" into cents. Returns null if invalid. */
export function parseMoney(input: string): Cents | null {
  const cleaned = input.replace(/[$,\s]/g, "");
  if (cleaned === "" || !/^\d+(\.\d{0,2})?$/.test(cleaned)) return null;
  return Math.round(parseFloat(cleaned) * 100);
}

/** $1,234 (whole dollars) or $1,234.50 when there are cents. */
export function fmt(c: Cents, opts: { cents?: boolean; sign?: boolean } = {}): string {
  const neg = c < 0;
  const abs = Math.abs(c);
  const showCents = opts.cents ?? abs % 100 !== 0;
  const body = (abs / 100).toLocaleString("en-SG", {
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0,
  });
  const sign = neg ? "−" : opts.sign ? "+" : "";
  return `${sign}$${body}`;
}

/** Compact: $86.6k, $1.2M */
export function fmtShort(c: Cents): string {
  const d = Math.abs(c) / 100;
  const sign = c < 0 ? "−" : "";
  if (d >= 1_000_000) return `${sign}$${(d / 1_000_000).toFixed(d >= 10_000_000 ? 0 : 1)}M`;
  if (d >= 10_000) return `${sign}$${Math.round(d / 1000)}k`;
  if (d >= 1_000) return `${sign}$${(d / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return `${sign}$${Math.round(d)}`;
}

/** Round cents up to the next whole dollar. */
export const ceilDollar = (c: Cents): Cents => Math.ceil(c / 100) * 100;

export const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export const pct = (part: number, whole: number) =>
  whole <= 0 ? 0 : clamp(Math.round((part / whole) * 100), 0, 100);
