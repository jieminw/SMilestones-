/**
 * Fluffy, the shared companion.
 *
 * Design fix: in the Figma, Food/Play raised health and joy for free, so a couple could
 * keep Fluffy happy while saving $0. Here, coins are earned ONLY by contributing, and
 * care actions spend coins. XP, coins and happiness are derived from the ledger, so
 * editing or deleting a contribution adjusts Fluffy automatically.
 */
import type { CareAction, CoupleState } from "./types";
import { clamp } from "./money";
import { daysBetween } from "./dates";
import { liveTx, potStages, stageProgress } from "./selectors";

export const CARE: Record<CareAction, { label: string; cost: number; effect: string; xp: number }> = {
  food: { label: "Food", cost: 10, effect: "+15 health", xp: 2 },
  play: { label: "Play", cost: 5, effect: "+10 joy", xp: 2 },
  rest: { label: "Rest", cost: 0, effect: "+10 health · once per 12h", xp: 1 },
  outfit: { label: "Wardrobe", cost: 60, effect: "Unlock a new outfit", xp: 10 },
};

export const OUTFITS = ["Bare fur", "Red scarf", "Graduation cap", "Bow tie", "Hard hat"];

export function contributionReward(amountCents: number) {
  const d = amountCents / 100;
  return {
    xp: 10 + Math.min(40, Math.floor(d / 25)),
    coins: Math.min(50, Math.max(1, Math.floor(d / 10))),
  };
}

export interface PetStatus {
  name: string;
  xp: number;
  level: number;
  levelXp: number;
  levelNeed: number;
  coinsEarned: number;
  coinsSpent: number;
  coins: number;
  happiness: number;
  health: number;
  streakMonths: number;
  outfits: number;
  mood: string;
  stagesDone: number;
}

/** Level L needs 100·L XP to reach L+1 (Lv1: 100, Lv2: 200, Lv3: 300...). */
export function levelFromXp(xp: number) {
  let level = 1;
  let left = xp;
  while (left >= level * 100) {
    left -= level * 100;
    level++;
  }
  return { level, levelXp: left, levelNeed: level * 100 };
}

export function petStatus(s: CoupleState, now: Date = new Date()): PetStatus {
  const contributions = liveTx(s).filter((t) => t.kind === "contribution");
  let xp = 0;
  let coinsEarned = 0;
  for (const t of contributions) {
    const r = contributionReward(t.amount);
    xp += r.xp;
    coinsEarned += r.coins;
  }
  let stagesDone = 0;
  for (const pot of s.pots) {
    if (pot.status === "draft" || pot.status === "pending_split") continue;
    if (pot.sequential) stagesDone += stageProgress(s, pot).filter((x) => x.status === "done").length;
    else if (potStages(s, pot.id).length && pot.status === "completed") stagesDone += 1;
  }
  xp += stagesDone * 50;
  coinsEarned += stagesDone * 25;

  let coinsSpent = 0;
  for (const c of s.petCare) {
    coinsSpent += c.coins;
    xp += CARE[c.action].xp;
  }

  const ageDays = (iso: string) => daysBetween(new Date(iso), now);
  const recent = (days: number) => contributions.filter((t) => ageDays(t.occurred_on) <= days).length;
  const careSince = (a: CareAction, days: number) => s.petCare.filter((c) => c.action === a && ageDays(c.created_at) <= days).length;

  const lastContribution = contributions.reduce<string | null>((m, t) => (!m || t.occurred_on > m ? t.occurred_on : m), null);
  const idle = lastContribution ? Math.max(0, ageDays(lastContribution) - 30) : 0;
  const happiness = contributions.length
    ? clamp(25 * Math.min(recent(30), 2) + 10 * Math.min(careSince("play", 3), 3) + 15 - idle * 2, 0, 100)
    : clamp(10 * Math.min(careSince("play", 3), 3), 0, 100);
  const health = clamp(55 + 15 * Math.min(careSince("food", 3), 2) + 10 * Math.min(careSince("rest", 2), 1) + (recent(30) ? 5 : 0), 0, 100);

  // Monthly streak: consecutive months in which either of you put money in.
  const months = new Set(contributions.map((t) => t.occurred_on.slice(0, 7)));
  let streakMonths = 0;
  const cursor = new Date(now.getFullYear(), now.getMonth(), 1);
  if (!months.has(key(cursor))) cursor.setMonth(cursor.getMonth() - 1);
  while (months.has(key(cursor))) {
    streakMonths++;
    cursor.setMonth(cursor.getMonth() - 1);
  }

  const { level, levelXp, levelNeed } = levelFromXp(xp);
  const mood =
    happiness >= 80 ? "Feeling loved" : happiness >= 50 ? "Content" : happiness >= 20 ? "A little lonely" : "Waiting for your first milestone";

  return {
    name: s.couple.pet_name,
    xp, level, levelXp, levelNeed,
    coinsEarned, coinsSpent, coins: coinsEarned - coinsSpent,
    happiness, health, streakMonths,
    outfits: 1 + s.petCare.filter((c) => c.action === "outfit").length,
    mood, stagesDone,
  };
}

const key = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
