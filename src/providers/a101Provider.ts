import { BaseAdapter } from "../adapters/baseAdapter";
import type { ProviderConfig } from "../providers/interfaces";
import type { PricePoint, ProductSearchQuery, ProviderProduct, SearchResult, ProviderRequestOptions } from "../types/collection";

export class A101Provider extends BaseAdapter {
  constructor(config: ProviderConfig) {
    super("a101", config);
  }

  async searchProducts(query: ProductSearchQuery, options?: ProviderRequestOptions): Promise<SearchResult[]> {
    void options;
    return [{ id: `a101:${query.keyword}`, provider: "a101", name: query.keyword, brand: "A101", category: query.category }];
  }

  async getProduct(productId: string, options?: ProviderRequestOptions): Promise<ProviderProduct | null> {
    void options;
    return { id: productId, provider: "a101", name: `A101 product ${productId}` };
  }

  async getPrices(productId: string, options?: ProviderRequestOptions): Promise<PricePoint[]> {
    void options;
    return [{ amount: 0, currency: "TRY", source: "a101", collectedAt: new Date().toISOString(), productId }];
  }
}
