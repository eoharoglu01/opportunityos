import type { PricePoint, ProviderProduct, SearchResult } from "../types/collection";

export interface Parser<TParsed, TRaw = unknown> {
  parse(raw: TRaw): TParsed;
}

export abstract class BaseParser<TParsed, TRaw = unknown> implements Parser<TParsed, TRaw> {
  abstract parse(raw: TRaw): TParsed;
}

export class SearchResultParser extends BaseParser<SearchResult, Record<string, unknown>> {
  parse(raw: Record<string, unknown>): SearchResult {
    return {
      id: String(raw.id ?? ""),
      provider: "migros",
      name: String(raw.name ?? ""),
      brand: typeof raw.brand === "string" ? raw.brand : undefined,
      category: typeof raw.category === "string" ? raw.category : undefined,
      raw,
    };
  }
}

export class PriceParser extends BaseParser<PricePoint, Record<string, unknown>> {
  parse(raw: Record<string, unknown>): PricePoint {
    return {
      amount: Number(raw.amount ?? 0),
      currency: String(raw.currency ?? "TRY"),
      source: "migros",
      collectedAt: String(raw.collectedAt ?? new Date().toISOString()),
      productId: typeof raw.productId === "string" ? raw.productId : undefined,
    };
  }
}

export class ProductParser extends BaseParser<ProviderProduct, Record<string, unknown>> {
  parse(raw: Record<string, unknown>): ProviderProduct {
    return {
      id: String(raw.id ?? ""),
      provider: "migros",
      name: String(raw.name ?? ""),
      brand: typeof raw.brand === "string" ? raw.brand : undefined,
      category: typeof raw.category === "string" ? raw.category : undefined,
      sku: typeof raw.sku === "string" ? raw.sku : undefined,
      raw,
    };
  }
}
