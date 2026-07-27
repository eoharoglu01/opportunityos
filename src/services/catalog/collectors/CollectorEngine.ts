import type {
  CollectorOptions,
  CollectorResult,
  MarketCollector,
} from "./types";

export type CollectorEngineResult = {
  success: boolean;
  totalCollectedCount: number;
  results: CollectorResult[];
  errors: string[];
};

export class CollectorEngine {
  private readonly collectors = new Map<
    string,
    MarketCollector
  >();

  register(collector: MarketCollector): void {
    const normalizedStoreName =
      this.normalizeStoreName(collector.storeName);

    if (!normalizedStoreName) {
      throw new Error(
        "Collector market adı boş olamaz.",
      );
    }

    this.collectors.set(
      normalizedStoreName,
      collector,
    );
  }

  unregister(storeName: string): boolean {
    return this.collectors.delete(
      this.normalizeStoreName(storeName),
    );
  }

  hasCollector(storeName: string): boolean {
    return this.collectors.has(
      this.normalizeStoreName(storeName),
    );
  }

  getRegisteredStores(): string[] {
    return Array.from(
      this.collectors.values(),
    )
      .map((collector) => collector.storeName)
      .sort((firstStore, secondStore) =>
        firstStore.localeCompare(
          secondStore,
          "tr-TR",
        ),
      );
  }

  async collectFromStore(
    storeName: string,
    options: CollectorOptions,
  ): Promise<CollectorResult> {
    const collector = this.collectors.get(
      this.normalizeStoreName(storeName),
    );

    if (!collector) {
      return {
        success: false,
        storeName,
        sourceUrl: options.sourceUrl,
        collectedCount: 0,
        products: [],
        errors: [
          `${storeName} için kayıtlı veri toplayıcı bulunamadı.`,
        ],
      };
    }

    try {
      return await collector.collect(options);
    } catch (error) {
      return {
        success: false,
        storeName: collector.storeName,
        sourceUrl: options.sourceUrl,
        collectedCount: 0,
        products: [],
        errors: [
          error instanceof Error
            ? error.message
            : `${collector.storeName} verileri toplanırken bilinmeyen hata oluştu.`,
        ],
      };
    }
  }

  async collectFromAll(
    optionsByStore: Record<
      string,
      CollectorOptions
    >,
  ): Promise<CollectorEngineResult> {
    const collectionTasks = Array.from(
      this.collectors.values(),
    ).map(async (collector) => {
      const options =
        optionsByStore[collector.storeName] ??
        optionsByStore[
          this.normalizeStoreName(
            collector.storeName,
          )
        ];

      if (!options) {
        return {
          success: false,
          storeName: collector.storeName,
          sourceUrl: "",
          collectedCount: 0,
          products: [],
          errors: [
            `${collector.storeName} için kaynak adresi belirtilmedi.`,
          ],
        } satisfies CollectorResult;
      }

      return this.collectFromStore(
        collector.storeName,
        options,
      );
    });

    const results = await Promise.all(
      collectionTasks,
    );

    const errors = results.flatMap((result) =>
      result.errors.map(
        (error) =>
          `${result.storeName}: ${error}`,
      ),
    );

    const totalCollectedCount =
      results.reduce(
        (total, result) =>
          total + result.collectedCount,
        0,
      );

    return {
      success:
        results.length > 0 &&
        results.every(
          (result) => result.success,
        ),
      totalCollectedCount,
      results,
      errors,
    };
  }

  private normalizeStoreName(
    value: string,
  ): string {
    return value
      .toLocaleLowerCase("tr-TR")
      .replace(/\s+/g, " ")
      .trim();
  }
}

export const collectorEngine =
  new CollectorEngine();