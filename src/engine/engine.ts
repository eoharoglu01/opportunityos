import { ConsoleLogger } from "../logger";
import { SyncEngine } from "./syncEngine";
import { InMemoryPriceHistoryStore } from "./priceHistoryStore";
import { PriceDropNotificationService } from "./notificationService";
import type { DataProvider } from "../providers/interfaces";
import type { Logger } from "../logger";

export class OpportunitySyncEngine {
  public readonly syncEngine: SyncEngine;

  constructor(
    providers: DataProvider[],
    logger: Logger = new ConsoleLogger(),
  ) {
    this.syncEngine = new SyncEngine(
      providers,
      logger,
      new InMemoryPriceHistoryStore(),
      new PriceDropNotificationService(logger),
    );
  }
}
