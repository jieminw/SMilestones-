import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_KEY, SUPABASE_URL } from "./config";

let client: SupabaseClient | null = null;

/** Browser client. The session lives in localStorage and refreshes itself. */
export const supabase = () => (client ??= createClient(SUPABASE_URL, SUPABASE_KEY));
