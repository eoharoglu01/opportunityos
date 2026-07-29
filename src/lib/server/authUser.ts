import "server-only";
import { getSupabaseAdminClient } from "../supabaseAdmin";

export async function requireUserFromBearer(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  if (!header.startsWith("Bearer ")) return { user: null, error: "Oturum anahtarı eksik." };
  const client = getSupabaseAdminClient();
  if (!client) return { user: null, error: "Supabase yönetici bağlantısı hazır değil." };
  const { data, error } = await client.auth.getUser(header.slice(7));
  return { user: data.user ?? null, error: error?.message ?? null };
}
