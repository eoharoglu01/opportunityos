import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "../../../src/lib/supabaseAdmin";
import { getProductionEnvReport } from "../../../src/lib/server/productionEnv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const env = getProductionEnvReport();
  const client = getSupabaseAdminClient();
  let database = false;
  let databaseError: string | null = null;

  if (client) {
    const { error } = await client.from("stores").select("id", { head: true, count: "exact" }).limit(1);
    database = !error;
    databaseError = error?.message ?? null;
  }

  const ready = env.ok && database;
  return NextResponse.json(
    { success: ready, ready, checks: { environment: env.ok, database }, missing: env.missing, databaseError },
    { status: ready ? 200 : 503 },
  );
}
