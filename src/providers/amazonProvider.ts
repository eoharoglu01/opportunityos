import { BaseAdapter } from "../adapters/baseAdapter";
import type { ProviderConfig } from "../providers/interfaces";
import type { PricePoint, ProductSearchQuery, ProviderProduct, SearchResult, ProviderRequestOptions } from "../types/collection";

export class AmazonProvider extends BaseAdapter {
  constructor(config: ProviderConfig) {
    super("amazon", config);
  }

  async searchProducts(query: ProductSearchQuery, options?: ProviderRequestOptions): Promise<SearchResult[]> {
    void options;
    return [{ id: `amazon:${query.keyword}`, provider: "amazon", name: query.keyword, brand: "Amazon", category: query.category }];
  }

  async getProduct(productId: string, options?: ProviderRequestOptions): Promise<ProviderProduct | null> {
    void options;
    return { id: productId, provider: "amazon", name: `Amazon product ${productId}` };
  }

  async getPrices(productId: string, options?: ProviderRequestOptions): Promise<PricePoint[]> {
    void options;
    return [{ amount: 0, currency: "TRY", source: "amazon", collectedAt: new Date().toISOString(), productId }];
  }
}
