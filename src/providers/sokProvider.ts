import { BaseAdapter } from "../adapters/baseAdapter";
import type { ProviderConfig } from "../providers/interfaces";
import type { PricePoint, ProductSearchQuery, ProviderProduct, SearchResult, ProviderRequestOptions } from "../types/collection";

export class SOKProvider extends BaseAdapter {
  constructor(config: ProviderConfig) {
    super("sok", config);
  }

  async searchProducts(query: ProductSearchQuery, options?: ProviderRequestOptions): Promise<SearchResult[]> {
    void options;
    return [{ id: `sok:${query.keyword}`, provider: "sok", name: query.keyword, brand: "ŞOK", category: query.category }];
  }

  async getProduct(productId: string, options?: ProviderRequestOptions): Promise<ProviderProduct | null> {
    void options;
    return { id: productId, provider: "sok", name: `ŞOK product ${productId}` };
  }

  async getPrices(productId: string, options?: ProviderRequestOptions): Promise<PricePoint[]> {
    void options;
    return [{ amount: 0, currency: "TRY", source: "sok", collectedAt: new Date().toISOString(), productId }];
  }
}
