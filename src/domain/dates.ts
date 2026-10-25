/** Dates are stored as ISO strings. Calendar dates use "YYYY-MM-DD". */

export const todayISO = (now: Date = new Date()) => now.toISOString().slice(0, 10);

export function parseDate(d: string): Date {
  // Treat YYYY-MM-DD as a local calendar date (avoid UTC off-by-one).
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    const [y, m, day] = d.split("-").map(Number);
    return new Date(y, m - 1, day);
  }
  return new Date(d);
}

export function addMonths(d: string, months: number): string {
  const x = parseDate(d);
  const target = new Date(x.getFullYear(), x.getMonth() + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(x.getDate(), lastDay));
  return toISODate(target);
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Number of monthly contributions you can still make between `from` and `to`,
 * counting the current month. E.g. Nov 2026 → Dec 2027 = 14.
 */
export function contributionMonths(from: string, to: string): number {
  const a = parseDate(from);
  const b = parseDate(to);
  const n = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()) + 1;
  return Math.max(n, 1);
}

export function monthsBetween(from: string, to: string): number {
  const a = parseDate(from);
  const b = parseDate(to);
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
}

export const fmtMonth = (d: string) =>
  parseDate(d).toLocaleDateString("en-SG", { month: "short", year: "numeric" });

export const fmtDay = (d: string) =>
  parseDate(d).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" });

export const fmtDayShort = (d: string) =>
  parseDate(d).toLocaleDateString("en-SG", { day: "numeric", month: "short" });

export function relativeTime(iso: string, now: Date = new Date()): string {
  const diff = (now.getTime() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
  return fmtDay(iso.slice(0, 10));
}

export function daysBetween(a: Date, b: Date) {
  return Math.floor((b.getTime() - a.getTime()) / 86_400_000);
}
