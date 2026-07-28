import { chromium, type Page } from "playwright";
import { getPath } from "pdf-parse/worker";
import { PDFParse } from "pdf-parse";
PDFParse.setWorker(getPath());
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

function normalizeOnurMarketUrl(
  value: string,
): string {
  const url = new URL(value);

if (
  url.hostname !== "kurumsal.onurmarket.com" &&
  url.hostname !== "www.onurmarket.com" &&
  url.hostname !== "onurmarket.com"
) {
  throw new Error(
    "Yalnızca Onur Market adreslerinden veri toplanabilir.",
  );
}

  url.protocol = "https:";
  url.hash = "";

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
    /izin ver/i,
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
async function extractPdfText(
  pdfUrl: string,
): Promise<string> {
  const parser = new PDFParse({
    url: pdfUrl,
  });

  try {
    const result = await parser.getText();

    return result.text ?? "";
  } finally {
    await parser.destroy();
  }
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
        /^(\d{1,7}(?:\.\d{3})*(?:,\d{2})?)\s*(?:TL|₺)$/i;

      const unitPricePattern =
        /^\(\d{1,7}(?:\.\d{3})*(?:,\d{2})?\s*(?:TL|₺)\s*\/.*\)$/i;

      const ignoredTexts = new Set([
        "Popüler Ürünler",
        "Çok Satan Ürünler",
        "Öne Çıkanlar",
        "Öne Çıkan Ürünler",
        "Kampanyalı Ürünler",
        "Kategoriler",
        "Sepet",
        "Sepetim",
        "Hesabım",
        "Giriş Yap",
        "Üye Ol",
        "Adres Seç",
        "Teslimat Adresi",
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

        let productName = "";

        for (
          let offset = 1;
          offset <= 4;
          offset += 1
        ) {
          const candidate =
            lines[index - offset] ?? "";

          if (
            !candidate ||
            candidate.length < 3 ||
            ignoredTexts.has(candidate) ||
            pricePattern.test(candidate) ||
            unitPricePattern.test(candidate)
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
      storeName: "Onur Market",
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

export class OnurMarketCollectorService
  implements MarketCollector
{
  readonly storeName = "Onur Market";

  async collect(
    options: CollectorOptions,
  ): Promise<CollectorResult> {
    const sourceUrl = normalizeOnurMarketUrl(
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

const catalogLinks = await page
  .locator(
    'a[href*="campaign="], a[href*=".pdf"], a[href*="/download/"]',
  )
  .evaluateAll((links) =>
    links.map((link) => ({
      text: (link.textContent ?? "")
        .replace(/\s+/g, " ")
        .trim(),
      href: (link as HTMLAnchorElement).href,
    })),
  );

console.log(
  "ONUR MARKET GERÇEK KATALOG BAĞLANTILARI:",
  catalogLinks,
);
const currentPdfUrl = catalogLinks.find((link) =>
  link.href.toLocaleLowerCase("tr-TR").includes(".pdf"),
)?.href;

if (!currentPdfUrl) {
  throw new Error(
    "Onur Market güncel katalog PDF bağlantısı bulunamadı.",
  );
}

const pdfText = await extractPdfText(currentPdfUrl);

console.log(
  "ONUR MARKET PDF METNİ:",
  pdfText.slice(0, 3000),
);
      const products = await extractProducts(
        page,
        maximumProductCount,
      );

      if (products.length === 0) {
        errors.push(
          "Onur Market sayfasında ürün veya fiyat bulunamadı.",
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
          : "Onur Market verileri toplanırken bilinmeyen hata oluştu.",
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

export const onurMarketCollectorService =
  new OnurMarketCollectorService();

collectorEngine.register(
  onurMarketCollectorService,
);