import type { Opportunity } from "./opportunity";

export interface ProductRepository {
  getProducts(query?: string): Promise<Opportunity[]>;
}
