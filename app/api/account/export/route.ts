import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "../../../../src/lib/supabaseAdmin";
import { requireUserFromBearer } from "../../../../src/lib/server/authUser";

export const runtime = "nodejs";
export async function GET(request: Request) {
  const auth = await requireUserFromBearer(request);
  if (!auth.user) return NextResponse.json({ success: false, error: auth.error ?? "Yetkisiz istek." }, { status: 401 });
  const client = getSupabaseAdminClient() as SupabaseClient | null;
  if (!client) return NextResponse.json({ success: false, error: "Sunucu bağlantısı hazır değil." }, { status: 503 });
  const tableNames = ["favorites", "price_alerts", "alerts", "notifications", "shopping_lists"] as const;
  const records: Record<string, unknown> = {};
  for (const table of tableNames) {
    const { data, error } = await client.from(table).select("*").eq("user_id", auth.user.id);
    records[table] = error ? { unavailable: true } : data;
  }
  return NextResponse.json({ success: true, exportedAt: new Date().toISOString(), user: { id: auth.user.id, email: auth.user.email, createdAt: auth.user.created_at }, records }, { headers: { "Content-Disposition": `attachment; filename=opportunityos-data-${auth.user.id}.json` } });
}
