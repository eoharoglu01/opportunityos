import { BimAdapter } from "../adapters/bimAdapter";
import type { ProviderConfig } from "../providers/interfaces";
import type { PricePoint, ProductSearchQuery, ProviderProduct, SearchResult, ProviderRequestOptions } from "../types/collection";

export class BIMProvider extends BimAdapter {
  constructor(config: ProviderConfig) {
    super(config);
  }

  override async searchProducts(query: ProductSearchQuery, options?: ProviderRequestOptions): Promise<SearchResult[]> {
    return super.searchProducts(query, options);
  }

  override async getProduct(productId: string, options?: ProviderRequestOptions): Promise<ProviderProduct | null> {
    return super.getProduct(productId, options);
  }

  override async getPrices(productId: string, options?: ProviderRequestOptions): Promise<PricePoint[]> {
    return super.getPrices(productId, options);
  }
}
