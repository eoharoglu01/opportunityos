import { NextResponse } from "next/server";

import "../../../../src/services/catalog/collectors/CarrefourCollectorService";

import { catalogImportService } from "../../../../src/services/catalog/CatalogImportService";
import { collectorEngine } from "../../../../src/services/catalog/collectors/CollectorEngine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type CarrefourRequestBody = {
  sourceUrl?: string;
  maximumProductCount?: number;
  importToDatabase?: boolean;
};

const DEFAULT_SOURCE_URL =
  "https://www.carrefoursa.com/online-alisverisi-tum-urunler/c/9577";

function parseMaximumProductCount(
  value: unknown,
): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    return 20;
  }

  return Math.min(
    Math.max(Math.floor(value), 1),
    50,
  );
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);

  const sourceUrl =
    requestUrl.searchParams.get("sourceUrl") ??
    DEFAULT_SOURCE_URL;

  const maximumProductCount =
    parseMaximumProductCount(
      Number(
        requestUrl.searchParams.get(
          "maximumProductCount",
        ),
      ),
    );

  const collectionResult =
    await collectorEngine.collectFromStore(
      "CarrefourSA",
      {
        sourceUrl,
        maximumProductCount,
      },
    );

  return NextResponse.json(
    {
      success: collectionResult.success,
      message: collectionResult.success
        ? `${collectionResult.collectedCount} CarrefourSA ürünü toplandı.`
        : "CarrefourSA ürünleri toplanamadı.",
      data: collectionResult,
    },
    {
      status: collectionResult.success
        ? 200
        : 422,
    },
  );
}

export async function POST(request: Request) {
  try {
    const body =
      (await request.json()) as CarrefourRequestBody;

    const sourceUrl =
      body.sourceUrl ?? DEFAULT_SOURCE_URL;

    const maximumProductCount =
      parseMaximumProductCount(
        body.maximumProductCount,
      );

    const collectionResult =
      await collectorEngine.collectFromStore(
        "CarrefourSA",
        {
          sourceUrl,
          maximumProductCount,
        },
      );

    if (!collectionResult.success) {
      return NextResponse.json(
        {
          success: false,
          message:
            "CarrefourSA ürünleri toplanamadı.",
          collection: collectionResult,
        },
        {
          status: 422,
        },
      );
    }

    if (body.importToDatabase === false) {
      return NextResponse.json({
        success: true,
        message:
          `${collectionResult.collectedCount} ürün toplandı ancak veritabanına aktarılmadı.`,
        collection: collectionResult,
        importResult: null,
      });
    }

    const importResult =
      await catalogImportService.importProducts(
        collectionResult.products.map(
          (product) => ({
            storeName: product.storeName,
            productName: product.productName,
            brand: product.brand,
            barcode: product.barcode,
            price: product.price,
            currency: product.currency,
            sourceUrl: product.sourceUrl,
            validFrom: product.collectedAt,
          }),
        ),
      );

    return NextResponse.json(
      {
        success:
          collectionResult.success &&
          importResult.success,
        message:
          `${collectionResult.collectedCount} ürün toplandı. ` +
          `${importResult.importedCount} yeni fiyat eklendi, ` +
          `${importResult.updatedCount} fiyat güncellendi, ` +
          `${importResult.skippedCount} kayıt atlandı.`,
        collection: {
          success: collectionResult.success,
          storeName: collectionResult.storeName,
          sourceUrl: collectionResult.sourceUrl,
          collectedCount:
            collectionResult.collectedCount,
          errors: collectionResult.errors,
        },
        importResult,
      },
      {
        status: importResult.success
          ? 200
          : 207,
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "CarrefourSA katalog aktarımı sırasında bilinmeyen hata oluştu.",
      },
      {
        status: 500,
      },
    );
  }
}