import { chromium, type Page } from "playwright";

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

function normalizeSokUrl(value: string): string {
  const url = new URL(value);

  if (
    url.hostname !== "www.sokmarket.com.tr" &&
    url.hostname !== "sokmarket.com.tr"
  ) {
    throw new Error(
      "Yalnızca sokmarket.com.tr adreslerinden veri toplanabilir.",
    );
  }

  url.protocol = "https:";
  url.hash = "";

  return url.toString();
}

function parseTurkishPrices(value: string): number[] {
  const matches =
    value.match(
      /(\d{1,6}(?:\.\d{3})*,\d{2})\s*₺/gi,
    ) ?? [];

  return matches
    .map((match) =>
      Number(
        match
          .replace(/\s/g, "")
          .replace(/₺/g, "")
          .replace(/\./g, "")
          .replace(",", "."),
      ),
    )
    .filter(
      (price) =>
        Number.isFinite(price) && price > 0,
    );
}

function findCurrentPrice(value: string): number | null {
  const prices = parseTurkishPrices(value);

  if (prices.length === 0) {
    return null;
  }

  /*
   * Kampanyalı ürünlerde eski ve yeni fiyat birlikte
   * gösterilebildiği için en düşük geçerli fiyatı alıyoruz.
   */
  return Math.min(...prices);
}

function guessBrand(
  productName: string,
): string | undefined {
  const firstWord =
    normalizeWhitespace(productName).split(" ")[0];

  if (!firstWord || firstWord.length < 2) {
    return undefined;
  }

  return firstWord;
}

async function acceptCookies(
  page: Page,
): Promise<void> {
  const buttonPatterns = [
    /tümünü kabul et/i,
    /kabul et/i,
    /çerezleri kabul et/i,
    /onayla/i,
  ];

  for (const name of buttonPatterns) {
    const button = page
      .getByRole("button", { name })
      .first();

    if (
      await button.isVisible().catch(() => false)
    ) {
      await button
        .click()
        .catch(() => undefined);

      return;
    }
  }
}

async function scrollPage(
  page: Page,
  delayMs: number,
): Promise<void> {
  let previousHeight = 0;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const currentHeight = await page.evaluate(
      () => document.body.scrollHeight,
    );

    if (
      currentHeight === previousHeight &&
      attempt > 1
    ) {
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

async function extractProducts(
  page: Page,
  maximumProductCount: number,
): Promise<CollectedCatalogProduct[]> {
  const collectedAt = new Date().toISOString();

  const rawProducts = await page.evaluate(
    (limit) => {
      const links = Array.from(
        document.querySelectorAll<HTMLAnchorElement>(
          'a[href*="-p-"]',
        ),
      );

      const results = new Map<
        string,
        {
          productName: string;
          priceText: string;
          sourceUrl: string;
        }
      >();

      for (const link of links) {
        if (results.size >= limit) {
          break;
        }

        const sourceUrl = new URL(
          link.href,
          window.location.origin,
        ).toString();

        if (results.has(sourceUrl)) {
          continue;
        }

        const card =
          link.closest("article") ??
          link.closest("li") ??
          link.closest(
            '[class*="product"], [class*="Product"]',
          ) ??
          link.parentElement;

       const imageAlt =
  link
    .querySelector("img")
    ?.getAttribute("alt") ?? "";

const headingText =
  card
    ?.querySelector(
      'h1, h2, h3, h4, [class*="name"], [class*="Name"], [class*="title"], [class*="Title"]',
    )
    ?.textContent ?? "";

const linkText =
  link.textContent ?? "";

const productName =
  imageAlt !== "product-thumb"
    ? imageAlt
    : headingText || linkText;

        results.set(sourceUrl, {
          productName,
          priceText: card?.textContent ?? "",
          sourceUrl,
        });
      }

      return Array.from(results.values());
    },
    maximumProductCount,
  );

  const products: CollectedCatalogProduct[] = [];

  for (const rawProduct of rawProducts) {
    const productName = normalizeWhitespace(
      rawProduct.productName,
    );

    const price = findCurrentPrice(
      rawProduct.priceText,
    );

    if (!productName || price === null) {
      continue;
    }

    products.push({
      storeName: "ŞOK",
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

export class SokCollectorService
  implements MarketCollector
{
  readonly storeName = "ŞOK";

  async collect(
    options: CollectorOptions,
  ): Promise<CollectorResult> {
    const sourceUrl = normalizeSokUrl(
      options.sourceUrl,
    );

    const maximumProductCount = Math.min(
      Math.max(
        options.maximumProductCount ?? 20,
        1,
      ),
      50,
    );

    const delayMs = Math.max(
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
        viewport: {
          width: 1440,
          height: 1200,
        },
        userAgent:
          "OpportunityOS/1.0 catalog collector (development)",
      });

      const page = await context.newPage();

      await page.goto(sourceUrl, {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });

      await acceptCookies(page);
      await page.waitForTimeout(2_000);
      await scrollPage(page, delayMs);

      const products = await extractProducts(
        page,
        maximumProductCount,
      );

      if (products.length === 0) {
        errors.push(
          "ŞOK sayfasında ürün veya fiyat bulunamadı.",
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
          : "ŞOK verileri toplanırken bilinmeyen hata oluştu.",
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

export const sokCollectorService =
  new SokCollectorService();

collectorEngine.register(
  sokCollectorService,
);