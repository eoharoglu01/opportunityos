export type ProviderName = "migros" | "a101" | "bim" | "sok" | "carrefour" | "amazon" | "trendyol" | "tekel";

export interface ProductSearchQuery {
  keyword: string;
  region?: string;
  category?: string;
  limit?: number;
}

export interface ProviderProduct {
  id: string;
  provider: ProviderName;
  name: string;
  brand?: string;
  category?: string;
  sku?: string;
  description?: string;
  price?: number;
  currency?: string;
  unit?: string;
  available?: boolean;
  raw?: unknown;
}

export type SearchResult = ProviderProduct;

export interface PricePoint {
  amount: number;
  currency: string;
  source: ProviderName;
  collectedAt: string;
  productId?: string;
}

export interface ProductRecord extends ProviderProduct {
  prices: PricePoint[];
  collectedAt: string;
}

export interface ProviderRequestOptions {
  timeoutMs?: number;
  retries?: number;
}

export interface CollectorTask {
  id: string;
  query: ProductSearchQuery;
  providerName: ProviderName;
}

export interface QueueJob<TPayload = unknown> {
  id: string;
  type: "search" | "product" | "price";
  payload: TPayload;
  attempts: number;
  scheduledAt: string;
}

export interface CacheEntry<TValue> {
  value: TValue;
  expiresAt: number;
  createdAt: number;
}
