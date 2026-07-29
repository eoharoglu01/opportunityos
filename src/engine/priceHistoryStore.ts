import type { PriceChangeRecord } from "./types";

export interface PriceHistoryStore {
  append(record: PriceChangeRecord): Promise<void>;
  list(productId: string): Promise<PriceChangeRecord[]>;
}

export class InMemoryPriceHistoryStore implements PriceHistoryStore {
  private readonly records = new Map<string, PriceChangeRecord[]>();

  async append(record: PriceChangeRecord): Promise<void> {
    const existing = this.records.get(record.productId) ?? [];
    existing.push(record);
    this.records.set(record.productId, existing);
  }

  async list(productId: string): Promise<PriceChangeRecord[]> {
    return this.records.get(productId) ?? [];
  }
}
