/**
 * "Cover me": one partner pays the other's missed monthly share, and the other pays it back in small
 * extra amounts over the next few months.
 *
 * Rules:
 *  - A cover is proposed by the partner who pays and must be accepted by the partner who is covered.
 *    On acceptance the payer's contribution is logged, tagged `covering` the other person, so it counts
 *    toward the covered partner's share for that month (not the payer's own).
 *  - The covered partner's expected share rises by `amount / months` (rounded up to a whole dollar) for
 *    each of the next `months` months, until the cover is repaid.
 *  - Repaid is measured, never stored: whatever the covered partner contributes beyond their base share
 *    in the months after the cover counts toward it, oldest cover first.
 *  - "Who's ahead" is the total still owed across all accepted covers.
 */
import type { CoupleState, Cover } from "./types";
import type { Cents } from "./money";
import { activeSplit, liveTx } from "./selectors";

export const COVER_MONTHS_DEFAULT = 3;
export const COVER_MONTHS_MIN = 1;
export const COVER_MONTHS_MAX = 6;

export const monthKey = (iso: string) => iso.slice(0, 7);
export function addMonthKey(key: string, n: number): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** The share each person agreed for a pot, before any payback. */
export const baseShare = (s: CoupleState, potId: string, userId: string): Cents => activeSplit(s, potId)?.shares[userId] ?? 0;

/** What a person put towards their own share in a month; a contribution tagged `covering` counts for the covered person. */
export function creditedIn(s: CoupleState, potId: string, userId: string, month: string): Cents {
  return liveTx(s)
    .filter((t) => t.pot_id === potId && t.kind === "contribution" && (t.covering ?? t.user_id) === userId && monthKey(t.occurred_on) === month)
    .reduce((sum, t) => sum + t.amount, 0);
}

export const perMonth = (c: Pick<Cover, "amount" | "months">): Cents => Math.ceil(c.amount / c.months / 100) * 100;

export interface Payback {
  cover: Cover;
  perMonth: Cents;
  repaid: Cents;
  outstanding: Cents;
}

/** Paybacks for accepted covers, with repayment allocated oldest first from extra contributions. */
export function paybacks(s: CoupleState): Payback[] {
  const covers = s.covers.filter((c) => c.status === "accepted").sort((a, b) => a.month.localeCompare(b.month) || a.created_at.localeCompare(b.created_at));
  // extras[pot|user|month] = what was paid beyond the base share and is still unallocated
  const extras = new Map<string, Cents>();
  const extraKey = (potId: string, userId: string, month: string) => `${potId}|${userId}|${month}`;
  const months = new Set(liveTx(s).filter((t) => t.kind === "contribution").map((t) => monthKey(t.occurred_on)));
  for (const c of covers) {
    for (const mo of months) {
      const k = extraKey(c.pot_id, c.for_user_id, mo);
      if (!extras.has(k)) extras.set(k, Math.max(creditedIn(s, c.pot_id, c.for_user_id, mo) - baseShare(s, c.pot_id, c.for_user_id), 0));
    }
  }
  return covers.map((cover) => {
    let repaid = 0;
    const start = monthKey(cover.month);
    for (const mo of [...months].sort()) {
      if (mo <= start || repaid >= cover.amount) continue;
      const k = extraKey(cover.pot_id, cover.for_user_id, mo);
      const take = Math.min(extras.get(k) ?? 0, cover.amount - repaid);
      extras.set(k, (extras.get(k) ?? 0) - take);
      repaid += take;
    }
    return { cover, perMonth: perMonth(cover), repaid, outstanding: cover.amount - repaid };
  });
}

/** Agreed share plus the payback instalments due in that month. */
export function expectedShare(s: CoupleState, potId: string, userId: string, month: string): Cents {
  const extra = paybacks(s)
    .filter((p) => p.cover.pot_id === potId && p.cover.for_user_id === userId && p.outstanding > 0)
    .filter((p) => monthKey(p.cover.month) < month && month <= addMonthKey(monthKey(p.cover.month), p.cover.months))
    .reduce((sum, p) => sum + Math.min(p.perMonth, p.outstanding), 0);
  return baseShare(s, potId, userId) + extra;
}

export const shortfallIn = (s: CoupleState, potId: string, userId: string, month: string): Cents =>
  Math.max(expectedShare(s, potId, userId, month) - creditedIn(s, potId, userId, month), 0);

/** Net amount one partner is still owed by the other across all accepted covers. */
export function whosAhead(s: CoupleState): { leaderId: string | null; amount: Cents } {
  const net = new Map<string, Cents>();
  for (const p of paybacks(s)) {
    net.set(p.cover.payer_id, (net.get(p.cover.payer_id) ?? 0) + p.outstanding);
    net.set(p.cover.for_user_id, (net.get(p.cover.for_user_id) ?? 0) - p.outstanding);
  }
  const [top] = [...net.entries()].sort((a, b) => b[1] - a[1]);
  return top && top[1] > 0 ? { leaderId: top[0], amount: top[1] } : { leaderId: null, amount: 0 };
}
