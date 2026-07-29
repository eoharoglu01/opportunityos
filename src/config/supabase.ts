import { getSupabaseRuntimeMode, logSupabaseRuntimeMode } from "../lib/env";

logSupabaseRuntimeMode();

export const supabaseConfig = {
  useSupabase: getSupabaseRuntimeMode() === "SUPABASE",
} as const;
