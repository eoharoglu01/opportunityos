import { NextResponse } from "next/server";

import { automaticCatalogUpdateService } from "../../../../src/services/catalog/AutomaticCatalogUpdateService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return process.env.NODE_ENV !== "production";

  const authorization = request.headers.get("authorization");
  const querySecret = new URL(request.url).searchParams.get("secret");
  return authorization === `Bearer ${secret}` || querySecret === secret;
}

async function runSync(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Yetkisiz istek." }, { status: 401 });
  }

  const url = new URL(request.url);
  const markets = url.searchParams.get("markets")
    ?.split(",")
    .map((market) => market.trim())
    .filter(Boolean);
  const maximumProductCount = Number(url.searchParams.get("maximumProductCount") ?? "20");

  const result = await automaticCatalogUpdateService.run({
    markets,
    maximumProductCount,
  });

  return NextResponse.json(result, { status: result.success ? 200 : 207 });
}

export async function GET(request: Request) {
  return runSync(request);
}

export async function POST(request: Request) {
  return runSync(request);
}
