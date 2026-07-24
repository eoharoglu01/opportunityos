import { AppError } from "../../lib/errors";
import { getSupabaseClient } from "../../lib/supabase";
import type { Opportunity } from "../../types";
import type { ProductRepository } from "../ProductRepository";

type OpportunityRow = {
  id: number;
  product_name: string;
  store: string;
  price: string;
  savings: string;
  badge: string;
  description: string;
  created_at?: string;
};

export class SupabaseProductRepository implements ProductRepository {
  async getProducts(query?: string): Promise<Opportunity[]> {
    const client = getSupabaseClient();

    if (!client) {
      throw new AppError("Supabase is not configured.", 503);
    }

    let request = client.from("opportunities").select("*") as ReturnType<typeof client.from>;

    if (query?.trim()) {
      request = request.ilike("product_name", `%${query.trim()}%`) as ReturnType<typeof client.from>;
    }

    const { data, error } = await request;

    if (error) {
      throw new AppError(error.message, 502);
    }

    const rows = (data ?? []) as OpportunityRow[];
    return rows.map((item) => this.mapRow(item));
  }

  async getProductById(id: string): Promise<Opportunity | null> {
    const client = getSupabaseClient();

    if (!client) {
      throw new AppError("Supabase is not configured.", 503);
    }

    const { data, error } = await client.from("opportunities").select("*").eq("id", Number(id)).maybeSingle();

    if (error) {
      throw new AppError(error.message, 502);
    }

    return data ? this.mapRow(data as OpportunityRow) : null;
  }

  private mapRow(row: OpportunityRow): Opportunity {
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
