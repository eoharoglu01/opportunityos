import { BaseAdapter } from "./baseAdapter";
import type { ProviderConfig } from "../providers/interfaces";
import type { PricePoint, ProductSearchQuery, ProviderName, ProviderProduct, SearchResult, ProviderRequestOptions } from "../types/collection";

export class MockAdapter extends BaseAdapter {
  constructor(name: ProviderName, config: ProviderConfig) {
    super(name, config);
  }

  async searchProducts(query: ProductSearchQuery, options?: ProviderRequestOptions): Promise<SearchResult[]> {
    void options;
    return [
      {
        id: `${this.name}-${query.keyword}`,
        provider: this.name,
        name: query.keyword,
        brand: "Mock",
        category: query.category,
      },
    ];
  }

  async getProduct(productId: string, options?: ProviderRequestOptions): Promise<ProviderProduct | null> {
    void options;
    return {
      id: productId,
      provider: this.name,
      name: productId,
    };
  }

  async getPrices(productId: string, options?: ProviderRequestOptions): Promise<PricePoint[]> {
    void options;
    return [
      {
        amount: 0,
        currency: "TRY",
        source: this.name,
        collectedAt: new Date().toISOString(),
        productId,
      },
    ];
  }
}
