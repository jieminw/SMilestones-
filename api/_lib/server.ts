import type { VercelRequest, VercelResponse } from "@vercel/node";
import postgres from "postgres";
import { createClient } from "@supabase/supabase-js";
import type { Db } from "../../src/data/db";
import { DomainError } from "../../src/domain/engine";

let sql: postgres.Sql | null = null;

function client() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set. See README → Supabase setup.");
  // prepare:false is required for Supabase's transaction pooler (port 6543)
  sql ??= postgres(process.env.DATABASE_URL, { prepare: false, max: 5, idle_timeout: 20 });
  return sql;
}

const wrap = (s: postgres.Sql | postgres.TransactionSql): Db => ({
  query: async (text, params = []) => (await s.unsafe(text, params as postgres.ParameterOrJSON<never>[])) as never[],
  transaction: async (fn) => {
    if ("begin" in s) return (await (s as postgres.Sql).begin((tx) => fn(wrap(tx)))) as never;
    return fn(wrap(s)); // already inside a transaction
  },
});

export const db = (): Db => wrap(client());

/** The signed-in user's id, verified by Supabase from the Bearer token the browser sends. */
export async function currentUserId(req: VercelRequest): Promise<string | null> {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!url || !key || !token) return null;
  const { data, error } = await createClient(url, key, { auth: { persistSession: false } }).auth.getUser(token);
  return error ? null : (data.user?.id ?? null);
}

export async function requireUser(req: VercelRequest) {
  const uid = await currentUserId(req);
  if (!uid) throw new DomainError("Your session has ended. Please sign in again.");
  return uid;
}

/** Wraps a handler: JSON in, JSON out, domain errors become friendly messages. */
export function route(method: "GET" | "POST", fn: (req: VercelRequest, uid: string) => Promise<unknown>) {
  return async (req: VercelRequest, res: VercelResponse) => {
    if (req.method !== method) return res.status(405).json({ ok: false, error: "Method not allowed." });
    try {
      const uid = await requireUser(req);
      return res.status(200).json(await fn(req, uid));
    } catch (e) {
      if (e instanceof DomainError) return res.status(200).json({ ok: false, error: e.message });
      console.error(e);
      // a short code (like ENOTFOUND or 28P01) helps find the cause without exposing details such as hostnames or passwords
      const code = (e as { code?: unknown }).code;
      return res.status(200).json({ ok: false, error: "Something went wrong on our side. Please try again.", code: typeof code === "string" ? code : (e as Error).name });
    }
  };
}
