import { Buffer } from "node:buffer";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../lib/errors";
import { getSupabaseClient } from "../../lib/supabase";
import type { Opportunity } from "../../types";
import type { ProductRepository } from "../ProductRepository";

type ProductRow = {
  id: string;
  name: string;
  barcode: string | null;
};

type StoreRow = {
  id: string;
  name: string;
};

type RelatedRow<T> = T | T[] | null;

type PriceRow = {
  id: string;
  price: number | string;
  products: RelatedRow<ProductRow>;
  stores: RelatedRow<StoreRow>;
};

type PriceTableName = "product_prices" | "prices";

function repairMojibake(value: string): string {
  if (!/[ÃÄÅ]/.test(value)) {
    return value;
  }

  try {
    const repaired = Buffer.from(value, "latin1").toString("utf8");
    return repaired.includes("�") ? value : repaired;
  } catch {
    return value;
  }
}

function isMissingRelationError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("does not exist") ||
    normalized.includes("could not find the table") ||
    normalized.includes("relation") && normalized.includes("not found")
  );
}

export class SupabaseProductRepository implements ProductRepository {
  async getProducts(query?: string): Promise<Opportunity[]> {
    const client = getSupabaseClient();

    if (!client) {
      throw new AppError("Supabase is not configured.", 503);
    }

    const searchTerm = query?.trim();
    const rows = await this.fetchRows(client, searchTerm);

    return rows
      .map((row) => this.mapPriceRow(row))
      .filter((item): item is Opportunity => item !== null);
  }

  async getProductById(id: string): Promise<Opportunity | null> {
    const client = getSupabaseClient();

    if (!client) {
      throw new AppError("Supabase is not configured.", 503);
    }

    for (const table of this.priceTables()) {
      const { data, error } = await client
        .from(table)
        .select(`
          id,
          price,
          products!inner (
            id,
            name,
            barcode
          ),
          stores!inner (
            id,
            name
          )
        `)
        .eq("id", id)
        .maybeSingle();

      if (!error) {
        return data ? this.mapPriceRow(data as unknown as PriceRow) : null;
      }

      if (!isMissingRelationError(error.message)) {
        throw new AppError(error.message, 502);
      }
    }

    return null;
  }

  private async fetchRows(
    client: SupabaseClient,
    searchTerm?: string,
  ): Promise<PriceRow[]> {
    let lastMissingTableError: string | null = null;

    for (const table of this.priceTables()) {
      let request = client.from(table).select(`
        id,
        price,
        products!inner (
          id,
          name,
          barcode
        ),
        stores!inner (
          id,
          name
        )
      `);

      if (searchTerm) {
        const isBarcode = /^\d{8,14}$/.test(searchTerm);
        request = isBarcode
          ? request.eq("products.barcode", searchTerm)
          : request.ilike("products.name", `%${searchTerm}%`);
      }

      const { data, error } = await request.order("price", {
        ascending: true,
      });

      if (!error) {
        return (data ?? []) as unknown as PriceRow[];
      }

      if (isMissingRelationError(error.message)) {
        lastMissingTableError = error.message;
        continue;
      }

      throw new AppError(error.message, 502);
    }

    throw new AppError(
      lastMissingTableError ?? "Price table could not be found.",
      502,
    );
  }

  private priceTables(): readonly PriceTableName[] {
    return ["prices", "product_prices"];
  }

  private mapPriceRow(row: PriceRow): Opportunity | null {
    const product = this.getRelatedRow(row.products);
    const store = this.getRelatedRow(row.stores);

    if (!product || !store) {
      return null;
    }

    return {
      id: row.id,
      productName: repairMojibake(product.name),
      store: repairMojibake(store.name),
      price: String(row.price),
      savings: "0",
      badge: "Fiyat Karşılaştırması",
      description: `${repairMojibake(product.name)} ürünü ${repairMojibake(store.name)} mağazasında`,
    };
  }

  private getRelatedRow<T>(value: RelatedRow<T>): T | null {
    if (!value) {
      return null;
    }

    if (Array.isArray(value)) {
      return value[0] ?? null;
    }

    return value;
  }
}
