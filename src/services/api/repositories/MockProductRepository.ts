import type { Opportunity } from "../../../types";
import { opportunities } from "../../../data/opportunities";
import type { OpportunityRepository } from "../../../repositories/OpportunityRepository";

export class MockProductRepository implements OpportunityRepository {
  async getProducts(query?: string): Promise<Opportunity[]> {
    const normalizedQuery = query?.trim().toLowerCase();

    if (!normalizedQuery) {
      return opportunities;
    }

    return opportunities.filter((opportunity) =>
      opportunity.productName.toLowerCase().includes(normalizedQuery),
    );
  }
}
