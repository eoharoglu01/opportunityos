import { ConsoleLogger, type Logger } from "../logger";
import type { DataProvider } from "../providers/interfaces";
import type { PricePoint, ProductSearchQuery } from "../types/collection";
import { PriceChangeDetector } from "./priceChangeDetector";
import { InMemoryPriceHistoryStore, type PriceHistoryStore } from "./priceHistoryStore";
import { PriceDropNotificationService } from "./notificationService";
import type { PriceDropNotification, SyncResult } from "./types";
import { defaultRetryPolicy, withRetry } from "../providers/retry";

export class SyncEngine {
  private readonly detector = new PriceChangeDetector();
  private readonly historyStore: PriceHistoryStore;
  private readonly notifier: PriceDropNotificationService;

  constructor(
    private readonly providers: DataProvider[],
    private readonly logger: Logger = new ConsoleLogger(),
    historyStore?: PriceHistoryStore,
    notifier?: PriceDropNotificationService,
  ) {
    this.historyStore = historyStore ?? new InMemoryPriceHistoryStore();
    this.notifier = notifier ?? new PriceDropNotificationService(this.logger);
  }

  async syncProducts(query: ProductSearchQuery): Promise<SyncResult> {
    let synchronized = 0;
    let changesDetected = 0;
    let priceDrops = 0;

    for (const provider of this.providers) {
      const products = await withRetry(
        async () => provider.searchProducts(query),
        defaultRetryPolicy,
        this.logger,
        `search:${provider.name}`,
      );

      synchronized += products.length;

      for (const product of products) {
        const prices = await withRetry(
          async () => provider.getPrices(product.id),
          defaultRetryPolicy,
          this.logger,
          `prices:${product.id}`,
        );

        const latestPrice = prices[prices.length - 1];
        if (!latestPrice) {
          continue;
        }

        const previousPrice = await this.readPreviousPrice(product.id);
        const change = this.detector.detect(previousPrice, latestPrice);

        if (change) {
          changesDetected += 1;
          await this.historyStore.append(change);

          if (change.direction === "down" && change.previousPrice !== undefined) {
            priceDrops += 1;
            const notification: PriceDropNotification = {
              productId: change.productId,
              provider: change.provider,
              previousPrice: change.previousPrice,
              currentPrice: change.currentPrice,
              currency: change.currency,
              collectedAt: change.collectedAt,
            };

            await this.notifier.notifyDrop(notification);
          }
        }
      }
    }

    return { synchronized, changesDetected, priceDrops };
  }

  private async readPreviousPrice(productId: string): Promise<PricePoint | undefined> {
    const history = await this.historyStore.list(productId);
    const latestChange = history[history.length - 1];
    if (!latestChange) {
      return undefined;
    }

    return {
      amount: latestChange.currentPrice,
      currency: latestChange.currency,
      source: latestChange.provider,
      collectedAt: latestChange.collectedAt,
      productId: latestChange.productId,
    };
  }
}
