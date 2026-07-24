import { ConsoleLogger } from "../logger";
import { Scheduler } from "./scheduler";
import type { SyncEngine } from "../engine/syncEngine";

export class BackgroundJobs {
  constructor(
    private readonly scheduler: Scheduler,
    private readonly syncEngine: SyncEngine,
    private readonly logger = new ConsoleLogger(),
  ) {}

  register(): void {
    this.scheduler.register({
      name: "product-sync",
      intervalMs: 60_000,
      run: async () => {
        this.logger.info("Starting scheduled product synchronization");
        await this.syncEngine.syncProducts({ keyword: "", category: "all" });
      },
    });
  }
}
