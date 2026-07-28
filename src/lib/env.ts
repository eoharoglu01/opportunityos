export type SupabaseRuntimeMode = "MOCK" | "SUPABASE";

let runtimeModeLogged = false;

function isValidSupabaseUrl(value: string | undefined): boolean {
  if (!value) {
    return false;
  }

  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" && parsed.hostname.includes("supabase") && parsed.hostname.includes("co");
  } catch {
    return false;
  }
}

function isValidSupabaseAnonKey(value: string | undefined): boolean {
  if (!value) {
    return false;
  }

  const normalized = value.trim();
  if (normalized.length < 20) {
    return false;
  }

  const placeholders = ["your", "placeholder", "example", "anon", "changeme"];
  return !placeholders.some((placeholder) => normalized.toLowerCase().includes(placeholder));
}

export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  return {
    url: url || undefined,
    anonKey: anonKey || undefined,
  };
}

export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = getSupabaseEnv();
  const useSupabaseFlag = process.env.NEXT_PUBLIC_USE_SUPABASE?.trim().toLowerCase() === "true";
  return (
    useSupabaseFlag &&
    isValidSupabaseUrl(url) &&
    isValidSupabaseAnonKey(anonKey)
  );
}

export function getSupabaseRuntimeMode(): SupabaseRuntimeMode {
  return isSupabaseConfigured() ? "SUPABASE" : "MOCK";
}

export function logSupabaseRuntimeMode(): SupabaseRuntimeMode {
  const mode = getSupabaseRuntimeMode();

  if (!runtimeModeLogged && process.env.NODE_ENV !== "production") {
    runtimeModeLogged = true;
    console.info(`[OpportunityOS] Runtime mode: ${mode}`);
  }

  return mode;
}
