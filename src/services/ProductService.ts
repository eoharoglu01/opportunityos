import type { ProductRepository } from "../repositories/ProductRepository";
import type { Opportunity } from "../types";

export class ProductService {
  constructor(private readonly repository: ProductRepository) {}

  async list(query?: string): Promise<Opportunity[]> {
    return this.repository.getProducts(query);
  }

  async getById(id: string): Promise<Opportunity | null> {
    return this.repository.getProductById(id);
  }
}
