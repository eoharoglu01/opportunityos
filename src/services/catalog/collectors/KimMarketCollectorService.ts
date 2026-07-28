import type {
  CollectedCatalogProduct,
  CollectorOptions,
  CollectorResult,
  MarketCollector,
} from "./types";

import { collectorEngine } from "./CollectorEngine";

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeKimMarketUrl(value: string): string {
  const url = new URL(value);

  if (
    url.hostname !== "www.kimgeldi.com" &&
    url.hostname !== "kimgeldi.com"
  ) {
    throw new Error(
      "Yalnızca kimgeldi.com adreslerinden veri toplanabilir.",
    );
  }

  url.protocol = "https:";
  url.hash = "";

  return url.toString();
}

function decodeHtml(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#x20BA;/gi, "₺")
    .replace(/&#8378;/gi, "₺");
}

function htmlToLines(html: string): string[] {
  const text = html
    .replace(
      /<(script|style|noscript)[^>]*>[\s\S]*?<\/\1>/gi,
      "",
    )
    .replace(
      /<(br|\/p|\/div|\/li|\/h1|\/h2|\/h3|\/article|\/section)>/gi,
      "\n",
    )
    .replace(/<[^>]+>/g, " ");

  return decodeHtml(text)
    .split("\n")
    .map(normalizeWhitespace)
    .filter(Boolean);
}

function parseTurkishPrice(value: string): number | null {
  const match = value.match(
    /(?:₺\s*)?(\d{1,7}(?:\.\d{3})*(?:,\d{2}))(?:\s*(?:TL|₺))?/i,
  );

  if (!match) {
    return null;
  }

  const price = Number(
    match[1]
      .replace(/\./g, "")
      .replace(",", "."),
  );

  return Number.isFinite(price) && price > 0
    ? price
    : null;
}

function guessBrand(
  productName: string,
): string | undefined {
  const firstWord =
    normalizeWhitespace(productName).split(" ")[0];

  return firstWord && firstWord.length >= 2
    ? firstWord
    : undefined;
}

function extractProductsFromHtml(
  html: string,
  sourceUrl: string,
  maximumProductCount: number,
): CollectedCatalogProduct[] {
  const lines = htmlToLines(html);
  const collectedAt = new Date().toISOString();

  const productCodePattern = /^\d{2,8}$/;

  const pricePattern =
    /(?:₺\s*)?\d{1,7}(?:\.\d{3})*,\d{2}(?:\s*(?:TL|₺))?/i;

  const ignoredTexts = new Set([
    "Favori Listeme Ekle",
    "Favorilere Ekle",
    "Sepetim",
    "Sepet",
    "Giriş Yap",
    "Üye Ol",
    "Kategoriler",
    "Bölge değiştir",
    "Lütfen Bölgenizi Seçiniz",
    "Stokta var",
    "Stokta yok",
    "Adet:",
    "Arama",
  ]);

  const products: CollectedCatalogProduct[] = [];
  const seen = new Set<string>();

  for (
    let index = 1;
    index < lines.length;
    index += 1
  ) {
    if (products.length >= maximumProductCount) {
      break;
    }

    if (!productCodePattern.test(lines[index])) {
      continue;
    }

    let productName = "";

    for (
      let offset = 1;
      offset <= 4;
      offset += 1
    ) {
      const candidate =
        lines[index - offset] ?? "";

      if (
        candidate.length >= 3 &&
        !ignoredTexts.has(candidate) &&
        !productCodePattern.test(candidate) &&
        !pricePattern.test(candidate) &&
        !candidate.startsWith("%")
      ) {
        productName = candidate;
        break;
      }
    }

    if (!productName) {
      continue;
    }

    const prices: number[] = [];

    for (
      let offset = 1;
      offset <= 8;
      offset += 1
    ) {
      const candidate =
        lines[index + offset] ?? "";

      const price = parseTurkishPrice(candidate);

      if (price !== null) {
        prices.push(price);
      }

      if (
        offset > 1 &&
        productCodePattern.test(candidate)
      ) {
        break;
      }
    }

    if (prices.length === 0) {
      continue;
    }

    const price = Math.min(...prices);

    const uniqueKey =
      `${productName}|${price}`
        .toLocaleLowerCase("tr-TR");

    if (seen.has(uniqueKey)) {
      continue;
    }

    seen.add(uniqueKey);

    products.push({
      storeName: "KİM Market",
      productName,
      brand: guessBrand(productName),
      price,
      currency: "TRY",
      sourceUrl,
      collectedAt,
    });
  }

  return products;
}

export class KimMarketCollectorService
  implements MarketCollector
{
  readonly storeName = "KİM Market";

  async collect(
    options: CollectorOptions,
  ): Promise<CollectorResult> {
    const sourceUrl = normalizeKimMarketUrl(
      options.sourceUrl,
    );

    const maximumProductCount = Math.min(
      Math.max(
        options.maximumProductCount ?? 20,
        1,
      ),
      50,
    );

    const errors: string[] = [];

    try {
      const response = await fetch(sourceUrl, {
        cache: "no-store",
        headers: {
          Accept:
            "text/html,application/xhtml+xml",
          "Accept-Language":
            "tr-TR,tr;q=0.9",
          "User-Agent":
            "Mozilla/5.0 OpportunityOS/1.0",
        },
      });

      if (!response.ok) {
        throw new Error(
          `KİM Market sayfası ${response.status} durum kodu döndürdü.`,
        );
      }

      const html = await response.text();

      const products = extractProductsFromHtml(
        html,
        sourceUrl,
        maximumProductCount,
      );

      if (products.length === 0) {
        errors.push(
          "KİM Market sayfasında ürün veya fiyat bulunamadı.",
        );
      }

      return {
        success: products.length > 0,
        storeName: this.storeName,
        sourceUrl,
        collectedCount: products.length,
        products,
        errors,
      };
    } catch (error: unknown) {
      errors.push(
        error instanceof Error
          ? error.message
          : "KİM Market verileri toplanırken bilinmeyen hata oluştu.",
      );

      return {
        success: false,
        storeName: this.storeName,
        sourceUrl,
        collectedCount: 0,
        products: [],
        errors,
      };
    }
  }
}

export const kimMarketCollectorService =
  new KimMarketCollectorService();

collectorEngine.register(
  kimMarketCollectorService,
);