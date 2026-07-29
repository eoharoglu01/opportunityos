import { BaseAdapter } from "./baseAdapter";
import { BimParser, type BimProductPayload } from "../parsers/bimParser";
import type { ProviderConfig } from "../providers/interfaces";
import type { PricePoint, ProductSearchQuery, ProviderProduct, SearchResult, ProviderRequestOptions } from "../types/collection";

export interface BimAdapterOptions {
  baseUrl?: string;
}

export class BimAdapter extends BaseAdapter {
  private readonly parser = new BimParser();

  constructor(config: ProviderConfig, private readonly options: BimAdapterOptions = {}) {
    super("bim", config);
  }

  async searchProducts(query: ProductSearchQuery, options?: ProviderRequestOptions): Promise<SearchResult[]> {
    void options;
    const payloads: BimProductPayload[] = [
      {
        id: `bim:${query.keyword.toLowerCase().replace(/\s+/g, "-")}`,
        name: query.keyword,
        brand: "BİM",
        category: query.category ?? "general",
        description: `Search result for ${query.keyword}`,
        price: 0,
        currency: "TRY",
        unit: "piece",
        available: true,
      },
    ];

    return payloads.map((item) => this.parser.parse(item));
  }

  async getProduct(productId: string, options?: ProviderRequestOptions): Promise<ProviderProduct | null> {
    void options;
    const payload: BimProductPayload = {
      id: productId,
      name: `BİM product ${productId}`,
      brand: "BİM",
      category: "general",
      description: "Normalized BİM product payload",
      price: 0,
      currency: "TRY",
      unit: "piece",
      available: true,
    };

    return this.parser.parse(payload);
  }

  async getPrices(productId: string, options?: ProviderRequestOptions): Promise<PricePoint[]> {
    void options;
    return [
      {
        amount: 0,
        currency: "TRY",
        source: "bim",
        collectedAt: new Date().toISOString(),
        productId,
      },
    ];
  }
}
