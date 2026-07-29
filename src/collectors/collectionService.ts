import { ConsoleLogger, type Logger } from "../logger";
import type { DataProvider } from "../providers/interfaces";
import { ProviderCollector } from "./collector";
import type { PricePoint, ProductSearchQuery, ProviderProduct, SearchResult } from "../types/collection";

export class CollectionService {
  constructor(
    private readonly providers: DataProvider[],
    private readonly logger: Logger = new ConsoleLogger(),
  ) {}

  async searchAcrossProviders(query: ProductSearchQuery): Promise<Map<string, SearchResult[]>> {
    const results = new Map<string, SearchResult[]>();

    for (const provider of this.providers) {
      const collector = new ProviderCollector(provider, this.logger);
      results.set(provider.name, await collector.searchProducts(query));
    }

    return results;
  }

  async getProductFromProvider(providerName: string, productId: string): Promise<ProviderProduct | null> {
    const provider = this.providers.find((item) => item.name === providerName);
    if (!provider) {
      return null;
    }

    const collector = new ProviderCollector(provider, this.logger);
    return collector.getProduct(productId);
  }

  async getPricesFromProvider(providerName: string, productId: string): Promise<PricePoint[]> {
    const provider = this.providers.find((item) => item.name === providerName);
    if (!provider) {
      return [];
    }

    const collector = new ProviderCollector(provider, this.logger);
    return collector.getPrices(productId);
  }
}
