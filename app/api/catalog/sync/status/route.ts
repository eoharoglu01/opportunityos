import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdminClient } from "../../../../../src/lib/supabaseAdmin";
import { isBearerAuthorized } from "../../../../../src/lib/server/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isBearerAuthorized(request, process.env.CRON_SECRET)) return NextResponse.json({ success: false, error: "Yetkisiz istek." }, { status: 401 });
  const url = new URL(request.url);
  const parsed = z.coerce.number().int().min(1).max(100).safeParse(url.searchParams.get("limit") ?? 20);
  if (!parsed.success) return NextResponse.json({ success: false, error: "limit 1 ile 100 arasında olmalıdır." }, { status: 400 });
  const client = getSupabaseAdminClient();
  if (!client) return NextResponse.json({ success: false, error: "Supabase yönetici bağlantısı hazır değil." }, { status: 503 });
  const { data, error } = await client.from("catalog_sync_runs").select("*").order("started_at", { ascending: false }).limit(parsed.data);
  if (error) return NextResponse.json({ success: false, error: "Senkronizasyon geçmişi okunamadı." }, { status: 500 });
  return NextResponse.json({ success: true, data });
}
