import { AppError } from "../../lib/errors";
import { getSupabaseClient } from "../../lib/supabase";
import type { Opportunity } from "../../types";
import type { StoreRepository } from "../StoreRepository";

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

export class SupabaseStoreRepository implements StoreRepository {
  async getStores(): Promise<string[]> {
    const client = getSupabaseClient();

    if (!client) {
      throw new AppError("Supabase is not configured.", 503);
    }

    const { data, error } = await client.from("opportunities").select("store");

    if (error) {
      throw new AppError(error.message, 502);
    }

    const rows = (data ?? []) as Array<{ store: string }>;
    return Array.from(new Set(rows.map((item) => item.store)));
  }

  async getProductsForStore(storeName: string): Promise<Opportunity[]> {
    const client = getSupabaseClient();

    if (!client) {
      throw new AppError("Supabase is not configured.", 503);
    }

    const { data, error } = await client.from("opportunities").select("*").eq("store", storeName);

    if (error) {
      throw new AppError(error.message, 502);
    }

    const rows = (data ?? []) as OpportunityRow[];
    return rows.map((item) => this.mapRow(item));
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
