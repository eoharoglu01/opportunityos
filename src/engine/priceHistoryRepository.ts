import type { PriceChangeRecord } from "./types";

export interface PriceHistoryRepository {
  save(record: PriceChangeRecord): Promise<void>;
  list(productId: string): Promise<PriceChangeRecord[]>;
}

export class InMemoryPriceHistoryRepository implements PriceHistoryRepository {
  private readonly records = new Map<string, PriceChangeRecord[]>();

  async save(record: PriceChangeRecord): Promise<void> {
    const existing = this.records.get(record.productId) ?? [];
    existing.push(record);
    this.records.set(record.productId, existing);
  }

  async list(productId: string): Promise<PriceChangeRecord[]> {
    return this.records.get(productId) ?? [];
  }
}
