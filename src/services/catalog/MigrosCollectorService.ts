import { chromium, type Page } from "playwright";
import type {
  CollectorOptions,
  CollectorResult,
  MarketCollector,
} from "./collectors/types";
export type MigrosCollectedProduct = {
  storeName: "Migros";
  productName: string;
  brand?: string;
  price: number;
  currency: "TRY";
  sourceUrl: string;
  collectedAt: string;
};



type CollectOptions = {
  sourceUrl: string;
  maximumProductCount?: number;
  delayBetweenScrollsMs?: number;
};

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeMigrosUrl(value: string): string {
  const url = new URL(value);

  if (
    url.hostname !== "www.migros.com.tr" &&
    url.hostname !== "migros.com.tr"
  ) {
    throw new Error(
      "Yalnızca migros.com.tr adreslerinden veri toplanabilir.",
    );
  }

  url.protocol = "https:";
  url.hash = "";

  return url.toString();
}

function parseTurkishPrice(value: string): number | null {
  const cleanedValue = value
    .replace(/\s/g, "")
    .replace(/₺/g, "")
    .replace(/TL/gi, "")
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/[^\d.]/g, "");

  const parsedPrice = Number(cleanedValue);

  if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
    return null;
  }

  return parsedPrice;
}

function findPriceInText(value: string): number | null {
  const matches = value.match(
    /(?:₺\s*)?(\d{1,5}(?:\.\d{3})*(?:,\d{2}))\s*(?:₺|TL)?/gi,
  );

  if (!matches) {
    return null;
  }

  for (const match of matches) {
    const price = parseTurkishPrice(match);

    if (price !== null) {
      return price;
    }
  }

  return null;
}

function guessBrand(productName: string): string | undefined {
  const cleanedName = normalizeWhitespace(productName);
  const firstWord = cleanedName.split(" ")[0];

  if (!firstWord || firstWord.length < 2) {
    return undefined;
  }

  return firstWord;
}

async function acceptCookies(page: Page): Promise<void> {
  const possibleButtonNames = [
    /kabul et/i,
    /tümünü kabul et/i,
    /çerezleri kabul et/i,
    /onayla/i,
  ];

  for (const name of possibleButtonNames) {
    const button = page.getByRole("button", { name }).first();

    if (await button.isVisible().catch(() => false)) {
      await button.click().catch(() => undefined);
      return;
    }
  }
}

async function scrollProductPage(
  page: Page,
  delayMs: number,
): Promise<void> {
  let previousHeight = 0;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const currentHeight = await page.evaluate(
      () => document.body.scrollHeight,
    );

    if (currentHeight === previousHeight && attempt > 1) {
      break;
    }

    previousHeight = currentHeight;

    await page.evaluate(() => {
      window.scrollTo({
        top: document.body.scrollHeight,
        behavior: "instant",
      });
    });

    await page.waitForTimeout(delayMs);
  }

  await page.evaluate(() => {
    window.scrollTo({
      top: 0,
      behavior: "instant",
    });
  });
}

async function extractProductsFromPage(
  page: Page,
  maximumProductCount: number,
): Promise<MigrosCollectedProduct[]> {
  const collectedAt = new Date().toISOString();

  const rawProducts = await page.evaluate((limit) => {
    const productLinks = Array.from(
      document.querySelectorAll<HTMLAnchorElement>(
        'a[href*="-p-"], a[href*="/product/"]',
      ),
    );

    const uniqueProducts = new Map<
      string,
      {
        name: string;
        priceText: string;
        sourceUrl: string;
      }
    >();

    for (const productLink of productLinks) {
      if (uniqueProducts.size >= limit) {
        break;
      }

      const sourceUrl = new URL(
        productLink.href,
        window.location.origin,
      ).toString();

      if (uniqueProducts.has(sourceUrl)) {
        continue;
      }

      const card =
        productLink.closest("article") ??
        productLink.closest("li") ??
        productLink.closest(
          '[class*="product-card"], [class*="productCard"]',
        ) ??
        productLink.parentElement;

      const productName =
        productLink.getAttribute("aria-label") ??
        productLink.getAttribute("title") ??
        productLink.querySelector("img")?.getAttribute("alt") ??
        productLink.textContent ??
        "";

      const cardText = card?.textContent ?? "";

      uniqueProducts.set(sourceUrl, {
        name: productName,
        priceText: cardText,
        sourceUrl,
      });
    }

    return Array.from(uniqueProducts.values());
  }, maximumProductCount);

  const products: MigrosCollectedProduct[] = [];

  for (const rawProduct of rawProducts) {
    const productName = normalizeWhitespace(rawProduct.name);
    const price = findPriceInText(rawProduct.priceText);

    if (!productName || price === null) {
      continue;
    }

    products.push({
      storeName: "Migros",
      productName,
      brand: guessBrand(productName),
      price,
      currency: "TRY",
      sourceUrl: rawProduct.sourceUrl,
      collectedAt,
    });
  }

  return products;
}

 export class MigrosCollectorService implements MarketCollector {
  readonly storeName = "Migros";
async collect(
  options: CollectorOptions,
): Promise<CollectorResult> {
    const sourceUrl = normalizeMigrosUrl(options.sourceUrl);

    const maximumProductCount = Math.min(
      Math.max(options.maximumProductCount ?? 50, 1),
      100,
    );

    const delayBetweenScrollsMs = Math.max(
      options.delayBetweenRequestsMs ?? 1_500,
      1_000,
    );

    const errors: string[] = [];

    const browser = await chromium.launch({
      headless: true,
    });

    try {
      const context = await browser.newContext({
        locale: "tr-TR",
        timezoneId: "Europe/Istanbul",
        userAgent:
          "OpportunityOS/1.0 catalog collector (development)",
        viewport: {
          width: 1440,
          height: 1200,
        },
      });

      const page = await context.newPage();

      await page.goto(sourceUrl, {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });

      await acceptCookies(page);

      await page.waitForTimeout(2_000);

      await scrollProductPage(
        page,
        delayBetweenScrollsMs,
      );

      const products = await extractProductsFromPage(
        page,
        maximumProductCount,
      );

      if (products.length === 0) {
        errors.push(
          "Sayfada ürün ve fiyat bulunamadı. Teslimat bölgesi seçilmesi gerekiyor olabilir.",
        );
      }

      await context.close();

      return {
        success: products.length > 0,
        storeName: this.storeName,
        sourceUrl,
        collectedCount: products.length,
        products,
        errors,
      };
    } catch (error) {
      errors.push(
        error instanceof Error
          ? error.message
          : "Migros verileri toplanırken bilinmeyen bir hata oluştu.",
      );

      return {
        success: false,
        storeName: this.storeName,
        sourceUrl,
        collectedCount: 0,
        products: [],
        errors,
      };
    } finally {
      await browser.close();
    }
  }
}

export const migrosCollectorService =
  new MigrosCollectorService();
  import { collectorEngine } from "./collectors/CollectorEngine";

collectorEngine.register(migrosCollectorService);