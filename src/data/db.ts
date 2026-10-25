/**
 * Database-agnostic persistence for the engine's Mutations.
 * Works with any client that can run parameterised SQL inside a transaction:
 * postgres.js in production (Supabase), PGlite in tests.
 */
import type { CoupleState, Mutation, TableName } from "../domain/types";
import { STATE_KEY } from "../domain/types";

export interface Db {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>;
  /** Run `fn` in a transaction. Returning normally commits; throwing rolls back. */
  transaction<T>(fn: (tx: Db) => Promise<T>): Promise<T>;
}

type ColType = "text" | "int" | "bool" | "json" | "date" | "ts" | "uuid";

/** Column whitelist. Only these columns can ever be written, whatever the engine sends. */
export const COLUMNS: Record<TableName, Record<string, ColType>> = {
  couples: { id: "uuid", name: "text", pet_name: "text", version: "int", created_at: "ts" },
  profiles: { id: "uuid", couple_id: "uuid", display_name: "text", monthly_income: "int", age: "int", first_timer: "bool", cpf_oa: "int", created_at: "ts" },
  pots: { id: "uuid", couple_id: "uuid", kind: "text", name: "text", subtitle: "text", status: "text", sequential: "bool", target_date: "date", created_by: "uuid", created_at: "ts", bto: "json", wedding: "json" },
  stages: { id: "uuid", pot_id: "uuid", idx: "int", name: "text", description: "text", target: "int", due_date: "date" },
  proposals: { id: "uuid", pot_id: "uuid", couple_id: "uuid", proposed_by: "uuid", mode: "text", shares: "json", monthly_total: "int", status: "text", response_note: "text", responded_at: "ts", created_at: "ts" },
  transactions: { id: "uuid", couple_id: "uuid", pot_id: "uuid", kind: "text", amount: "int", user_id: "uuid", note: "text", occurred_on: "date", created_at: "ts", edited_at: "ts", voided_at: "ts", request_id: "uuid", covering: "uuid", verified_at: "ts" },
  requests: { id: "uuid", couple_id: "uuid", kind: "text", pot_id: "uuid", to_pot_id: "uuid", amount: "int", reason: "text", requested_by: "uuid", status: "text", response_note: "text", expires_at: "ts", responded_at: "ts", created_at: "ts" },
  pet_care: { id: "uuid", couple_id: "uuid", user_id: "uuid", action: "text", coins: "int", created_at: "ts" },
  notifications: { id: "uuid", couple_id: "uuid", user_id: "uuid", text: "text", href: "text", read: "bool", created_at: "ts" },
  money_dates: { id: "uuid", couple_id: "uuid", month: "date", completed_by: "json", created_at: "ts" },
  pot_members: { id: "uuid", couple_id: "uuid", pot_id: "uuid", user_id: "uuid", role: "text", display_name: "text", created_at: "ts" },
  covers: { id: "uuid", couple_id: "uuid", pot_id: "uuid", payer_id: "uuid", for_user_id: "uuid", month: "date", amount: "int", months: "int", status: "text", response_note: "text", responded_at: "ts", created_at: "ts" },
  bto_applications: { id: "uuid", couple_id: "uuid", pot_id: "uuid", exercise: "text", project_id: "text", flat_type: "text", applied_on: "date", result: "text", queue_number: "int", created_at: "ts" },
};

/** Select list that returns dates as 'YYYY-MM-DD' and timestamps as ISO 8601 strings. */
function selectList(table: TableName, alias = "t") {
  return Object.entries(COLUMNS[table])
    .map(([c, t]) => {
      const col = `${alias}.${c}`;
      if (t === "date") return `${col}::text as ${c}`;
      if (t === "ts") return `to_json(${col}) #>> '{}' as ${c}`;
      if (t === "uuid") return `${col}::text as ${c}`;
      return `${col}`;
    })
    .join(", ");
}

function normalise(table: TableName, row: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [c, t] of Object.entries(COLUMNS[table])) {
    let v = row[c];
    if (t === "ts" && typeof v === "string") v = new Date(v).toISOString();
    if (t === "json" && typeof v === "string") v = JSON.parse(v);
    out[c] = v ?? null;
  }
  return out;
}

const param = (t: ColType, v: unknown) => (t === "json" && v != null ? JSON.stringify(v) : v);
const cast = (t: ColType) => (t === "json" ? "::jsonb" : t === "uuid" ? "::uuid" : t === "date" ? "::date" : t === "ts" ? "::timestamptz" : "");

export async function loadState(db: Db, coupleId: string): Promise<CoupleState | null> {
  const [couple] = await db.query(`select ${selectList("couples")} from couples t where t.id = $1::uuid`, [coupleId]);
  if (!couple) return null;
  const byCouple = (table: TableName) =>
    db.query(`select ${selectList(table)} from ${table} t where t.couple_id = $1::uuid`, [coupleId]).then((rows) => rows.map((r) => normalise(table, r)));
  const [profiles, pots, proposals, transactions, requests, petCare, stages] = await Promise.all([
    byCouple("profiles"), byCouple("pots"), byCouple("proposals"), byCouple("transactions"), byCouple("requests"), byCouple("pet_care"),
    db.query(`select ${selectList("stages")} from stages t join pots p on p.id = t.pot_id where p.couple_id = $1::uuid`, [coupleId]).then((r) => r.map((x) => normalise("stages", x))),
  ]);
  const [notifications, btoApplications, covers, potMembers, moneyDates] = await Promise.all([
    byCouple("notifications"), byCouple("bto_applications"), byCouple("covers"), byCouple("pot_members"), byCouple("money_dates"),
  ]);
  return {
    couple: normalise("couples", couple) as unknown as CoupleState["couple"],
    profiles, pots, stages, proposals, transactions, requests, petCare, notifications, btoApplications, covers, potMembers, moneyDates,
  } as unknown as CoupleState;
}

export class ConflictError extends Error {
  constructor() {
    super("Your partner changed something at the same time. Please try again.");
    this.name = "ConflictError";
  }
}

/**
 * Apply mutations atomically. The couple's version must still equal `expectedVersion`
 * (optimistic locking), and every row touched must belong to this couple.
 */
export async function commit(db: Db, coupleId: string, expectedVersion: number, mutations: Mutation[]) {
  return db.transaction(async (tx) => {
    const bumped = await tx.query(`update couples set version = version + 1 where id = $1::uuid and version = $2 returning version`, [coupleId, expectedVersion]);
    if (!bumped.length) throw new ConflictError();

    for (const mu of mutations) {
      const cols = COLUMNS[mu.table];
      if (!cols) throw new Error(`Unknown table ${mu.table}`);
      const owned = ownership(mu.table);

      if (mu.op === "insert") {
        const row = mu.row as Record<string, unknown>;
        const keys = Object.keys(row).filter((k) => k in cols);
        if (mu.table === "stages") {
          const ok = await tx.query(`select 1 from pots where id = $1::uuid and couple_id = $2::uuid`, [row.pot_id, coupleId]);
          // the pot may be inserted earlier in this same batch — it is visible inside the transaction
          if (!ok.length) throw new Error("Stage for a pot outside this couple");
        } else if (row.couple_id !== coupleId) {
          throw new Error(`Insert into ${mu.table} for another couple`);
        }
        const values = keys.map((k, i) => `$${i + 1}${cast(cols[k])}`);
        await tx.query(`insert into ${mu.table} (${keys.join(", ")}) values (${values.join(", ")})`, keys.map((k) => param(cols[k], row[k])));
      } else if (mu.op === "update") {
        const keys = Object.keys(mu.patch).filter((k) => k in cols && k !== "id" && k !== "couple_id" && k !== "version");
        if (!keys.length) continue;
        const sets = keys.map((k, i) => `${k} = $${i + 1}${cast(cols[k])}`);
        const params = [...keys.map((k) => param(cols[k], mu.patch[k])), mu.id, coupleId];
        await tx.query(`update ${mu.table} t set ${sets.join(", ")} where t.id = $${keys.length + 1}::uuid and ${owned(keys.length + 2)}`, params);
      } else {
        await tx.query(`delete from ${mu.table} t where t.id = $1::uuid and ${owned(2)}`, [mu.id, coupleId]);
      }
    }
    return bumped[0] as { version: number };
  });
}

function ownership(table: TableName) {
  return (n: number) => {
    if (table === "couples") return `t.id = $${n}::uuid`;
    if (table === "stages") return `t.pot_id in (select id from pots where couple_id = $${n}::uuid)`;
    return `t.couple_id = $${n}::uuid`;
  };
}

export const stateKeyOf = (t: TableName) => STATE_KEY[t];
