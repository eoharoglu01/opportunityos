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

function normalizeHakmarUrl(value: string): string {
  const url = new URL(value);

  if (
    url.hostname !== "www.hakmarexpress.com.tr" &&
    url.hostname !== "hakmarexpress.com.tr"
  ) {
    throw new Error(
      "Yalnızca hakmarexpress.com.tr adreslerinden veri toplanabilir.",
    );
  }

  url.protocol = "https:";
  url.hash = "";

  return url.toString();
}

function parseTurkishPrice(value: string): number | null {
  const match = value.match(
    /(\d{1,7}(?:\.\d{3})*(?:,\d{2})?)\s*(?:TL|₺)/i,
  );

  if (!match) {
    return null;
  }

  const rawValue = match[1];

  const normalizedValue = rawValue.includes(",")
    ? rawValue.replace(/\./g, "").replace(",", ".")
    : rawValue.replace(/\./g, "");

  const price = Number(normalizedValue);

  return Number.isFinite(price) && price > 0
    ? price
    : null;
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
  const buttonNames = [
    /tümünü kabul et/i,
    /kabul et/i,
    /onayla/i,
    /tamam/i,
  ];

  for (const name of buttonNames) {
    const button = page
      .getByRole("button", { name })
      .first();

    if (await button.isVisible().catch(() => false)) {
      await button.click().catch(() => undefined);
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
      const lines = (
        document.body.innerText ??
        document.body.textContent ??
        ""
      )
        .split("\n")
        .map((line) =>
          line.replace(/\s+/g, " ").trim(),
        )
        .filter(Boolean);

      const pricePattern =
        /^(\d{1,7}(?:\.\d{3})*,\d{2})\s*(?:TL|₺)$/i;

      const unitPricePattern =
        /^\(\d{1,7}(?:\.\d{3})*,\d{2}\s*(?:TL|₺)\s*\/.*\)$/i;

      const ignoredTexts = new Set([
        "Popüler Ürünler",
        "Çok Satan Ürünler",
        "Öne Çıkanlar",
        "Kategoriler",
        "Sepet",
        "Hesabım",
        "Giriş Yap",
        "Nereye Gelsin",
        "Teslimat adresi seçin!",
      ]);

      const results: Array<{
        productName: string;
        priceText: string;
        sourceUrl: string;
      }> = [];

      const seen = new Set<string>();

      for (
        let index = 0;
        index < lines.length;
        index += 1
      ) {
        if (results.length >= limit) {
          break;
        }

        const priceText = lines[index];

        if (!pricePattern.test(priceText)) {
          continue;
        }

        const previousLine = lines[index - 1] ?? "";

        if (
          !previousLine ||
          previousLine.length < 3 ||
          ignoredTexts.has(previousLine) ||
          pricePattern.test(previousLine) ||
          unitPricePattern.test(previousLine)
        ) {
          continue;
        }

        const productName = previousLine;

        const uniqueKey =
          `${productName}|${priceText}`.toLocaleLowerCase(
            "tr-TR",
          );

        if (seen.has(uniqueKey)) {
          continue;
        }

        seen.add(uniqueKey);

        results.push({
          productName,
          priceText,
          sourceUrl: window.location.href,
        });
      }

      return results;
    },
    maximumProductCount,
  );

  const products: CollectedCatalogProduct[] = [];

  for (const rawProduct of rawProducts) {
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
      storeName: "Hakmar Express",
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

export class HakmarCollectorService
  implements MarketCollector
{
  readonly storeName = "Hakmar Express";

  async collect(
    options: CollectorOptions,
  ): Promise<CollectorResult> {
    const sourceUrl = normalizeHakmarUrl(
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
      console.log("HAKMAR DEBUG URL:", page.url());
console.log("HAKMAR DEBUG BAŞLIK:", await page.title());
console.log(
  "HAKMAR DEBUG METİN:",
  (await page.locator("body").innerText()).slice(0, 3000),
);
console.log(
  "HAKMAR DEBUG IFRAME SAYISI:",
  page.frames().length,
);

      const products = await extractProducts(
        page,
        maximumProductCount,
      );

      if (products.length === 0) {
        errors.push(
          "Hakmar Express sayfasında ürün veya fiyat bulunamadı.",
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
    } catch (error: unknown) {
      errors.push(
        error instanceof Error
          ? error.message
          : "Hakmar Express verileri toplanırken bilinmeyen hata oluştu.",
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

export const hakmarCollectorService =
  new HakmarCollectorService();

collectorEngine.register(
  hakmarCollectorService,
);