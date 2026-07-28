import { NextResponse } from "next/server";
import {
  catalogImportService,
  type CatalogProductInput,
} from "../../../../src/services/catalog/CatalogImportService";

type ImportRequestBody = {
  products?: unknown;
};

function isCatalogProductInput(value: unknown): value is CatalogProductInput {
  if (!value || typeof value !== "object") return false;

  const item = value as Record<string, unknown>;

  return (
    typeof item.storeName === "string" &&
    typeof item.productName === "string" &&
    typeof item.price === "number"
  );
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ImportRequestBody;

    if (!Array.isArray(body.products)) {
      return NextResponse.json(
        {
          success: false,
          error: "Ürün listesi gönderilmelidir.",
        },
        { status: 400 },
      );
    }

    if (!body.products.every(isCatalogProductInput)) {
      return NextResponse.json(
        {
          success: false,
          error: "Ürün kayıtlarından biri veya birkaçı geçersiz.",
        },
        { status: 400 },
      );
    }

    const result = await catalogImportService.importProducts(body.products);

    return NextResponse.json({
      success: result.success,
      message: result.success
        ? "Ürünler başarıyla içe aktarıldı."
        : "İçe aktarma bazı hatalarla tamamlandı.",
      details: result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "İçe aktarma sırasında beklenmeyen bir hata oluştu.",
      },
      { status: 500 },
    );
  }
}
