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

function normalizeCarrefourUrl(value: string): string {
  const url = new URL(value);

  if (
    url.hostname !== "www.carrefoursa.com" &&
    url.hostname !== "carrefoursa.com"
  ) {
    throw new Error(
      "Yalnızca carrefoursa.com adreslerinden veri toplanabilir.",
    );
  }

  url.protocol = "https:";
  url.hash = "";

  return url.toString();
}

function parseTurkishPrice(value: string): number | null {
  const match = value.match(
    /(\d{1,5}(?:\.\d{3})*,\d{2})\s*(?:TL|₺)/i,
  );

  if (!match) {
    return null;
  }

  const normalizedValue = match[1]
    .replace(/\./g, "")
    .replace(",", ".");

  const price = Number(normalizedValue);

  if (!Number.isFinite(price) || price <= 0) {
    return null;
  }

  return price;
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
      const candidateLimit = Math.max(limit * 10, 50);

      const links = Array.from(
        document.querySelectorAll<HTMLAnchorElement>(
          [
            'a[href*="-p-"]',
            'a[href*="/p/"]',
            'a[href*="/product/"]',
            'a[href*="product"]',
          ].join(","),
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
        if (results.size >= candidateLimit) {
          break;
        }

        const href = link.getAttribute("href");

        if (!href) {
          continue;
        }

        const sourceUrl = new URL(
          href,
          window.location.origin,
        ).toString();

        if (
          !sourceUrl.includes("carrefoursa.com") ||
          results.has(sourceUrl)
        ) {
          continue;
        }

        const card =
          link.closest("article") ??
          link.closest("li") ??
          link.closest(
            [
              '[class*="product-card"]',
              '[class*="productCard"]',
              '[class*="ProductCard"]',
              '[class*="product-item"]',
              '[class*="productItem"]',
              '[class*="product"]',
              '[class*="Product"]',
            ].join(","),
          ) ??
          link.parentElement?.parentElement ??
          link.parentElement;

        if (!card) {
          continue;
        }

        const imageAlt =
          link
            .querySelector<HTMLImageElement>("img")
            ?.getAttribute("alt") ??
          card
            .querySelector<HTMLImageElement>("img")
            ?.getAttribute("alt") ??
          "";

        const nameElement = card.querySelector<HTMLElement>(
          [
            '[class*="product-name"]',
            '[class*="productName"]',
            '[class*="ProductName"]',
            '[class*="name"]',
            "h2",
            "h3",
          ].join(","),
        );

        const productName =
          imageAlt ||
          link.getAttribute("title") ||
          link.getAttribute("aria-label") ||
          nameElement?.textContent ||
          link.textContent ||
          "";

        const priceElements = Array.from(
          card.querySelectorAll<HTMLElement>(
            [
              '[class*="price"]',
              '[class*="Price"]',
              '[data-testid*="price"]',
              '[itemprop="price"]',
            ].join(","),
          ),
        );

        const priceText = [
          ...priceElements.map(
            (element) =>
              element.getAttribute("content") ??
              element.textContent ??
              "",
          ),
          card.textContent ?? "",
        ].join(" ");

        if (
          !productName.trim() ||
          !/(\d{1,5}(?:\.\d{3})*,\d{2})\s*(?:TL|₺)/i.test(
            priceText,
          )
        ) {
          continue;
        }

        results.set(sourceUrl, {
          productName,
          priceText,
          sourceUrl,
        });
      }

      return Array.from(results.values());
    },
    maximumProductCount,
  );

  const products: CollectedCatalogProduct[] = [];

  for (const rawProduct of rawProducts) {
    if (products.length >= maximumProductCount) {
      break;
    }

    const productName = normalizeWhitespace(
      rawProduct.productName,
    );

    const price = parseTurkishPrice(
      rawProduct.priceText,
    );

    if (!productName || price === null) {
      continue;
    }

    products.push({
      storeName: "CarrefourSA",
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

export class CarrefourCollectorService
  implements MarketCollector
{
  readonly storeName = "CarrefourSA";

  async collect(
    options: CollectorOptions,
  ): Promise<CollectorResult> {
    const sourceUrl = normalizeCarrefourUrl(
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
          "CarrefourSA sayfasında ürün veya fiyat bulunamadı.",
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
          : "CarrefourSA verileri toplanırken bilinmeyen hata oluştu.",
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

export const carrefourCollectorService =
  new CarrefourCollectorService();

collectorEngine.register(
  carrefourCollectorService,
);