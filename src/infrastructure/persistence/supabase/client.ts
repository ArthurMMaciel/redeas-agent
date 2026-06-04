import { createClient } from "@supabase/supabase-js";
import { env } from "../../config/env.js";

export function createSupabaseClient() {
  const key = env.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_PUBLISHABLE_KEY;

  if (!env.SUPABASE_URL || !key) {
    throw new Error("Supabase credentials are not configured");
  }

  return createClient(env.SUPABASE_URL, key, {
    auth: { persistSession: false }
  });
}

