import type { ProductSearchQuery, ProviderName } from "../types/collection";

export interface SyncEngineOptions {
  batchSize?: number;
  concurrency?: number;
}

export interface PriceChangeRecord {
  id: string;
  productId: string;
  provider: ProviderName;
  previousPrice?: number;
  currentPrice: number;
  priceDelta: number;
  direction: "up" | "down" | "same";
  currency: string;
  collectedAt: string;
}

export interface PriceDropNotification {
  productId: string;
  provider: ProviderName;
  previousPrice?: number;
  currentPrice: number;
  currency: string;
  collectedAt: string;
}

export interface PriceDropNotifier {
  notifyDrop(notification: PriceDropNotification): Promise<void>;
}

export interface SyncResult {
  synchronized: number;
  changesDetected: number;
  priceDrops: number;
}

export interface ProductSyncRequest {
  query: ProductSearchQuery;
  providerName?: ProviderName;
}
