import type { Opportunity } from "../../types";
import type { OpportunityRepository } from "../../repositories/OpportunityRepository";

export class ProductService {
  constructor(private readonly repository: OpportunityRepository) {}

  async getProducts(query?: string): Promise<Opportunity[]> {
    return this.repository.getProducts(query);
  }
}
