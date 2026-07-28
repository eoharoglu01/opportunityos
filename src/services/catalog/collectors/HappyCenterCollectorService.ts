import {
  chromium,
  type BrowserContext,
  type Page,
} from "playwright";

import type {
  CollectedCatalogProduct,
  CollectorOptions,
  CollectorResult,
  MarketCollector,
} from "./types";

import { collectorEngine } from "./CollectorEngine";

const HAPPY_CENTER_HOSTS = new Set([
  "www.happycenter.com.tr",
  "happycenter.com.tr",
]);

const DEFAULT_SEARCH_TERMS = [
  "ekmek",
  "tost ekmek",
  "süt",
  "su",
  "yoğurt",
  "yumurta",
  "peynir",
  "ayçiçek yağı",
  "zeytinyağı",
  "makarna",
  "pirinç",
  "bulgur",
  "un",
  "şeker",
  "çay",
  "kahve",
];

function normalizeWhitespace(
  value: string,
): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeHappyCenterUrl(
  value: string,
): string {
  const url = new URL(value);

  if (!HAPPY_CENTER_HOSTS.has(url.hostname)) {
    throw new Error(
      "Yalnızca happycenter.com.tr adreslerinden veri toplanabilir.",
    );
  }

  url.protocol = "https:";
  url.hostname = "www.happycenter.com.tr";
  url.hash = "";

  return url.toString();
}

function createSearchUrl(
  searchTerm: string,
): string {
  const url = new URL(
    "https://www.happycenter.com.tr/Product/Search/",
  );

  url.searchParams.set("ara", searchTerm);

  return url.toString();
}

function parseTurkishPrice(
  value: string,
): number | null {
  const match = value.match(
    /(\d{1,7}(?:\.\d{3})*(?:,\d{2})?)\s*(?:TL|₺)/i,
  );

  if (!match) {
    return null;
  }

  const rawValue = match[1];

  const normalizedValue = rawValue.includes(",")
    ? rawValue
        .replace(/\./g, "")
        .replace(",", ".")
    : rawValue.replace(/\./g, "");

  const price = Number(normalizedValue);

  return Number.isFinite(price) && price > 0
    ? price
    : null;
}

function guessBrand(
  productName: string,
): string | undefined {
  const normalizedName =
    normalizeWhitespace(productName);

  const firstWord =
    normalizedName.split(" ")[0];

  if (
    !firstWord ||
    firstWord.length < 2
  ) {
    return undefined;
  }

  const genericFirstWords = new Set([
    "ekmek",
    "süt",
    "su",
    "yoğurt",
    "yumurta",
    "peynir",
    "makarna",
    "pirinç",
    "bulgur",
    "un",
    "şeker",
    "çay",
    "kahve",
  ]);

  if (
    genericFirstWords.has(
      firstWord.toLocaleLowerCase("tr-TR"),
    )
  ) {
    return undefined;
  }

  return firstWord;
}

function createProductKey(
  product: Pick<
    CollectedCatalogProduct,
    "productName" | "price" | "storeName"
  >,
): string {
  return [
    product.storeName,
    normalizeWhitespace(
      product.productName,
    ),
    product.price.toFixed(2),
  ]
    .join("|")
    .toLocaleLowerCase("tr-TR");
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

    if (
      await button
        .isVisible()
        .catch(() => false)
    ) {
      await button
        .click()
        .catch(() => undefined);

      return;
    }
  }
}

async function closePopups(
  page: Page,
): Promise<void> {
  const selectors = [
    '[aria-label="Close"]',
    '[aria-label="Kapat"]',
    ".modal-close",
    ".close",
    'button:has-text("Kapat")',
  ];

  for (const selector of selectors) {
    const button = page
      .locator(selector)
      .first();

    if (
      await button
        .isVisible()
        .catch(() => false)
    ) {
      await button
        .click()
        .catch(() => undefined);
    }
  }

  await page.keyboard
    .press("Escape")
    .catch(() => undefined);
}

async function scrollPage(
  page: Page,
  delayMs: number,
): Promise<void> {
  let previousHeight = 0;
  let stableAttempts = 0;

  for (
    let attempt = 0;
    attempt < 12;
    attempt += 1
  ) {
    const currentHeight =
      await page.evaluate(
        () => document.body.scrollHeight,
      );

    if (currentHeight === previousHeight) {
      stableAttempts += 1;
    } else {
      stableAttempts = 0;
    }

    if (stableAttempts >= 2) {
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
  const collectedAt =
    new Date().toISOString();

  const rawProducts =
    await page.evaluate(
      (limit) => {
        const lines = (
          document.body.innerText ??
          document.body.textContent ??
          ""
        )
          .split("\n")
          .map((line) =>
            line
              .replace(/\s+/g, " ")
              .trim(),
          )
          .filter(Boolean);

        const pricePattern =
          /^\d{1,7}(?:\.\d{3})*,\d{2}\s*(?:TL|₺)$/i;

        const ignoredTexts = new Set([
          "Şube Seçiniz",
          "Sepete eklendi",
          "Sepetim",
          "Giriş Yap",
          "Üye Ol",
          "Kategoriler",
          "Reyon Seçiniz",
          "Marka Seçiniz",
          "Alışveriş Listeme Ekle",
          "Favorilere Ekle",
          "Ürünler",
          "Ana Sayfa",
          "Stokta Yok",
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
          let index = 1;
          index < lines.length;
          index += 1
        ) {
          if (
            results.length >= limit
          ) {
            break;
          }

          const priceText =
            lines[index];

          if (
            !pricePattern.test(
              priceText,
            )
          ) {
            continue;
          }

          let productName = "";

          for (
            let offset = 1;
            offset <= 6;
            offset += 1
          ) {
            const candidate =
              lines[index - offset] ??
              "";

            if (
              !candidate ||
              candidate.length < 3 ||
              ignoredTexts.has(
                candidate,
              ) ||
              pricePattern.test(
                candidate,
              ) ||
              /^\d+(?:[.,]\d+)?$/.test(
                candidate,
              ) ||
              candidate.length > 180
            ) {
              continue;
            }

            productName =
              candidate;

            break;
          }

          if (!productName) {
            continue;
          }

          const uniqueKey =
            `${productName}|${priceText}`
              .toLocaleLowerCase(
                "tr-TR",
              );

          if (
            seen.has(uniqueKey)
          ) {
            continue;
          }

          seen.add(uniqueKey);

          results.push({
            productName,
            priceText,
            sourceUrl:
              window.location.href,
          });
        }

        return results;
      },
      maximumProductCount,
    );

  const products:
    CollectedCatalogProduct[] = [];

  for (const rawProduct of rawProducts) {
    const productName =
      normalizeWhitespace(
        rawProduct.productName,
      );

    const price =
      parseTurkishPrice(
        rawProduct.priceText,
      );

    if (
      !productName ||
      price === null
    ) {
      continue;
    }

    products.push({
      storeName:
        "Happy Center",
      productName,
      brand:
        guessBrand(productName),
      price,
      currency: "TRY",
      sourceUrl:
        rawProduct.sourceUrl,
      collectedAt,
    });
  }

  return products;
}

async function collectFromPage(
  context: BrowserContext,
  sourceUrl: string,
  maximumProductCount: number,
  delayMs: number,
): Promise<
  CollectedCatalogProduct[]
> {
  const page =
    await context.newPage();

  try {
    await page.goto(sourceUrl, {
      waitUntil:
        "domcontentloaded",
      timeout: 60_000,
    });

    await acceptCookies(page);
    await closePopups(page);

    await page.waitForTimeout(
      1_500,
    );

    await scrollPage(
      page,
      delayMs,
    );

    return await extractProducts(
      page,
      maximumProductCount,
    );
  } finally {
    await page.close();
  }
}

function shouldCollectSearchPages(
  sourceUrl: string,
): boolean {
  const url = new URL(sourceUrl);

  const isSearchPage =
    url.pathname
      .toLocaleLowerCase("tr-TR")
      .includes("/product/search");

  return !isSearchPage;
}

export class HappyCenterCollectorService
  implements MarketCollector
{
  readonly storeName =
    "Happy Center";

  async collect(
    options: CollectorOptions,
  ): Promise<CollectorResult> {
    const sourceUrl =
      normalizeHappyCenterUrl(
        options.sourceUrl,
      );

    const maximumProductCount =
      Math.min(
        Math.max(
          options.maximumProductCount ??
            100,
          1,
        ),
        500,
      );

    const delayMs = Math.max(
      options.delayBetweenRequestsMs ??
        1_000,
      750,
    );

    const errors: string[] = [];

    const products:
      CollectedCatalogProduct[] = [];

    const seenProducts =
      new Set<string>();

    const browser =
      await chromium.launch({
        headless: true,
      });

    try {
      const context =
        await browser.newContext({
          locale: "tr-TR",
          timezoneId:
            "Europe/Istanbul",
          viewport: {
            width: 1440,
            height: 1200,
          },
          userAgent:
            "OpportunityOS/1.0 catalog collector",
        });

      const targetUrls = [
        sourceUrl,
      ];

      if (
        shouldCollectSearchPages(
          sourceUrl,
        )
      ) {
        targetUrls.push(
          ...DEFAULT_SEARCH_TERMS.map(
            createSearchUrl,
          ),
        );
      }

      for (const targetUrl of targetUrls) {
        if (
          products.length >=
          maximumProductCount
        ) {
          break;
        }

        const remainingCount =
          maximumProductCount -
          products.length;

        try {
          const pageProducts =
            await collectFromPage(
              context,
              targetUrl,
              remainingCount,
              delayMs,
            );

          for (
            const product of pageProducts
          ) {
            const productKey =
              createProductKey(
                product,
              );

            if (
              seenProducts.has(
                productKey,
              )
            ) {
              continue;
            }

            seenProducts.add(
              productKey,
            );

            products.push(
              product,
            );

            if (
              products.length >=
              maximumProductCount
            ) {
              break;
            }
          }
        } catch (error: unknown) {
          const message =
            error instanceof Error
              ? error.message
              : "Bilinmeyen sayfa toplama hatası.";

          errors.push(
            `${targetUrl}: ${message}`,
          );
        }
      }

      await context.close();

      if (products.length === 0) {
        errors.push(
          "Happy Center sayfalarında ürün veya fiyat bulunamadı.",
        );
      }

      return {
        success:
          products.length > 0,
        storeName:
          this.storeName,
        sourceUrl,
        collectedCount:
          products.length,
        products,
        errors,
      };
    } catch (error: unknown) {
      errors.push(
        error instanceof Error
          ? error.message
          : "Happy Center verileri toplanırken bilinmeyen hata oluştu.",
      );

      return {
        success: false,
        storeName:
          this.storeName,
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

export const happyCenterCollectorService =
  new HappyCenterCollectorService();

collectorEngine.register(
  happyCenterCollectorService,
);