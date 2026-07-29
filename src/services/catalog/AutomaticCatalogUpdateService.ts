import type { SupabaseClient } from "@supabase/supabase-js";

import { supabaseAdmin } from "../../lib/supabaseAdmin";
import { catalogImportService } from "./CatalogImportService";
import { collectorEngine } from "./collectors/CollectorEngine";

import "./MigrosCollectorService";
import "./collectors/A101CollectorService";
import "./collectors/BimCollectorService";
import "./collectors/BizimToptanCollectorService";
import "./collectors/CarrefourCollectorService";
import "./collectors/HakmarCollectorService";
import "./collectors/HappyCenterCollectorService";
import "./collectors/KimMarketCollectorService";
import "./collectors/OnurMarketCollectorService";
import "./collectors/SokCollectorService";
import "./collectors/TarimKrediCollectorService";

export type AutomaticCatalogMarket = {
  key: string;
  collectorName: string;
  sourceUrl: string;
};

export type AutomaticCatalogMarketResult = {
  market: string;
  storeName: string;
  success: boolean;
  collectedCount: number;
  importedCount: number;
  updatedCount: number;
  skippedCount: number;
  durationMs: number;
  errors: string[];
};

export type AutomaticCatalogUpdateResult = {
  success: boolean;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  totalCollectedCount: number;
  totalImportedCount: number;
  totalUpdatedCount: number;
  totalSkippedCount: number;
  results: AutomaticCatalogMarketResult[];
};

export const automaticCatalogMarkets: AutomaticCatalogMarket[] = [
  {
    key: "sok",
    collectorName: "şok",
    sourceUrl: "https://www.sokmarket.com.tr/sut-ve-sut-urunleri-c-460",
  },
  {
    key: "migros",
    collectorName: "migros",
    sourceUrl: "https://www.migros.com.tr/",
  },
  {
    key: "carrefour",
    collectorName: "carrefoursa",
    sourceUrl: "https://www.carrefoursa.com/sut-ve-sut-urunleri/c/9006",
  },
  {
    key: "bim",
    collectorName: "bim",
    sourceUrl: "https://www.bim.com.tr/categories/100/aktuel-urunler.aspx",
  },
  {
    key: "a101",
    collectorName: "a101",
    sourceUrl: "https://www.a101.com.tr/kapida/sut-urunleri-kahvaltilik/sut",
  },
  {
    key: "tarimkredi",
    collectorName: "tarım kredi",
    sourceUrl: "https://www.tkkoop.com.tr/urun-kategori/sut",
  },
  {
    key: "bizimtoptan",
    collectorName: "bizim toptan",
    sourceUrl: "https://www.bizimtoptan.com.tr/sutas",
  },
  {
    key: "hakmar",
    collectorName: "hakmar express",
    sourceUrl: "https://www.hakmarexpress.com.tr/",
  },
  {
    key: "happy",
    collectorName: "happy center",
    sourceUrl: "https://www.happycenter.com.tr/",
  },
];

function toMaximumProductCount(value: number | undefined): number {
  if (!Number.isFinite(value)) return 20;
  return Math.min(Math.max(Math.floor(value ?? 20), 1), 50);
}

function toTimeoutMs(value: number | undefined): number {
  if (!Number.isFinite(value)) return 45_000;
  return Math.min(Math.max(Math.floor(value ?? 45_000), 5_000), 55_000);
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`İşlem ${timeoutMs / 1000} saniyede tamamlanamadı.`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export class AutomaticCatalogUpdateService {
  async run(options?: {
    markets?: string[];
    maximumProductCount?: number;
    timeoutMs?: number;
  }): Promise<AutomaticCatalogUpdateResult> {
    const startedAtDate = new Date();
    const maximumProductCount = toMaximumProductCount(options?.maximumProductCount);
    const timeoutMs = toTimeoutMs(options?.timeoutMs);
    const requestedMarkets = new Set(
      (options?.markets ?? []).map((market) => market.trim().toLocaleLowerCase("tr-TR")),
    );

    const markets = requestedMarkets.size
      ? automaticCatalogMarkets.filter((market) => requestedMarkets.has(market.key))
      : automaticCatalogMarkets;

    const results: AutomaticCatalogMarketResult[] = [];

    for (const market of markets) {
      const marketStartedAt = Date.now();

      try {
        const collectionResult = await withTimeout(
          collectorEngine.collectFromStore(market.collectorName, {
            sourceUrl: market.sourceUrl,
            maximumProductCount,
          }),
          timeoutMs,
        );

        if (!collectionResult.success || collectionResult.products.length === 0) {
          results.push({
            market: market.key,
            storeName: collectionResult.storeName,
            success: false,
            collectedCount: collectionResult.collectedCount,
            importedCount: 0,
            updatedCount: 0,
            skippedCount: 0,
            durationMs: Date.now() - marketStartedAt,
            errors: collectionResult.errors.length
              ? collectionResult.errors
              : ["Collector ürün döndürmedi."],
          });
          continue;
        }

        const importResult = await catalogImportService.importProducts(
          collectionResult.products.map((product) => ({
            storeName: product.storeName,
            productName: product.productName,
            brand: product.brand,
            barcode: product.barcode,
            price: product.price,
            currency: product.currency,
            sourceUrl: product.sourceUrl,
            validFrom: product.collectedAt,
          })),
        );

        results.push({
          market: market.key,
          storeName: collectionResult.storeName,
          success: importResult.success,
          collectedCount: collectionResult.collectedCount,
          importedCount: importResult.importedCount,
          updatedCount: importResult.updatedCount,
          skippedCount: importResult.skippedCount,
          durationMs: Date.now() - marketStartedAt,
          errors: [...collectionResult.errors, ...importResult.errors],
        });
      } catch (error) {
        results.push({
          market: market.key,
          storeName: market.collectorName,
          success: false,
          collectedCount: 0,
          importedCount: 0,
          updatedCount: 0,
          skippedCount: 0,
          durationMs: Date.now() - marketStartedAt,
          errors: [error instanceof Error ? error.message : "Bilinmeyen collector hatası."],
        });
      }
    }

    const finishedAtDate = new Date();
    const result: AutomaticCatalogUpdateResult = {
      success: results.length > 0 && results.some((item) => item.success),
      startedAt: startedAtDate.toISOString(),
      finishedAt: finishedAtDate.toISOString(),
      durationMs: finishedAtDate.getTime() - startedAtDate.getTime(),
      totalCollectedCount: results.reduce((sum, item) => sum + item.collectedCount, 0),
      totalImportedCount: results.reduce((sum, item) => sum + item.importedCount, 0),
      totalUpdatedCount: results.reduce((sum, item) => sum + item.updatedCount, 0),
      totalSkippedCount: results.reduce((sum, item) => sum + item.skippedCount, 0),
      results,
    };

    await this.persistRun(result);
    return result;
  }

  private async persistRun(result: AutomaticCatalogUpdateResult): Promise<void> {
    const client = supabaseAdmin as SupabaseClient | null;
    if (!client) return;

    const { error } = await client.from("catalog_sync_runs").insert({
      status: result.success ? "completed" : "failed",
      started_at: result.startedAt,
      finished_at: result.finishedAt,
      duration_ms: result.durationMs,
      total_collected_count: result.totalCollectedCount,
      total_imported_count: result.totalImportedCount,
      total_updated_count: result.totalUpdatedCount,
      total_skipped_count: result.totalSkippedCount,
      result: result,
    });

    if (error && !error.message.includes("catalog_sync_runs")) {
      console.error("Catalog sync run kaydedilemedi:", error.message);
    }
  }
}

export const automaticCatalogUpdateService = new AutomaticCatalogUpdateService();
