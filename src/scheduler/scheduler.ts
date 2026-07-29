export interface SchedulerJob {
  name: string;
  run: () => Promise<void>;
  intervalMs: number;
}

export class Scheduler {
  private readonly jobs = new Map<string, SchedulerJob>();

  register(job: SchedulerJob): void {
    this.jobs.set(job.name, job);
  }

  start(): void {
    for (const job of this.jobs.values()) {
      setInterval(() => {
        void job.run();
      }, job.intervalMs);
    }
  }
}
