import { NextResponse } from "next/server";
import { z } from "zod";
import { automaticCatalogMarkets, automaticCatalogUpdateService } from "../../../../src/services/catalog/AutomaticCatalogUpdateService";
import { consumeRateLimit, errorId, isBearerAuthorized, requestFingerprint } from "../../../../src/lib/server/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

let running = false;

const querySchema = z.object({
  markets: z.string().max(200).optional(),
  maximumProductCount: z.coerce.number().int().min(1).max(50).default(20),
  timeoutMs: z.coerce.number().int().min(5000).max(55000).default(45000),
});

async function runSync(request: Request) {
  if (!isBearerAuthorized(request, process.env.CRON_SECRET)) {
    return NextResponse.json({ success: false, error: "Yetkisiz istek." }, { status: 401 });
  }

  const fingerprint = requestFingerprint(request);
  const limit = consumeRateLimit(`catalog-sync:${fingerprint}`, 5, 10 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json({ success: false, error: "Çok fazla senkronizasyon isteği." }, { status: 429, headers: { "Retry-After": String(Math.ceil((limit.resetAt - Date.now()) / 1000)) } });
  }

  if (running) return NextResponse.json({ success: false, error: "Başka bir senkronizasyon halen çalışıyor." }, { status: 409 });

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    markets: url.searchParams.get("markets") ?? undefined,
    maximumProductCount: url.searchParams.get("maximumProductCount") ?? undefined,
    timeoutMs: url.searchParams.get("timeoutMs") ?? undefined,
  });
  if (!parsed.success) return NextResponse.json({ success: false, error: "Geçersiz parametreler.", details: parsed.error.flatten() }, { status: 400 });

  const known = new Set(automaticCatalogMarkets.map((market) => market.key));
  const markets = parsed.data.markets?.split(",").map((value) => value.trim().toLocaleLowerCase("tr-TR")).filter(Boolean);
  const unknown = markets?.filter((market) => !known.has(market)) ?? [];
  if (unknown.length) return NextResponse.json({ success: false, error: `Bilinmeyen market: ${unknown.join(", ")}` }, { status: 400 });

  running = true;
  try {
    const result = await automaticCatalogUpdateService.run({ markets, maximumProductCount: parsed.data.maximumProductCount, timeoutMs: parsed.data.timeoutMs });
    return NextResponse.json(result, { status: result.success ? 200 : 207 });
  } catch (error) {
    const id = errorId(error);
    console.error(`[catalog-sync:${id}]`, error);
    return NextResponse.json({ success: false, error: "Senkronizasyon tamamlanamadı.", errorId: id }, { status: 500 });
  } finally {
    running = false;
  }
}

export async function GET(request: Request) { return runSync(request); }
export async function POST(request: Request) { return runSync(request); }
