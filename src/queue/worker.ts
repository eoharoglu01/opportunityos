import { ConsoleLogger, type Logger } from "../logger";
import type { QueueJob } from "../types/collection";
import type { Queue } from "./queue";

export interface JobHandler<TPayload> {
  handle(job: QueueJob<TPayload>): Promise<void>;
}

export class QueueWorker<TPayload> {
  constructor(
    private readonly queue: Queue<TPayload>,
    private readonly handler: JobHandler<TPayload>,
    private readonly logger: Logger = new ConsoleLogger(),
  ) {}

  async runOnce(): Promise<void> {
    const job = await this.queue.dequeue();
    if (!job) {
      return;
    }

    this.logger.info("Processing queue job", { jobId: job.id, type: job.type });
    await this.handler.handle(job);
  }
}
