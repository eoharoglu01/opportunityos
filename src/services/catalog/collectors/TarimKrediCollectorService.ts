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

function normalizeTarimKrediUrl(value: string): string {
  const url = new URL(value);

  if (
    url.hostname !== "www.tkkoop.com.tr" &&
    url.hostname !== "tkkoop.com.tr"
  ) {
    throw new Error(
      "Yalnızca tkkoop.com.tr adreslerinden veri toplanabilir.",
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
  const buttonNames = [
    /tümünü kabul et/i,
    /kabul et/i,
    /onayla/i,
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

      const priceOnlyPattern =
        /^\d{1,7}(?:\.\d{3})*(?:,\d{2})?$/;

      const priceWithCurrencyPattern =
        /^(\d{1,7}(?:\.\d{3})*(?:,\d{2})?)\s*(?:TL|₺)$/i;

      const ignoredTexts = new Set([
        "TL",
        "₺",
        "Ürünler",
        "Ana Sayfa",
        "Sepetim",
        "Giriş Yap",
        "Üye Ol",
        "Detay",
        "İncele",
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

        let priceText = "";

        if (
          priceWithCurrencyPattern.test(lines[index])
        ) {
          priceText = lines[index];
        } else if (
          priceOnlyPattern.test(lines[index]) &&
          /^(TL|₺)$/i.test(lines[index + 1] ?? "")
        ) {
          priceText =
            `${lines[index]} ${lines[index + 1]}`;
        } else {
          continue;
        }

        let productName = "";

        for (
          let previousIndex = index - 1;
          previousIndex >= 0 &&
          previousIndex >= index - 8;
          previousIndex -= 1
        ) {
          const candidate = lines[previousIndex];

          if (
            ignoredTexts.has(candidate) ||
            priceOnlyPattern.test(candidate) ||
            priceWithCurrencyPattern.test(candidate) ||
            /^(TL|₺)$/i.test(candidate) ||
            candidate.length < 3 ||
            candidate.includes("Sepete Ekle")
          ) {
            continue;
          }

          productName = candidate;
          break;
        }

        if (!productName) {
          continue;
        }

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
      storeName: "Tarım Kredi",
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

export class TarimKrediCollectorService
  implements MarketCollector
{
  readonly storeName = "Tarım Kredi";

  async collect(
    options: CollectorOptions,
  ): Promise<CollectorResult> {
    const sourceUrl = normalizeTarimKrediUrl(
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
          "Tarım Kredi sayfasında ürün veya fiyat bulunamadı.",
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
          : "Tarım Kredi verileri toplanırken bilinmeyen hata oluştu.",
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

export const tarimKrediCollectorService =
  new TarimKrediCollectorService();

collectorEngine.register(
  tarimKrediCollectorService,
);