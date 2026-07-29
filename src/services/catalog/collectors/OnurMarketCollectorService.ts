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
  function extractProductsFromPdfText(
  pdfText: string,
  pdfUrl: string,
  maximumProductCount: number,
): CollectedCatalogProduct[] {
  const collectedAt = new Date().toISOString();

  const lines = pdfText
    .split(/\r?\n/)
    .map((line) =>
      line.replace(/\s+/g, " ").trim(),
    )
    .filter(Boolean);

  const pricePattern =
    /(\d{1,7}(?:\.\d{3})*(?:,\d{2})?)\s*(?:TL|₺)/i;

  const ignoredPatterns = [
    /kampanya/i,
    /indirimler/i,
    /onur kart/i,
    /stoklarla sınırlıdır/i,
    /geçerlidir/i,
    /www\./i,
    /onurmarket/i,
    /çok al az öde/i,
    /^\d{1,2}[./-]\d{1,2}/,
  ];

  const products: CollectedCatalogProduct[] = [];
  const seen = new Set<string>();

  for (
    let index = 0;
    index < lines.length;
    index += 1
  ) {
    if (products.length >= maximumProductCount) {
      break;
    }

    const line = lines[index];
    const priceMatch = line.match(pricePattern);

    if (!priceMatch) {
      continue;
    }

    const price = parseTurkishPrice(priceMatch[0]);

    if (price === null) {
      continue;
    }

    const priceIndex = priceMatch.index ?? 0;

    let productName = normalizeWhitespace(
      line.slice(0, priceIndex),
    );

    productName = productName
      .replace(
        /^(süper fiyat|onur fiyat|fırsat fiyatı|onur kart fiyatı)\s*/i,
        "",
      )
      .replace(/^[•\-–—|]+/, "")
      .trim();

    if (
      productName.length < 3 ||
      ignoredPatterns.some((pattern) =>
        pattern.test(productName),
      )
    ) {
      productName = "";

      for (
        let offset = 1;
        offset <= 3;
        offset += 1
      ) {
        const candidate =
          lines[index - offset] ?? "";

        if (
          candidate.length >= 3 &&
          !pricePattern.test(candidate) &&
          !ignoredPatterns.some((pattern) =>
            pattern.test(candidate),
          )
        ) {
          productName = candidate;
          break;
        }
      }
    }

    if (!productName) {
      continue;
    }

    const uniqueKey =
      `${productName}|${price}`
        .toLocaleLowerCase("tr-TR");

    if (seen.has(uniqueKey)) {
      continue;
    }

    seen.add(uniqueKey);

    products.push({
      storeName: "Onur Market",
      productName,
      brand: guessBrand(productName),
      price,
      currency: "TRY",
      sourceUrl: pdfUrl,
      collectedAt,
    });
  }

  return products;
}
