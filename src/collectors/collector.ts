import type { Logger } from "../logger";
import type { DataProvider } from "../providers/interfaces";
import type { PricePoint, ProductSearchQuery, ProviderProduct, SearchResult } from "../types/collection";

export interface Collector {
  searchProducts(query: ProductSearchQuery): Promise<SearchResult[]>;
  getProduct(productId: string): Promise<ProviderProduct | null>;
  getPrices(productId: string): Promise<PricePoint[]>;
}

export class ProviderCollector implements Collector {
  constructor(
    private readonly provider: DataProvider,
    private readonly logger: Logger,
  ) {}

  async searchProducts(query: ProductSearchQuery): Promise<SearchResult[]> {
    this.logger.info("Collecting search results", { provider: this.provider.name, query });
    return this.provider.searchProducts(query);
  }

  async getProduct(productId: string): Promise<ProviderProduct | null> {
    this.logger.info("Collecting product", { provider: this.provider.name, productId });
    return this.provider.getProduct(productId);
  }

  async getPrices(productId: string): Promise<PricePoint[]> {
    this.logger.info("Collecting prices", { provider: this.provider.name, productId });
    return this.provider.getPrices(productId);
  }
}
