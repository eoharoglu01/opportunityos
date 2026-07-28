import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { supabaseAdmin } from "../../../../../src/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return process.env.NODE_ENV !== "production";
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Yetkisiz istek." }, { status: 401 });
  }

  const client = supabaseAdmin as SupabaseClient | null;
  if (!client) {
    return NextResponse.json(
      { success: false, error: "SUPABASE_SERVICE_ROLE_KEY tanımlı değil." },
      { status: 503 },
    );
  }

  const { data, error } = await client
    .from("catalog_sync_runs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, data });
}
