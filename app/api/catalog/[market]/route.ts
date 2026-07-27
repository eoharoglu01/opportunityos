import { NextResponse } from "next/server";

import "../../../../src/services/catalog/MigrosCollectorService";
import "../../../../src/services/catalog/collectors/CarrefourCollectorService";
import "../../../../src/services/catalog/collectors/SokCollectorService";
import "../../../../src/services/catalog/collectors/BimCollectorService";
import "../../../../src/services/catalog/collectors/A101CollectorService";
import "../../../../src/services/catalog/collectors/TarimKrediCollectorService";
import "../../../../src/services/catalog/collectors/BizimToptanCollectorService";
import "../../../../src/services/catalog/collectors/HakmarCollectorService";
import { catalogImportService } from "../../../../src/services/catalog/CatalogImportService";
import { collectorEngine } from "../../../../src/services/catalog/collectors/CollectorEngine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type CatalogRequestBody = {
  sourceUrl?: string;
  maximumProductCount?: number;
  importToDatabase?: boolean;
};

const DEFAULT_SOURCE_URL =
"https://www.sokmarket.com.tr/sut-ve-sut-urunleri-c-460"

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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ market: string }> },
) {
  const { market } = await params;
  const requestUrl = new URL(request.url);

  const normalizedMarket = market
    .trim()
    .toLocaleLowerCase("tr-TR");

const defaultSourceUrls: Record<string, string> = {
  sok: "https://www.sokmarket.com.tr/sut-ve-sut-urunleri-c-460",
  migros: "https://www.migros.com.tr/",
  carrefour:
    "https://www.carrefoursa.com/sut-ve-sut-urunleri/c/9006",
  carrefoursa:
    "https://www.carrefoursa.com/sut-ve-sut-urunleri/c/9006",
  bim:
    "https://www.bim.com.tr/categories/100/aktuel-urunler.aspx",
  a101:
    "https://www.a101.com.tr/kapida/sut-urunleri-kahvaltilik/sut",
  tarimkredi:
    "https://www.tkkoop.com.tr/urun-kategori/sut",
  "tarim-kredi":
    "https://www.tkkoop.com.tr/urun-kategori/sut",
    bizimtoptan:
  "https://www.bizimtoptan.com.tr/sutas",
"bizim-toptan":
  "https://www.bizimtoptan.com.tr/sutas",
  hakmar:
  "https://www.hakmarexpress.com.tr/",
hakmarexpress:
  "https://www.hakmarexpress.com.tr/",
"hakmar-express":
  "https://www.hakmarexpress.com.tr/",
};

const collectorMarket =
  normalizedMarket === "carrefour"
    ? "carrefoursa"
    : normalizedMarket === "tarimkredi" ||
        normalizedMarket === "tarim-kredi"
      ? "tarım kredi"
      : normalizedMarket === "bizimtoptan" ||
          normalizedMarket === "bizim-toptan"
        ? "bizim toptan"
        : normalizedMarket === "hakmar" ||
            normalizedMarket === "hakmarexpress" ||
            normalizedMarket === "hakmar-express"
          ? "hakmar express"
          : normalizedMarket;

  const sourceUrl =
    requestUrl.searchParams.get("sourceUrl") ??
    defaultSourceUrls[normalizedMarket] ??
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
      collectorMarket,
      {
        sourceUrl,
        maximumProductCount,
      },
    );

  return NextResponse.json(
    {
      success: collectionResult.success,
      message: collectionResult.success
        ? `${collectionResult.collectedCount} ${collectionResult.storeName} ürünü toplandı.`
        : `${collectionResult.storeName} ürünleri toplanamadı.`,
      data: collectionResult,
    },
    {
      status: collectionResult.success
        ? 200
        : 422,
    },
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ market: string }> },
) {
  try {
    const body =
      (await request.json()) as CatalogRequestBody;

    const sourceUrl =
      body.sourceUrl ?? DEFAULT_SOURCE_URL;

    const maximumProductCount =
      parseMaximumProductCount(
        body.maximumProductCount,
      );

    const collectionResult =
      await collectorEngine.collectFromStore(
        "ŞOK",
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
            "ŞOK ürünleri toplanamadı.",
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
            : "ŞOK katalog aktarımı sırasında bilinmeyen hata oluştu.",
      },
      {
        status: 500,
      },
    );
  }
}