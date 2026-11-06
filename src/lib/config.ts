export const SUPABASE_URL: string = import.meta.env.VITE_SUPABASE_URL ?? "";
export const SUPABASE_KEY: string = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

/**
 * Accounts (sign up, sign in, cloud data) are on only when Supabase is configured AND VITE_ENABLE_ACCOUNTS is "true".
 * The second condition is a switch: with it off, the site is the demo only, and the Log in and Create account buttons
 * are hidden, even if the Supabase keys are still set. The demo never needs Supabase and always works.
 */
export const cloudEnabled = Boolean(SUPABASE_URL && SUPABASE_KEY) && import.meta.env.VITE_ENABLE_ACCOUNTS === "true";

export const MODE_KEY = "sm-mode";
