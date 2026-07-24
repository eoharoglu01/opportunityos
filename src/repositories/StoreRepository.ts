import type { Opportunity } from "../types";

export interface StoreRepository {
  getStores(): Promise<string[]>;
  getProductsForStore(storeName: string): Promise<Opportunity[]>;
}
