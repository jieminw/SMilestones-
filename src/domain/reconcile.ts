/**
 * Bank statement reconciliation. Everything here is pure and runs in the browser: the CSV is read and
 * parsed on the device and is never uploaded or stored. The only thing that is ever saved is a
 * verification flag (`verified_at`) on a contribution the statement confirms.
 *
 * Banks all export slightly different CSVs, so nothing here assumes a fixed layout: the user maps the
 * columns once (see `detectColumns` for a starting guess) and the mapping can be remembered as a preset.
 */
import type { CoupleState, Transaction } from "./types";
import type { Cents } from "./money";
import { liveTx } from "./selectors";

// ------------------------------------------------------------------ CSV

/** Parses CSV text into rows. Handles quoted fields, escaped quotes, commas and newlines inside quotes, and CRLF. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
      continue;
    }
    if (c === '"') inQuotes = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((x) => x.trim() !== "")) rows.push(row.map((x) => x.trim()));
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((x) => x.trim() !== "")) rows.push(row.map((x) => x.trim()));
  return rows;
}

// ------------------------------------------------------------------ mapping

export type DateFormat = "dmy" | "mdy" | "ymd";
export type AmountMode = "signed" | "split";

export interface ColumnMapping {
  hasHeader: boolean;
  date: number;
  description: number;
  amountMode: AmountMode;
  /** One column with debits as negative numbers (or marked DR). */
  amount: number;
  /** Separate columns for money out and money in. */
  debit: number;
  credit: number;
  dateFormat: DateFormat;
}

export const emptyMapping = (): ColumnMapping => ({ hasHeader: true, date: 0, description: 1, amountMode: "signed", amount: 2, debit: -1, credit: -1, dateFormat: "dmy" });

/** A starting guess from the header row. The user can always change it. */
export function detectColumns(header: string[]): ColumnMapping {
  const find = (re: RegExp) => header.findIndex((h) => re.test(h.toLowerCase()));
  const m = emptyMapping();
  const date = find(/date/);
  const desc = (() => {
    const strong = find(/desc|detail|narrat|particular|memo|payee/);
    if (strong >= 0) return strong;
    return header.findIndex((h, i) => i !== date && /reference|transaction/.test(h.toLowerCase()));
  })();
  const debit = find(/debit|withdraw|money out|paid out/);
  const credit = find(/credit|deposit|money in|paid in/);
  const amount = find(/^amount|amt|value/);
  if (date >= 0) m.date = date;
  if (desc >= 0) m.description = desc;
  if (debit >= 0 && credit >= 0) {
    m.amountMode = "split";
    m.debit = debit;
    m.credit = credit;
  } else if (amount >= 0) m.amount = amount;
  return m;
}

/** A stable key for a header row, so a saved preset can be recognised when the same bank's file comes back. */
export const headerSignature = (header: string[]) => header.map((h) => h.toLowerCase().replace(/[^a-z]/g, "")).join("|");

// ------------------------------------------------------------------ values

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const iso = (y: number, m: number, d: number) => {
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
};

/** Reads 2026-10-05, 05/10/2026, 5-Oct-2026, 05 Oct 26. Numeric order follows `fmt` unless the year comes first. */
export function parseDate(raw: string, fmt: DateFormat = "dmy"): string | null {
  const s = raw.trim();
  if (!s) return null;
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return iso(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{1,2})[\s\-/.]([A-Za-z]{3})[A-Za-z]*[\s\-/.,]*(\d{2,4})/);
  if (m) {
    const mi = MONTHS.indexOf(m[2].toLowerCase());
    if (mi < 0) return null;
    const y = m[3].length === 2 ? 2000 + +m[3] : +m[3];
    return iso(y, mi + 1, +m[1]);
  }
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (m) {
    const y = m[3].length === 2 ? 2000 + +m[3] : +m[3];
    const [a, b] = [+m[1], +m[2]];
    return fmt === "mdy" ? iso(y, a, b) : iso(y, b, a);
  }
  return null;
}

/** Reads "1,234.50", "$12", "(45.00)", "45.00 DR", "-45", "S$ 45.00". Returns signed cents, or null if it isn't an amount. */
export function parseAmount(raw: string): Cents | null {
  let s = raw.trim();
  if (!s) return null;
  let neg = false;
  if (/^\(.*\)$/.test(s)) {
    neg = true;
    s = s.slice(1, -1);
  }
  if (/\bDR\b|\bDEBIT\b/i.test(s)) neg = true;
  s = s.replace(/\b(DR|CR|DEBIT|CREDIT)\b/gi, "");
  if (/^[-−–]/.test(s.trim())) neg = true;
  s = s.replace(/[^\d.,]/g, "");
  if (!s || !/\d/.test(s)) return null;
  s = s.replace(/,/g, "");
  if ((s.match(/\./g) ?? []).length > 1) return null;
  const n = Math.round(parseFloat(s) * 100);
  if (!Number.isFinite(n)) return null;
  return neg ? -n : n;
}

// ------------------------------------------------------------------ statement lines

export interface StatementLine {
  index: number;
  date: string;
  description: string;
  /** Signed cents: money out is negative. */
  amount: Cents;
}

export interface ParseResult {
  lines: StatementLine[];
  skipped: number;
}

export function parseStatement(rows: string[][], map: ColumnMapping): ParseResult {
  const body = map.hasHeader ? rows.slice(1) : rows;
  const lines: StatementLine[] = [];
  let skipped = 0;
  body.forEach((r, index) => {
    const date = parseDate(r[map.date] ?? "", map.dateFormat);
    let amount: Cents | null = null;
    if (map.amountMode === "signed") amount = parseAmount(r[map.amount] ?? "");
    else {
      const out = parseAmount(r[map.debit] ?? "");
      const inn = parseAmount(r[map.credit] ?? "");
      if (out !== null && out !== 0) amount = -Math.abs(out);
      else if (inn !== null && inn !== 0) amount = Math.abs(inn);
    }
    if (!date || amount === null) {
      skipped++;
      return;
    }
    lines.push({ index, date, description: (r[map.description] ?? "").trim(), amount });
  });
  return { lines, skipped };
}

// ------------------------------------------------------------------ matching

const DAY = 86_400_000;
export const MATCH_WINDOW_DAYS = 3;
const dayNumber = (isoDate: string) => Math.round(Date.parse(isoDate + "T00:00:00Z") / DAY);

const NOISE = new Set(["fast", "payment", "transfer", "paynow", "giro", "ibanking", "internet", "banking", "to", "from", "via", "ref", "inward", "outward", "funds", "fund", "the", "of", "and", "pte", "ltd", "sgd", "atm", "nets", "pos", "purchase"]);

/** A rough payee identity from a description, ignoring references, dates and filler words. */
export function payeeKey(description: string): string {
  const tokens = description.toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter((t) => t.length > 2 && !NOISE.has(t));
  return tokens.slice(0, 2).join(" ");
}

export interface Match {
  txId: string;
  line: StatementLine;
  /** Days between the logged date and the statement date (0 when they agree). */
  offsetDays: number;
}

export interface Reconciliation {
  matched: Match[];
  /** Logged contributions with no matching debit on the statement. */
  notFound: Transaction[];
  /** Outgoing transfers that look like savings but aren't logged: same payee as something that matched. */
  suggestions: StatementLine[];
  /** Contributions that were already verified before this run. */
  alreadyVerified: string[];
}

export interface ReconcileOptions {
  /** Only this person's contributions are checked: a statement can only confirm its own owner's transfers. */
  userId: string;
  windowDays?: number;
}

/**
 * Pairs each of the user's logged contributions with one statement debit of the same amount within the date
 * window. Matching is one-to-one, so two $500 contributions need two $500 debits. When several debits fit,
 * the closest in date wins.
 */
export function reconcile(s: CoupleState, lines: StatementLine[], opts: ReconcileOptions): Reconciliation {
  const window = opts.windowDays ?? MATCH_WINDOW_DAYS;
  const debits = lines.filter((l) => l.amount < 0);
  const used = new Set<number>();
  const mine = liveTx(s)
    .filter((t) => t.kind === "contribution" && t.user_id === opts.userId)
    .sort((a, b) => a.occurred_on.localeCompare(b.occurred_on) || a.id.localeCompare(b.id));

  const matched: Match[] = [];
  const notFound: Transaction[] = [];
  const alreadyVerified: string[] = [];
  for (const t of mine) {
    const day = dayNumber(t.occurred_on);
    let best: { line: StatementLine; diff: number } | null = null;
    for (const l of debits) {
      if (used.has(l.index) || -l.amount !== t.amount) continue;
      const diff = Math.abs(dayNumber(l.date) - day);
      if (diff > window) continue;
      if (!best || diff < best.diff) best = { line: l, diff };
    }
    if (best) {
      used.add(best.line.index);
      matched.push({ txId: t.id, line: best.line, offsetDays: best.diff });
      if (t.verified_at) alreadyVerified.push(t.id);
    } else notFound.push(t);
  }

  // Unmatched outgoing transfers to a payee we already know is a savings destination.
  const known = new Set(matched.map((m) => payeeKey(m.line.description)).filter(Boolean));
  const suggestions = debits.filter((l) => !used.has(l.index) && known.has(payeeKey(l.description)));
  return { matched, notFound, suggestions, alreadyVerified };
}
