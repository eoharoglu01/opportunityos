import { opportunities } from "../data/opportunities";
import type { Opportunity } from "../types";
import type { ProductRepository } from "./ProductRepository";

export class MockProductRepository implements ProductRepository {
  async getProducts(query?: string): Promise<Opportunity[]> {
    const normalizedQuery = query?.trim().toLowerCase();

    if (!normalizedQuery) {
      return opportunities;
    }

    return opportunities.filter((opportunity) =>
      opportunity.productName.toLowerCase().includes(normalizedQuery),
    );
  }

  async getProductById(id: string): Promise<Opportunity | null> {
    const numericId = Number(id);
    return opportunities.find((opportunity) => opportunity.id === numericId) ?? null;
  }
}
