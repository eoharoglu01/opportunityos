import type { PricePoint, ProductSearchQuery, ProviderName, ProviderProduct, SearchResult, ProviderRequestOptions } from "../types/collection";

export interface ProviderConfig {
  name: ProviderName;
  enabled: boolean;
  baseUrl?: string;
  rateLimitPerMinute: number;
  timeoutMs: number;
}

export interface DataProvider {
  readonly name: ProviderName;
  readonly config: ProviderConfig;
  searchProducts(query: ProductSearchQuery, options?: ProviderRequestOptions): Promise<SearchResult[]>;
  getProduct(productId: string, options?: ProviderRequestOptions): Promise<ProviderProduct | null>;
  getPrices(productId: string, options?: ProviderRequestOptions): Promise<PricePoint[]>;
}
