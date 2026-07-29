import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/supabase";
import { getSupabaseEnv, isSupabaseConfigured, logSupabaseRuntimeMode } from "./env";

let cachedClient: SupabaseClient<Database> | null = null;

export function getSupabaseClient(): SupabaseClient<Database> | null {
  if (cachedClient) {
    return cachedClient;
  }

  logSupabaseRuntimeMode();

  if (!isSupabaseConfigured()) {
    return null;
  }

  const { url, anonKey } = getSupabaseEnv();

  if (!url || !anonKey) {
    return null;
  }

  cachedClient = createClient<Database>(url, anonKey, {
    auth: {
     persistSession: true,
autoRefreshToken: true,
detectSessionInUrl: true,
storage:
  typeof window !== "undefined"
    ? window.localStorage
    : undefined,
    },
  });

  return cachedClient;
}

export const supabase = getSupabaseClient();
