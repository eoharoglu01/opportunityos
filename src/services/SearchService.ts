import type { ProductRepository } from "../repositories/ProductRepository";
import type { Opportunity } from "../types";

export class SearchService {
  constructor(private readonly repository: ProductRepository) {}

  async search(query?: string): Promise<Opportunity[]> {
    return this.repository.getProducts(query);
  }
}
