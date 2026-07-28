import { NextResponse } from "next/server";

type CatalogProduct = {
  storeName: string;
  productName: string;
  brand?: string;
  barcode?: string;
  price: number;
  currency: string;
  sourceUrl: string;
  collectedAt: string;
};

type MarketApiResponse = {
  success?: boolean;
  message?: string;
  data?: {
    success?: boolean;
    storeName?: string;
    collectedCount?: number;
    products?: CatalogProduct[];
    errors?: string[];
  };
};

type MarketResult = {
  market: string;
  storeName: string;
  success: boolean;
  collectedCount: number;
  httpStatus: number;
  durationMs: number;
  errors: string[];
};

type MatchingMethod =
  | "barcode"
  | "smart-name";

type ProductGroupAccumulator = {
  groupKey: string;
  normalizedName: string;
  productName: string;
  barcode?: string;
  brand?: string;
  quantityKey?: string;
  matchingMethod: MatchingMethod;
  offersByStore: Map<string, CatalogProduct>;
};

type QuantityInformation = {
  quantityKey?: string;
  normalizedQuantityText?: string;
};

const markets = [
  "sok",
  "migros",
  "carrefour",
  "bim",
  "a101",
  "tarimkredi",
  "bizimtoptan",
  "hakmar",
  "happy",
] as const;

const ignoredWords = new Set([
  "kampanya",
  "kampanyali",
  "indirim",
  "indirimli",
  "avantaj",
  "avantajli",
  "ekonomik",
  "ozel",
  "yeni",
  "firsat",
  "firsati",
  "hediyeli",
  "promosyon",
  "promosyonlu",
  "super",
  "uygun",
  "ucuz",
  "market",
  "urun",
  "urunu",
  "paket",
  "pk",
  "adet",
  "ad",
  "marka",
  "cesitleri",
  "cesidi",
  "stok",
  "stoklarla",
  "sinirli",
  "online",
  "sepette",
  "kartla",
  "kart",
]);

const weakWords = new Set([
  "tam",
  "yarim",
  "normal",
  "klasik",
  "standart",
  "geleneksel",
]);

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function normalizeTurkishText(
  value: string,
): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c");
}

function normalizeBarcode(
  value?: string,
): string | undefined {
  if (!value) {
    return undefined;
  }

  const digits = value.replace(/\D/g, "");

  if (
    digits.length < 8 ||
    digits.length > 14
  ) {
    return undefined;
  }

  return digits;
}

function normalizeBrand(
  value?: string,
): string | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = normalizeTurkishText(value)
    .replace(/[®️™️©️]/g, " ")
    .replace(/\bmarka\b/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  return normalized || undefined;
}

function formatDecimalForKey(
  value: number,
): string {
  if (Number.isInteger(value)) {
    return String(value);
  }

  return Number(value.toFixed(3))
    .toString()
    .replace(".", "_");
}

function extractQuantityInformation(
  rawValue: string,
): QuantityInformation {
  const value = normalizeTurkishText(rawValue)
    .replace(/,/g, ".");

  const multipackMatch = value.match(
    /\b(\d{1,3})\s*[xX×]\s*(\d+(?:\.\d+)?)\s*(ml|l|lt|litre|g|gr|gram|kg)\b/i,
  );

  if (multipackMatch) {
    const packCount = Number(
      multipackMatch[1],
    );

    const amount = Number(
      multipackMatch[2],
    );

    const unit =
      multipackMatch[3].toLowerCase();

    if (
      Number.isFinite(packCount) &&
      Number.isFinite(amount) &&
      packCount > 0 &&
      amount > 0
    ) {
      if (
        unit === "ml" ||
        unit === "l" ||
        unit === "lt" ||
        unit === "litre"
      ) {
        const amountInMl =
          unit === "ml"
            ? amount
            : amount * 1000;

        return {
          quantityKey:
            `${packCount}x${formatDecimalForKey(
              amountInMl,
            )}ml`,
          normalizedQuantityText:
            `${packCount} x ${formatDecimalForKey(
              amountInMl,
            )} ml`,
        };
      }

      const amountInGrams =
        unit === "kg"
          ? amount * 1000
          : amount;

      return {
        quantityKey:
          `${packCount}x${formatDecimalForKey(
            amountInGrams,
          )}g`,
        normalizedQuantityText:
          `${packCount} x ${formatDecimalForKey(
            amountInGrams,
          )} g`,
      };
    }
  }

  const quantityMatches = Array.from(
    value.matchAll(
      /\b(\d+(?:\.\d+)?)\s*(ml|l|lt|litre|g|gr|gram|kg)\b/gi,
    ),
  );

  if (quantityMatches.length === 0) {
    return {};
  }

  const lastMatch =
    quantityMatches[
      quantityMatches.length - 1
    ];

  const amount = Number(lastMatch[1]);
  const unit = lastMatch[2].toLowerCase();

  if (
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    return {};
  }

  if (
    unit === "ml" ||
    unit === "l" ||
    unit === "lt" ||
    unit === "litre"
  ) {
    const amountInMl =
      unit === "ml"
        ? amount
        : amount * 1000;

    return {
      quantityKey:
        `${formatDecimalForKey(
          amountInMl,
        )}ml`,
      normalizedQuantityText:
        `${formatDecimalForKey(
          amountInMl,
        )} ml`,
    };
  }

  const amountInGrams =
    unit === "kg"
      ? amount * 1000
      : amount;

  return {
    quantityKey:
      `${formatDecimalForKey(
        amountInGrams,
      )}g`,
    normalizedQuantityText:
      `${formatDecimalForKey(
        amountInGrams,
      )} g`,
  };
}

function removeQuantityExpressions(
  value: string,
): string {
  return value
    .replace(
      /\b\d{1,3}\s*[xX×]\s*\d+(?:[.,]\d+)?\s*(ml|l|lt|litre|g|gr|gram|kg)\b/gi,
      " ",
    )
    .replace(
      /\b\d+(?:[.,]\d+)?\s*(ml|l|lt|litre|g|gr|gram|kg)\b/gi,
      " ",
    );
}

function tokenizeProductName(
  value: string,
): string[] {
  const normalized =
    normalizeTurkishText(
      removeQuantityExpressions(value),
    )
      .replace(
        /%(\d+(?:[.,]\d+)?)/g,
        " yuzde $1 ",
      )
      .replace(/,/g, ".")
      .replace(/[®️™️©️]/g, " ")
      .replace(/[^\p{L}\p{N}.]+/gu, " ")
      .replace(/\s+/g, " ")
      .trim();

  const tokens = normalized
    .split(" ")
    .map((token) => token.trim())
    .filter(Boolean)
    .filter(
      (token) =>
        !ignoredWords.has(token),
    );

  const uniqueTokens =
    Array.from(new Set(tokens));

  return uniqueTokens.sort((a, b) =>
    a.localeCompare(b, "tr"),
  );
}

function inferBrand(
  product: CatalogProduct,
  tokens: string[],
): string | undefined {
  const explicitBrand =
    normalizeBrand(product.brand);

  if (explicitBrand) {
    return explicitBrand;
  }

  const firstToken = tokens.find(
    (token) =>
      token.length >= 2 &&
      !weakWords.has(token) &&
      !/^\d/.test(token),
  );

  return firstToken;
}

function normalizeProductName(
  product: CatalogProduct,
): {
  normalizedName: string;
  fingerprint: string;
  brand?: string;
  quantityKey?: string;
} {
  const tokens = tokenizeProductName(
    product.productName,
  );

  const brand = inferBrand(
    product,
    tokens,
  );

  const quantity =
    extractQuantityInformation(
      product.productName,
    );

  const meaningfulTokens = tokens.filter(
    (token) =>
      token !== brand ||
      tokens.filter(
        (candidate) =>
          candidate === brand,
      ).length > 1,
  );

  const tokenKey =
    meaningfulTokens.join("-");

  const fingerprintParts = [
    brand ?? "markasiz",
    tokenKey || "isimsiz",
    quantity.quantityKey ?? "miktarsiz",
  ];

  const normalizedNameParts = [
    brand,
    ...meaningfulTokens,
    quantity.normalizedQuantityText,
  ].filter(
    (
      value,
    ): value is string =>
      Boolean(value),
  );

  return {
    normalizedName:
      normalizedNameParts
        .join(" ")
        .replace(/\s+/g, " ")
        .trim(),

    fingerprint:
      fingerprintParts.join("|"),

    brand,

    quantityKey:
      quantity.quantityKey,
  };
}

function parseMaximumProductCount(
  value: string | null,
): number {
  const parsedValue = Number(value ?? 5);

  if (!Number.isFinite(parsedValue)) {
    return 5;
  }

  return Math.min(
    Math.max(
      Math.floor(parsedValue),
      1,
    ),
    50,
  );
}

function isValidProduct(
  product: CatalogProduct,
): boolean {
  return (
    Boolean(product.storeName?.trim()) &&
    Boolean(product.productName?.trim()) &&
    Number.isFinite(product.price) &&
    product.price > 0 &&
    Boolean(product.sourceUrl)
  );
}

function calculateOpportunityScore(input: {
  storeCount: number;
  offerCount: number;
  savingsPercentage: number;
}): number {
  const storeScore = Math.min(
    input.storeCount * 10,
    40,
  );

  const savingsScore = Math.min(
    input.savingsPercentage * 1.5,
    40,
  );

  const offerScore = Math.min(
    input.offerCount * 4,
    20,
  );

  return Math.round(
    Math.min(
      storeScore +
        savingsScore +
        offerScore,
      100,
    ),
  );
}

function createOpportunityBadges(input: {
  isComparable: boolean;
  storeCount: number;
  maximumSavings: number;
  savingsPercentage: number;
  opportunityScore: number;
}): string[] {
  const badges: string[] = [];

  if (
    input.isComparable &&
    input.savingsPercentage >= 20
  ) {
    badges.push("🔥 EN ÇOK TASARRUF");
  }

  if (input.storeCount >= 4) {
    badges.push(
      "🏆 ÇOK MARKette BULUNDU",
    );
  }

  if (
    input.opportunityScore >= 80
  ) {
    badges.push("💎 İYİ FIRSAT");
  }

  if (
    input.isComparable &&
    input.maximumSavings > 0 &&
    badges.length === 0
  ) {
    badges.push("💰 TASARRUF FIRSATI");
  }

  if (badges.length === 0) {
    badges.push("EN UCUZ");
  }

  return badges;
}

async function fetchMarketCatalog(
  baseUrl: string,
  market: string,
  maximumProductCount: number,
): Promise<{
  market: string;
  httpStatus: number;
  durationMs: number;
  body: MarketApiResponse;
}> {
  const startedAt = Date.now();

  const controller =
    new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    55_000,
  );

  try {
    const response = await fetch(
      `${baseUrl}/api/catalog/${market}?maximumProductCount=${maximumProductCount}`,
      {
        cache: "no-store",
        signal: controller.signal,
      },
    );

    let body: MarketApiResponse;

    try {
      body =
        (await response.json()) as MarketApiResponse;
    } catch {
      body = {
        success: false,
        message:
          `${market} geçersiz JSON cevabı döndürdü.`,
      };
    }

    return {
      market,
      httpStatus: response.status,
      durationMs:
        Date.now() - startedAt,
      body,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(
  request: Request,
) {
  const requestUrl = new URL(
    request.url,
  );

  const baseUrl =
    requestUrl.origin;

  const maximumProductCount =
    parseMaximumProductCount(
      requestUrl.searchParams.get(
        "maximumProductCount",
      ),
    );

  const settledResults =
    await Promise.allSettled(
      markets.map((market) =>
        fetchMarketCatalog(
          baseUrl,
          market,
          maximumProductCount,
        ),
      ),
    );

  const products: CatalogProduct[] = [];

  const marketResults: MarketResult[] =
    settledResults.map(
      (result, index) => {
        const market =
          markets[index];

        if (
          result.status === "rejected"
        ) {
          return {
            market,
            storeName: market,
            success: false,
            collectedCount: 0,
            httpStatus: 500,
            durationMs: 0,
            errors: [
              result.reason instanceof Error
                ? result.reason.message
                : "Market isteği sırasında bilinmeyen hata oluştu.",
            ],
          };
        }

        const {
          body,
          httpStatus,
          durationMs,
        } = result.value;

        const marketData =
          body.data;

        const marketProducts =
          (
            marketData?.products ??
            []
          ).filter(isValidProduct);

        const success =
          httpStatus >= 200 &&
          httpStatus < 300 &&
          body.success === true &&
          marketData?.success === true;

        if (success) {
          products.push(
            ...marketProducts,
          );
        }

        return {
          market,

          storeName:
            marketData?.storeName ??
            market,

          success,

          collectedCount:
            marketProducts.length,

          httpStatus,

          durationMs,

          errors:
            marketData?.errors ??
            (body.message &&
            !success
              ? [body.message]
              : []),
        };
      },
    );

  const groupMap = new Map<
    string,
    ProductGroupAccumulator
  >();

  for (const product of products) {
    const barcode =
      normalizeBarcode(
        product.barcode,
      );

    const normalized =
      normalizeProductName(product);

    const groupKey = barcode
      ? `barcode:${barcode}`
      : `smart:${normalized.fingerprint}`;

    const existingGroup =
      groupMap.get(groupKey);

    if (!existingGroup) {
      groupMap.set(groupKey, {
        groupKey,

        normalizedName:
          normalized.normalizedName,

        productName:
          product.productName,

        barcode,

        brand:
          normalized.brand,

        quantityKey:
          normalized.quantityKey,

        matchingMethod: barcode
          ? "barcode"
          : "smart-name",

        offersByStore: new Map([
          [
            product.storeName,
            product,
          ],
        ]),
      });

      continue;
    }

    const existingStoreOffer =
      existingGroup.offersByStore.get(
        product.storeName,
      );

    if (
      !existingStoreOffer ||
      product.price <
        existingStoreOffer.price
    ) {
      existingGroup.offersByStore.set(
        product.storeName,
        product,
      );
    }

    const currentCheapest =
      Array.from(
        existingGroup.offersByStore.values(),
      ).reduce(
        (cheapest, offer) =>
          offer.price <
          cheapest.price
            ? offer
            : cheapest,
      );

    existingGroup.productName =
      currentCheapest.productName;
  }

  const groupedProducts = Array.from(
    groupMap.values(),
  )
    .map((group) => {
      const sortedOffers =
        Array.from(
          group.offersByStore.values(),
        ).sort(
          (
            firstOffer,
            secondOffer,
          ) =>
            firstOffer.price -
            secondOffer.price,
        );

      const cheapestOffer =
        sortedOffers[0];

      const highestOffer =
        sortedOffers[
          sortedOffers.length - 1
        ];

      const cheapestPrice =
        cheapestOffer?.price ?? 0;

      const highestPrice =
        highestOffer?.price ??
        cheapestPrice;

      const maximumSavings =
        Math.max(
          highestPrice -
            cheapestPrice,
          0,
        );

      const savingsPercentage =
        highestPrice > 0
          ? Number(
              (
                (maximumSavings /
                  highestPrice) *
                100
              ).toFixed(2),
            )
          : 0;

      const storeCount =
        group.offersByStore.size;

      const offerCount =
        sortedOffers.length;

      const isComparable =
        storeCount > 1;

      const opportunityScore =
        calculateOpportunityScore({
          storeCount,
          offerCount,
          savingsPercentage,
        });

      const opportunityBadges =
        createOpportunityBadges({
          isComparable,
          storeCount,
          maximumSavings,
          savingsPercentage,
          opportunityScore,
        });

      const matchConfidence =
        group.matchingMethod ===
        "barcode"
          ? 100
          : Math.min(
              70 +
                storeCount * 5 +
                (group.quantityKey
                  ? 10
                  : 0) +
                (group.brand
                  ? 5
                  : 0),
              95,
            );

      return {
        groupKey:
          group.groupKey,

        normalizedName:
          group.normalizedName,

        productName:
          group.productName,

        brand:
          group.brand,

        barcode:
          group.barcode,

        quantityKey:
          group.quantityKey,

        matching: {
          method:
            group.matchingMethod,

          confidence:
            matchConfidence,
        },

        badge:
          opportunityBadges[0],

        badges:
          opportunityBadges,

        opportunityScore,

        cheapestOffer,

        cheapestPrice,

        highestPrice,

        maximumSavings:
          Number(
            maximumSavings.toFixed(2),
          ),

        savingsPercentage,

        offerCount,

        storeCount,

        isComparable,

        priceHistoryAvailable:
          false,

        offers: sortedOffers.map(
          (offer, index) => {
            const priceDifference =
              Math.max(
                offer.price -
                  cheapestPrice,
                0,
              );

            const priceDifferencePercentage =
              cheapestPrice > 0
                ? Number(
                    (
                      (priceDifference /
                        cheapestPrice) *
                      100
                    ).toFixed(2),
                  )
                : 0;

            return {
              ...offer,

              rank:
                index + 1,

              badge:
                index === 0
                  ? "EN UCUZ"
                  : null,

              isCheapest:
                index === 0,

              priceDifference:
                Number(
                  priceDifference.toFixed(
                    2,
                  ),
                ),

              priceDifferencePercentage,

              priceHistoryAvailable:
                false,
            };
          },
        ),
      };
    })
    .sort(
      (
        firstGroup,
        secondGroup,
      ) => {
        if (
          firstGroup.isComparable !==
          secondGroup.isComparable
        ) {
          return firstGroup.isComparable
            ? -1
            : 1;
        }

        if (
          secondGroup.storeCount !==
          firstGroup.storeCount
        ) {
          return (
            secondGroup.storeCount -
            firstGroup.storeCount
          );
        }

        if (
          secondGroup.opportunityScore !==
          firstGroup.opportunityScore
        ) {
          return (
            secondGroup.opportunityScore -
            firstGroup.opportunityScore
          );
        }

        if (
          secondGroup.maximumSavings !==
          firstGroup.maximumSavings
        ) {
          return (
            secondGroup.maximumSavings -
            firstGroup.maximumSavings
          );
        }

        return (
          firstGroup.cheapestPrice -
          secondGroup.cheapestPrice
        );
      },
    );

  const successfulMarkets =
    marketResults.filter(
      (marketResult) =>
        marketResult.success,
    ).length;

  const comparableProductGroups =
    groupedProducts.filter(
      (group) =>
        group.isComparable,
    ).length;

  const barcodeMatchedGroups =
    groupedProducts.filter(
      (group) =>
        group.matching.method ===
        "barcode",
    ).length;

  const smartMatchedGroups =
    groupedProducts.length -
    barcodeMatchedGroups;

  const totalPotentialSavings =
    groupedProducts.reduce(
      (total, group) =>
        total +
        group.maximumSavings,
      0,
    );

  const averageOpportunityScore =
    groupedProducts.length > 0
      ? groupedProducts.reduce(
          (total, group) =>
            total +
            group.opportunityScore,
          0,
        ) /
        groupedProducts.length
      : 0;

  return NextResponse.json({
    success:
      successfulMarkets > 0,

    summary: {
      totalMarkets:
        markets.length,

      successfulMarkets,

      failedMarkets:
        markets.length -
        successfulMarkets,

      totalProducts:
        products.length,

      totalProductGroups:
        groupedProducts.length,

      comparableProductGroups,

      barcodeMatchedGroups,

      smartMatchedGroups,

      totalPotentialSavings:
        Number(
          totalPotentialSavings.toFixed(
            2,
          ),
        ),

      averageOpportunityScore:
        Number(
          averageOpportunityScore.toFixed(
            2,
          ),
        ),

      currency: "TRY",
    },

    groupedProducts,

    products: products.sort(
      (
        firstProduct,
        secondProduct,
      ) =>
        firstProduct.price -
        secondProduct.price,
    ),

    marketResults,
  });
}