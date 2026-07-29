import { NextResponse } from "next/server";
import { getSupabaseClient } from "../../../src/lib/supabase";

type ProductRow = {
  id: string;
  name: string;
  barcode: string | null;
};

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

  try {
    const { searchParams } = new URL(request.url);

    const barcode = searchParams.get("barcode")?.trim() ?? "";
    const requestedProductId =
      searchParams.get("productId")?.trim() ?? "";

    if (!barcode && !requestedProductId) {
      return NextResponse.json(
        {
          success: false,
          error: "Barkod veya ürün kimliği gönderilmedi.",
        },
        { status: 400 },
      );
    }

    let productId = requestedProductId;
    let product: ProductRow | null = null;

    if (barcode) {
      const { data: productData, error: productError } = await supabase
        .from("products")
        .select("id, name, barcode")
        .eq("barcode", barcode)
        .maybeSingle();

      if (productError) {
        console.error("Ürün sorgusu başarısız:", productError);

        return NextResponse.json(
          {
            success: false,
            error: "Ürün bilgisi alınamadı.",
            details: productError.message,
          },
          { status: 502 },
        );
      }

      if (!productData) {
        return NextResponse.json(
          {
            success: false,
            error: "Bu barkoda ait ürün bulunamadı.",
          },
          { status: 404 },
        );
      }

      product = productData as ProductRow;
      productId = product.id;
    } else {
      const { data: productData, error: productError } = await supabase
        .from("products")
        .select("id, name, barcode")
        .eq("id", productId)
        .maybeSingle();

      if (productError) {
        console.error("Ürün sorgusu başarısız:", productError);

        return NextResponse.json(
          {
            success: false,
            error: "Ürün bilgisi alınamadı.",
            details: productError.message,
          },
          { status: 502 },
        );
      }

      product = (productData as ProductRow | null) ?? null;
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
      console.error("Fiyat geçmişi sorgusu başarısız:", historyError);

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
        product: {
          id: productId,
          name: product?.name ?? null,
          barcode: product?.barcode ?? barcode ??
           null,
        },
        data: [],
        summary: {
          count: 0,
          lowestPrice: null,
          highestPrice: null,
          latestPrice: null,
          currency: "TRY",
          lastUpdatedAt: null,
        },
      });
    }

    const storeIds = [
      ...new Set(rows.map((row) => row.store_id).filter(Boolean)),
    ];

    const { data: storeData, error: storeError } = await supabase
      .from("stores")
      .select("id, name")
      .in("id", storeIds);

    if (storeError) {
      console.error("Market sorgusu başarısız:", storeError);

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
    const latestPoint = history.at(-1) ?? null;

    return NextResponse.json({
      success: true,
      product: {
        id: productId,
        name: product?.name ?? null,
        barcode: product?.barcode ?? barcode ?? null,
      },
      data: history,
      summary: {
        count: history.length,
        lowestPrice: prices.length ? Math.min(...prices) : null,
        highestPrice: prices.length ? Math.max(...prices) : null,
        latestPrice: latestPoint?.price ?? null,
        currency: latestPoint?.currency ?? "TRY",
        lastUpdatedAt: latestPoint?.recordedAt ?? null,
      },
    });
  } catch (error) {
    console.error("History API beklenmeyen hata:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Fiyat geçmişi alınırken beklenmeyen bir hata oluştu.",
      },
      { status: 500 },
    );
  }
}