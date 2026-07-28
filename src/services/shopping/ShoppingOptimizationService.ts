export type OptimizationInputItem = {
  id: number;
  productName: string;
  barcode?: string;
  quantity: number;
  unit: string;
};

type CatalogOffer = {
  storeName: string;
  productName: string;
  brand?: string;
  barcode?: string;
  price: number;
  currency: string;
  sourceUrl: string;
  collectedAt: string;
  isCheapest?: boolean;
  priceDifference?: number;
  priceDifferencePercentage?: number;
};

type CatalogProductGroup = {
  groupKey?: string;
  normalizedName: string;
  productName: string;
  brand?: string;
  barcode?: string;
  quantityKey?: string;
  cheapestOffer: CatalogOffer;
  cheapestPrice: number;
  highestPrice: number;
  maximumSavings: number;
  savingsPercentage: number;
  offerCount: number;
  storeCount: number;
  isComparable: boolean;
  opportunityScore?: number;
  offers: CatalogOffer[];
};

type CatalogApiResponse = {
  success: boolean;
  groupedProducts?: CatalogProductGroup[];
  summary?: {
    successfulMarkets?: number;
    failedMarkets?: number;
    totalProducts?: number;
    totalProductGroups?: number;
  };
};

export type OptimizedBasketItem = {
  shoppingItemId: number;
  requestedProductName: string;
  matchedProductName: string;
  quantity: number;
  unit: string;

  storeId: string;
  storeName: string;

  unitPrice: number;
  totalPrice: number;
  currency: string;

  barcode?: string | null;
  brand?: string | null;
  sourceUrl?: string;

  matchScore: number;
  matchMethod:
    | "barcode"
    | "exact-name"
    | "smart-name";

  availableStoreCount: number;
  priceDifferenceFromHighest: number;
};

export type UnmatchedBasketItem = {
  shoppingItemId: number;
  productName: string;
  reason: string;
};

export type StoreBasketGroup = {
  storeId: string;
  storeName: string;
  items: OptimizedBasketItem[];
  total: number;
  itemCount: number;
};

export type SingleStoreOption = {
  storeId: string;
  storeName: string;
  total: number;
  matchedItemCount: number;
  missingItemCount: number;
  missingItems: string[];
  isCompleteBasket: boolean;
};

export type BalancedBasketPlan = {
  storeCount: number;
  total: number;
  savingsComparedWithSingleStore: number;
  storeGroups: StoreBasketGroup[];
};

export type ShoppingOptimizationResult = {
  items: OptimizedBasketItem[];
  unmatchedItems: UnmatchedBasketItem[];
  storeGroups: StoreBasketGroup[];

  total: number;
  currency: string;

  singleStoreTotal: number;
  singleStoreName?: string;
  savings: number;

  recommendedStoreCount: number;
  recommendedTotal: number;
  recommendedSavings: number;

  matchedItemCount: number;
  unmatchedItemCount: number;

  singleStoreOptions: SingleStoreOption[];
  balancedPlan: BalancedBasketPlan | null;

  catalogSummary?: {
    successfulMarkets: number;
    failedMarkets: number;
    totalProducts: number;
    totalProductGroups: number;
  };
};

type MatchResult = {
  group: CatalogProductGroup;
  score: number;
  method:
    | "barcode"
    | "exact-name"
    | "smart-name";
};

const ignoredWords = new Set([
  "kampanya",
  "kampanyali",
  "indirim",
  "indirimli",
  "avantaj",
  "avantajli",
  "firsat",
  "firsati",
  "promosyon",
  "promosyonlu",
  "ekonomik",
  "uygun",
  "ozel",
  "yeni",
  "urun",
  "urunu",
  "paket",
  "adet",
  "marka",
  "market",
]);

function roundMoney(value: number): number {
  return Number(value.toFixed(2));
}

function normalizeText(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/,/g, ".")
    .replace(
      /(\d+(?:\.\d+)?)\s*(lt|litre)\b/g,
      "$1 l",
    )
    .replace(
      /(\d+(?:\.\d+)?)\s*(gr|gram)\b/g,
      "$1 g",
    )
    .replace(/[®️™️©️]/g, " ")
    .replace(/[^\p{L}\p{N}.]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeBarcode(
  value?: string | null,
): string | null {
  if (!value) {
    return null;
  }

  const digits = value.replace(/\D/g, "");

  if (
    digits.length < 8 ||
    digits.length > 14
  ) {
    return null;
  }

  return digits;
}

function tokenize(value: string): string[] {
  return Array.from(
    new Set(
      normalizeText(value)
        .split(" ")
        .map((token) => token.trim())
        .filter(Boolean)
        .filter(
          (token) =>
            !ignoredWords.has(token),
        ),
    ),
  );
}

function calculateTokenSimilarity(
  firstValue: string,
  secondValue: string,
): number {
  const firstTokens = tokenize(firstValue);
  const secondTokens = tokenize(secondValue);

  if (
    firstTokens.length === 0 ||
    secondTokens.length === 0
  ) {
    return 0;
  }

  const firstSet = new Set(firstTokens);
  const secondSet = new Set(secondTokens);

  let intersectionCount = 0;

  for (const token of firstSet) {
    if (secondSet.has(token)) {
      intersectionCount += 1;
    }
  }

  const unionCount = new Set([
    ...firstTokens,
    ...secondTokens,
  ]).size;

  if (unionCount === 0) {
    return 0;
  }

  return intersectionCount / unionCount;
}

function hasConflictingQuantity(
  requestedName: string,
  group: CatalogProductGroup,
): boolean {
  const requestedQuantities =
    normalizeText(requestedName).match(
      /\b\d+(?:\.\d+)?\s*(?:ml|l|g|kg)\b/g,
    ) ?? [];

  if (requestedQuantities.length === 0) {
    return false;
  }

  const groupText = normalizeText(
    [
      group.productName,
      group.normalizedName,
      group.quantityKey ?? "",
    ].join(" "),
  );

  return !requestedQuantities.some(
    (quantity) =>
      groupText.includes(quantity),
  );
}

function findBestGroupMatch(
  item: OptimizationInputItem,
  groups: CatalogProductGroup[],
): MatchResult | null {
  const requestedBarcode = normalizeBarcode(
    item.barcode,
  );

  if (requestedBarcode) {
    const barcodeGroup = groups.find((group) => {
      const groupBarcode = normalizeBarcode(
        group.barcode,
      );

      if (groupBarcode === requestedBarcode) {
        return true;
      }

      return group.offers.some(
        (offer) =>
          normalizeBarcode(offer.barcode) ===
          requestedBarcode,
      );
    });

    if (barcodeGroup) {
      return {
        group: barcodeGroup,
        score: 100,
        method: "barcode",
      };
    }
  }

  const normalizedRequestedName = normalizeText(
    item.productName,
  );

  if (!normalizedRequestedName) {
    return null;
  }

  const requestedTokens = tokenize(
    item.productName,
  );

  const exactGroup = groups.find((group) => {
    const names = [
      group.productName,
      group.normalizedName,
      ...group.offers.map(
        (offer) => offer.productName,
      ),
    ];

    return names.some(
      (name) =>
        normalizeText(name) ===
        normalizedRequestedName,
    );
  });

  if (exactGroup) {
    return {
      group: exactGroup,
      score: 98,
      method: "exact-name",
    };
  }

  let bestMatch: MatchResult | null = null;

  for (const group of groups) {
    if (
      hasConflictingQuantity(
        item.productName,
        group,
      )
    ) {
      continue;
    }

    const candidateNames = [
      group.productName,
      group.normalizedName,
      ...group.offers.map(
        (offer) => offer.productName,
      ),
    ].filter(Boolean);

    let highestSimilarity = 0;
    let containsRequestedName = false;
    let allRequestedTokensExist = false;

    for (const candidateName of candidateNames) {
      const normalizedCandidate =
        normalizeText(candidateName);

      const candidateTokens = tokenize(
        candidateName,
      );

      const similarity =
        calculateTokenSimilarity(
          item.productName,
          candidateName,
        );

      highestSimilarity = Math.max(
        highestSimilarity,
        similarity,
      );

      if (
        normalizedCandidate.includes(
          normalizedRequestedName,
        )
      ) {
        containsRequestedName = true;
      }

      if (
        requestedTokens.length > 0 &&
        requestedTokens.every((token) =>
          candidateTokens.includes(token),
        )
      ) {
        allRequestedTokensExist = true;
      }
    }

    let calculatedScore =
      highestSimilarity * 100;

    if (containsRequestedName) {
      calculatedScore += 35;
    }

    if (allRequestedTokensExist) {
      calculatedScore += 30;
    }

    calculatedScore += Math.min(
      (group.opportunityScore ?? 0) / 1000,
      5,
    );

    calculatedScore = Math.min(
      95,
      Math.round(calculatedScore),
    );

    if (
      calculatedScore < 35 ||
      (bestMatch &&
        calculatedScore <= bestMatch.score)
    ) {
      continue;
    }

    bestMatch = {
      group,
      score: calculatedScore,
      method: "smart-name",
    };
  }

  return bestMatch;
}

function getValidOffers(
  group: CatalogProductGroup,
): CatalogOffer[] {
  const cheapestOfferByStore =
    new Map<string, CatalogOffer>();

  for (const offer of group.offers) {
    const price = Number(offer.price);
    const storeName =
      offer.storeName?.trim();

    if (
      !storeName ||
      !Number.isFinite(price) ||
      price <= 0
    ) {
      continue;
    }

    const storeKey =
      normalizeText(storeName);

    const existing =
      cheapestOfferByStore.get(storeKey);

    if (
      !existing ||
      price < Number(existing.price)
    ) {
      cheapestOfferByStore.set(
        storeKey,
        {
          ...offer,
          price,
        },
      );
    }
  }

  return Array.from(
    cheapestOfferByStore.values(),
  ).sort(
    (firstOffer, secondOffer) =>
      firstOffer.price -
      secondOffer.price,
  );
}

function createOptimizedItem(
  inputItem: OptimizationInputItem,
  match: MatchResult,
): OptimizedBasketItem | null {
  const offers = getValidOffers(
    match.group,
  );

  const cheapestOffer = offers[0];

  if (!cheapestOffer) {
    return null;
  }

  const highestPrice =
    offers[offers.length - 1]?.price ??
    cheapestOffer.price;

  const quantity = Number(
    inputItem.quantity,
  );

  if (
    !Number.isFinite(quantity) ||
    quantity <= 0
  ) {
    return null;
  }

  const totalPrice =
    cheapestOffer.price * quantity;

  return {
    shoppingItemId: inputItem.id,
    requestedProductName:
      inputItem.productName,
    matchedProductName:
      match.group.productName,
    quantity,
    unit: inputItem.unit,

    storeId: normalizeText(
      cheapestOffer.storeName,
    ),
    storeName:
      cheapestOffer.storeName,

    unitPrice:
      roundMoney(cheapestOffer.price),
    totalPrice:
      roundMoney(totalPrice),

    currency:
      cheapestOffer.currency || "TRY",

    barcode:
      cheapestOffer.barcode ??
      match.group.barcode ??
      inputItem.barcode ??
      null,

    brand:
      cheapestOffer.brand ??
      match.group.brand ??
      null,

    sourceUrl:
      cheapestOffer.sourceUrl,

    matchScore: match.score,
    matchMethod: match.method,

    availableStoreCount:
      offers.length,

    priceDifferenceFromHighest:
      roundMoney(
        Math.max(
          highestPrice -
            cheapestOffer.price,
          0,
        ) * quantity,
      ),
  };
}
function createOptimizedItemForStore(
  inputItem: OptimizationInputItem,
  match: MatchResult,
  requestedStoreName: string,
): OptimizedBasketItem | null {
  const offers = getValidOffers(match.group);

  const selectedOffer = offers.find(
    (offer) =>
      normalizeText(offer.storeName) ===
      normalizeText(requestedStoreName),
  );

  if (!selectedOffer) {
    return null;
  }

  const highestPrice =
    offers[offers.length - 1]?.price ??
    selectedOffer.price;

  const quantity = Number(inputItem.quantity);

  if (
    !Number.isFinite(quantity) ||
    quantity <= 0
  ) {
    return null;
  }

  const totalPrice =
    selectedOffer.price * quantity;

  return {
    shoppingItemId: inputItem.id,
    requestedProductName:
      inputItem.productName,
    matchedProductName:
      match.group.productName,
    quantity,
    unit: inputItem.unit,

    storeId: normalizeText(
      selectedOffer.storeName,
    ),
    storeName:
      selectedOffer.storeName,

    unitPrice:
      roundMoney(selectedOffer.price),
    totalPrice:
      roundMoney(totalPrice),

    currency:
      selectedOffer.currency || "TRY",

    barcode:
      selectedOffer.barcode ??
      match.group.barcode ??
      inputItem.barcode ??
      null,

    brand:
      selectedOffer.brand ??
      match.group.brand ??
      null,

    sourceUrl:
      selectedOffer.sourceUrl,

    matchScore: match.score,
    matchMethod: match.method,

    availableStoreCount:
      offers.length,

    priceDifferenceFromHighest:
      roundMoney(
        Math.max(
          highestPrice -
            selectedOffer.price,
          0,
        ) * quantity,
      ),
  };
}
function groupItemsByStore(
  items: OptimizedBasketItem[],
): StoreBasketGroup[] {
  const groups =
    new Map<string, StoreBasketGroup>();

  for (const item of items) {
    const existing =
      groups.get(item.storeId);

    if (existing) {
      existing.items.push(item);
      existing.total = roundMoney(
        existing.total +
          item.totalPrice,
      );
      existing.itemCount += 1;
      continue;
    }

    groups.set(item.storeId, {
      storeId: item.storeId,
      storeName: item.storeName,
      items: [item],
      total: item.totalPrice,
      itemCount: 1,
    });
  }

  return Array.from(groups.values()).sort(
    (firstGroup, secondGroup) =>
      secondGroup.itemCount -
        firstGroup.itemCount ||
      firstGroup.total -
        secondGroup.total,
  );
}

function calculateSingleStoreOptions(
  inputItems: OptimizationInputItem[],
  matches: Map<number, MatchResult>,
): SingleStoreOption[] {
  const storeNames = new Map<
    string,
    string
  >();

  for (const match of matches.values()) {
    for (const offer of getValidOffers(
      match.group,
    )) {
      storeNames.set(
        normalizeText(offer.storeName),
        offer.storeName,
      );
    }
  }

  const options: SingleStoreOption[] = [];

  for (const [
    storeId,
    storeName,
  ] of storeNames) {
    let total = 0;
    let matchedItemCount = 0;
    const missingItems: string[] = [];

    for (const item of inputItems) {
      const match = matches.get(item.id);

      if (!match) {
        missingItems.push(
          item.productName,
        );
        continue;
      }

      const storeOffer =
        getValidOffers(
          match.group,
        ).find(
          (offer) =>
            normalizeText(
              offer.storeName,
            ) === storeId,
        );

      if (!storeOffer) {
        missingItems.push(
          item.productName,
        );
        continue;
      }

      matchedItemCount += 1;

      total +=
        storeOffer.price *
        item.quantity;
    }

    options.push({
      storeId,
      storeName,
      total: roundMoney(total),
      matchedItemCount,
      missingItemCount:
        missingItems.length,
      missingItems,
      isCompleteBasket:
        missingItems.length === 0,
    });
  }

  return options.sort(
    (firstOption, secondOption) => {
      if (
        firstOption.isCompleteBasket !==
        secondOption.isCompleteBasket
      ) {
        return firstOption.isCompleteBasket
          ? -1
          : 1;
      }

      if (
        firstOption.missingItemCount !==
        secondOption.missingItemCount
      ) {
        return (
          firstOption.missingItemCount -
          secondOption.missingItemCount
        );
      }

      return (
        firstOption.total -
        secondOption.total
      );
    },
  );
}

function createBalancedPlan(
  optimizedItems: OptimizedBasketItem[],
  singleStoreOptions: SingleStoreOption[],
  optimizedTotal: number,
): BalancedBasketPlan | null {
  if (optimizedItems.length === 0) {
    return null;
  }

  const completeSingleStore =
    singleStoreOptions.find(
      (option) =>
        option.isCompleteBasket,
    );

  if (
    completeSingleStore &&
    completeSingleStore.total <=
      optimizedTotal * 1.05
  ) {
    const itemsForStore =
      optimizedItems.map((item) => ({
        ...item,
        storeId:
          completeSingleStore.storeId,
        storeName:
          completeSingleStore.storeName,
      }));

    return {
      storeCount: 1,
      total:
        completeSingleStore.total,
      savingsComparedWithSingleStore: 0,
      storeGroups: [
        {
          storeId:
            completeSingleStore.storeId,
          storeName:
            completeSingleStore.storeName,
          items: itemsForStore,
          total:
            completeSingleStore.total,
          itemCount:
            itemsForStore.length,
        },
      ],
    };
  }

  const optimizedGroups =
    groupItemsByStore(optimizedItems);

  return {
    storeCount:
      optimizedGroups.length,
    total:
      roundMoney(optimizedTotal),
    savingsComparedWithSingleStore:
      roundMoney(
        Math.max(
          (completeSingleStore?.total ??
            optimizedTotal) -
            optimizedTotal,
          0,
        ),
      ),
    storeGroups: optimizedGroups,
  };
}

export const shoppingOptimizationService = {
  async optimizeBasket(
    inputItems: OptimizationInputItem[],
  ): Promise<ShoppingOptimizationResult> {
    const validInputItems =
      inputItems.filter(
        (item) =>
          Boolean(item.productName.trim()) &&
          Number.isFinite(
            Number(item.quantity),
          ) &&
          Number(item.quantity) > 0,
      );

    if (validInputItems.length === 0) {
      throw new Error(
        "Optimizasyon için en az bir geçerli ürün gereklidir.",
      );
    }

    const response = await fetch(
      "/api/catalog/all?maximumProductCount=500",
      {
        cache: "no-store",
      },
    );

    let catalogResponse: CatalogApiResponse;

    try {
      catalogResponse =
        (await response.json()) as CatalogApiResponse;
    } catch {
      throw new Error(
        "Market kataloğu geçersiz cevap döndürdü.",
      );
    }

    if (
      !response.ok ||
      !catalogResponse.success
    ) {
      throw new Error(
        "Canlı market fiyatları alınamadı.",
      );
    }

    const catalogGroups =
      catalogResponse.groupedProducts ?? [];

    if (catalogGroups.length === 0) {
      throw new Error(
        "Optimizasyon için kullanılabilecek ürün fiyatı bulunamadı.",
      );
    }

    const optimizedItems: OptimizedBasketItem[] =
      [];

    const unmatchedItems: UnmatchedBasketItem[] =
      [];

    const matches = new Map<
      number,
      MatchResult
    >();

    for (const inputItem of validInputItems) {
      const match = findBestGroupMatch(
        inputItem,
        catalogGroups,
      );

      if (!match) {
        unmatchedItems.push({
          shoppingItemId:
            inputItem.id,
          productName:
            inputItem.productName,
          reason:
            "Canlı market kataloğunda yeterince güvenilir eşleşme bulunamadı.",
        });
        continue;
      }

      const optimizedItem =
        createOptimizedItem(
          inputItem,
          match,
        );

      if (!optimizedItem) {
        unmatchedItems.push({
          shoppingItemId:
            inputItem.id,
          productName:
            inputItem.productName,
          reason:
            "Eşleşen ürün için geçerli market fiyatı bulunamadı.",
        });
        continue;
      }

      matches.set(inputItem.id, match);
      optimizedItems.push(
        optimizedItem,
      );
    }

    const total = roundMoney(
      optimizedItems.reduce(
        (sum, item) =>
          sum + item.totalPrice,
        0,
      ),
    );

    const storeGroups =
      groupItemsByStore(optimizedItems);

    const singleStoreOptions =
      calculateSingleStoreOptions(
        validInputItems,
        matches,
      );

    const cheapestCompleteSingleStore =
      singleStoreOptions.find(
        (option) =>
          option.isCompleteBasket,
      );

    const singleStoreTotal =
  cheapestCompleteSingleStore?.total ??
  0;

const savings =
  cheapestCompleteSingleStore
    ? roundMoney(
        Math.max(
          singleStoreTotal - total,
          0,
        ),
      )
    : 0;


const shouldPreferSingleStore =
  Boolean(cheapestCompleteSingleStore) &&
  savings <= 0;

const finalOptimizedItems =
  shouldPreferSingleStore &&
  cheapestCompleteSingleStore
    ? validInputItems
        .map((inputItem) => {
          const match = matches.get(
            inputItem.id,
          );

          if (!match) {
            return null;
          }

          return createOptimizedItemForStore(
            inputItem,
            match,
            cheapestCompleteSingleStore.storeName,
          );
        })
        .filter(
          (
            item,
          ): item is OptimizedBasketItem =>
            item !== null,
        )
    : optimizedItems;

const finalStoreGroups =
  groupItemsByStore(finalOptimizedItems);

const finalTotal = roundMoney(
  finalOptimizedItems.reduce(
    (sum, item) =>
      sum + item.totalPrice,
    0,
  ),
);
    const balancedPlan =
  createBalancedPlan(
    finalOptimizedItems,
    singleStoreOptions,
    finalTotal,
  );

    return {
items: finalOptimizedItems,
unmatchedItems,
storeGroups: finalStoreGroups,

total: finalTotal,
      currency:
        optimizedItems[0]?.currency ??
        "TRY",

      singleStoreTotal,
      singleStoreName:
        cheapestCompleteSingleStore
          ?.storeName,

      savings,

      recommendedStoreCount:
  finalStoreGroups.length,

recommendedTotal: finalTotal,
      recommendedSavings: savings,

      
        matchedItemCount:
  finalOptimizedItems.length,

      unmatchedItemCount:
        unmatchedItems.length,

      singleStoreOptions,
      balancedPlan,

      catalogSummary: {
        successfulMarkets:
          catalogResponse.summary
            ?.successfulMarkets ?? 0,

        failedMarkets:
          catalogResponse.summary
            ?.failedMarkets ?? 0,

        totalProducts:
          catalogResponse.summary
            ?.totalProducts ?? 0,

        totalProductGroups:
          catalogResponse.summary
            ?.totalProductGroups ?? 0,
      },
    };
  },
};