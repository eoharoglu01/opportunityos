import "server-only";

import {
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

import type { Database } from "../types/supabase";

let cachedAdminClient:
  | SupabaseClient<Database>
  | null = null;

export function getSupabaseAdminClient():
  | SupabaseClient<Database>
  | null {
  if (cachedAdminClient) {
    return cachedAdminClient;
  }

  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    return null;
  }

  cachedAdminClient = createClient<Database>(
    url,
    serviceRoleKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );

  return cachedAdminClient;
}

export const supabaseAdmin =
  getSupabaseAdminClient();