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

type StoreRecord = {
  id: string;
  name: string;
};

type KnownStore = {
  name: string;
  slug: string;
  websiteUrl: string;
  aliases: string[];
};

const knownStores: KnownStore[] = [
  {
    name: "A101",
    slug: "a101",
    websiteUrl: "https://www.a101.com.tr/",
    aliases: ["a101", "a 101"],
  },
  {
    name: "BİM",
    slug: "bim",
    websiteUrl: "https://www.bim.com.tr/",
    aliases: ["bim", "bİm"],
  },
  {
    name: "ŞOK",
    slug: "sok",
    websiteUrl: "https://www.sokmarket.com.tr/",
    aliases: ["sok", "şok", "şok market", "sok market"],
  },
  {
    name: "Migros",
    slug: "migros",
    websiteUrl: "https://www.migros.com.tr/",
    aliases: ["migros"],
  },
  {
    name: "CarrefourSA",
    slug: "carrefoursa",
    websiteUrl: "https://www.carrefoursa.com/",
    aliases: ["carrefour", "carrefoursa", "carrefour sa"],
  },
  {
    name: "Tarım Kredi",
    slug: "tarim-kredi",
    websiteUrl: "https://www.tkkoop.com.tr/",
    aliases: [
      "tarim kredi",
      "tarım kredi",
      "tarım kredi kooperatif market",
      "tarim kredi kooperatif market",
    ],
  },
  {
    name: "Bizim Toptan",
    slug: "bizim-toptan",
    websiteUrl: "https://www.bizimtoptan.com.tr/",
    aliases: ["bizim toptan", "bizimtoptan"],
  },
  {
    name: "Hakmar Express",
    slug: "hakmar-express",
    websiteUrl: "https://www.hakmarexpress.com.tr/",
    aliases: ["hakmar", "hakmar express", "hakmarexpress"],
  },
  {
    name: "Happy Center",
    slug: "happy-center",
    websiteUrl: "https://www.happycenter.com.tr/",
    aliases: ["happy center", "happycenter"],
  },
  {
    name: "Onur Market",
    slug: "onur-market",
    websiteUrl: "https://www.onurmarket.com/",
    aliases: ["onur", "onur market", "onurmarket"],
  },
  {
    name: "KİM Market",
    slug: "kim-market",
    websiteUrl: "https://www.kimmarket.com/",
    aliases: ["kim", "kim market", "kİm market"],
  },
];

function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeStoreName(value: string): string {
  return cleanText(value)
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function isValidPrice(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function findKnownStore(value: string): KnownStore | null {
  const normalizedValue = normalizeStoreName(value);

  return (
    knownStores.find((store) =>
      [store.name, store.slug, ...store.aliases].some(
        (alias) => normalizeStoreName(alias) === normalizedValue,
      ),
    ) ?? null
  );
}

async function resolveStore(
  client: SupabaseClient,
  requestedStoreName: string,
): Promise<{ store: StoreRecord | null; error: string | null }> {
  const knownStore = findKnownStore(requestedStoreName);
  const canonicalName = knownStore?.name ?? cleanText(requestedStoreName);
  const normalizedRequestedName = normalizeStoreName(canonicalName);

  const { data: stores, error: storesError } = await client
    .from("stores")
    .select("id, name");

  if (storesError) {
    return { store: null, error: storesError.message };
  }

  const matchingStore = (stores ?? []).find(
    (store) => normalizeStoreName(String(store.name)) === normalizedRequestedName,
  ) as StoreRecord | undefined;

  if (matchingStore) {
    return { store: matchingStore, error: null };
  }

  if (!knownStore) {
    return {
      store: null,
      error: `${requestedStoreName}: Tanınmayan market adı.`,
    };
  }

  const { data: createdStore, error: createError } = await client
    .from("stores")
    .upsert(
      {
        name: knownStore.name,
        slug: knownStore.slug,
        website_url: knownStore.websiteUrl,
        is_active: true,
      },
      { onConflict: "slug" },
    )
    .select("id, name")
    .single();

  if (createError || !createdStore) {
    return {
      store: null,
      error: createError?.message ?? `${knownStore.name}: Market oluşturulamadı.`,
    };
  }

  return { store: createdStore as StoreRecord, error: null };
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

    const storeCache = new Map<string, StoreRecord>();

    for (const rawItem of products) {
      const item = {
        ...rawItem,
        storeName: cleanText(rawItem.storeName),
        productName: cleanText(rawItem.productName),
        brand: rawItem.brand ? cleanText(rawItem.brand) : undefined,
        barcode: rawItem.barcode?.trim() || undefined,
      };

      try {
        if (!item.storeName || !item.productName) {
          skippedCount += 1;
          errors.push("Market veya ürün adı boş olduğu için kayıt atlandı.");
          continue;
        }

        if (!isValidPrice(item.price)) {
          skippedCount += 1;
          errors.push(`${item.productName}: Geçersiz fiyat (${item.price}).`);
          continue;
        }

        const cacheKey = normalizeStoreName(item.storeName);
        let store = storeCache.get(cacheKey) ?? null;

        if (!store) {
          const storeResult = await resolveStore(client, item.storeName);

          if (!storeResult.store) {
            skippedCount += 1;
            errors.push(storeResult.error ?? `${item.storeName}: Market bulunamadı.`);
            continue;
          }

          store = storeResult.store;
          storeCache.set(cacheKey, store);
        }

        let productQuery = client
          .from("products")
          .select("id, name, brand, barcode");

        if (item.barcode) {
          productQuery = productQuery.eq("barcode", item.barcode);
        } else {
          productQuery = productQuery.ilike("name", item.productName);
        }

        const { data: existingProduct, error: productFindError } =
          await productQuery.maybeSingle();

        if (productFindError) {
          skippedCount += 1;
          errors.push(`${item.productName}: ${productFindError.message}`);
          continue;
        }

        let product = existingProduct;

        if (!product) {
          const { data: newProduct, error: productInsertError } = await client
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
                productInsertError?.message ?? "Ürün oluşturulamadı."
              }`,
            );
            continue;
          }

          product = newProduct;
        }

        const { data: existingPrice, error: existingPriceError } = await client
          .from("prices")
          .select("id, price")
          .eq("product_id", product.id)
          .eq("store_id", store.id)
          .maybeSingle();

        if (existingPriceError) {
          skippedCount += 1;
          errors.push(`${item.productName}: ${existingPriceError.message}`);
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
            errors.push(`${item.productName}: ${updateError.message}`);
            continue;
          }

          updatedCount += 1;
        } else {
          const { error: insertError } = await client.from("prices").insert({
            product_id: product.id,
            store_id: store.id,
            price: item.price,
            currency: item.currency ?? "TRY",
          });

          if (insertError) {
            skippedCount += 1;
            errors.push(`${item.productName}: ${insertError.message}`);
            continue;
          }

          importedCount += 1;
        }
      } catch (error: unknown) {
        skippedCount += 1;
        errors.push(
          `${item.productName}: ${
            error instanceof Error ? error.message : "Bilinmeyen hata"
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

export const catalogImportService = new CatalogImportService();
