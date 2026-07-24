import { productCatalog } from "../data/productCatalog";
import type { PricePoint, ProviderName } from "../types/collection";
import type { PriceChangeRecord } from "./types";

export interface CatalogSyncEntry {
  productId: string;
  provider: ProviderName;
  price: number;
  currency: string;
  collectedAt: string;
}

export function buildCatalogSyncEntries(): CatalogSyncEntry[] {
  return productCatalog.flatMap((product) =>
    product.prices.map((price) => ({
      productId: product.id,
      provider: price.provider,
      price: price.amount,
      currency: price.currency,
      collectedAt: price.collectedAt,
    })),
  );
}

export function toPricePoints(entry: CatalogSyncEntry): PricePoint[] {
  return [
    {
      amount: entry.price,
      currency: entry.currency,
      source: entry.provider,
      collectedAt: entry.collectedAt,
      productId: entry.productId,
    },
  ];
}

export function toPriceChangeRecord(entry: CatalogSyncEntry, previousPrice?: number): PriceChangeRecord | null {
  if (previousPrice === undefined) {
    return null;
  }

  const delta = entry.price - previousPrice;
  const direction = delta < 0 ? "down" : delta > 0 ? "up" : "same";

  return {
    id: `${entry.productId}-${entry.provider}-${Date.now()}`,
    productId: entry.productId,
    provider: entry.provider,
    previousPrice,
    currentPrice: entry.price,
    priceDelta: delta,
    direction,
    currency: entry.currency,
    collectedAt: entry.collectedAt,
  };
}
