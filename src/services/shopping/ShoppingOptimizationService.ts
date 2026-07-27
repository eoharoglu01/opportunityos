import { supabase } from "../../lib/supabase";

export type OptimizationInputItem = {
  id: number;
  productName: string;
  quantity: number;
  unit: string;
};

export type OptimizationProduct = {
  id: string;
  name: string;
  brand: string | null;
  barcode: string | null;
};

export type OptimizationStore = {
  id: string;
  name: string;
  slug: string | null;
};

export type OptimizationPrice = {
  id: string;
  product_id: string;
  store_id: string;
  price: number;
  currency: string;
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
};

export type ShoppingOptimizationResult = {
  items: OptimizedBasketItem[];
  unmatchedItems: UnmatchedBasketItem[];
  storeGroups: StoreBasketGroup[];
  total: number;
  currency: string;
  singleStoreTotal: number;
  savings: number;

  recommendedStoreCount: number;
  recommendedTotal: number;
  recommendedSavings: number;
};

function normalizeText(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findBestProductMatch(
  requestedName: string,
  products: OptimizationProduct[],
): OptimizationProduct | null {
  const normalizedRequestedName = normalizeText(requestedName);

  if (!normalizedRequestedName) {
    return null;
  }

  const exactMatch = products.find(
    (product) =>
      normalizeText(product.name) === normalizedRequestedName,
  );

  if (exactMatch) {
    return exactMatch;
  }

  const partialMatch = products.find((product) => {
    const normalizedProductName = normalizeText(product.name);

    return (
      normalizedProductName.includes(normalizedRequestedName) ||
      normalizedRequestedName.includes(normalizedProductName)
    );
  });

  return partialMatch ?? null;
}

function groupItemsByStore(
  items: OptimizedBasketItem[],
): StoreBasketGroup[] {
  const groups = new Map<string, StoreBasketGroup>();

  for (const item of items) {
    const existingGroup = groups.get(item.storeId);

    if (existingGroup) {
      existingGroup.items.push(item);
      existingGroup.total += item.totalPrice;
      continue;
    }

    groups.set(item.storeId, {
      storeId: item.storeId,
      storeName: item.storeName,
      items: [item],
      total: item.totalPrice,
    });
  }

  return Array.from(groups.values()).sort(
    (firstGroup, secondGroup) =>
      firstGroup.total - secondGroup.total,
  );
}

export const shoppingOptimizationService = {
  async optimizeBasket(
    inputItems: OptimizationInputItem[],
  ): Promise<ShoppingOptimizationResult> {
    if (inputItems.length === 0) {
      throw new Error(
        "Optimizasyon için en az bir ürün gereklidir.",
      );
    }

    const client = supabase;

    if (!client) {
      throw new Error(
        "Supabase bağlantısı kurulamadı. Ortam değişkenlerini kontrol edin.",
      );
    }

    const [
      productsResponse,
      storesResponse,
      pricesResponse,
    ] = await Promise.all([
      client
        .from("products")
        .select("id, name, brand, barcode"),

      client
        .from("stores")
        .select("id, name, slug"),

      client
        .from("prices")
        .select(
          "id, product_id, store_id, price, currency",
        ),
    ]);

    if (productsResponse.error) {
      throw new Error(
        `Ürünler alınamadı: ${productsResponse.error.message}`,
      );
    }

    if (storesResponse.error) {
      throw new Error(
        `Marketler alınamadı: ${storesResponse.error.message}`,
      );
    }

    if (pricesResponse.error) {
      throw new Error(
        `Fiyatlar alınamadı: ${pricesResponse.error.message}`,
      );
    }

    const products =
      (productsResponse.data ?? []) as OptimizationProduct[];

    const stores =
      (storesResponse.data ?? []) as OptimizationStore[];

    const prices =
      (pricesResponse.data ?? []) as OptimizationPrice[];

    const optimizedItems: OptimizedBasketItem[] = [];
    const unmatchedItems: UnmatchedBasketItem[] = [];

    for (const inputItem of inputItems) {
      const matchedProduct = findBestProductMatch(
        inputItem.productName,
        products,
      );

      if (!matchedProduct) {
        unmatchedItems.push({
          shoppingItemId: inputItem.id,
          productName: inputItem.productName,
          reason: "Ürün kataloğunda eşleşme bulunamadı.",
        });

        continue;
      }

      const productPrices = prices.filter(
        (price) =>
          price.product_id === matchedProduct.id &&
          Number.isFinite(Number(price.price)) &&
          Number(price.price) > 0,
      );

      if (productPrices.length === 0) {
        unmatchedItems.push({
          shoppingItemId: inputItem.id,
          productName: inputItem.productName,
          reason: "Bu ürün için geçerli fiyat verisi bulunamadı.",
        });

        continue;
      }

      const cheapestPrice = productPrices.reduce(
        (cheapest, current) =>
          Number(current.price) < Number(cheapest.price)
            ? current
            : cheapest,
      );

      const matchedStore = stores.find(
        (store) => store.id === cheapestPrice.store_id,
      );

      if (!matchedStore) {
        unmatchedItems.push({
          shoppingItemId: inputItem.id,
          productName: inputItem.productName,
          reason: "Fiyatın bağlı olduğu market bulunamadı.",
        });

        continue;
      }

      const unitPrice = Number(cheapestPrice.price);
      const totalPrice = unitPrice * inputItem.quantity;

      optimizedItems.push({
        shoppingItemId: inputItem.id,
        requestedProductName: inputItem.productName,
        matchedProductName: matchedProduct.name,
        quantity: inputItem.quantity,
        unit: inputItem.unit,
        storeId: matchedStore.id,
        storeName: matchedStore.name,
        unitPrice,
        totalPrice,
        currency: cheapestPrice.currency || "TRY",
      });
    }

 const total = optimizedItems.reduce(
      (sum, item) => sum + item.totalPrice,
      0,
    );

  const matchedProductIds = optimizedItems.map((item) => {
  const matchedProduct = products.find(
    (product) => product.name === item.matchedProductName,
  );

  return {
    item,
    productId: matchedProduct?.id ?? null,
  };
});

const singleStoreOptions = stores
  .map((store) => {
    let storeTotal = 0;

    for (const matchedItem of matchedProductIds) {
      if (!matchedItem.productId) {
        return null;
      }

      const storePrice = prices.find(
        (price) =>
          price.product_id === matchedItem.productId &&
          price.store_id === store.id &&
          Number(price.price) > 0,
      );

      if (!storePrice) {
        return null;
      }

      storeTotal +=
        Number(storePrice.price) *
        matchedItem.item.quantity;
    }

    return {
      storeId: store.id,
      storeName: store.name,
      total: storeTotal,
    };
  })
  .filter(
    (
      option,
    ): option is {
      storeId: string;
      storeName: string;
      total: number;
    } => option !== null,
  );

const cheapestSingleStore = singleStoreOptions.reduce<
  | {
      storeId: string;
      storeName: string;
      total: number;
    }
  | null
>((cheapest, current) => {
  if (!cheapest || current.total < cheapest.total) {
    return current;
  }

  return cheapest;
}, null);

const storeGroups = groupItemsByStore(optimizedItems);

const singleStoreTotal =
  cheapestSingleStore?.total ?? total;

const savings = Math.max(
  0,
  singleStoreTotal - total,
);

return {
  items: optimizedItems,
  unmatchedItems,
  storeGroups,
  total,
  currency: optimizedItems[0]?.currency ?? "TRY",
  singleStoreTotal,
  savings,

  recommendedStoreCount: storeGroups.length,
  recommendedTotal: total,
  recommendedSavings: savings,
};
  },
};
