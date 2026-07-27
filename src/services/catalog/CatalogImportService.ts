import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "../../lib/supabaseAdmin";

export type CatalogProductInput = {
  storeName: string;
  productName: string;
  brand?: string;
  barcode?: string;
  price: number;
  currency?: "TRY";
  validFrom?: string;
  validUntil?: string;
  sourceUrl?: string;
};

export type CatalogImportResult = {
  success: boolean;
  importedCount: number;
  updatedCount: number;
  skippedCount: number;
  errors: string[];
};

function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function isValidPrice(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

export class CatalogImportService {
  async importProducts(
    products: CatalogProductInput[],
  ): Promise<CatalogImportResult> {
    let importedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    const client = supabaseAdmin as SupabaseClient;

    if (!client) {
      return {
        success: false,
        importedCount: 0,
        updatedCount: 0,
        skippedCount: products.length,
        errors: ["Supabase bağlantısı bulunamadı."],
      };
    }

    for (const rawItem of products) {
      const item = {
        ...rawItem,
        storeName: cleanText(rawItem.storeName),
        productName: cleanText(rawItem.productName),
        brand: rawItem.brand
          ? cleanText(rawItem.brand)
          : undefined,
        barcode: rawItem.barcode?.trim() || undefined,
      };

      try {
        if (!item.storeName || !item.productName) {
          skippedCount += 1;
          errors.push(
            "Market veya ürün adı boş olduğu için kayıt atlandı.",
          );
          continue;
        }

        if (!isValidPrice(item.price)) {
          skippedCount += 1;
          errors.push(
            `${item.productName}: Geçersiz fiyat (${item.price}).`,
          );
          continue;
        }

        const { data: store, error: storeError } =
          await client
            .from("stores")
            .select("id, name")
            .ilike("name", item.storeName)
            .maybeSingle();

        if (storeError) {
          skippedCount += 1;
          errors.push(
            `${item.storeName}: ${storeError.message}`,
          );
          continue;
        }

        if (!store) {
          skippedCount += 1;
          errors.push(
            `${item.storeName}: Market bulunamadı.`,
          );
          continue;
        }

        let productQuery = client
          .from("products")
          .select("id, name, brand, barcode");

        if (item.barcode) {
          productQuery = productQuery.eq(
            "barcode",
            item.barcode,
          );
        } else {
          productQuery = productQuery.ilike(
            "name",
            item.productName,
          );
        }

        const {
          data: existingProduct,
          error: productFindError,
        } = await productQuery.maybeSingle();

        if (productFindError) {
          skippedCount += 1;
          errors.push(
            `${item.productName}: ${productFindError.message}`,
          );
          continue;
        }

        let product = existingProduct;

        if (!product) {
          const {
            data: newProduct,
            error: productInsertError,
          } = await client
            .from("products")
            .insert({
              name: item.productName,
              brand: item.brand ?? null,
              barcode: item.barcode ?? null,
            })
            .select("id, name, brand, barcode")
            .single();

          if (productInsertError || !newProduct) {
            skippedCount += 1;
            errors.push(
              `${item.productName}: ${
                productInsertError?.message ??
                "Ürün oluşturulamadı."
              }`,
            );
            continue;
          }

          product = newProduct;
        }

        const {
          data: existingPrice,
          error: existingPriceError,
        } = await client
          .from("prices")
          .select("id, price")
          .eq("product_id", product.id)
          .eq("store_id", store.id)
          .maybeSingle();

        if (existingPriceError) {
          skippedCount += 1;
          errors.push(
            `${item.productName}: ${existingPriceError.message}`,
          );
          continue;
        }

        if (existingPrice) {
          const { error: updateError } = await client
            .from("prices")
            .update({
              price: item.price,
              currency: item.currency ?? "TRY",
            })
            .eq("id", existingPrice.id);

          if (updateError) {
            skippedCount += 1;
            errors.push(
              `${item.productName}: ${updateError.message}`,
            );
            continue;
          }

          updatedCount += 1;
        } else {
          const { error: insertError } = await client
            .from("prices")
            .insert({
              product_id: product.id,
              store_id: store.id,
              price: item.price,
              currency: item.currency ?? "TRY",
            });

          if (insertError) {
            skippedCount += 1;
            errors.push(
              `${item.productName}: ${insertError.message}`,
            );
            continue;
          }

          importedCount += 1;
        }
      } catch (error: unknown) {
        skippedCount += 1;

        errors.push(
          `${item.productName}: ${
            error instanceof Error
              ? error.message
              : "Bilinmeyen hata"
          }`,
        );
      }
    }

    return {
      success: errors.length === 0,
      importedCount,
      updatedCount,
      skippedCount,
      errors,
    };
  }
}

export const catalogImportService =
  new CatalogImportService();