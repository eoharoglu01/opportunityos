import { NextResponse } from "next/server";

import "../../../../src/services/catalog/MigrosCollectorService";

import { collectorEngine } from "../../../../src/services/catalog/collectors/CollectorEngine";
import { catalogImportService } from "../../../../src/services/catalog/CatalogImportService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type MigrosRequestBody = {
  sourceUrl?: string;
  maximumProductCount?: number;
  importToDatabase?: boolean;
};

const DEFAULT_SOURCE_URL =
  "https://www.migros.com.tr/";

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
    100,
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

  try {
    const collectionResult =
      await collectorEngine.collectFromStore(
        "Migros",
        {
          sourceUrl,
          maximumProductCount,
        },
      );

    return NextResponse.json(
      {
        success: collectionResult.success,
        message: collectionResult.success
          ? `${collectionResult.collectedCount} Migros ürünü toplandı.`
          : "Migros ürünleri toplanamadı.",
        data: collectionResult,
      },
      {
        status: collectionResult.success
          ? 200
          : 422,
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Migros verileri alınırken bilinmeyen bir hata oluştu.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body =
      (await request.json()) as MigrosRequestBody;

    const sourceUrl =
      body.sourceUrl ?? DEFAULT_SOURCE_URL;

    const maximumProductCount =
      parseMaximumProductCount(
        body.maximumProductCount,
      );

    const collectionResult =
      await collectorEngine.collectFromStore(
        "Migros",
        {
          sourceUrl,
          maximumProductCount,
        },
      );

    if (!collectionResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Migros ürünleri toplanamadı.",
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
        message: `${collectionResult.collectedCount} ürün toplandı ancak veritabanına aktarılmadı.`,
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
            : "Migros katalog aktarımı sırasında bilinmeyen bir hata oluştu.",
      },
      {
        status: 500,
      },
    );
  }
}