import { NextResponse } from "next/server";

type OpenFoodFactsProduct = {
  product_name?: string;
  product_name_tr?: string;
  brands?: string;
  quantity?: string;
  image_front_url?: string;
};

type OpenFoodFactsResponse = {
  status: number;
  product?: OpenFoodFactsProduct;
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const barcode = searchParams.get("barcode")?.trim();

    if (!barcode || !/^\d{8,14}$/.test(barcode)) {
      return NextResponse.json(
        {
          success: false,
          error: "Geçerli bir barkod girilmedi.",
        },
        { status: 400 },
      );
    }

    const fields = [
      "product_name",
      "product_name_tr",
      "brands",
      "quantity",
      "image_front_url",
    ].join(",");

    const response = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(
        barcode,
      )}.json?fields=${fields}`,
      {
        headers: {
          "User-Agent": "OpportunityOS/1.0",
        },
        next: {
          revalidate: 86400,
        },
      },
    );

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: "Ürün servisine ulaşılamadı.",
        },
        { status: 502 },
      );
    }

    const result = (await response.json()) as OpenFoodFactsResponse;

    if (result.status !== 1 || !result.product) {
      return NextResponse.json({
        success: true,
        found: false,
        data: null,
      });
    }

    const product = result.product;
    const productName =
      product.product_name_tr?.trim() ||
      product.product_name?.trim() ||
      "İsimsiz ürün";

    return NextResponse.json({
      success: true,
      found: true,
      data: {
        barcode,
        name: productName,
        brand: product.brands?.trim() || null,
        quantity: product.quantity?.trim() || null,
        imageUrl: product.image_front_url || null,
      },
    });
  } catch (error) {
    console.error(error);
    console.error("Ürün sorgulama hatası:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Beklenmeyen bir hata oluştu.",
      },
      { status: 500 },
    );
  }
}