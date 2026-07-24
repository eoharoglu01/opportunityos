import { BaseAdapter } from "../adapters/baseAdapter";
import type { ProviderConfig } from "../providers/interfaces";
import type { PricePoint, ProductSearchQuery, ProviderProduct, SearchResult, ProviderRequestOptions } from "../types/collection";

export class TrendyolProvider extends BaseAdapter {
  constructor(config: ProviderConfig) {
    super("trendyol", config);
  }

  async searchProducts(query: ProductSearchQuery, options?: ProviderRequestOptions): Promise<SearchResult[]> {
    void options;
    return [{ id: `trendyol:${query.keyword}`, provider: "trendyol", name: query.keyword, brand: "Trendyol", category: query.category }];
  }

  async getProduct(productId: string, options?: ProviderRequestOptions): Promise<ProviderProduct | null> {
    void options;
    return { id: productId, provider: "trendyol", name: `Trendyol product ${productId}` };
  }

  async getPrices(productId: string, options?: ProviderRequestOptions): Promise<PricePoint[]> {
    void options;
    return [{ amount: 0, currency: "TRY", source: "trendyol", collectedAt: new Date().toISOString(), productId }];
  }
}
