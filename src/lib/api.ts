import type { Command } from "@/domain/engine";
import type { CoupleState, Profile } from "@/domain/types";
import { supabase } from "./supabase";

export type Snapshot = { me: Profile; state: CoupleState | null; role?: "partner" | "contributor" };
export type Simple<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };
export type CommandResult = ({ ok: true; createdId?: string } | { ok: false; error: string }) & { snapshot?: Snapshot | null };

async function call<T>(path: string, method: "GET" | "POST", body?: unknown): Promise<T> {
  const { data } = await supabase().auth.getSession();
  try {
    const res = await fetch(`/api/${path}`, {
      method,
      headers: { "content-type": "application/json", authorization: `Bearer ${data.session?.access_token ?? ""}` },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return (await res.json()) as T;
  } catch {
    return { ok: false, error: "Can't reach the server. Check your connection and try again." } as T;
  }
}

export async function fetchSnapshot(): Promise<Snapshot | null> {
  const r = await call<{ ok: boolean; snapshot?: Snapshot | null }>("snapshot", "GET");
  return r.ok ? (r.snapshot ?? null) : null;
}
export const runCommandAction = (cmd: Command) => call<CommandResult>("command", "POST", { cmd });
export const createInviteAction = () => call<Simple<{ code: string; expires_at: string }>>("invite", "POST", {});
export const joinInviteAction = (code: string) => call<Simple<{ kind: "couple" | "pot" }>>("join", "POST", { code });
export const createPotInviteAction = (potId: string, label: string) => call<Simple<{ code: string; expires_at: string }>>("pot-invite", "POST", { potId, label });
export const updateProfileAction = (patch: { display_name?: string; monthly_income?: number | null; age?: number | null; first_timer?: boolean | null; cpf_oa?: number | null }) =>
  call<Simple>("profile", "POST", patch);
