import { ConsoleLogger } from "../logger";
import { InMemoryCache } from "../cache/cache";
import { InMemoryQueue } from "../queue/queue";
import { CollectionService } from "./collectionService";
import { ProviderRegistry } from "./providerRegistry";
import { Scheduler } from "../scheduler/scheduler";
import type { ProviderConfig } from "../providers/interfaces";
import type { DataProvider } from "../providers/interfaces";

export class CollectionArchitecture {
  public readonly providers: DataProvider[];
  public readonly collectionService: CollectionService;
  public readonly scheduler: Scheduler;

  constructor(configs: ProviderConfig[]) {
    const logger = new ConsoleLogger();
    const registry = new ProviderRegistry(logger);
    this.providers = registry.createProviders(configs);
    this.collectionService = new CollectionService(this.providers, logger);
    this.scheduler = new Scheduler();

    this.scheduler.register({
      name: "collection-refresh",
      intervalMs: 60_000,
      run: async () => {
        logger.info("Background collection job triggered");
      },
    });

    void new InMemoryQueue<unknown>();
    void new InMemoryCache<unknown>();
  }
}
