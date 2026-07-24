import { BaseAdapter } from "../adapters/baseAdapter";
import type { ProviderConfig } from "../providers/interfaces";
import type { PricePoint, ProductSearchQuery, ProviderProduct, SearchResult, ProviderRequestOptions } from "../types/collection";

export class CarrefourProvider extends BaseAdapter {
  constructor(config: ProviderConfig) {
    super("carrefour", config);
  }

  async searchProducts(query: ProductSearchQuery, options?: ProviderRequestOptions): Promise<SearchResult[]> {
    void options;
    return [{ id: `carrefour:${query.keyword}`, provider: "carrefour", name: query.keyword, brand: "Carrefour", category: query.category }];
  }

  async getProduct(productId: string, options?: ProviderRequestOptions): Promise<ProviderProduct | null> {
    void options;
    return { id: productId, provider: "carrefour", name: `Carrefour product ${productId}` };
  }

  async getPrices(productId: string, options?: ProviderRequestOptions): Promise<PricePoint[]> {
    void options;
    return [{ amount: 0, currency: "TRY", source: "carrefour", collectedAt: new Date().toISOString(), productId }];
  }
}
