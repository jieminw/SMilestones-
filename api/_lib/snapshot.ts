import type { CoupleState, Profile } from "../../src/domain/types";
import { loadState } from "../../src/data/db";
import { getProfile, loadContributorState } from "../../src/data/pairing";
import { db } from "./server";

export type Snapshot = { me: Profile; state: CoupleState | null; role: "partner" | "contributor" };

export async function snapshotFor(uid: string): Promise<Snapshot | null> {
  const me = await getProfile(db(), uid);
  if (!me) return null;
  if (!me.couple_id) {
    // not paired: either waiting to pair, or a contributor invited to one pot
    const state = await loadContributorState(db(), uid);
    return { me, state, role: state ? "contributor" : "partner" };
  }
  const state = await loadState(db(), me.couple_id);
  if (state) state.notifications = state.notifications.filter((n) => n.user_id === uid);
  return { me, state, role: "partner" };
}
