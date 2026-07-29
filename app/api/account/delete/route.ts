import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "../../../../src/lib/supabaseAdmin";
import { requireUserFromBearer } from "../../../../src/lib/server/authUser";

export const runtime = "nodejs";
export async function DELETE(request: Request) {
  const auth = await requireUserFromBearer(request);
  if (!auth.user) return NextResponse.json({ success: false, error: auth.error ?? "Yetkisiz istek." }, { status: 401 });
  const confirmation = request.headers.get("x-confirm-account-delete");
  if (confirmation !== "DELETE") return NextResponse.json({ success: false, error: "Hesap silme onayı eksik." }, { status: 400 });
  const client = getSupabaseAdminClient() as SupabaseClient | null;
  if (!client) return NextResponse.json({ success: false, error: "Sunucu bağlantısı hazır değil." }, { status: 503 });
  const { error } = await client.auth.admin.deleteUser(auth.user.id);
  if (error) return NextResponse.json({ success: false, error: "Hesap silinemedi." }, { status: 500 });
  return NextResponse.json({ success: true, message: "Hesap ve ilişkili veriler silindi." });
}
