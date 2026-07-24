import { createOpportunityRepository } from "../../repositories/factory";
import type { OpportunityRepository } from "../../repositories/OpportunityRepository";
import type { Opportunity } from "../../types";

export class OpportunityService {
  constructor(private readonly repository: OpportunityRepository) {}

  static create(): OpportunityService {
    return new OpportunityService(createOpportunityRepository());
  }

  async getProducts(query?: string): Promise<Opportunity[]> {
    return this.repository.getProducts(query);
  }
}
