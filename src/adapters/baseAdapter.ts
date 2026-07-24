import type { DataProvider, ProviderConfig } from "../providers/interfaces";
import type { PricePoint, ProductSearchQuery, ProviderName, ProviderProduct, SearchResult, ProviderRequestOptions } from "../types/collection";

export abstract class BaseAdapter implements DataProvider {
  constructor(
    public readonly name: ProviderName,
    public readonly config: ProviderConfig,
  ) {}

  abstract searchProducts(query: ProductSearchQuery, options?: ProviderRequestOptions): Promise<SearchResult[]>;
  abstract getProduct(productId: string, options?: ProviderRequestOptions): Promise<ProviderProduct | null>;
  abstract getPrices(productId: string, options?: ProviderRequestOptions): Promise<PricePoint[]>;
}
