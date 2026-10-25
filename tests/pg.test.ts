/**
 * Runs the real Supabase migration on PGlite (Postgres compiled to WASM) and exercises
 * pairing, the command runner, optimistic locking and the ownership checks.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { PGlite, type Transaction } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { commit, ConflictError, loadState, type Db } from "@/data/db";
import { createInvite, createPotInvite, joinAnyInvite, joinInvite, joinPotInvite, loadContributorState, runForUser } from "@/data/pairing";
import { potBalance } from "@/domain/selectors";
import { dollars } from "@/domain/money";

const wrap = (pg: PGlite | Transaction): Db => ({
  query: async (text, params) => (await pg.query(text, params)).rows as never[],
  transaction: (fn) => (pg as PGlite).transaction((tx) => fn(wrap(tx))),
});

let db: Db;
let pgRaw: PGlite;
const A = randomUUID();
const B = randomUUID();
const C = randomUUID(); // a parent, not part of the couple

beforeAll(async () => {
  const pg = new PGlite();
  await pg.exec(`
    create schema auth;
    create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb);
    create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
  `);
  for (const file of readdirSync(path.join(__dirname, "../supabase/migrations")).sort()) {
    await pg.exec(readFileSync(path.join(__dirname, "../supabase/migrations", file), "utf8"));
  }
  await pg.query(`insert into auth.users values ($1, 'dephany@example.com', '{"display_name":"Dephany Tan"}'), ($2, 'julian@example.com', '{}')`, [A, B]);
  await pg.query(`insert into auth.users values ($1, 'mum@example.com', '{"display_name":"Mum Tan"}')`, [C]);
  pgRaw = pg;
  db = wrap(pg);
});

describe("Supabase schema on Postgres", () => {
  let coupleId: string;

  it("creates profiles via the auth trigger", async () => {
    const rows = await db.query<{ display_name: string }>(`select display_name from profiles order by display_name`);
    expect(rows.map((r) => r.display_name)).toEqual(["Dephany Tan", "Mum Tan", "julian"]);
  });

  it("pairs two people with an invite code", async () => {
    const { code } = await createInvite(db, A);
    expect(code).toMatch(/^\d{6}$/);
    await expect(joinInvite(db, A, code)).rejects.toThrow(/own code/);
    coupleId = await joinInvite(db, B, code);
    await expect(joinInvite(db, B, code)).rejects.toThrow(/already used/);
    const s = await loadState(db, coupleId);
    expect(s!.couple.name).toBe("Dephany & julian");
    expect(s!.profiles).toHaveLength(2);
  });

  it("runs commands end to end and computes balances from the ledger", async () => {
    const created = await runForUser(db, A, {
      type: "createPot", kind: "trip", name: "Japan", subtitle: "", target_date: "2027-12-01", bto: null,
      stages: [{ name: "Flights", description: "", target: dollars(1_000), due_date: null }, { name: "Hotel", description: "", target: dollars(1_000), due_date: null }],
    }, randomUUID);
    expect(created.ok).toBe(true);
    const potId = (created as { createdId: string }).createdId;

    const early = await runForUser(db, A, { type: "logContribution", potId, amount: 100, occurred_on: "2026-10-20", note: "" }, randomUUID);
    expect(early).toEqual({ ok: false, error: expect.stringMatching(/agree the split/) });

    const prop = await runForUser(db, A, { type: "proposeSplit", potId, mode: "equal", shares: { [A]: dollars(100), [B]: dollars(100) } }, randomUUID);
    const proposalId = (prop as { createdId: string }).createdId;
    expect((await runForUser(db, B, { type: "respondSplit", proposalId, accept: true }, randomUUID)).ok).toBe(true);

    await runForUser(db, A, { type: "logContribution", potId, amount: dollars(150), occurred_on: "2026-10-20", note: "first!" }, randomUUID);
    await runForUser(db, B, { type: "logContribution", potId, amount: dollars(50), occurred_on: "2026-10-21", note: "" }, randomUUID);

    const s = (await loadState(db, coupleId))!;
    expect(potBalance(s, potId)).toBe(dollars(200));
    expect(s.stages.map((x) => x.due_date)).toEqual([null, null]);
    expect(s.pots[0].target_date).toBe("2027-12-01");
    expect(s.notifications.length).toBeGreaterThan(0);
    expect(typeof s.transactions[0].created_at).toBe("string");
  });

  it("rejects a commit made against a stale version", async () => {
    const s = (await loadState(db, coupleId))!;
    await commit(db, coupleId, s.couple.version, []);
    await expect(commit(db, coupleId, s.couple.version, [])).rejects.toBeInstanceOf(ConflictError);
  });

  it("refuses to write rows for another couple", async () => {
    const s = (await loadState(db, coupleId))!;
    await expect(
      commit(db, coupleId, s.couple.version, [
        { table: "notifications", op: "insert", row: { id: randomUUID(), couple_id: randomUUID(), user_id: A, text: "x", href: "/", read: false, created_at: new Date().toISOString() } as { id: string } },
      ]),
    ).rejects.toThrow(/another couple/);
    // and the failed batch rolled back, so the version did not move
    expect((await loadState(db, coupleId))!.couple.version).toBe(s.couple.version);
  });
});

describe("contributors on one pot", () => {
  let coupleId: string;
  let japan: string;
  let car: string;

  /** Run `fn` as a signed-in user under row level security: the `authenticated` role, with auth.uid() set. */
  async function asUser<T>(uid: string, fn: () => Promise<T>): Promise<T> {
    await pgRaw.exec(`set role authenticated`);
    await pgRaw.query(`select set_config('test.uid', $1, false)`, [uid]);
    try {
      return await fn();
    } finally {
      await pgRaw.exec(`reset role`);
    }
  }

  beforeAll(async () => {
    [{ couple_id: coupleId }] = await db.query<{ couple_id: string }>(`select couple_id::text from profiles where id = $1::uuid`, [A]);
    japan = (await db.query<{ id: string }>(`select id::text from pots where name = 'Japan'`))[0].id;
    const made = await runForUser(db, A, { type: "createPot", kind: "custom", name: "Car", subtitle: "", target_date: "2028-01-01", bto: null, stages: [{ name: "Car", description: "", target: dollars(5_000), due_date: null }] }, randomUUID);
    car = (made as { createdId: string }).createdId;
    // Row level security for the browser's public key: sign-in is simulated through auth.uid().
    await pgRaw.exec(`
      create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
      create role authenticated;
      grant usage on schema public, auth to authenticated;
      grant select on all tables in schema public to authenticated;
      grant execute on all functions in schema public to authenticated;
    `);
  });

  it("a partner creates a pot invite and a parent joins it", async () => {
    await expect(createPotInvite(db, C, japan, "Mum")).rejects.toThrow(/Pair with your partner/);
    await expect(createPotInvite(db, A, japan, "  ")).rejects.toThrow(/who this is for/);
    const { code } = await createPotInvite(db, A, japan, "Mum");
    expect(code).toMatch(/^\d{6}$/);
    await expect(joinPotInvite(db, A, code)).rejects.toThrow(/already part of a couple/);
    expect(await joinAnyInvite(db, C, code)).toEqual({ kind: "pot" });
    await expect(joinPotInvite(db, C, code)).rejects.toThrow(/already used/);
    const [m] = await db.query<{ role: string; display_name: string }>(`select role, display_name from pot_members where user_id = $1::uuid`, [C]);
    expect(m).toEqual({ role: "contributor", display_name: "Mum" });
  });

  it("the contributor's view holds one pot and no private details", async () => {
    const s = (await loadContributorState(db, C))!;
    expect(s.pots.map((p) => p.name)).toEqual(["Japan"]);
    expect(s.stages.every((x) => x.pot_id === japan)).toBe(true);
    expect(s.transactions.every((t) => t.pot_id === japan)).toBe(true);
    expect(s.proposals).toEqual([]);
    expect(s.requests).toEqual([]);
    expect(s.covers).toEqual([]);
    for (const p of s.profiles) expect(p).toMatchObject({ monthly_income: null, age: null, first_timer: null, cpf_oa: null });
  });

  it("the server lets the contributor give to their pot and nothing else", async () => {
    const ok = await runForUser(db, C, { type: "logContribution", potId: japan, amount: dollars(100), occurred_on: "2026-10-20", note: "" }, randomUUID);
    expect(ok.ok).toBe(true);
    const [gift] = await db.query<{ note: string; user_id: string }>(`select note, user_id::text from transactions where user_id = $1::uuid`, [C]);
    expect(gift.note).toBe("Gift from Mum");

    const other = await runForUser(db, C, { type: "logContribution", potId: car, amount: dollars(100), occurred_on: "2026-10-20", note: "" }, randomUUID);
    expect(other.ok).toBe(false);

    // cannot ask for money out, or approve a partner's request
    const req = await runForUser(db, A, { type: "requestWithdrawal", potId: japan, amount: dollars(50), reason: "test" }, randomUUID);
    const requestId = (req as { createdId: string }).createdId;
    const take = await runForUser(db, C, { type: "requestWithdrawal", potId: japan, amount: dollars(10), reason: "x" }, randomUUID);
    expect(take.ok).toBe(false);
    const approve = await runForUser(db, C, { type: "respondRequest", requestId, approve: true }, randomUUID);
    expect(approve).toEqual({ ok: false, error: expect.stringMatching(/Only the couple/) });
    const [row] = await db.query<{ status: string }>(`select status from requests where id = $1::uuid`, [requestId]);
    expect(row.status).toBe("pending");
  });

  it("row level security: a contributor reads only their pot, not the couple's other data", async () => {
    await asUser(C, async () => {
      const pots = await db.query<{ name: string }>(`select name from pots order by name`);
      expect(pots.map((p) => p.name)).toEqual(["Japan"]);
      expect(await db.query(`select 1 from pots where id = $1::uuid`, [car])).toHaveLength(0);
      const tx = await db.query<{ pot_id: string }>(`select pot_id::text from transactions`);
      expect(tx.length).toBeGreaterThan(0);
      expect(tx.every((t) => t.pot_id === japan)).toBe(true);
      expect(await db.query(`select 1 from stages where pot_id = $1::uuid`, [car])).toHaveLength(0);
      // nothing about the couple's money decisions, partners' details or other people's notifications
      expect(await db.query(`select 1 from requests`)).toHaveLength(0);
      expect(await db.query(`select 1 from proposals`)).toHaveLength(0);
      expect(await db.query(`select 1 from covers`)).toHaveLength(0);
      expect(await db.query(`select 1 from notifications`)).toHaveLength(0);
      const people = await db.query<{ id: string }>(`select id::text from profiles`);
      expect(people.map((p) => p.id)).toEqual([C]); // her own row only: no partner profiles or incomes
    });
  });

  it("row level security: a contributor cannot write directly", async () => {
    await asUser(C, async () => {
      await expect(db.query(`insert into transactions (id, couple_id, pot_id, kind, amount, user_id, occurred_on) values (gen_random_uuid(), $1::uuid, $2::uuid, 'contribution', 100, $3::uuid, '2026-10-20')`, [coupleId, japan, C])).rejects.toThrow(/permission denied/);
      await expect(db.query(`update requests set status = 'approved'`)).rejects.toThrow(/permission denied/);
    });
  });

  it("row level security: the partners still see everything of their own couple", async () => {
    await asUser(A, async () => {
      const pots = await db.query<{ name: string }>(`select name from pots order by name`);
      expect(pots.map((p) => p.name)).toEqual(["Car", "Japan"]);
      expect((await db.query(`select 1 from profiles`)).length).toBe(2);
      expect((await db.query(`select 1 from pot_members`)).length).toBe(1);
    });
  });
});
