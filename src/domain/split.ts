import type { Cents } from "./money";
import type { SplitMode } from "./types";

/**
 * Split a monthly target between two partners, rounding each share UP to a whole dollar
 * so the pair never falls short. Any overshoot is shown as a "buffer".
 *   equal:  $1,149 → $575 + $575 (buffer $1)
 *   income: $1,149 with incomes 3,600 / 3,900 → 48% / 52% → $552 + $598 (buffer $1)
 */
export function splitShares(mode: Exclude<SplitMode, "custom">, total: Cents, incomeA: number | null, incomeB: number | null): [Cents, Cents] {
  const up = (c: number) => Math.ceil(c / 100) * 100;
  if (mode === "income" && incomeA && incomeB && incomeA + incomeB > 0) {
    const shareA = up((total * incomeA) / (incomeA + incomeB));
    const shareB = up(total - shareA);
    return [shareA, Math.max(shareB, 0)];
  }
  const half = up(total / 2);
  return [half, half];
}

export function sharePct(a: Cents, b: Cents): [number, number] {
  const t = a + b;
  if (!t) return [50, 50];
  const pa = Math.round((a / t) * 100);
  return [pa, 100 - pa];
}
