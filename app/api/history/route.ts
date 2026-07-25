import { NextResponse } from "next/server";
import { getSupabaseClient } from "../../../src/lib/supabase";

type HistoryRow = {
  id: string;
  product_id: string;
  store_id: string;
  price: number | string;
  recorded_at: string;
  currency: string | null;
};

type StoreRow = {
  id: string;
  name: string;
};

export async function GET(request: Request) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return NextResponse.json(
      {
        success: false,
        error: "Supabase bağlantısı yapılandırılmamış.",
      },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const productId = searchParams.get("productId")?.trim() ?? "";

  if (!productId) {
    return NextResponse.json(
      {
        success: false,
        error: "Ürün kimliği gönderilmedi.",
      },
      { status: 400 },
    );
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: historyData, error: historyError } = await supabase
    .from("price_history")
    .select(
      "id, product_id, store_id, price, recorded_at, currency",
    )
    .eq("product_id", productId)
    .gte("recorded_at", thirtyDaysAgo.toISOString())
    .order("recorded_at", { ascending: true });

  if (historyError) {
    console.error("Price history query failed:", historyError);

    return NextResponse.json(
      {
        success: false,
        error: "Fiyat geçmişi alınamadı.",
        details: historyError.message,
      },
      { status: 502 },
    );
  }

  const rows = (historyData ?? []) as HistoryRow[];

  if (rows.length === 0) {
    return NextResponse.json({
      success: true,
      data: [],
      summary: {
        count: 0,
        lowestPrice: null,
        highestPrice: null,
        latestPrice: null,
        currency: "TRY",
      },
    });
  }

  const storeIds = [...new Set(rows.map((row) => row.store_id))];

  const { data: storeData, error: storeError } = await supabase
    .from("stores")
    .select("id, name")
    .in("id", storeIds);

  if (storeError) {
    console.error("Store query failed:", storeError);

    return NextResponse.json(
      {
        success: false,
        error: "Market bilgileri alınamadı.",
        details: storeError.message,
      },
      { status: 502 },
    );
  }

  const storeMap = new Map(
    ((storeData ?? []) as StoreRow[]).map((store) => [
      store.id,
      store.name,
    ]),
  );

  const history = rows
    .map((row) => ({
      id: row.id,
      productId: row.product_id,
      storeId: row.store_id,
      store: storeMap.get(row.store_id) ?? "Bilinmeyen market",
      price: Number(row.price),
      currency: row.currency ?? "TRY",
      recordedAt: row.recorded_at,
    }))
    .filter(
      (row) =>
        Number.isFinite(row.price) &&
        row.price >= 0 &&
        Boolean(row.recordedAt),
    );

  const prices = history.map((row) => row.price);

  return NextResponse.json({
    success: true,
    data: history,
    summary: {
      count: history.length,
      lowestPrice: prices.length ? Math.min(...prices) : null,
      highestPrice: prices.length ? Math.max(...prices) : null,
      latestPrice: prices.length
        ? prices[prices.length - 1]
        : null,
      currency: history[0]?.currency ?? "TRY",
    },
  });
}
