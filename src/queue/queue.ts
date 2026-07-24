import type { QueueJob } from "../types/collection";

export interface Queue<TPayload> {
  enqueue(job: QueueJob<TPayload>): Promise<void>;
  dequeue(): Promise<QueueJob<TPayload> | null>;
}

export class InMemoryQueue<TPayload> implements Queue<TPayload> {
  private readonly jobs: QueueJob<TPayload>[] = [];

  async enqueue(job: QueueJob<TPayload>): Promise<void> {
    this.jobs.push(job);
  }

  async dequeue(): Promise<QueueJob<TPayload> | null> {
    return this.jobs.shift() ?? null;
  }
}
