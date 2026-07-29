import type { StoreRepository } from "../repositories/StoreRepository";
import type { Opportunity } from "../types";

export class StoreService {
  constructor(private readonly repository: StoreRepository) {}

  async list(): Promise<string[]> {
    return this.repository.getStores();
  }

  async getProductsForStore(storeName: string): Promise<Opportunity[]> {
    return this.repository.getProductsForStore(storeName);
  }
}
