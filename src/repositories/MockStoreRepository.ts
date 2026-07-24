import { opportunities } from "../data/opportunities";
import type { Opportunity } from "../types";
import type { StoreRepository } from "./StoreRepository";

export class MockStoreRepository implements StoreRepository {
  async getStores(): Promise<string[]> {
    return Array.from(new Set(opportunities.map((opportunity) => opportunity.store)));
  }

  async getProductsForStore(storeName: string): Promise<Opportunity[]> {
    return opportunities.filter((opportunity) => opportunity.store === storeName);
  }
}
