export type SupabaseRuntimeMode = "MOCK" | "SUPABASE";

let runtimeModeLogged = false;

function normalizeEnvValue(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value
    .trim()
    .replace(/^['"]|['"]$/g, "")
    .replace(/\\r|\\n/g, "")
    .trim();

  return normalized || undefined;
}

function normalizeSupabaseUrl(value: string | undefined): string | undefined {
  const normalized = normalizeEnvValue(value);

  if (!normalized) {
    return undefined;
  }

  try {
    const parsed = new URL(normalized);

    if (
      parsed.protocol !== "https:" ||
      !parsed.hostname.endsWith(".supabase.co")
    ) {
      return undefined;
    }

    return parsed.origin;
  } catch {
    return undefined;
  }
}

function isValidSupabaseAnonKey(value: string | undefined): boolean {
  const normalized = normalizeEnvValue(value);

  if (!normalized || normalized.length < 20) {
    return false;
  }

  const placeholders = ["your", "placeholder", "example", "changeme"];
  return !placeholders.some((placeholder) =>
    normalized.toLowerCase().includes(placeholder),
  );
}

export function getSupabaseEnv() {
  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anonKey = normalizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  return {
    url,
    anonKey,
  };
}

export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = getSupabaseEnv();
  const useSupabaseFlag =
    normalizeEnvValue(process.env.NEXT_PUBLIC_USE_SUPABASE)?.toLowerCase() ===
    "true";

  return Boolean(useSupabaseFlag && url && isValidSupabaseAnonKey(anonKey));
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
