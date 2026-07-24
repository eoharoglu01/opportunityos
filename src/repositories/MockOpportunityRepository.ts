import { opportunities } from "../data/opportunities";
import type { Opportunity } from "../types";
import type { OpportunityRepository } from "./OpportunityRepository";

export class MockOpportunityRepository implements OpportunityRepository {
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
