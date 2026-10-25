/**
 * Accounts & pairing (cloud mode). A couple row is only created when two people pair,
 * so a "couple of one" never exists.
 */
import type { Db } from "./db";
import { commit, ConflictError, loadState } from "./db";
import type { CoupleState, Profile } from "../domain/types";
import { DomainError, run, type Command } from "../domain/engine";

import { INVITE_TTL_MINUTES, POT_INVITE_TTL_DAYS } from "./pairing-constants";
export { INVITE_TTL_MINUTES, POT_INVITE_TTL_DAYS };

export async function getProfile(db: Db, userId: string): Promise<Profile | null> {
  const [p] = await db.query<Profile>(
    `select id::text, couple_id::text, display_name, monthly_income, age, first_timer, cpf_oa, to_json(created_at) #>> '{}' as created_at
       from profiles where id = $1::uuid`,
    [userId],
  );
  return p ?? null;
}

export async function updateProfile(db: Db, userId: string, patch: { display_name?: string; monthly_income?: number | null; age?: number | null; first_timer?: boolean | null; cpf_oa?: number | null }) {
  if (patch.display_name !== undefined && !patch.display_name.trim()) throw new DomainError("Your name can't be empty.");
  await db.query(
    `update profiles set display_name = coalesce($2, display_name), monthly_income = $3, age = $4, first_timer = $5, cpf_oa = $6 where id = $1::uuid`,
    [userId, patch.display_name?.trim() ?? null, patch.monthly_income ?? null, patch.age ?? null, patch.first_timer ?? null, patch.cpf_oa ?? null],
  );
}

export async function createInvite(db: Db, userId: string, now = new Date()): Promise<{ code: string; expires_at: string }> {
  const me = await getProfile(db, userId);
  if (!me) throw new DomainError("Profile not found.");
  if (me.couple_id) throw new DomainError("You're already paired.");
  // reuse a live code if there is one
  const [live] = await db.query<{ code: string; expires_at: string }>(
    `select code, to_json(expires_at) #>> '{}' as expires_at from invites where created_by = $1::uuid and used_at is null and expires_at > $2::timestamptz order by expires_at desc limit 1`,
    [userId, now.toISOString()],
  );
  if (live) return { code: live.code, expires_at: new Date(live.expires_at).toISOString() };
  const expires = new Date(now.getTime() + INVITE_TTL_MINUTES * 60_000).toISOString();
  for (let i = 0; i < 5; i++) {
    const code = String(Math.floor(100_000 + Math.random() * 900_000));
    const rows = await db.query(
      `insert into invites (code, created_by, expires_at) values ($1, $2::uuid, $3::timestamptz) on conflict (code) do nothing returning code`,
      [code, userId, expires],
    );
    if (rows.length) return { code, expires_at: expires };
  }
  throw new Error("Could not generate a code, please retry.");
}

export async function joinInvite(db: Db, userId: string, code: string, now = new Date()): Promise<string> {
  const clean = code.replace(/\D/g, "");
  if (clean.length !== 6) throw new DomainError("Enter the 6-digit code from your partner.");
  return db.transaction(async (tx) => {
    const [inv] = await tx.query<{ created_by: string; expires_at: string; used_at: string | null }>(
      `select created_by::text, to_json(expires_at) #>> '{}' as expires_at, used_at from invites where code = $1 for update`,
      [clean],
    );
    if (!inv || inv.used_at) throw new DomainError("That code doesn't exist or was already used.");
    if (new Date(inv.expires_at) <= now) throw new DomainError("That code has expired. Ask your partner for a new one.");
    if (inv.created_by === userId) throw new DomainError("That's your own code — send it to your partner instead.");
    const people = await tx.query<{ id: string; couple_id: string | null; display_name: string }>(
      `select id::text, couple_id::text, display_name from profiles where id in ($1::uuid, $2::uuid) for update`,
      [userId, inv.created_by],
    );
    if (people.some((p) => p.couple_id)) throw new DomainError("One of you is already paired with someone.");
    const first = (id: string) => people.find((p) => p.id === id)?.display_name.split(" ")[0] ?? "Partner";
    const names = [first(inv.created_by), first(userId)];
    const [couple] = await tx.query<{ id: string }>(`insert into couples (name) values ($1) returning id::text`, [names.join(" & ")]);
    await tx.query(`update profiles set couple_id = $1::uuid where id in ($2::uuid, $3::uuid)`, [couple.id, userId, inv.created_by]);
    await tx.query(`update invites set used_by = $1::uuid, used_at = $2::timestamptz where code = $3`, [userId, now.toISOString(), clean]);
    return couple.id;
  });
}

// ------------------------------------------------------------------ contributors (parents) on one pot

/** A partner creates a code for one pot. The contributor enters it after signing up. */
export async function createPotInvite(db: Db, userId: string, potId: string, label: string, now = new Date()): Promise<{ code: string; expires_at: string }> {
  const me = await getProfile(db, userId);
  if (!me?.couple_id) throw new DomainError("Pair with your partner first.");
  const name = label.trim().slice(0, 30);
  if (!name) throw new DomainError("Say who this is for, for example Mum.");
  const [owned] = await db.query(`select 1 from pots where id = $1::uuid and couple_id = $2::uuid`, [potId, me.couple_id]);
  if (!owned) throw new DomainError("That pot isn't part of your couple.");
  const expires = new Date(now.getTime() + POT_INVITE_TTL_DAYS * 86_400_000).toISOString();
  for (let i = 0; i < 8; i++) {
    const code = String(Math.floor(100_000 + Math.random() * 900_000));
    // keep codes unambiguous against couple invites too
    const [clash] = await db.query(`select 1 from invites where code = $1 and used_at is null`, [code]);
    if (clash) continue;
    const rows = await db.query(
      `insert into pot_invites (code, couple_id, pot_id, created_by, label, expires_at) values ($1, $2::uuid, $3::uuid, $4::uuid, $5, $6::timestamptz) on conflict (code) do nothing returning code`,
      [code, me.couple_id, potId, userId, name, expires],
    );
    if (rows.length) return { code, expires_at: expires };
  }
  throw new Error("Could not generate a code, please retry.");
}

/** A signed-in person with no couple joins one pot as a contributor. Returns the pot id. */
export async function joinPotInvite(db: Db, userId: string, code: string, now = new Date()): Promise<string> {
  const clean = code.replace(/\D/g, "");
  if (clean.length !== 6) throw new DomainError("Enter the 6-digit code you were sent.");
  return db.transaction(async (tx) => {
    const [inv] = await tx.query<{ couple_id: string; pot_id: string; created_by: string; label: string; expires_at: string; used_at: string | null }>(
      `select couple_id::text, pot_id::text, created_by::text, label, to_json(expires_at) #>> '{}' as expires_at, used_at from pot_invites where code = $1 for update`,
      [clean],
    );
    if (!inv || inv.used_at) throw new DomainError("That code doesn't exist or was already used.");
    if (new Date(inv.expires_at) <= now) throw new DomainError("That code has expired. Ask for a new one.");
    const me = await getProfile(tx, userId);
    if (!me) throw new DomainError("Profile not found.");
    if (me.couple_id) throw new DomainError("You're already part of a couple, so you can't join as a contributor.");
    await tx.query(
      `insert into pot_members (id, couple_id, pot_id, user_id, role, display_name) values (gen_random_uuid(), $1::uuid, $2::uuid, $3::uuid, 'contributor', $4) on conflict (pot_id, user_id) do nothing`,
      [inv.couple_id, inv.pot_id, userId, inv.label],
    );
    await tx.query(`update pot_invites set used_by = $1::uuid, used_at = $2::timestamptz where code = $3`, [userId, now.toISOString(), clean]);
    return inv.pot_id;
  });
}

/** Couple invite first; if the code isn't one of those, try a pot invite. */
export async function joinAnyInvite(db: Db, userId: string, code: string): Promise<{ kind: "couple" | "pot" }> {
  try {
    await joinInvite(db, userId, code);
    return { kind: "couple" };
  } catch (e) {
    if (!(e instanceof DomainError) || !/doesn't exist or was already used/.test(e.message)) throw e;
  }
  await joinPotInvite(db, userId, code);
  return { kind: "pot" };
}

export async function contributorCouple(db: Db, userId: string): Promise<string | null> {
  const [row] = await db.query<{ couple_id: string }>(`select couple_id::text from pot_members where user_id = $1::uuid and role = 'contributor' limit 1`, [userId]);
  return row?.couple_id ?? null;
}

/**
 * What a contributor may see: the couple's name, the pots they were invited to with their stages and ledger,
 * and the partners' first names. Incomes, ages, CPF balances, splits, requests and every other pot are removed.
 */
export async function loadContributorState(db: Db, userId: string): Promise<CoupleState | null> {
  const coupleId = await contributorCouple(db, userId);
  if (!coupleId) return null;
  const full = await loadState(db, coupleId);
  if (!full) return null;
  const mine = new Set(full.potMembers.filter((x) => x.user_id === userId && x.role === "contributor").map((x) => x.pot_id));
  return {
    ...full,
    profiles: full.profiles.map((p) => ({ ...p, monthly_income: null, age: null, first_timer: null, cpf_oa: null })),
    pots: full.pots.filter((p) => mine.has(p.id)).map((p) => ({ ...p, bto: null })),
    stages: full.stages.filter((x) => mine.has(x.pot_id)),
    transactions: full.transactions.filter((t) => mine.has(t.pot_id)),
    potMembers: full.potMembers.filter((x) => mine.has(x.pot_id)),
    proposals: [], requests: [], petCare: [], btoApplications: [], covers: [],
    notifications: full.notifications.filter((n) => n.user_id === userId),
  };
}

export type CommandResult = { ok: true; createdId?: string } | { ok: false; error: string };

/** Load → run the engine → commit, retrying if the partner wrote at the same moment. */
export async function runForUser(db: Db, userId: string, cmd: Command, newId: () => string): Promise<CommandResult> {
  const me = await getProfile(db, userId);
  const coupleId = me?.couple_id ?? (me ? await contributorCouple(db, userId) : null);
  if (!coupleId) return { ok: false, error: "Pair with your partner first." };
  for (let attempt = 0; attempt < 3; attempt++) {
    const state = await loadState(db, coupleId);
    if (!state) return { ok: false, error: "Couple not found." };
    try {
      const r = run(state, cmd, { userId, now: new Date(), newId });
      await commit(db, coupleId, state.couple.version, r.mutations);
      return { ok: true, createdId: r.createdId };
    } catch (e) {
      if (e instanceof ConflictError) continue;
      if (e instanceof DomainError) return { ok: false, error: e.message };
      throw e;
    }
  }
  return { ok: false, error: new ConflictError().message };
}
