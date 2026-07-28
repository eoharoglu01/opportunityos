import "server-only";

const REQUIRED_SERVER = ["SUPABASE_SERVICE_ROLE_KEY", "CRON_SECRET"] as const;
const REQUIRED_PUBLIC = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"] as const;

export function getProductionEnvReport() {
  const required = [...REQUIRED_SERVER, ...REQUIRED_PUBLIC];
  const missing = required.filter((key) => !process.env[key]?.trim());
  const exposedServerSecrets = REQUIRED_SERVER.filter((key) => key.startsWith("NEXT_PUBLIC_"));
  return {
    ok: missing.length === 0 && exposedServerSecrets.length === 0,
    missing,
    exposedServerSecrets,
    nodeEnv: process.env.NODE_ENV ?? "unknown",
    vercelEnv: process.env.VERCEL_ENV ?? null,
  };
}

export function assertProductionEnv() {
  const report = getProductionEnvReport();
  if (process.env.NODE_ENV === "production" && !report.ok) {
    throw new Error(`Production ortam değişkenleri eksik: ${report.missing.join(", ")}`);
  }
  return report;
}
