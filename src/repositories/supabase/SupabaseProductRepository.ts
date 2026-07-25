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

export class SupabaseProductRepository implements ProductRepository {
  async getProducts(query?: string): Promise<Opportunity[]> {
    const client = getSupabaseClient();

    if (!client) {
      throw new AppError("Supabase is not configured.", 503);
    }

    const searchTerm = query?.trim();

    let request = client.from("prices").select(`
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

      if (isBarcode) {
        request = request.eq("products.barcode", searchTerm);
      } else {
        request = request.ilike("products.name", `%${searchTerm}%`);
      }
    }

    const { data, error } = await request.order("price", {
      ascending: true,
    });

    if (error) {
      throw new AppError(error.message, 502);
    }

    const rows = (data ?? []) as unknown as PriceRow[];

    return rows
      .map((row) => this.mapPriceRow(row))
      .filter((item): item is Opportunity => item !== null);
  }

  async getProductById(id: string): Promise<Opportunity | null> {
    const client = getSupabaseClient();

    if (!client) {
      throw new AppError("Supabase is not configured.", 503);
    }

    const { data, error } = await client
      .from("prices")
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

    if (error) {
      throw new AppError(error.message, 502);
    }

    if (!data) {
      return null;
    }

    return this.mapPriceRow(data as unknown as PriceRow);
  }

  private mapPriceRow(row: PriceRow): Opportunity | null {
    const product = this.getRelatedRow(row.products);
    const store = this.getRelatedRow(row.stores);

    if (!product || !store) {
      return null;
    }

    return {
id: 0,
      productName: product.name,
      store: store.name,
      price: String(row.price),
      savings: "0",
      badge: "Fiyat Karşılaştırması",
      description: `${product.name} ürünü ${store.name} mağazasında`,
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