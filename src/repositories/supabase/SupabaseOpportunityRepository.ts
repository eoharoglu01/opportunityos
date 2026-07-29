import { AppError } from "../../lib/errors";
import { getSupabaseClient } from "../../lib/supabase";
import type { Database } from "../../types/supabase";
import type { Opportunity } from "../../types";
import type { OpportunityRepository } from "../OpportunityRepository";

export class SupabaseOpportunityRepository implements OpportunityRepository {
  async getProducts(query?: string): Promise<Opportunity[]> {
    const client = getSupabaseClient();

    if (!client) {
      throw new AppError("Supabase is not configured.", 503);
    }

    let request = client.from("opportunities").select("*");

    if (query?.trim()) {
      request = request.ilike("product_name", `%${query.trim()}%`);
    }

    const { data, error } = await request;

    if (error) {
      throw new AppError(error.message, 502);
    }

    return (data ?? []).map((item) => this.mapRow(item as Database["public"]["Tables"]["opportunities"]["Row"]));
  }

  private mapRow(row: Database["public"]["Tables"]["opportunities"]["Row"]): Opportunity {
    return {
      id: row.id,
      productName: row.product_name,
      store: row.store,
      price: row.price,
      savings: row.savings,
      badge: row.badge,
      description: row.description,
    };
  }
}
