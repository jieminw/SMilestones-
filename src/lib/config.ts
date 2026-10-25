export const SUPABASE_URL: string = import.meta.env.VITE_SUPABASE_URL ?? "";
export const SUPABASE_KEY: string = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

/** Accounts are available only when Supabase is configured. The demo always works. */
export const cloudEnabled = Boolean(SUPABASE_URL && SUPABASE_KEY);

export const MODE_KEY = "sm-mode";
