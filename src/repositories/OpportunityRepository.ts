import type { Opportunity } from "../types";

export interface OpportunityRepository {
  getProducts(query?: string): Promise<Opportunity[]>;
}
