import type { Opportunity } from "../types";

export interface ProductRepository {
  getProducts(query?: string): Promise<Opportunity[]>;
  getProductById(id: string): Promise<Opportunity | null>;
}